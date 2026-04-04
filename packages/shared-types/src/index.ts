export type Goal =
  | 'pitch'
  | 'range'
  | 'breath_control'
  | 'tone'
  | 'confidence'
  | 'agility'
  | 'ear_training'
  | 'stability';

export type SuccessBand = 'excellent' | 'good' | 'developing' | 'retry';

export interface ExerciseMetricResult {
  metricType: string;
  rawValue?: number;
  normalizedValue?: number;
  confidenceScore?: number;
  metadata?: Record<string, unknown>;
}
