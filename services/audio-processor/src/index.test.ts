import {
  VocalSeparationJob,
  VocalAnalysisJob,
  FillerDetectionJob,
  KaraokeCompareJob,
  AudioProcessorJob,
  VocalSeparationResult,
  VocalAnalysisResult,
  FillerDetectionResult,
  KaraokeCompareResult,
} from './index';

describe('Audio Processor Contract Types', () => {
  it('should allow defining a VocalSeparationJob', () => {
    const job: VocalSeparationJob = {
      jobType: 'vocal_separation',
      jobId: '123',
      songId: '456',
      audioFileUrl: 'https://example.com/audio.mp3',
      requestedAt: '2023-01-01T00:00:00Z',
    };
    expect(job.jobType).toBe('vocal_separation');
  });

  it('should allow defining a VocalAnalysisJob', () => {
    const job: VocalAnalysisJob = {
      jobType: 'vocal_analysis',
      jobId: '123',
      songId: '456',
      vocalStemUrl: 'https://example.com/vocal.mp3',
      requestedAt: '2023-01-01T00:00:00Z',
    };
    expect(job.jobType).toBe('vocal_analysis');
  });

  it('should allow defining a FillerDetectionJob', () => {
    const job: FillerDetectionJob = {
      jobType: 'filler_detection',
      jobId: '123',
      attemptId: '456',
      audioFileUrl: 'https://example.com/audio.mp3',
      userId: '789',
      requestedAt: '2023-01-01T00:00:00Z',
    };
    expect(job.jobType).toBe('filler_detection');
  });

  it('should allow defining a KaraokeCompareJob', () => {
    const job: KaraokeCompareJob = {
      jobType: 'karaoke_compare',
      jobId: '123',
      snippetId: '456',
      attemptId: '789',
      userAudioUrl: 'https://example.com/audio.mp3',
      referenceVocalAnalysisId: 'abc',
      requestedAt: '2023-01-01T00:00:00Z',
    };
    expect(job.jobType).toBe('karaoke_compare');
  });

  it('should allow an AudioProcessorJob to be any of the defined job types', () => {
    const job: AudioProcessorJob = {
      jobType: 'vocal_separation',
      jobId: '123',
      songId: '456',
      audioFileUrl: 'https://example.com/audio.mp3',
      requestedAt: '2023-01-01T00:00:00Z',
    };
    expect(job.jobType).toBeDefined();
  });

  it('should allow defining a VocalSeparationResult', () => {
    const result: VocalSeparationResult = {
      jobId: '123',
      songId: '456',
      instrumentalStemUrl: 'https://example.com/instrumental.mp3',
      vocalStemUrl: 'https://example.com/vocal.mp3',
      completedAt: '2023-01-01T00:00:00Z',
    };
    expect(result.jobId).toBe('123');
  });

  it('should allow defining a VocalAnalysisResult', () => {
    const result: VocalAnalysisResult = {
      jobId: '123',
      songId: '456',
      pitchFrames: [
        {
          timestampMs: 0,
          frequencyHz: 440,
          voiced: true,
          confidence: 0.9,
        },
      ],
      phraseSegments: [
        {
          startMs: 0,
          endMs: 1000,
          labelledAsPhrase: true,
        },
      ],
      estimatedKey: 'C Major',
      tempoEstimateBpm: 120,
      vocalRangeHz: { low: 200, high: 800 },
      completedAt: '2023-01-01T00:00:00Z',
    };
    expect(result.jobId).toBe('123');
  });

  it('should allow defining a FillerDetectionResult', () => {
    const result: FillerDetectionResult = {
      jobId: '123',
      attemptId: '456',
      fillerEvents: [
        {
          timestampMs: 1000,
          word: 'um',
          confidence: 0.9,
        },
      ],
      fillerRate: 1.5,
      completedAt: '2023-01-01T00:00:00Z',
    };
    expect(result.jobId).toBe('123');
  });

  it('should allow defining a KaraokeCompareResult', () => {
    const result: KaraokeCompareResult = {
      jobId: '123',
      snippetId: '456',
      attemptId: '789',
      pitchSimilarity: 95,
      timingAccuracy: 90,
      contourMatch: 92,
      overall: 93,
      signedPitchError: 5,
      dominantFailureMode: 'sharp',
      completedAt: '2023-01-01T00:00:00Z',
    };
    expect(result.jobId).toBe('123');
  });
});
