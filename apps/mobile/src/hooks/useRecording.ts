import { useState, useRef } from 'react';
import { Audio } from 'expo-av';

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [rmsDbFrames, setRmsDbFrames] = useState<number[]>([]);
  const framesRef = useRef<number[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      setRmsDbFrames([]);
      framesRef.current = [];
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            setRmsDbFrames((prev) => [...prev, status.metering!]);
            framesRef.current.push(status.metering!);
          }
        },
        100 // update interval ms
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (): Promise<{ uri: string | null; frames: number[] }> => {
    try {
      setIsRecording(false);
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
        const uri = recording.getURI();
        return { uri, frames: framesRef.current };
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
    return { uri: null, frames: framesRef.current };
  };

  return {
    startRecording,
    stopRecording,
    rmsDbFrames,
    isRecording,
  };
}
