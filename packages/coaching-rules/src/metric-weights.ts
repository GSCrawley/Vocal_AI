import type { SingingGoal, SingingMetricKey } from '@voice/shared-types';

// Weight multipliers: higher = this metric gets priority for coaching focus
// when the user has selected the corresponding goal.
// Weights do NOT affect the scoring formulas themselves.
export const GOAL_METRIC_WEIGHTS: Record<
  SingingGoal,
  Partial<Record<SingingMetricKey | 'primary' | 'secondary', number | string>>
> = {
  pitch: {
    pitchAccuracy: 2.0,
    stability: 1.5,
    musicality: 1.0,
  },
  stability: {
    stability: 2.0,
    pitchAccuracy: 1.5,
    breathControl: 1.0,
  },
  range: {
    pitchAccuracy: 1.5,
    breathControl: 1.5,
    stability: 1.0,
  },
  breath_control: {
    breathControl: 2.0,
    stability: 1.0,
    dynamics: 1.0,
  },
  tone: {
    toneQuality: 2.0,
    breathControl: 1.5,
    stability: 1.0,
  },
  agility: {
    pitchAccuracy: 1.5,
    musicality: 2.0,
    stability: 1.0,
  },
  ear_training: {
    pitchAccuracy: 2.0,
    musicality: 1.5,
  },
  dynamics: {
    dynamics: 2.0,
    breathControl: 1.5,
    stability: 1.0,
  },
  // 'vibrato' goal uses proxy metrics (toneQuality, stability) because the Python
  // audio processor does not yet emit a direct vibrato metric key. When Task 22
  // (vibrato detection) is implemented and a 'vibrato' SingingMetricKey is added
  // to SingingMetricKey, update this mapping to use it directly. [R-11]
  vibrato: {
    primary: 'toneQuality',
    secondary: 'stability',
    stability: 1.5,
    toneQuality: 2.0,
    breathControl: 1.0,
  },
};

export const DEFAULT_METRIC_WEIGHT = 1.0;
