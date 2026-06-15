import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { mapSustainedNoteScoreToCoaching } from '@voice/coaching-rules';
import { useSessionStore } from '../store/sessionStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultRouteProp = RouteProp<RootStackParamList, 'Result'>;

export default function ResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultRouteProp>();
  const { score } = route.params;
  const { dispatch, bestScore } = useSessionStore();

  const coaching = mapSustainedNoteScoreToCoaching(score);
  const isBest = score > 0 && score >= bestScore;

  const handleTryAgain = () => {
    dispatch({ type: 'RETRY' });
    navigation.replace('ExerciseIntro');
  };

  const handleContinue = () => {
    dispatch({ type: 'START_REFLECTION' });
    navigation.replace('Reflection');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Result</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreValue}>{Math.round(score)}</Text>
        <Text style={styles.scoreLabel}>Score</Text>
        {isBest && <Text style={styles.bestBadge}>Personal Best!</Text>}
      </View>

      <View style={styles.coachingCard}>
        <Text style={styles.praise}>{coaching.praiseMessage}</Text>
        <Text style={styles.tip}>{coaching.actionTip}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.btnWrapper}>
          <Button color={colors.muted} title="Try Again" onPress={handleTryAgain} />
        </View>
        <View style={styles.btnWrapper}>
          <Button color={colors.accent} title="Continue" onPress={handleContinue} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreValue: {
    color: colors.accent,
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 18,
    marginTop: 8,
  },
  bestBadge: {
    color: colors.warning,
    fontWeight: 'bold',
    marginTop: 16,
    fontSize: 16,
  },
  coachingCard: {
    marginBottom: 48,
  },
  praise: {
    color: colors.success,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  tip: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
});
