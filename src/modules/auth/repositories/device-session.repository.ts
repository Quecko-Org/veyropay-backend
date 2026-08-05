import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { DeviceSessionStatus } from '@shared/enums';
import { DeviceSessionEntity } from '../entities/device-session.entity';

@Injectable()
export class DeviceSessionRepository extends BaseRepository<DeviceSessionEntity> {
  constructor(@InjectRepository(DeviceSessionEntity) repository: Repository<DeviceSessionEntity>) {
    super(repository);
  }

  findActiveById(id: string): Promise<DeviceSessionEntity | null> {
    return this.repository.findOne({ where: { id, status: DeviceSessionStatus.ACTIVE } });
  }

  findAllForUser(userId: string): Promise<DeviceSessionEntity[]> {
    return this.repository.find({ where: { userId }, order: { lastSeen: 'DESC' } });
  }

  async revoke(id: string): Promise<void> {
    await this.repository.update({ id }, { status: DeviceSessionStatus.REVOKED });
  }
}
