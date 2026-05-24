import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSessionStore } from '../store/sessionStore';
import { mapSustainedNoteScoreToCoaching } from '@voice/coaching-rules';

export function ResultScreen({ route, navigation }: any) {
  const { score } = route.params;
  const dispatch = useSessionStore((state) => state.dispatch);
  const bestScore = useSessionStore((state) => state.bestScore);

  const coaching = mapSustainedNoteScoreToCoaching(score);
  const isPersonalBest = bestScore !== null && score >= bestScore;

  const handleRetry = () => {
    dispatch({ type: 'RETRY' });
    navigation.replace('ExerciseIntro');
  };

  const handleContinue = () => {
    dispatch({ type: 'CONTINUE' }); // Or maybe START_REFLECTION
    dispatch({ type: 'START_REFLECTION' });
    navigation.replace('Reflection');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Result</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Overall Score</Text>
        <Text style={styles.score}>{Math.round(score)}</Text>
        {isPersonalBest && score > 0 && (
          <Text style={styles.pbText}>New Personal Best!</Text>
        )}
      </View>

      <View style={styles.coachingCard}>
        <Text style={styles.praise}>{coaching.praiseMessage}</Text>
        <Text style={styles.correction}>{coaching.correctionMessage}</Text>
        <Text style={styles.tip}>Tip: {coaching.actionTip}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleRetry}>
          <Text style={styles.secondaryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 8,
  },
  score: {
    fontSize: 64,
    color: colors.accent,
    fontWeight: 'bold',
  },
  pbText: {
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 8,
  },
  coachingCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    marginBottom: 48,
  },
  praise: {
    fontSize: 18,
    color: colors.success,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  correction: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: colors.warning,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
