import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuardianRelationship, GuardianStatus, UserStatus } from '@shared/enums';
import { GuardianService } from './guardian.service';
import { GuardianRepository } from './repositories/guardian.repository';
import { GuardianEntity } from './entities/guardian.entity';
import { InviteGuardianDto } from './dto/invite-guardian.dto';

describe('GuardianService', () => {
  const callerId = 'owner-1';
  const targetId = 'target-1';
  const walletId = 'wallet-1';

  const caller = {
    id: callerId,
    email: 'owner@example.com',
    displayName: 'Owner',
    status: UserStatus.ACTIVE,
  };

  const target = {
    id: targetId,
    email: 'friend@example.com',
    displayName: 'Friend',
    avatar: 'https://cdn.example/a.png',
    status: UserStatus.ACTIVE,
  };

  const wallet = { id: walletId, userId: callerId, ownerAddress: undefined };

  const inviteDto: InviteGuardianDto = {
    userId: targetId,
    relationship: GuardianRelationship.FRIEND,
    canApproveRecovery: true,
    canMoveFunds: false,
    canSeeBalance: false,
    canBeRemoved: true,
  };

  let service: GuardianService;
  let guardianRepository: {
    countOpenForWallet: jest.Mock;
    findOpenByWalletAndEmail: jest.Mock;
    findOpenByWalletAndUserId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOutgoingForWallet: jest.Mock;
    findIncomingForUser: jest.Mock;
    findByIdWithRelations: jest.Mock;
  };
  let profileService: {
    getById: jest.Mock;
    findByEmail: jest.Mock;
  };
  let walletService: {
    getByUserId: jest.Mock;
    findByUserId: jest.Mock;
    findBySmartAccountAddress: jest.Mock;
  };
  let notificationService: { notify: jest.Mock };
  let sendgridService: { sendGuardianInvitation: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    guardianRepository = {
      countOpenForWallet: jest.fn().mockResolvedValue(0),
      findOpenByWalletAndEmail: jest.fn().mockResolvedValue(null),
      findOpenByWalletAndUserId: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Record<string, unknown>) => ({ id: 'g-1', ...data })),
      save: jest.fn((entity: GuardianEntity) => Promise.resolve(entity)),
      findOutgoingForWallet: jest.fn(),
      findIncomingForUser: jest.fn(),
      findByIdWithRelations: jest.fn(),
    };
    profileService = {
      getById: jest.fn((id: string) => Promise.resolve(id === callerId ? caller : target)),
      findByEmail: jest.fn(),
    };
    walletService = {
      getByUserId: jest.fn().mockResolvedValue(wallet),
      findByUserId: jest.fn().mockResolvedValue(null),
      findBySmartAccountAddress: jest.fn().mockResolvedValue(null),
    };
    notificationService = { notify: jest.fn().mockResolvedValue({}) };
    sendgridService = { sendGuardianInvitation: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue({ corsOrigin: 'https://app.example' }) };

    service = new GuardianService(
      guardianRepository as unknown as GuardianRepository,
      profileService as never,
      walletService as never,
      notificationService as never,
      sendgridService as never,
      configService as unknown as ConfigService,
    );
  });

  describe('search', () => {
    it('rejects the caller searching their own email', async () => {
      await expect(service.search(callerId, 'Owner@example.com')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when no active user matches', async () => {
      profileService.findByEmail.mockResolvedValue(null);
      await expect(service.search(callerId, 'missing@example.com')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns a public user card when found', async () => {
      profileService.findByEmail.mockResolvedValue(target);
      await expect(service.search(callerId, 'friend@example.com')).resolves.toEqual({
        id: targetId,
        email: target.email,
        displayName: target.displayName,
        avatar: target.avatar,
      });
    });
  });

  describe('searchBySmartWalletAddress', () => {
    const smartAddress = '0x1234567890123456789012345678901234567890';

    it('rejects the caller searching their own smart wallet address', async () => {
      walletService.findBySmartAccountAddress.mockResolvedValue({
        id: walletId,
        userId: callerId,
        smartAccountAddress: smartAddress,
      });

      await expect(
        service.searchBySmartWalletAddress(callerId, smartAddress),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when no wallet matches', async () => {
      walletService.findBySmartAccountAddress.mockResolvedValue(null);

      await expect(
        service.searchBySmartWalletAddress(callerId, smartAddress),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a public user card when found', async () => {
      walletService.findBySmartAccountAddress.mockResolvedValue({
        id: 'wallet-2',
        userId: targetId,
        smartAccountAddress: smartAddress,
      });

      await expect(service.searchBySmartWalletAddress(callerId, smartAddress)).resolves.toEqual({
        id: targetId,
        email: target.email,
        displayName: target.displayName,
        avatar: target.avatar,
      });
    });
  });

  describe('invite', () => {
    it('rejects inviting yourself by user id', async () => {
      await expect(
        service.invite(callerId, { ...inviteDto, userId: callerId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a fourth open guardian', async () => {
      guardianRepository.countOpenForWallet.mockResolvedValue(3);
      await expect(service.invite(callerId, inviteDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a duplicate pending or active invite', async () => {
      guardianRepository.findOpenByWalletAndEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.invite(callerId, inviteDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates an invited guardian and notifies the invitee', async () => {
      const result = await service.invite(callerId, inviteDto);

      expect(result.status).toBe('pending');
      expect(result.relationship).toBe(GuardianRelationship.FRIEND);
      expect(guardianRepository.save).toHaveBeenCalled();
      expect(notificationService.notify).toHaveBeenCalled();
      expect(sendgridService.sendGuardianInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'friend@example.com',
          invitationUrl: 'https://app.example/guardians/incoming',
        }),
      );
    });
  });

  describe('accept and decline', () => {
    const invited: GuardianEntity = {
      id: 'g-1',
      walletId,
      guardianEmail: target.email,
      guardianName: target.displayName,
      guardianUserId: targetId,
      status: GuardianStatus.INVITED,
      canApproveRecovery: true,
      canMoveFunds: false,
      canSeeBalance: false,
      canBeRemoved: true,
      invitationToken: 'token',
      invitedAt: new Date(),
      wallet: { id: walletId, userId: callerId, user: caller } as GuardianEntity['wallet'],
    } as GuardianEntity;

    it('rejects accept when the caller is not the invitee', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue(invited);
      await expect(service.accept(callerId, 'g-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts a pending invitation for the invitee', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({ ...invited });
      walletService.findByUserId.mockResolvedValue({ ownerAddress: '0xabc' });

      const result = await service.accept(targetId, 'g-1');
      expect(result.status).toBe('approved');
      expect(guardianRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: GuardianStatus.ACTIVE,
          guardianAddress: '0xabc',
        }),
      );
    });

    it('declines a pending invitation', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({ ...invited });
      const result = await service.decline(targetId, 'g-1');
      expect(result.status).toBe('rejected');
      expect(guardianRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GuardianStatus.REJECTED }),
      );
    });

    it('conflicts when the invitation is no longer pending', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({
        ...invited,
        status: GuardianStatus.ACTIVE,
      });
      await expect(service.decline(targetId, 'g-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('forbids removing an active guardian when canBeRemoved is false', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({
        id: 'g-1',
        walletId,
        status: GuardianStatus.ACTIVE,
        canBeRemoved: false,
      });

      await expect(service.remove(callerId, 'g-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('removes a pending invitation owned by the caller', async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({
        id: 'g-1',
        walletId,
        status: GuardianStatus.INVITED,
        canBeRemoved: true,
        guardianEmail: target.email,
      });

      const result = await service.remove(callerId, 'g-1');
      expect(result.status).toBe('rejected');
      expect(guardianRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GuardianStatus.REMOVED }),
      );
    });

    it("hides another user's guardian from delete", async () => {
      guardianRepository.findByIdWithRelations.mockResolvedValue({
        id: 'g-1',
        walletId: 'other-wallet',
        status: GuardianStatus.INVITED,
      });

      await expect(service.remove(callerId, 'g-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listOutgoing and listIncoming', () => {
    const now = new Date();
    const older = new Date(now.getTime() - 60_000);

    const mixed = [
      {
        id: 'g-rejected',
        status: GuardianStatus.REJECTED,
        createdAt: now,
        invitedAt: now,
        canApproveRecovery: true,
        canMoveFunds: false,
        canSeeBalance: false,
        canBeRemoved: true,
        guardianEmail: target.email,
        guardianUser: target,
      },
      {
        id: 'g-pending',
        status: GuardianStatus.INVITED,
        createdAt: older,
        invitedAt: older,
        canApproveRecovery: true,
        canMoveFunds: false,
        canSeeBalance: false,
        canBeRemoved: true,
        guardianEmail: target.email,
        guardianUser: target,
      },
      {
        id: 'g-active',
        status: GuardianStatus.ACTIVE,
        createdAt: now,
        invitedAt: older,
        canApproveRecovery: true,
        canMoveFunds: false,
        canSeeBalance: false,
        canBeRemoved: true,
        guardianEmail: target.email,
        guardianUser: target,
      },
    ];

    it('lists outgoing without a status filter', async () => {
      guardianRepository.findOutgoingForWallet.mockResolvedValue(mixed);

      const result = await service.listOutgoing(callerId);

      expect(guardianRepository.findOutgoingForWallet).toHaveBeenCalledWith(walletId);
      expect(guardianRepository.findOutgoingForWallet).toHaveBeenCalledTimes(1);
      expect(result.map((row) => row.id)).toEqual(['g-rejected', 'g-pending', 'g-active']);
      expect(result.map((row) => row.status)).toEqual(['rejected', 'pending', 'approved']);
    });

    it('lists incoming for all statuses (pending, approved, rejected)', async () => {
      guardianRepository.findIncomingForUser.mockResolvedValue(mixed);

      const result = await service.listIncoming(targetId);

      expect(guardianRepository.findIncomingForUser).toHaveBeenCalledWith(targetId, target.email);
      expect(result).toHaveLength(3);
      expect(result.map((row) => row.status).sort()).toEqual(['approved', 'pending', 'rejected']);
    });
  });
});
