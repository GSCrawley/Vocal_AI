export interface LivePitchFrame {
  timestampMs: number;
  frequencyHz?: number;
  centsFromTarget?: number;
  voiced: boolean;
  confidence: number;
}

export interface ExerciseScoreBreakdown {
  pitchAccuracy: number;
  stability: number;
  completion: number;
  overall: number;
}
