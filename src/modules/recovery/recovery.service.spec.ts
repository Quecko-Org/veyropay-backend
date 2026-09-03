import { ConflictException, NotFoundException } from '@nestjs/common';
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
    displayName: 'Alex',
    status: UserStatus.ACTIVE,
  };

  const guardianUser = {
    id: guardianUserId,
    email: 'mark@example.com',
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

  const guardians = [
    {
      id: 'g-1',
      walletId,
      guardianUserId,
      guardianEmail: 'mark@example.com',
      guardianName: 'Mark de Vries',
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
      status: GuardianStatus.ACTIVE,
      canApproveRecovery: true,
      canMoveFunds: false,
    },
  ];

  let service: RecoveryService;
  let recoveryRequestRepository: {
    findPendingByWalletId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findByIdWithRelations: jest.Mock;
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
  };
  let profileService: { findByEmail: jest.Mock; getById: jest.Mock };
  let notificationService: { notify: jest.Mock };

  beforeEach(() => {
    recoveryRequestRepository = {
      findPendingByWalletId: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Record<string, unknown>) => ({ id: 'rec-1', ...data })),
      save: jest.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
      findByIdWithRelations: jest.fn(),
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
    };
    profileService = {
      findByEmail: jest.fn().mockResolvedValue(owner),
      getById: jest.fn((id: string) =>
        Promise.resolve(id === ownerId ? owner : id === guardianUserId ? guardianUser : owner),
      ),
    };
    notificationService = { notify: jest.fn().mockResolvedValue({}) };

    service = new RecoveryService(
      recoveryRequestRepository as never,
      recoveryApprovalRepository as never,
      guardianRepository as never,
      walletService as never,
      profileService as never,
      notificationService as never,
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

    it('creates approvals and notifies guardians via in-app notification', async () => {
      const result = await service.createRequest(dto);

      expect(result.requiredApprovals).toBe(2);
      expect(result.guardiansRegistered).toBe(3);
      expect(result.newOwnerAddress.toLowerCase()).toBe(dto.newOwnerAddress.toLowerCase());
      expect(notificationService.notify).toHaveBeenCalledTimes(3);
    });

    it('rejects duplicate pending recovery', async () => {
      recoveryRequestRepository.findPendingByWalletId.mockResolvedValue({ id: 'existing' });
      await expect(service.createRequest(dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('approve', () => {
    it('marks request approved when threshold is met', async () => {
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
            { id: 'apr-g-1', status: RecoveryApprovalStatus.APPROVED },
            { id: 'apr-g-2', status: RecoveryApprovalStatus.PENDING },
            { id: 'apr-g-3', status: RecoveryApprovalStatus.PENDING },
          ],
        },
      };
      recoveryApprovalRepository.findByIdWithRelations.mockResolvedValue(approval);
      profileService.getById.mockResolvedValue({
        id: 'guardian-user-2',
        email: 'sofie@example.com',
      });

      const result = await service.approve('guardian-user-2', 'apr-g-2');
      expect(result.recoveryStatus).toBe(RecoveryRequestStatus.APPROVED);
      expect(result.approvalsCount).toBe(2);
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
});
