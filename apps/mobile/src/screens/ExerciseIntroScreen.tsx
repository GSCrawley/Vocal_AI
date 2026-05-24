import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSessionStore } from '../store/sessionStore';
import { BUILD_01_EXERCISE } from '../constants/exercise';

export function ExerciseIntroScreen({ navigation }: any) {
  const dispatch = useSessionStore((state) => state.dispatch);
  const exercise = BUILD_01_EXERCISE;

  useEffect(() => {
    dispatch({ type: 'LOADED' });
  }, [dispatch]);

  const handleStart = () => {
    dispatch({ type: 'START_ATTEMPT' });
    navigation.replace('SustainedNote');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exercise.title}</Text>

      <View style={styles.card}>
        <Text style={styles.targetNote}>Target Note: A4</Text>
        <Text style={styles.targetFreq}>440 Hz</Text>
      </View>

      <Text style={styles.instruction}>{exercise.userInstructionText}</Text>

      <Pressable style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>I'm Ready</Text>
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
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  targetNote: {
    fontSize: 24,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  targetFreq: {
    fontSize: 16,
    color: colors.muted,
  },
  instruction: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
