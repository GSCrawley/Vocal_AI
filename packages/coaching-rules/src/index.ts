import type { SuccessBand } from '@voice/shared-types';

export interface CoachingPayload {
  praiseMessage: string;
  correctionMessage: string;
  actionTip: string;
  successBand: SuccessBand;
}

export function mapScoreToCoaching(score: number): CoachingPayload {
  if (score >= 85) {
    return {
      praiseMessage: 'Great control.',
      correctionMessage: 'Keep the tone steady through the full hold.',
      actionTip: 'Repeat once and match that consistency again.',
      successBand: 'excellent'
    };
  }

  if (score >= 70) {
    return {
      praiseMessage: 'Nice work.',
      correctionMessage: 'You drifted a little near the end.',
      actionTip: 'Focus on steady airflow through the whole note.',
      successBand: 'good'
    };
  }

  if (score >= 50) {
    return {
      praiseMessage: 'Good effort.',
      correctionMessage: 'The note moved sharp and flat during the hold.',
      actionTip: 'Try again with a lighter, steadier delivery.',
      successBand: 'developing'
    };
  }

  return {
    praiseMessage: 'You got through the rep.',
    correctionMessage: 'The signal was unstable or far from the target note.',
    actionTip: 'Retry after taking a breath and matching the reference tone first.',
    successBand: 'retry'
  };
}
