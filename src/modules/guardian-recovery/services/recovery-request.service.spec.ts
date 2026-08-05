import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GuardianStatus, RecoveryApprovalStatus, RecoveryRequestStatus } from '@shared/enums';
import { RecoveryRequestService } from './recovery-request.service';

describe('RecoveryRequestService', () => {
  let service: RecoveryRequestService;
  let recoveryRequestRepository: {
    findPendingByWalletId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findById: jest.Mock;
    findHistoryForWallet: jest.Mock;
  };
  let recoveryApprovalRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findByRequestAndGuardian: jest.Mock;
    countApprovedForRequest: jest.Mock;
    findApprovedForRequest: jest.Mock;
  };
  let guardianRepository: { findActiveByWalletId: jest.Mock; findByInvitationToken: jest.Mock };
  let walletService: { getByUserId: jest.Mock };
  let profileService: { findByEmail: jest.Mock };
  let notificationService: { notify: jest.Mock };
  let systemService: { recordAudit: jest.Mock };
  let safeService: {
    getRecoveryModuleAddress: jest.Mock;
    buildMultiConfirmRecoveryCallData: jest.Mock;
  };
  let pimlicoService: { getRecoveryHash: jest.Mock };
  let relayerService: { relayTransaction: jest.Mock };
  let sendgridService: { sendRecoveryRequested: jest.Mock; sendRecoveryCompleted: jest.Mock };

  const wallet = { id: 'wallet-1', userId: 'user-1' };
  const user = { id: 'user-1', email: 'owner@example.com' };
  const guardian = {
    id: 'guardian-1',
    walletId: wallet.id,
    status: GuardianStatus.ACTIVE,
    guardianUserId: null,
  };

  beforeEach(() => {
    recoveryRequestRepository = {
      findPendingByWalletId: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: unknown) => data),
      save: jest.fn((entity: object) => Promise.resolve({ id: 'request-1', ...entity })),
      findById: jest.fn(),
      findHistoryForWallet: jest.fn(),
    };
    recoveryApprovalRepository = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findByRequestAndGuardian: jest.fn(),
      countApprovedForRequest: jest.fn(),
      findApprovedForRequest: jest.fn().mockResolvedValue([]),
    };
    guardianRepository = {
      findActiveByWalletId: jest.fn().mockResolvedValue([guardian]),
      findByInvitationToken: jest.fn().mockResolvedValue(guardian),
    };
    walletService = { getByUserId: jest.fn().mockResolvedValue(wallet) };
    profileService = { findByEmail: jest.fn().mockResolvedValue(user) };
    notificationService = { notify: jest.fn() };
    systemService = { recordAudit: jest.fn() };
    safeService = {
      getRecoveryModuleAddress: jest
        .fn()
        .mockReturnValue('0x9999999999999999999999999999999999999999'),
      buildMultiConfirmRecoveryCallData: jest.fn().mockReturnValue('0xcalldata'),
    };
    pimlicoService = { getRecoveryHash: jest.fn().mockResolvedValue('0xhash') };
    relayerService = { relayTransaction: jest.fn().mockResolvedValue('0xtxhash') };
    sendgridService = {
      sendRecoveryRequested: jest.fn().mockResolvedValue(undefined),
      sendRecoveryCompleted: jest.fn().mockResolvedValue(undefined),
    };

    service = new RecoveryRequestService(
      recoveryRequestRepository as never,
      recoveryApprovalRepository as never,
      guardianRepository as never,
      walletService as never,
      profileService as never,
      notificationService as never,
      systemService as never,
      safeService as never,
      pimlicoService as never,
      relayerService as never,
      sendgridService as never,
    );
  });

  describe('createRequest', () => {
    it('returns null when no account matches the email (anti-enumeration)', async () => {
      profileService.findByEmail.mockResolvedValue(null);

      const result = await service.createRequest({
        email: 'nobody@example.com',
        newOwnerAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(result).toBeNull();
    });

    it('rejects when a recovery request is already pending', async () => {
      recoveryRequestRepository.findPendingByWalletId.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createRequest({
          email: user.email,
          newOwnerAddress: '0x1111111111111111111111111111111111111111',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when the wallet has no active guardians', async () => {
      guardianRepository.findActiveByWalletId.mockResolvedValue([]);

      await expect(
        service.createRequest({
          email: user.email,
          newOwnerAddress: '0x1111111111111111111111111111111111111111',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a pending request requiring approval from every active guardian', async () => {
      const result = await service.createRequest({
        email: user.email,
        newOwnerAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(result).toMatchObject({ status: RecoveryRequestStatus.PENDING, requiredApprovals: 1 });
      expect(recoveryApprovalRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitApproval', () => {
    const pendingRequest = {
      id: 'request-1',
      walletId: wallet.id,
      status: RecoveryRequestStatus.PENDING,
      requiredApprovals: 1,
      expiresAt: null,
    };

    beforeEach(() => {
      recoveryRequestRepository.findById.mockResolvedValue({ ...pendingRequest });
      recoveryApprovalRepository.findByRequestAndGuardian.mockResolvedValue({
        id: 'approval-1',
        status: RecoveryApprovalStatus.PENDING,
      });
    });

    it('throws ForbiddenException for an invalid guardian token', async () => {
      guardianRepository.findByInvitationToken.mockResolvedValue(null);

      await expect(
        service.submitApproval('request-1', 'bad-token', 'approved', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('moves the request to APPROVED once the required approval count is reached', async () => {
      recoveryApprovalRepository.countApprovedForRequest.mockResolvedValue(1);

      const result = await service.submitApproval('request-1', 'token-1', 'approved', {});

      expect(result.status).toBe(RecoveryRequestStatus.APPROVED);
      expect(systemService.recordAudit).toHaveBeenCalledWith(
        'recovery.approved',
        undefined,
        expect.objectContaining({ recoveryRequestId: 'request-1' }),
      );
    });

    it('rejects the whole request immediately on a single guardian rejection', async () => {
      const result = await service.submitApproval('request-1', 'token-1', 'rejected', {});

      expect(result.status).toBe(RecoveryRequestStatus.REJECTED);
      expect(systemService.recordAudit).toHaveBeenCalledWith(
        'recovery.failed',
        undefined,
        expect.objectContaining({ reason: 'guardian rejected' }),
      );
    });

    it('rejects if the guardian already responded to this request', async () => {
      recoveryApprovalRepository.findByRequestAndGuardian.mockResolvedValue({
        id: 'approval-1',
        status: RecoveryApprovalStatus.APPROVED,
      });

      await expect(service.submitApproval('request-1', 'token-1', 'approved', {})).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('executeRecovery', () => {
    const provisionedWallet = { ...wallet, smartAccountAddress: '0xsafe' };

    it('rejects execution of a request that is not yet approved', async () => {
      recoveryRequestRepository.findById.mockResolvedValue({
        id: 'request-1',
        walletId: wallet.id,
        status: RecoveryRequestStatus.PENDING,
      });

      await expect(service.executeRecovery('user-1', 'request-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects when the SocialRecoveryModule has not been enabled on the wallet', async () => {
      walletService.getByUserId.mockResolvedValue(provisionedWallet);
      recoveryRequestRepository.findById.mockResolvedValue({
        id: 'request-1',
        walletId: wallet.id,
        status: RecoveryRequestStatus.APPROVED,
        recoveryHash: null,
      });

      await expect(service.executeRecovery('user-1', 'request-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects when too few on-chain-verifiable guardian signatures are available', async () => {
      walletService.getByUserId.mockResolvedValue(provisionedWallet);
      recoveryRequestRepository.findById.mockResolvedValue({
        id: 'request-1',
        walletId: wallet.id,
        status: RecoveryRequestStatus.APPROVED,
        recoveryHash: '0xhash',
        requiredApprovals: 1,
      });
      recoveryApprovalRepository.findApprovedForRequest.mockResolvedValue([]);

      await expect(service.executeRecovery('user-1', 'request-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('relays multiConfirmRecovery and marks the request executed', async () => {
      walletService.getByUserId.mockResolvedValue(provisionedWallet);
      recoveryRequestRepository.findById.mockResolvedValue({
        id: 'request-1',
        walletId: wallet.id,
        status: RecoveryRequestStatus.APPROVED,
        recoveryHash: '0xhash',
        requiredApprovals: 1,
        newOwnerAddress: '0xnewowner',
        requestedByEmail: user.email,
      });
      recoveryApprovalRepository.findApprovedForRequest.mockResolvedValue([
        {
          guardian: { guardianAddress: '0xguardian1111111111111111111111111111111' },
          signature: '0xsig',
        },
      ]);

      const result = await service.executeRecovery('user-1', 'request-1');

      expect(relayerService.relayTransaction).toHaveBeenCalled();
      expect(result.status).toBe(RecoveryRequestStatus.EXECUTED);
      expect(result.executionTxHash).toBe('0xtxhash');
      expect(systemService.recordAudit).toHaveBeenCalledWith(
        'recovery.executed',
        'user-1',
        expect.objectContaining({ recoveryRequestId: 'request-1' }),
      );
      expect(sendgridService.sendRecoveryCompleted).toHaveBeenCalled();
    });
  });
});
