import { ConflictException, NotFoundException } from '@nestjs/common';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex } from 'viem';
import {
  GuardianStatus,
  RecoveryApprovalStatus,
  RecoveryRequestStatus,
  UserStatus,
  WalletStatus,
} from '@shared/enums';
import { RecoveryService } from './recovery.service';
import { CreateRecoveryRequestDto } from './dto/create-recovery-request.dto';

describe('RecoveryService', () => {
  const ownerId = 'owner-1';
  const walletId = 'wallet-1';
  const guardianUserId = 'guardian-user-1';

  const owner = {
    id: ownerId,
    email: 'owner@example.com',
    displayName: 'Alex Won',
    status: UserStatus.ACTIVE,
    turnkeyUserId: 'tk-owner-old',
  };

  const guardianUser = {
    id: guardianUserId,
    email: 'mark1@example.com',
    displayName: 'Mark de Vries',
    status: UserStatus.ACTIVE,
  };

  const wallet = {
    id: walletId,
    userId: ownerId,
    smartAccountAddress: '0x1A3f00000000000000000000000000000000C4d2',
    ownerAddress: '0x1111111111111111111111111111111111111111',
    chainId: 8453,
    status: WalletStatus.ACTIVE,
    guardianThreshold: 2,
  };

  const guardianKey = generatePrivateKey();
  const guardianAccount = privateKeyToAccount(guardianKey);
  const recoveryHash = keccak256(toHex('recovery-test'));
  const newOwnerAddress = '0x7Ac800000000000000000000000000000000894e';

  const guardians = [
    {
      id: 'g-1',
      walletId,
      guardianUserId,
      guardianEmail: 'mark@example.com',
      guardianName: 'Mark de Vries',
      guardianAddress: '0x2222222222222222222222222222222222222222',
      status: GuardianStatus.ACTIVE,
      canApproveRecovery: true,
      canMoveFunds: false,
      guardianUser,
    },
    {
      id: 'g-2',
      walletId,
      guardianUserId: 'guardian-user-2',
      guardianEmail: 'sofie@example.com',
      guardianName: 'Sofie Vermeer',
      guardianAddress: guardianAccount.address,
      status: GuardianStatus.ACTIVE,
      canApproveRecovery: true,
      canMoveFunds: false,
    },
    {
      id: 'g-3',
      walletId,
      guardianUserId: 'guardian-user-3',
      guardianEmail: 'anna@example.com',
      guardianName: 'Anna Bakker',
      guardianAddress: '0x3333333333333333333333333333333333333333',
      status: GuardianStatus.ACTIVE,
      canApproveRecovery: true,
      canMoveFunds: false,
    },
  ];

  let service: RecoveryService;
  let recoveryRequestRepository: {
    findPendingByWalletId: jest.Mock;
    findActiveByWalletId: jest.Mock;
    findActiveOthersByWalletId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findByIdWithRelations: jest.Mock;
    findByWalletIdWithRelations: jest.Mock;
  };
  let recoveryApprovalRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findByIdWithRelations: jest.Mock;
    findIncomingForGuardian: jest.Mock;
  };
  let guardianRepository: { findActiveApproversForWallet: jest.Mock };
  let walletService: {
    findByUserId: jest.Mock;
    findBySmartAccountAddress: jest.Mock;
    getById: jest.Mock;
    save: jest.Mock;
  };
  let profileService: {
    findByEmail: jest.Mock;
    getById: jest.Mock;
    rebindTurnkeyIdentity: jest.Mock;
    setProviderReference: jest.Mock;
  };
  let notificationService: { notify: jest.Mock };
  let pimlicoService: {
    getRecoveryHashWithNonce: jest.Mock;
    isSocialRecoveryGuardian: jest.Mock;
  };
  let relayerService: { relayTransaction: jest.Mock };
  let safeService: {
    getRecoveryModuleAddress: jest.Mock;
    buildMultiConfirmRecoveryCallData: jest.Mock;
    getSafeInfo: jest.Mock;
  };
  let turnkeyService: {
    verifySessionToken: jest.Mock;
    organizationControlsAddress: jest.Mock;
  };
  let authService: { openSessionForUser: jest.Mock };

  beforeEach(() => {
    recoveryRequestRepository = {
      findPendingByWalletId: jest.fn().mockResolvedValue(null),
      findActiveByWalletId: jest.fn().mockResolvedValue(null),
      findActiveOthersByWalletId: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: Record<string, unknown>) => ({ id: 'rec-1', ...data })),
      save: jest.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
      findByIdWithRelations: jest.fn(),
      findByWalletIdWithRelations: jest.fn().mockResolvedValue([]),
    };
    recoveryApprovalRepository = {
      create: jest.fn((data: Record<string, unknown>) => ({
        id: `apr-${String(data.guardianId)}`,
        ...data,
      })),
      save: jest.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
      findByIdWithRelations: jest.fn(),
      findIncomingForGuardian: jest.fn().mockResolvedValue([]),
    };
    guardianRepository = {
      findActiveApproversForWallet: jest.fn().mockResolvedValue(guardians),
    };
    walletService = {
      findByUserId: jest.fn().mockResolvedValue(wallet),
      findBySmartAccountAddress: jest.fn().mockResolvedValue(wallet),
      getById: jest.fn().mockResolvedValue(wallet),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    };
    profileService = {
      findByEmail: jest.fn().mockResolvedValue(owner),
      getById: jest.fn((id: string) =>
        Promise.resolve(id === ownerId ? owner : id === guardianUserId ? guardianUser : owner),
      ),
      rebindTurnkeyIdentity: jest.fn().mockResolvedValue(owner),
      setProviderReference: jest.fn().mockResolvedValue(undefined),
    };
    notificationService = { notify: jest.fn().mockResolvedValue({}) };
    pimlicoService = {
      getRecoveryHashWithNonce: jest.fn().mockResolvedValue({ hash: recoveryHash, nonce: 0n }),
      isSocialRecoveryGuardian: jest.fn().mockResolvedValue(true),
    };
    relayerService = {
      relayTransaction: jest.fn().mockResolvedValue('0xtxhash'),
    };
    safeService = {
      getRecoveryModuleAddress: jest
        .fn()
        .mockReturnValue('0x4Aa5Bf7D840aC607cb5BD3249e6Af6FC86C04897'),
      buildMultiConfirmRecoveryCallData: jest.fn().mockReturnValue('0xdead'),
      getSafeInfo: jest.fn().mockResolvedValue({ owners: [newOwnerAddress] }),
    };
    turnkeyService = {
      verifySessionToken: jest.fn().mockResolvedValue({
        userId: 'tk-new',
        organizationId: 'org-new',
      }),
      organizationControlsAddress: jest.fn().mockResolvedValue(true),
    };
    authService = {
      openSessionForUser: jest.fn().mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 3600,
      }),
    };

    service = new RecoveryService(
      recoveryRequestRepository as never,
      recoveryApprovalRepository as never,
      guardianRepository as never,
      walletService as never,
      profileService as never,
      notificationService as never,
      pimlicoService as never,
      relayerService as never,
      safeService as never,
      turnkeyService as never,
      authService as never,
    );
  });

  describe('lookupByEmail', () => {
    it('returns masked owner and threshold from wallet.guardianThreshold', async () => {
      await expect(service.lookupByEmail('owner@example.com')).resolves.toMatchObject({
        wallet: { id: walletId },
        owner: { email: 'o***@example.com' },
        guardiansRegistered: 3,
        approvalsNeeded: 2,
        guardiansCanMoveFunds: false,
      });
    });

    it('throws when no active approvers exist', async () => {
      guardianRepository.findActiveApproversForWallet.mockResolvedValue([]);
      await expect(service.lookupByEmail('owner@example.com')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('lookupByAddress', () => {
    it('returns the same shape as email lookup', async () => {
      await expect(
        service.lookupByAddress('0x1A3f00000000000000000000000000000000C4d2'),
      ).resolves.toMatchObject({
        guardiansRegistered: 3,
        approvalsNeeded: 2,
      });
    });
  });

  describe('createRequest', () => {
    const dto: CreateRecoveryRequestDto = {
      walletId,
      newOwnerAddress: '0x7ac800000000000000000000000000000000894e',
      requestedByEmail: 'owner@example.com',
    };

    it('creates approvals with on-chain recovery hash and notifies guardians', async () => {
      const result = await service.createRequest(dto);

      expect(result.requiredApprovals).toBe(2);
      expect(result.guardiansRegistered).toBe(3);
      expect(result.recoveryHash).toBe(recoveryHash);
      expect(result.newOwnerAddress.toLowerCase()).toBe(dto.newOwnerAddress.toLowerCase());
      expect(notificationService.notify).toHaveBeenCalledTimes(3);
      expect(pimlicoService.isSocialRecoveryGuardian).toHaveBeenCalled();
    });

    it('rejects duplicate pending recovery', async () => {
      recoveryRequestRepository.findActiveByWalletId.mockResolvedValue({
        id: 'existing',
        status: RecoveryRequestStatus.PENDING,
      });
      await expect(service.createRequest(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when an approved (not executed) recovery already exists', async () => {
      recoveryRequestRepository.findActiveByWalletId.mockResolvedValue({
        id: 'existing-approved',
        status: RecoveryRequestStatus.APPROVED,
      });
      await expect(service.createRequest(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('defaults requestedByEmail to the wallet owner email when omitted', async () => {
      await service.createRequest({
        walletId,
        newOwnerAddress: dto.newOwnerAddress,
      });

      expect(recoveryRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ requestedByEmail: owner.email }),
      );
    });
  });

  describe('listRequests', () => {
    it('returns requests with per-guardian approval status', async () => {
      recoveryRequestRepository.findByWalletIdWithRelations.mockResolvedValue([
        {
          id: 'rec-1',
          walletId,
          wallet,
          newOwnerAddress: '0x7ac800000000000000000000000000000000894e',
          requiredApprovals: 2,
          status: RecoveryRequestStatus.PENDING,
          recoveryHash,
          recoveryNonce: '0',
          createdAt: new Date(),
          approvals: [
            {
              id: 'apr-1',
              guardianId: 'g-1',
              status: RecoveryApprovalStatus.APPROVED,
              guardian: guardians[0],
              decidedAt: new Date(),
            },
            {
              id: 'apr-2',
              guardianId: 'g-2',
              status: RecoveryApprovalStatus.PENDING,
              guardian: guardians[1],
            },
          ],
        },
      ]);

      const result = await service.listRequests(walletId);

      expect(result).toHaveLength(1);
      expect(result[0].approvalsCount).toBe(1);
      expect(result[0].approvals.map((row) => row.status)).toEqual([
        RecoveryApprovalStatus.APPROVED,
        RecoveryApprovalStatus.PENDING,
      ]);
      expect(result[0].approvals[0].guardianName).toBe('Mark de Vries');
    });
  });

  describe('approve', () => {
    it('requires a signature that recovers to the guardian address and executes on threshold', async () => {
      const signature = await guardianAccount.sign({ hash: recoveryHash });
      const approval = {
        id: 'apr-g-2',
        guardianId: 'g-2',
        status: RecoveryApprovalStatus.PENDING,
        guardian: guardians[1],
        recoveryRequest: {
          id: 'rec-1',
          walletId,
          status: RecoveryRequestStatus.PENDING,
          requiredApprovals: 2,
          newOwnerAddress,
          recoveryHash,
          recoveryNonce: '0',
          expiresAt: new Date(Date.now() + 86_400_000),
          wallet,
          approvals: [
            {
              id: 'apr-g-1',
              status: RecoveryApprovalStatus.APPROVED,
              signature: `0x${'11'.repeat(65)}`,
              guardian: guardians[0],
            },
            { id: 'apr-g-2', status: RecoveryApprovalStatus.PENDING, guardian: guardians[1] },
            { id: 'apr-g-3', status: RecoveryApprovalStatus.PENDING, guardian: guardians[2] },
          ],
        },
      };
      recoveryApprovalRepository.findByIdWithRelations.mockResolvedValue(approval);
      profileService.getById.mockResolvedValue({
        id: 'guardian-user-2',
        email: 'sofie@example.com',
      });

      const result = await service.approve('guardian-user-2', 'apr-g-2', signature);
      expect(result.recoveryStatus).toBe(RecoveryRequestStatus.EXECUTED);
      expect(result.approvalsCount).toBe(2);
      expect(relayerService.relayTransaction).toHaveBeenCalled();
      expect(result.executionTxHash).toBe('0xtxhash');
    });
  });

  describe('decline', () => {
    it('marks request rejected when threshold becomes impossible', async () => {
      const approval = {
        id: 'apr-g-2',
        guardianId: 'g-2',
        status: RecoveryApprovalStatus.PENDING,
        guardian: guardians[1],
        recoveryRequest: {
          id: 'rec-1',
          status: RecoveryRequestStatus.PENDING,
          requiredApprovals: 2,
          expiresAt: new Date(Date.now() + 86_400_000),
          approvals: [
            { id: 'apr-g-1', status: RecoveryApprovalStatus.REJECTED },
            { id: 'apr-g-2', status: RecoveryApprovalStatus.PENDING },
            { id: 'apr-g-3', status: RecoveryApprovalStatus.REJECTED },
          ],
        },
      };
      recoveryApprovalRepository.findByIdWithRelations.mockResolvedValue(approval);
      profileService.getById.mockResolvedValue({
        id: 'guardian-user-2',
        email: 'sofie@example.com',
      });

      const result = await service.decline('guardian-user-2', 'apr-g-2');
      expect(result.recoveryStatus).toBe(RecoveryRequestStatus.REJECTED);
    });
  });

  describe('retryExecute', () => {
    it('relays multiConfirmRecovery for an approved stuck request', async () => {
      const request = {
        id: 'rec-approved',
        walletId,
        wallet,
        status: RecoveryRequestStatus.APPROVED,
        requiredApprovals: 2,
        newOwnerAddress,
        recoveryHash,
        recoveryNonce: '0',
        expiresAt: new Date(Date.now() + 86_400_000),
        approvals: [
          {
            status: RecoveryApprovalStatus.APPROVED,
            signature: `0x${'11'.repeat(65)}`,
            guardian: guardians[0],
          },
          {
            status: RecoveryApprovalStatus.APPROVED,
            signature: `0x${'22'.repeat(65)}`,
            guardian: guardians[1],
          },
        ],
      };
      recoveryRequestRepository.findByIdWithRelations
        .mockResolvedValueOnce(request)
        .mockResolvedValueOnce({
          ...request,
          status: RecoveryRequestStatus.EXECUTED,
          executionTxHash: '0xtxhash',
        });

      const result = await service.retryExecute('rec-approved');
      expect(result.status).toBe(RecoveryRequestStatus.EXECUTED);
      expect(relayerService.relayTransaction).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels a pending request when email matches', async () => {
      recoveryRequestRepository.findByIdWithRelations.mockResolvedValue({
        id: 'rec-1',
        status: RecoveryRequestStatus.PENDING,
        requestedByEmail: 'owner@example.com',
        wallet: { ...wallet, user: owner },
        approvals: [],
      });

      const result = await service.cancel('rec-1', { email: 'owner@example.com' });
      expect(result.status).toBe(RecoveryRequestStatus.CANCELLED);
    });
  });

  describe('claim', () => {
    it('rebinds Turnkey identity and issues app tokens after on-chain execute', async () => {
      recoveryRequestRepository.findByIdWithRelations.mockResolvedValue({
        id: 'rec-1',
        walletId,
        wallet: { ...wallet, ownerAddress: newOwnerAddress, user: owner },
        status: RecoveryRequestStatus.EXECUTED,
        executionTxHash: '0xtxhash',
        newOwnerAddress,
        approvals: [],
      });

      const tokens = await service.claim(
        'rec-1',
        { sessionJwt: 'jwt', deviceName: 'phone', platform: 'ios' },
        { ipAddress: '127.0.0.1' },
      );

      expect(turnkeyService.verifySessionToken).toHaveBeenCalledWith('jwt');
      expect(turnkeyService.organizationControlsAddress).toHaveBeenCalled();
      expect(safeService.getSafeInfo).toHaveBeenCalled();
      expect(profileService.rebindTurnkeyIdentity).toHaveBeenCalledWith(ownerId, 'tk-new');
      expect(authService.openSessionForUser).toHaveBeenCalledWith(
        ownerId,
        { ipAddress: '127.0.0.1' },
        expect.objectContaining({ revokeOthers: true }),
      );
      expect(tokens.accessToken).toBe('a');
    });

    it('rejects claim when recovery is not executed', async () => {
      recoveryRequestRepository.findByIdWithRelations.mockResolvedValue({
        id: 'rec-1',
        status: RecoveryRequestStatus.APPROVED,
        executionTxHash: null,
        newOwnerAddress,
        wallet,
      });

      await expect(service.claim('rec-1', { sessionJwt: 'jwt' }, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
