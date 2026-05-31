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
  | 'karaoke_compare';   // DTW comparison of user attempt vs reference vocal

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

export type AudioProcessorJob =
  | VocalSeparationJob
  | VocalAnalysisJob
  | FillerDetectionJob
  | KaraokeCompareJob;

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
