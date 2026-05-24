import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [rmsDbFrames, setRmsDbFrames] = useState<number[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      setRmsDbFrames([]); // reset
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
             setRmsDbFrames((prev) => [...prev, status.metering!]);
          }
        },
        100 // metering update interval
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  return { startRecording, stopRecording, rmsDbFrames, isRecording };
}
