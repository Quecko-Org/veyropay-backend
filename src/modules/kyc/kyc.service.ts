import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KycStatus, NotificationType } from '@shared/enums';
import { SumsubService } from '@integrations/sumsub/sumsub.service';
import { mapSumsubReviewAnswer } from '@integrations/sumsub/sumsub.util';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { KycVerificationRepository } from './repositories/kyc-verification.repository';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycSessionDto } from './dto/kyc-session.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

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
    const kyc = await this.getReconciledStatus(userId);
    if (!kyc) {
      throw new NotFoundException('KYC verification has not been started');
    }

    return kyc;
  }

  // Also routes through reconciliation - this gates real functionality (card
  // ordering), so it can't be allowed to stay stuck on a stale PENDING just because
  // nothing has called getStatus() (and its self-heal) since the webhook was missed.
  async isApproved(userId: string): Promise<boolean> {
    const kyc = await this.getReconciledStatus(userId);
    return kyc?.verificationStatus === KycStatus.APPROVED;
  }

  // Webhook delivery isn't guaranteed - self-heal a missed or misconfigured webhook by
  // checking Sumsub's own status API directly whenever a status read still finds us
  // PENDING, rather than requiring a separate reconciliation job. Shared by both
  // getStatus() and isApproved() so neither can return a stale PENDING/false result
  // that a webhook should have already cleared.
  private async getReconciledStatus(userId: string): Promise<KycVerificationEntity | null> {
    const kyc = await this.kycRepository.findByUserId(userId);
    if (!kyc) {
      return null;
    }

    if (kyc.verificationStatus === KycStatus.PENDING && kyc.applicantId) {
      return this.reconcileWithSumsub(kyc);
    }

    return kyc;
  }

  // Best-effort: if Sumsub is unreachable, just return the (possibly stale) local row
  // rather than failing the whole status check.
  private async reconcileWithSumsub(kyc: KycVerificationEntity): Promise<KycVerificationEntity> {
    try {
      const applicantStatus = await this.sumsubService.getApplicantStatus(
        kyc.applicantId as string,
      );
      const status = mapSumsubReviewAnswer(applicantStatus.reviewResult?.reviewAnswer);
      if (!status) {
        return kyc;
      }

      await this.handleStatusUpdate(kyc.applicantId as string, status);
      return (await this.kycRepository.findByUserId(kyc.userId)) ?? kyc;
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub status reconciliation failed');
      return kyc;
    }
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