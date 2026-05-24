import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSessionStore } from '../store/sessionStore';
import { useRecording } from '../hooks/useRecording';
import { usePitchAnalysis } from '../hooks/usePitchAnalysis';
import { BUILD_01_EXERCISE } from '../constants/exercise';

export function SustainedNoteScreen({ navigation }: any) {
  const [countdown, setCountdown] = useState<number | null>(5);
  const [analyzing, setAnalyzing] = useState(false);
  const dispatch = useSessionStore((state) => state.dispatch);
  const setLastScore = useSessionStore((state) => state.setLastScore);
  const { startRecording, stopRecording, rmsDbFrames, isRecording } = useRecording();
  const { analyzeRecording } = usePitchAnalysis();

  useEffect(() => {
    dispatch({ type: 'SIGNAL_DETECTED' });
    startRecording();

    let time = BUILD_01_EXERCISE.durationTargetSeconds;
    const interval = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time <= 0) {
        clearInterval(interval);
        finishExercise();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const finishExercise = async () => {
    dispatch({ type: 'LISTENING_DONE' });
    setAnalyzing(true);
    const uri = await stopRecording();

    const { micCheckOk, score } = await analyzeRecording(uri, rmsDbFrames, BUILD_01_EXERCISE);
    dispatch({ type: 'ANALYSIS_DONE' });

    if (!micCheckOk.ok) {
       // Return to mic check with an indication it was noisy or bad recording
       navigation.replace('MicCheck');
       return;
    }

    if (score) {
       setLastScore(score.overall);
       navigation.replace('Result', { score: score.overall });
    }
  };

  // Compute a simple volume representation (0-100) from the latest db reading
  const currentDb = rmsDbFrames.length > 0 ? rmsDbFrames[rmsDbFrames.length - 1] : -160;
  const volumePercent = Math.max(0, Math.min(100, (currentDb + 60) * (100 / 60)));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sing & Hold!</Text>

      {analyzing ? (
        <Text style={styles.countdown}>Analyzing...</Text>
      ) : (
        <Text style={styles.countdown}>{countdown}</Text>
      )}

      <View style={styles.meterContainer}>
        <View style={[styles.meterFill, { height: `${volumePercent}%` }]} />
      </View>

      <Text style={styles.info}>Target: A4 (440 Hz)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 48,
  },
  countdown: {
    fontSize: 72,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 48,
  },
  meterContainer: {
    width: 20,
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 32,
  },
  meterFill: {
    width: '100%',
    backgroundColor: colors.success,
  },
  info: {
    fontSize: 16,
    color: colors.muted,
  },
});
