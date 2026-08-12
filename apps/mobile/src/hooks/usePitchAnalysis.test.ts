import { useSettingsStore } from '../store/settingsStore';
import { usePitchAnalysis } from './usePitchAnalysis';
import { ExerciseDefinition } from '@voice/shared-types';

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

describe('usePitchAnalysis', () => {
  it('does not attempt deep analysis upload when consent is false', async () => {
    (useSettingsStore as unknown as { getState: jest.Mock }).getState.mockReturnValue({
      audioStorageConsent: false,
    });

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, frames: [] }),
      })
    );
    const { analyzeRecording } = usePitchAnalysis();

    const rmsDbFrames = [-50, -50];
    const result = await analyzeRecording('mock-uri', rmsDbFrames, mockExercise);

    // Should only have called the pitch extraction endpoint
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/pitch/extract'),
      expect.any(Object)
    );
    expect((result as unknown as { deepAnalysis: unknown }).deepAnalysis).toBeNull();

  it('leaves deepAnalysis null as a guarded no-op when consent is true (Group D stub)', async () => {
    (useSettingsStore as unknown as { getState: jest.Mock }).getState.mockReturnValue({
      audioStorageConsent: true,
    });

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, frames: [] }),
      })
    );
    const { analyzeRecording } = usePitchAnalysis();

    const rmsDbFrames = [-50, -50];
    const result = await analyzeRecording('mock-uri', rmsDbFrames, mockExercise);

    // Even with consent=true, the deep analysis endpoint should NOT be called until Group D
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/pitch/extract'),
      expect.any(Object)
    );
    expect((result as unknown as { deepAnalysis: unknown }).deepAnalysis).toBeUndefined();
  });

  const mockExercise: ExerciseDefinition = {
    exerciseId: 'test-exercise',
    version: 1,
    tier: 'singing',
    category: 'pitch_matching',
    subcategory: 'sustained_note',
    title: 'Test Note',
    description: 'Test',
    userInstructionText: 'Test',
    durationTargetSeconds: 5,
    repetitionsDefault: 1,
    targetPatternType: 'sustained_hold',
    targetPatternPayload: { targetHz: 440 },
    evaluationConfig: { toleranceCents: 50 },
    scoringWeights: { pitch: 0.5, stability: 0.5 },
    feedbackRuleSetId: 'default',
    activeFlag: true,
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    (useSettingsStore as unknown as { getState: jest.Mock }).getState.mockReturnValue({
      audioStorageConsent: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('generates placeholder frames from RMS data and returns score when micCheck passes', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            frames: [
              {
                timestampMs: 0,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
              {
                timestampMs: 100,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 200,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 300,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 400,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
            ],
          }),
      })
    );
    const { analyzeRecording } = usePitchAnalysis();

    // -20 is voiced (confidence 0.8), -50 is unvoiced (confidence 0.1)
    const rmsDbFrames = [-50, -20, -20, -20, -50];

    const result = await analyzeRecording('mock-uri', rmsDbFrames, mockExercise);

    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.frames).toHaveLength(5);

    // Check first unvoiced frame
    expect(result.frames[0]).toEqual({
      timestampMs: 0,
      frequencyHz: undefined,
      centsFromTarget: undefined,
      voiced: false,
      confidence: 0.1,
    });

    // Check voiced frame
    expect(result.frames[1]).toEqual({
      timestampMs: 100,
      frequencyHz: undefined,
      centsFromTarget: undefined,
      voiced: true,
      confidence: 0.8,
    });

    // Score should be populated
    expect(result.scoreBreakdown).toBeDefined();
    // With undefined frequencyHz, scorePitchAccuracy will return 0 and stability 0
    // so overall score will be 0 according to scoreSustainedNote logic
    expect(result.scoreBreakdown?.overall).toBe(0);
  });

  it('fails if micCheck detects clipping (e.g., db >= 0)', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            frames: [
              {
                timestampMs: 0,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
              {
                timestampMs: 100,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 200,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 300,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: true,
                confidence: 0.8,
              },
              {
                timestampMs: 400,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
            ],
          }),
      })
    );
    const { analyzeRecording } = usePitchAnalysis();

    // 0 is clipping
    const rmsDbFrames = [0, -20, -20, -20, -50];

    const result = await analyzeRecording('mock-uri', rmsDbFrames, mockExercise);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('clipping');
    expect(result.frames).toHaveLength(0);
    expect(result.scoreBreakdown).toBeNull();
  });

  it('fails if micCheck detects no usable frames (e.g. too quiet)', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            frames: [
              {
                timestampMs: 0,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
              {
                timestampMs: 100,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
              {
                timestampMs: 200,
                frequencyHz: undefined,
                centsFromTarget: undefined,
                voiced: false,
                confidence: 0.1,
              },
            ],
          }),
      })
    );
    const { analyzeRecording } = usePitchAnalysis();

    // All frames are below -40 threshold, so voiced = false, confidence = 0.1
    const rmsDbFrames = [-50, -60, -50];

    const result = await analyzeRecording('mock-uri', rmsDbFrames, mockExercise);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('low_confidence');
    expect(result.frames).toHaveLength(0);
    expect(result.scoreBreakdown).toBeNull();
  });
});
