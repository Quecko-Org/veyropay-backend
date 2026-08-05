import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationEntity> {
  constructor(@InjectRepository(NotificationEntity) repository: Repository<NotificationEntity>) {
    super(repository);
  }

  findAndCountForUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[NotificationEntity[], number]> {
    return this.repository.findAndCount({
      where: { userId },
      order: { sentAt: 'DESC' },
      skip,
      take,
    });
  }
}
