import { Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, NotificationType } from '@shared/enums';
import { SumsubService } from '@integrations/sumsub/sumsub.service';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { KycVerificationRepository } from './repositories/kyc-verification.repository';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycSessionDto } from './dto/kyc-session.dto';

@Injectable()
export class KycService {
  constructor(
    private readonly kycRepository: KycVerificationRepository,
    private readonly sumsubService: SumsubService,
    private readonly notificationService: NotificationService,
    private readonly systemService: SystemService,
  ) {}

  async initiate(userId: string): Promise<KycSessionDto> {
    let kyc = await this.kycRepository.findByUserId(userId);

    if (!kyc) {
      kyc = this.kycRepository.create({ userId, provider: 'sumsub' });
      kyc = await this.kycRepository.save(kyc);
    }

    let applicantId = kyc.applicantId;

    if (!applicantId) {
      const applicant = await this.sumsubService.createApplicant(userId);
      applicantId = applicant.id;
      kyc.applicantId = applicantId;
      kyc.verificationStatus = KycStatus.PENDING;
      await this.kycRepository.save(kyc);
    }

    const accessToken = await this.sumsubService.generateAccessToken(userId);

    return new KycSessionDto({ applicantId, accessToken: accessToken.token });
  }

  async getStatus(userId: string): Promise<KycVerificationEntity> {
    const kyc = await this.kycRepository.findByUserId(userId);
    if (!kyc) {
      throw new NotFoundException('KYC verification has not been started');
    }

    return kyc;
  }

  async isApproved(userId: string): Promise<boolean> {
    const kyc = await this.kycRepository.findByUserId(userId);
    return kyc?.verificationStatus === KycStatus.APPROVED;
  }

  // Invoked by the Sumsub webhook handler when a review decision comes in.
  async handleStatusUpdate(applicantId: string, status: KycStatus): Promise<void> {
    const kyc = await this.kycRepository.findByApplicantId(applicantId);
    if (!kyc) {
      return;
    }

    kyc.verificationStatus = status;
    if (status === KycStatus.APPROVED || status === KycStatus.REJECTED) {
      kyc.completedAt = new Date();
    }

    await this.kycRepository.save(kyc);

    if (status === KycStatus.APPROVED) {
      await this.notificationService.notify(
        kyc.userId,
        NotificationType.KYC,
        'Identity verified',
        'Your identity verification was approved. You can now order a card.',
      );
      await this.systemService.recordAudit('kyc_approved', kyc.userId, { applicantId });
    } else if (status === KycStatus.REJECTED) {
      await this.notificationService.notify(
        kyc.userId,
        NotificationType.KYC,
        'Identity verification failed',
        'Your identity verification was not approved. Please try again.',
      );
    }
  }
}
