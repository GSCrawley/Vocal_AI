import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useRecording } from '../hooks/useRecording';
import { usePitchAnalysis } from '../hooks/usePitchAnalysis';
import { BUILD_01_EXERCISE } from '../constants/exercise';

export function MicCheckScreen({ navigation }: any) {
  const { startRecording, stopRecording, rmsDbFrames, isRecording } = useRecording();
  const { analyzeRecording } = usePitchAnalysis();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setErrorMsg(null);
    setChecking(true);
    await startRecording();

    setTimeout(async () => {
      const uri = await stopRecording();
      const { micCheckOk } = await analyzeRecording(uri, rmsDbFrames, BUILD_01_EXERCISE);

      setChecking(false);

      if (micCheckOk.ok) {
        navigation.replace('ExerciseIntro');
      } else {
        if (micCheckOk.reason === 'too_quiet' || micCheckOk.reason === 'low_confidence' || micCheckOk.reason === 'no_voice') {
          setErrorMsg("We couldn't hear you clearly. Make sure you're close enough to the mic and speak up.");
        } else if (micCheckOk.reason === 'clipping') {
          setErrorMsg("The audio is a bit too loud. Try moving slightly away from the mic.");
        } else {
           setErrorMsg("Let's try that again. Ensure you have a quiet environment.");
        }
      }
    }, 2000); // 2 second check
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mic Check</Text>
      <Text style={styles.text}>
        Let's make sure we can hear you clearly. Tap the button and make a steady sound for 2 seconds.
      </Text>

      {errorMsg && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      )}

      <Pressable
        style={[styles.button, (isRecording || checking) && styles.buttonDisabled]}
        onPress={handleCheck}
        disabled={isRecording || checking}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Listening...' : checking ? 'Analyzing...' : 'Start Mic Check'}
        </Text>
      </Pressable>
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
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
