import type {
  CoachingQualityFlag,
  SingingMetricsResult,
  CoachingPayload,
  SuccessBand,
} from '@voice/shared-types';
import { MIC_CHECK_FAIL_DIALOGUE, STRAIN_WARNING_DIALOGUE } from '@voice/avatar-state';

export interface SafetyOverrideResult {
  triggered: true;
  type: 'mic_check' | 'strain_warning' | 'grindcore_gate' | 'extreme_style_threshold';
  coachingPayload: CoachingPayload;
  routeTo: 'mic_check_modal' | 'vocal_safety_modal' | 'exercise_result';
}

export type SafetyCheckResult = SafetyOverrideResult | { triggered: false };

/**
 * High-strain proxy per agents.md §18 and knowledge-graph §12.8:
 * (meanRmsDb > -10 dBFS) AND (frequencyHz > 880 Hz) AND (stability < 40)
 * for ≥ 3 consecutive seconds.
 *
 * The audio processor computes this and returns it in the metrics payload.
 * This function interprets the result; it does not recompute it.
 */
export function checkSafetyOverrides(
  result: Omit<SingingMetricsResult, 'qualityFlag'> & { qualityFlag: CoachingQualityFlag },
  _stylePack?: string,
  strainRiskFlagged?: boolean
): SafetyCheckResult {
  // 1. Unusable audio → mic check
  if (result.qualityFlag === 'unusable') {
    return {
      triggered: true,
      type: 'mic_check',
      coachingPayload: {
        praiseMessage: 'Something went wrong with the audio signal.',
        correctionMessage: MIC_CHECK_FAIL_DIALOGUE[0].text,
        actionTip: MIC_CHECK_FAIL_DIALOGUE[1].text,
        successBand: 'retry' as SuccessBand,
      },
      routeTo: 'mic_check_modal',
    };
  }

  // 2. Strain-risk proxy → vocal safety modal
  if (strainRiskFlagged === true) {
    return {
      triggered: true,
      type: 'strain_warning',
      coachingPayload: {
        praiseMessage: 'You pushed hard that rep.',
        correctionMessage: STRAIN_WARNING_DIALOGUE.text,
        actionTip: 'Take a vocal rest before trying again.',
        successBand: 'retry' as SuccessBand,
      },
      routeTo: 'vocal_safety_modal',
    };
  }

  return { triggered: false };
}
