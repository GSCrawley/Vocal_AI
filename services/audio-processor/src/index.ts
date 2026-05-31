/**
 * VOICE — Audio Processor Service
 *
 * Python (FastAPI) service for server-side audio analysis.
 * This TypeScript file serves as the contract/interface definition
 * for jobs dispatched from the Node.js API service.
 *
 * The actual implementation is in Python. See services/audio-processor/README.md
 * for the Python setup, Demucs configuration, and job queue setup.
 */

// ------------------------------------------------------------
// JOB TYPES dispatched to the audio processor
// ------------------------------------------------------------

export type AudioProcessorJobType =
  | 'vocal_separation'   // Demucs: split song into vocal + instrumental stems
  | 'vocal_analysis'     // pYIN on vocal stem: extract pitch curve + phrase data
  | 'filler_detection'   // Whisper: detect filler words in speaking recording
  | 'karaoke_compare'    // DTW comparison of user attempt vs reference vocal
  | 'singing_metrics'    // Full 11-metric analysis
  | 'baseline_assessment'; // Onboarding vocal profile

export interface VocalSeparationJob {
  jobType: 'vocal_separation';
  jobId: string;
  songId: string;
  audioFileUrl: string;  // Supabase Storage URL
  requestedAt: string;
}

export interface VocalAnalysisJob {
  jobType: 'vocal_analysis';
  jobId: string;
  songId: string;
  vocalStemUrl: string;  // Output from VocalSeparationJob
  requestedAt: string;
}

export interface FillerDetectionJob {
  jobType: 'filler_detection';
  jobId: string;
  attemptId: string;
  audioFileUrl: string;
  userId: string;
  requestedAt: string;
}

export interface KaraokeCompareJob {
  jobType: 'karaoke_compare';
  jobId: string;
  snippetId: string;
  attemptId: string;
  userAudioUrl: string;
  referenceVocalAnalysisId: string;
  requestedAt: string;
}


export interface SingingMetricsJob {
  jobType: 'singing_metrics';
  jobId: string;
  attemptId: string;
  userId: string;
  audioFileUrl: string; // User's singing attempt audio
  targetHz?: number; // Expected pitch (for exercise attempts)
  toleranceCents?: number; // Default 25
  exerciseCategory: string; // From ExerciseCategory
  useCrepe?: boolean; // Default false
  storeAudio?: boolean; // Requires user opt-in
}

export interface BaselineAssessmentJob {
  jobType: 'baseline_assessment';
  jobId: string;
  userId: string;
  rangeTestAudioUrl: string; // Scale walk from C2–C6
  sustainedHoldAudioUrl: string; // Single comfortable note, 8 seconds
  freeVocalAudioUrl: string; // 30 seconds of free singing
}

export type AudioProcessorJob =
  | VocalSeparationJob
  | VocalAnalysisJob
  | FillerDetectionJob
  | KaraokeCompareJob
  | SingingMetricsJob
  | BaselineAssessmentJob;

// ------------------------------------------------------------
// JOB RESULTS returned by the audio processor
// ------------------------------------------------------------

export interface VocalSeparationResult {
  jobId: string;
  songId: string;
  instrumentalStemUrl: string;
  vocalStemUrl: string;
  completedAt: string;
}

export interface VocalAnalysisResult {
  jobId: string;
  songId: string;
  pitchFrames: Array<{
    timestampMs: number;
    frequencyHz: number | null;
    voiced: boolean;
    confidence: number;
  }>;
  phraseSegments: Array<{
    startMs: number;
    endMs: number;
    labelledAsPhrase: boolean;
  }>;
  estimatedKey: string;
  tempoEstimateBpm: number;
  vocalRangeHz: { low: number; high: number };
  completedAt: string;
}

export interface FillerDetectionResult {
  jobId: string;
  attemptId: string;
  fillerEvents: Array<{
    timestampMs: number;
    word: string;
    confidence: number;
  }>;
  fillerRate: number;  // per minute
  completedAt: string;
}

export interface KaraokeCompareResult {
  jobId: string;
  snippetId: string;
  attemptId: string;
  pitchSimilarity: number;    // 0–100
  timingAccuracy: number;     // 0–100
  contourMatch: number;       // 0–100
  overall: number;            // Weighted composite
  signedPitchError: number;   // positive = sharp, negative = flat (average cents)
  dominantFailureMode?: string;
  completedAt: string;        // ISO 8601
}


export interface SingingMetricsResult {
  jobId: string;
  attemptId: string;
  pitchAccuracy: number | null; // null if no target
  pitchStability: number | null;
  onsetAccuracy: number | null;
  breathControl: number;
  toneQuality: number;
  dynamicsScore: number | null;
  vibratoScore: number | null;
  hnrDb: number;
  cppDb: number;
  jitterLocal: number;
  shimmerLocal: number;
  rmsVarianceDb: number;
  voicedFrameRatio: number;
  qualityFlag: string | null;
  pitchFrames: Array<{
    timestampMs: number;
    frequencyHz: number | null;
    voiced: boolean;
    confidence: number;
  }>;
  completedAt: string;
}

export interface BaselineAssessmentResult {
  jobId: string;
  userId: string;
  lowestNoteMidi: number;
  highestNoteMidi: number;
  lowestNoteName: string;
  highestNoteName: string;
  comfortableLowMidi: number;
  comfortableHighMidi: number;
  voiceType: string;
  baselineMetrics: {
    pitchAccuracy: number | null;
    pitchStability: number | null;
    breathControl: number;
    toneQuality: number;
    hnrDb: number;
  };
  recommendedStartingKeyMidi: number;
  recommendedStartingKeyName: string;
  completedAt: string;
}
