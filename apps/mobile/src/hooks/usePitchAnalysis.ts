import { ExerciseDefinition, LivePitchFrame } from '@voice/shared-types';
import { micCheck, scoreSustainedNote } from '@voice/audio-metrics';
import { useSettingsStore } from '../store/settingsStore';

// Provide a sensible fallback API URL if one isn't defined via environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:10000';

export function usePitchAnalysis() {
  const analyzeRecording = async (
    uri: string | null,
    rmsDbFrames: number[],
    exercise: ExerciseDefinition
  ) => {
    if (!uri) {
      return { ok: false, reason: 'no_audio', scoreBreakdown: null, frames: [] };
    }

    let frames: LivePitchFrame[] = [];

    // Offload pYIN pitch extraction to the backend audio-processor
    try {
      const formData = new FormData();

      formData.append('file', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);

      // We call the Fastify API proxy which coordinates with the Python audio-processor
      const response = await fetch(`${API_URL}/v1/pitch/extract`, {
        method: 'POST',
        body: formData,
        // Using a dummy auth header for now; in a real app this uses the actual session token
        headers: {
          Authorization: 'Bearer placeholder-token',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.ok && result.frames) {
        frames = result.frames;
      } else {
        throw new Error('Invalid response format from pitch extraction API');
      }
    } catch (err) {
      console.warn('Failed to extract pitch via backend:', err);
      // Return explicit error rather than silently failing to fake frames
      // The application relies on `ok: false` and a string reason for routing errors.
      // `api_error` is used here instead of falling back to false RMS data.
      // Ensure we explicitly mark the reason. If 'api_error' isn't supported by the typing,
      // we'll cast it to `any` or extend the mic check type in the future.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ok: false, reason: 'api_error' as any, scoreBreakdown: null, frames: [] };
    }

    const micStatus = micCheck(frames, rmsDbFrames);

    if (!micStatus.ok) {
      return { ok: false, reason: micStatus.reason, scoreBreakdown: null, frames: [] };
    }

    const targetHzRaw = (exercise.targetPatternPayload as Record<string, unknown>)['targetHz'];
    const toleranceRaw = (exercise.evaluationConfig as Record<string, unknown>)['toleranceCents'];
    if (typeof targetHzRaw !== 'number' || typeof toleranceRaw !== 'number') {
      return { ok: false, reason: 'invalid_exercise_config', scoreBreakdown: null, frames: [] };
    }
    const targetHz = targetHzRaw;
    const tolerance = toleranceRaw;

    const scoreBreakdown = scoreSustainedNote(frames, targetHz, tolerance, {
      pitch: exercise.scoringWeights.pitch || 0.5,
      stability: exercise.scoringWeights.stability || 0.5,
    });

    let deepAnalysis = null;
    const currentConsent = useSettingsStore.getState().audioStorageConsent;
    if (currentConsent) {
      try {
        // Deep analysis upload step (placeholder for actual integration)
        const daFormData = new FormData();
        daFormData.append('file', {
          uri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        } as unknown as Blob);

        const daResponse = await fetch(`${API_URL}/api/attempts/temp-id/analyze`, {
          method: 'POST',
          body: daFormData,
          headers: { Authorization: 'Bearer placeholder-token' },
        });

        if (daResponse.ok) {
          const daResult = await daResponse.json();
          deepAnalysis = daResult.deepAnalysis;
        }
      } catch (err) {
        console.warn('Failed to perform deep analysis:', err);
      }
    }

    return {
      ok: true,
      reason: undefined,
      scoreBreakdown,
      frames,
      deepAnalysis,
    };
  };

  return { analyzeRecording };
}
