import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { ProviderReferenceRepository } from './repositories/provider-reference.repository';
import { UserEntity } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserStatus } from '@shared/enums';

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly providerReferenceRepository: ProviderReferenceRepository,
  ) {}

  async findOrCreateByTurnkeyUserId(turnkeyUserId: string, email?: string): Promise<UserEntity> {
    const existing = await this.userRepository.findByTurnkeyUserId(turnkeyUserId);
    if (existing) {
      return existing;
    }

    const user = this.userRepository.create({
      turnkeyUserId,
      email,
      status: UserStatus.ACTIVE,
    });

    return this.userRepository.save(user);
  }

  async getById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  // Nullable (not throwing) - callers that use this for recovery/guardian lookups need
  // to handle "no such user" without leaking that fact to an unauthenticated caller.
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async update(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.getById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async setProviderReference(userId: string, provider: string, referenceId: string): Promise<void> {
    const existing = await this.providerReferenceRepository.findByUserAndProvider(userId, provider);

    if (existing) {
      existing.referenceId = referenceId;
      await this.providerReferenceRepository.save(existing);
      return;
    }

    const reference = this.providerReferenceRepository.create({ userId, provider, referenceId });
    await this.providerReferenceRepository.save(reference);
  }

  async getProviderReference(userId: string, provider: string): Promise<string | null> {
    const reference = await this.providerReferenceRepository.findByUserAndProvider(
      userId,
      provider,
    );
    return reference?.referenceId ?? null;
  }
}
