import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useRecording } from '../hooks/useRecording';
import { usePitchAnalysis } from '../hooks/usePitchAnalysis';
import { BUILD_01_EXERCISE } from '../constants/exercise';
import { useSessionStore } from '../store/sessionStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SustainedNote'>;

export default function SustainedNoteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { startRecording, stopRecording, rmsDbFrames, isRecording } = useRecording();
  const { analyzeRecording } = usePitchAnalysis();
  const { dispatch, setFrames, setLastScore } = useSessionStore();

  const [countdown, setCountdown] = useState(5);
  const [phase, setPhase] = useState<'countdown' | 'recording' | 'analyzing'>('countdown');
  const [meterValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startExercise();
      }
    }
  }, [countdown, phase]);

  useEffect(() => {
    if (isRecording && rmsDbFrames.length > 0) {
      const latestDb = rmsDbFrames[rmsDbFrames.length - 1];
      // Map dB roughly from -60 to 0 to a scale of 0 to 1
      const normalized = Math.max(0, Math.min(1, (latestDb + 60) / 60));
      Animated.timing(meterValue, {
        toValue: normalized,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [rmsDbFrames, isRecording, meterValue]);

  const startExercise = async () => {
    setPhase('recording');
    dispatch({ type: 'SIGNAL_DETECTED' }); // Transition to LISTENING state internally
    await startRecording();

    setTimeout(async () => {
      dispatch({ type: 'LISTENING_DONE' });
      setPhase('analyzing');
      const { uri, frames } = await stopRecording();

      const result = await analyzeRecording(uri, frames, BUILD_01_EXERCISE);

      dispatch({ type: 'ANALYSIS_DONE' });

      if (result.ok && result.scoreBreakdown) {
        setFrames(result.frames);
        setLastScore(result.scoreBreakdown.overall);
        navigation.replace('Result', { score: result.scoreBreakdown.overall });
      } else {
        // Route noisy/clipped audio back to mic check as per rules
        navigation.replace('MicCheck');
      }
    }, BUILD_01_EXERCISE.durationTargetSeconds * 1000);
  };

  const meterHeight = meterValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.container}>
      {phase === 'countdown' && (
        <Text style={styles.countdownText}>{countdown}</Text>
      )}

      {phase === 'recording' && (
        <>
          <Text style={styles.statusText}>Hold A4...</Text>
          <View style={styles.meterContainer}>
            <Animated.View style={[styles.meterFill, { height: meterHeight }]} />
          </View>
        </>
      )}

      {phase === 'analyzing' && (
        <Text style={styles.statusText}>Analyzing...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: colors.accent,
    fontSize: 72,
    fontWeight: 'bold',
  },
  statusText: {
    color: colors.text,
    fontSize: 24,
    marginBottom: 40,
  },
  meterContainer: {
    width: 40,
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  meterFill: {
    width: '100%',
    backgroundColor: colors.success,
  }
});
