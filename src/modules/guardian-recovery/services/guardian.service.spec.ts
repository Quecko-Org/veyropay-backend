import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GuardianStatus } from '@shared/enums';
import { GuardianService } from './guardian.service';
import { GuardianEntity } from '../entities/guardian.entity';
import { MAX_GUARDIANS_PER_WALLET } from '../constants/guardian-recovery.constant';

describe('GuardianService', () => {
  let service: GuardianService;
  let guardianRepository: {
    findActiveOrInvitedByEmail: jest.Mock;
    countActiveByWalletId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findByWalletId: jest.Mock;
    findActiveByWalletId: jest.Mock;
    findById: jest.Mock;
    findByInvitationToken: jest.Mock;
  };
  let walletService: {
    getByUserId: jest.Mock;
    getById: jest.Mock;
    setGuardianThreshold: jest.Mock;
  };
  let profileService: { findByEmail: jest.Mock; getById: jest.Mock };
  let notificationService: { notify: jest.Mock };
  let systemService: { recordAudit: jest.Mock };
  let safeService: {
    buildEnableRecoveryModuleTransaction: jest.Mock;
    buildAddGuardianCallData: jest.Mock;
    getRecoveryModuleAddress: jest.Mock;
  };
  let pimlicoService: { isContractDeployed: jest.Mock };
  let sendgridService: { sendGuardianInvitation: jest.Mock };

  const wallet = { id: 'wallet-1', userId: 'user-1' };
  const owner = { id: 'user-1', email: 'owner@example.com' };

  beforeEach(() => {
    guardianRepository = {
      findActiveOrInvitedByEmail: jest.fn(),
      countActiveByWalletId: jest.fn(),
      create: jest.fn((data) => data as GuardianEntity),
      save: jest.fn((entity) => Promise.resolve({ id: 'guardian-1', ...entity })),
      findByWalletId: jest.fn(),
      findActiveByWalletId: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByInvitationToken: jest.fn(),
    };
    walletService = {
      getByUserId: jest.fn().mockResolvedValue(wallet),
      getById: jest.fn().mockResolvedValue(wallet),
      setGuardianThreshold: jest.fn().mockResolvedValue(wallet),
    };
    profileService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      getById: jest.fn().mockResolvedValue(owner),
    };
    notificationService = { notify: jest.fn() };
    systemService = { recordAudit: jest.fn() };
    safeService = {
      buildEnableRecoveryModuleTransaction: jest
        .fn()
        .mockResolvedValue({ to: '0xsafe', value: 0n, data: '0xenable' }),
      buildAddGuardianCallData: jest.fn().mockReturnValue('0xaddguardian'),
      getRecoveryModuleAddress: jest.fn().mockReturnValue('0xmodule'),
    };
    pimlicoService = { isContractDeployed: jest.fn().mockResolvedValue(true) };
    sendgridService = { sendGuardianInvitation: jest.fn().mockResolvedValue(undefined) };

    service = new GuardianService(
      guardianRepository as never,
      walletService as never,
      profileService as never,
      notificationService as never,
      systemService as never,
      safeService as never,
      pimlicoService as never,
      sendgridService as never,
    );
  });

  describe('addGuardian', () => {
    it('creates an invited guardian and records an audit entry', async () => {
      guardianRepository.findActiveOrInvitedByEmail.mockResolvedValue(null);
      guardianRepository.countActiveByWalletId.mockResolvedValue(0);

      const result = await service.addGuardian('user-1', {
        guardianEmail: 'guardian@example.com',
        guardianName: 'Alice',
      });

      expect(result.status).toBe(GuardianStatus.INVITED);
      expect(result.invitationToken).toHaveLength(64);
      expect(systemService.recordAudit).toHaveBeenCalledWith(
        'guardian.invited',
        'user-1',
        expect.objectContaining({ guardianEmail: 'guardian@example.com' }),
      );
    });

    it('rejects a duplicate invite for the same email', async () => {
      guardianRepository.findActiveOrInvitedByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addGuardian('user-1', { guardianEmail: 'guardian@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects once the wallet has reached the max guardian count', async () => {
      guardianRepository.findActiveOrInvitedByEmail.mockResolvedValue(null);
      guardianRepository.countActiveByWalletId.mockResolvedValue(MAX_GUARDIANS_PER_WALLET);

      await expect(
        service.addGuardian('user-1', { guardianEmail: 'guardian@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('notifies the guardian in-app when they are already a platform user', async () => {
      guardianRepository.findActiveOrInvitedByEmail.mockResolvedValue(null);
      guardianRepository.countActiveByWalletId.mockResolvedValue(0);
      profileService.findByEmail.mockResolvedValue({ id: 'guardian-user-1' });

      await service.addGuardian('user-1', { guardianEmail: 'guardian@example.com' });

      expect(notificationService.notify).toHaveBeenCalledWith(
        'guardian-user-1',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('removeGuardian', () => {
    it('throws NotFoundException when the guardian belongs to a different wallet', async () => {
      guardianRepository.findById.mockResolvedValue({ id: 'g1', walletId: 'other-wallet' });

      await expect(service.removeGuardian('user-1', 'g1')).rejects.toThrow(NotFoundException);
    });

    it('marks the guardian removed', async () => {
      guardianRepository.findById.mockResolvedValue({
        id: 'g1',
        walletId: wallet.id,
        status: GuardianStatus.ACTIVE,
      });

      await service.removeGuardian('user-1', 'g1');

      expect(guardianRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GuardianStatus.REMOVED }),
      );
    });
  });

  describe('getRecoveryModuleSetupCalldata', () => {
    const provisionedWallet = { ...wallet, smartAccountAddress: '0xsafe' };

    it('rejects when the smart account has not been provisioned yet', async () => {
      await expect(service.getRecoveryModuleSetupCalldata('user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects when the Safe has not been deployed on-chain yet', async () => {
      walletService.getByUserId.mockResolvedValue(provisionedWallet);
      pimlicoService.isContractDeployed.mockResolvedValue(false);

      await expect(service.getRecoveryModuleSetupCalldata('user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('returns an enable-module step built via Protocol Kit plus one step per guardian with an address', async () => {
      walletService.getByUserId.mockResolvedValue(provisionedWallet);
      guardianRepository.findActiveByWalletId.mockResolvedValue([
        { guardianEmail: 'g1@example.com', guardianAddress: '0xguardian1' },
        { guardianEmail: 'g2@example.com', guardianAddress: null },
      ]);

      const result = await service.getRecoveryModuleSetupCalldata('user-1');

      expect(safeService.buildEnableRecoveryModuleTransaction).toHaveBeenCalledWith('0xsafe');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]).toMatchObject({ to: '0xsafe', data: '0xenable' });
    });
  });

  describe('acceptInvitation', () => {
    it('activates an invited guardian', async () => {
      guardianRepository.findByInvitationToken.mockResolvedValue({
        id: 'g1',
        walletId: wallet.id,
        status: GuardianStatus.INVITED,
      });

      const result = await service.acceptInvitation('token-1');

      expect(result.status).toBe(GuardianStatus.ACTIVE);
    });

    it('throws NotFoundException for an unknown token', async () => {
      guardianRepository.findByInvitationToken.mockResolvedValue(null);

      await expect(service.acceptInvitation('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if the invitation was already accepted', async () => {
      guardianRepository.findByInvitationToken.mockResolvedValue({
        id: 'g1',
        walletId: wallet.id,
        status: GuardianStatus.ACTIVE,
      });

      await expect(service.acceptInvitation('token-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
