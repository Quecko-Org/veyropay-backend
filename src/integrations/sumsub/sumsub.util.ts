import { KycStatus } from '@shared/enums';
import { SumsubReviewAnswer } from './types';

// Shared between the Sumsub webhook handler (WebhooksService) and KycService's
// fallback reconciliation poll - both need to turn Sumsub's GREEN/RED review answer
// into our own KycStatus the same way.
export function mapSumsubReviewAnswer(answer: SumsubReviewAnswer | undefined): KycStatus | null {
  if (answer === 'GREEN') return KycStatus.APPROVED;
  if (answer === 'RED') return KycStatus.REJECTED;
  return null;
}