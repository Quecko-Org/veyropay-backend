import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { InitEmailRecoveryDto } from './dto/init-email-recovery.dto';
import { CompleteEmailRecoveryDto } from './dto/complete-email-recovery.dto';

describe('AuthService email recovery', () => {
  const email = 'owner@example.com';
  const userId = 'user-1';
  const organizationId = '318b0225-12cc-4895-99e4-d2faccbb48f0';
  const turnkeyUserId = 'c1769e5d-cfc1-4aaa-973e-b195acfff816';

  let service: AuthService;
  let turnkeyService: {
    initEmailRecovery: jest.Mock;
    completeRecovery: jest.Mock;
  };
  let profileService: {
    findByEmail: jest.Mock;
    getProviderReference: jest.Mock;
    findByTurnkeyUserId: jest.Mock;
  };
  let systemService: { recordAudit: jest.Mock };
  let deviceSessionRepository: {
    findAllForUser: jest.Mock;
    revoke: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    turnkeyService = {
      initEmailRecovery: jest.fn().mockResolvedValue({ userId: turnkeyUserId }),
      completeRecovery: jest.fn().mockResolvedValue({ userId: turnkeyUserId }),
    };
    profileService = {
      findByEmail: jest.fn().mockResolvedValue({ id: userId, email }),
      getProviderReference: jest.fn().mockResolvedValue(organizationId),
      findByTurnkeyUserId: jest.fn().mockResolvedValue({ id: userId, turnkeyUserId }),
    };
    systemService = { recordAudit: jest.fn().mockResolvedValue({}) };
    deviceSessionRepository = {
      findAllForUser: jest.fn().mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn().mockReturnValue({ name: 'veyropay' }),
    };

    service = new AuthService(
      turnkeyService as never,
      profileService as never,
      {} as never,
      {} as never,
      systemService as never,
      deviceSessionRepository as never,
      {} as never,
      configService as unknown as ConfigService,
    );
  });

  describe('initEmailRecovery', () => {
    const dto: InitEmailRecoveryDto = {
      email,
      targetPublicKey: '02aabb',
    };

    it('throws when no user matches the email', async () => {
      profileService.findByEmail.mockResolvedValue(null);
      await expect(service.initEmailRecovery(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when Turnkey organization is not linked', async () => {
      profileService.getProviderReference.mockResolvedValue(null);
      await expect(service.initEmailRecovery(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('starts Turnkey email recovery and returns ids for complete', async () => {
      const result = await service.initEmailRecovery(dto);

      expect(turnkeyService.initEmailRecovery).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          email,
          targetPublicKey: dto.targetPublicKey,
          emailCustomization: { appName: 'veyropay' },
        }),
      );
      expect(result).toEqual({ userId: turnkeyUserId, organizationId });
      expect(systemService.recordAudit).toHaveBeenCalledWith(
        'email_recovery_init',
        userId,
        expect.objectContaining({ email }),
      );
    });
  });

  describe('completeEmailRecovery', () => {
    const dto: CompleteEmailRecoveryDto = {
      organizationId,
      userId: turnkeyUserId,
      timestampMs: '1788853804000',
      authenticator: {
        authenticatorName: 'Recovery Passkey',
        challenge: 'challenge',
        attestation: { id: 'att' },
      },
      stamp: 'stamp-value',
    };

    it('relays recover_user and revokes existing sessions', async () => {
      const result = await service.completeEmailRecovery(dto);

      expect(turnkeyService.completeRecovery).toHaveBeenCalledWith({
        organizationId,
        userId: turnkeyUserId,
        timestampMs: dto.timestampMs,
        authenticator: dto.authenticator,
        stamp: dto.stamp,
      });
      expect(deviceSessionRepository.revoke).toHaveBeenCalledTimes(2);
      expect(result.userId).toBe(turnkeyUserId);
      expect(result.message).toContain('stampLogin');
    });
  });
});
