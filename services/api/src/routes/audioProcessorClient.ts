import { getConfig } from '../config/env.js';

export async function enqueueAudioAnalysis(jobId: string, audioUrl: string, userId: string) {
  const config = getConfig();
  const audioProcessorUrl = process.env.AUDIO_PROCESSOR_URL || 'http://voice-audio-processor:8000';

  const response = await fetch(`${audioProcessorUrl}/jobs/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': config.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      jobId,
      audioUrl,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to enqueue audio analysis job: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
