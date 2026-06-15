import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSessionStore } from '../store/sessionStore';
import { mapSustainedNoteScoreToCoaching } from '@voice/coaching-rules';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RewardSummary'>;

// Helper for opacity
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function RewardSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { xpEarned, lastScore, bestScore, resetSession } = useSessionStore();

  const band = mapSustainedNoteScoreToCoaching(lastScore).successBand;
  const isPersonalBest = lastScore >= bestScore && lastScore > 0;

  const handleDone = () => {
    resetSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MicCheck' }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>

      <View style={styles.xpCard}>
        <Text style={styles.xpText}>+{xpEarned} XP</Text>
      </View>

      <Text style={styles.bandText}>Performance: {band.toUpperCase()}</Text>

      {isPersonalBest && (
        <View style={[styles.badgeContainer, { backgroundColor: hexToRgba(colors.warning, 0.2) }]}>
          <Text style={styles.badgeText}>🏆 Personal Best Achieved!</Text>
        </View>
      )}

      <View style={styles.btnContainer}>
        <Button color={colors.accent} title="Done" onPress={handleDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  xpCard: {
    backgroundColor: colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 24,
  },
  xpText: {
    color: colors.success,
    fontSize: 48,
    fontWeight: 'bold',
  },
  bandText: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 24,
    opacity: 0.8,
  },
  badgeContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 48,
  },
  badgeText: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnContainer: {
    width: '100%',
    marginTop: 20,
  },
});
