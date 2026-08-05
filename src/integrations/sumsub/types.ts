export interface ISumsubApplicant {
  id: string;
  externalUserId: string;
}

export interface ISumsubAccessToken {
  token: string;
  userId: string;
}

export type SumsubReviewAnswer = 'GREEN' | 'RED';

export interface ISumsubApplicantStatus {
  applicantId: string;
  reviewStatus: string;
  reviewResult?: {
    reviewAnswer: SumsubReviewAnswer;
  };
}
