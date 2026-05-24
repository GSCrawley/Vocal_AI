import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSessionStore } from '../store/sessionStore';
import { mapSustainedNoteScoreToCoaching } from '@voice/coaching-rules';
import { computeSessionXp } from '@voice/reward-engine';

const FEELING_OPTIONS = [
  'Felt easy and relaxed',
  'A bit strained',
  'Hard to hold steady'
];

const FOCUS_OPTIONS = [
  'Better breath support',
  'Pitch accuracy',
  'Staying relaxed'
];

export function ReflectionScreen({ navigation }: any) {
  const dispatch = useSessionStore((state) => state.dispatch);
  const setReflectionAnswers = useSessionStore((state) => state.setReflectionAnswers);
  const setXpEarned = useSessionStore((state) => state.setXpEarned);
  const lastScore = useSessionStore((state) => state.lastScore) || 0;
  const bestScore = useSessionStore((state) => state.bestScore) || 0;

  const [feeling, setFeeling] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const handleFinish = () => {
    if (!feeling || !focus) return;

    setReflectionAnswers([feeling, focus]);

    const coaching = mapSustainedNoteScoreToCoaching(lastScore);
    const isPersonalBest = lastScore > 0 && lastScore >= bestScore;

    const { total } = computeSessionXp(
       coaching.successBand,
       isPersonalBest,
       true, // isNewExerciseType for Build 0.1
       true  // reflectionCompleted
    );

    setXpEarned(total);
    dispatch({ type: 'REFLECTION_DONE' });
    navigation.replace('RewardSummary', { successBand: coaching.successBand, isPersonalBest });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Reflection</Text>

      <View style={styles.section}>
        <Text style={styles.prompt}>How did that attempt feel?</Text>
        {FEELING_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.option, feeling === opt && styles.optionSelected]}
            onPress={() => setFeeling(opt)}
          >
            <Text style={[styles.optionText, feeling === opt && styles.optionTextSelected]}>{opt}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.prompt}>What will you focus on next?</Text>
        {FOCUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.option, focus === opt && styles.optionSelected]}
            onPress={() => setFocus(opt)}
          >
            <Text style={[styles.optionText, focus === opt && styles.optionTextSelected]}>{opt}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.button, (!feeling || !focus) && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={!feeling || !focus}
      >
        <Text style={styles.buttonText}>Complete Session</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  prompt: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  option: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}20`,
  },
  optionText: {
    color: colors.muted,
    fontSize: 16,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 'auto',
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
