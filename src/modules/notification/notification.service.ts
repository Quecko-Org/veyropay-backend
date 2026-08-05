import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import { NotificationType } from '@shared/enums';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      body,
      sentAt: new Date(),
    });

    return this.notificationRepository.save(notification);
  }

  async listForUser(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<NotificationEntity>> {
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.notificationRepository.findAndCountForUser(
      userId,
      skip,
      take,
    );

    return new PaginatedResultDto(
      items,
      total,
      query.page ?? DEFAULT_PAGE,
      query.limit ?? DEFAULT_PAGE_SIZE,
    );
  }

  async markAsRead(userId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    return this.notificationRepository.save(notification);
  }
}
