import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSessionStore } from '../store/sessionStore';

export function RewardSummaryScreen({ route, navigation }: any) {
  const { successBand, isPersonalBest } = route.params;
  const xpEarned = useSessionStore((state) => state.xpEarned) || 0;
  const resetSession = useSessionStore((state) => state.resetSession);

  const handleDone = () => {
    resetSession();
    // In a real app we might go home, but for Build 0.1 we loop to MicCheck
    navigation.replace('MicCheck');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>

      <View style={styles.rewardCard}>
        <Text style={styles.xpAmount}>+{xpEarned} XP</Text>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: getBandColor(successBand) }]}>
             <Text style={styles.badgeText}>{successBand.toUpperCase()} SCORE</Text>
          </View>

          {isPersonalBest && (
            <View style={[styles.badge, styles.pbBadge]}>
               <Text style={styles.badgeText}>PERSONAL BEST</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable style={styles.button} onPress={handleDone}>
        <Text style={styles.buttonText}>Done</Text>
      </Pressable>
    </View>
  );
}

function getBandColor(band: string) {
  switch (band) {
    case 'excellent': return colors.success;
    case 'good': return colors.accent;
    case 'developing': return colors.warning;
    default: return colors.muted;
  }
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
    marginBottom: 48,
  },
  rewardCard: {
    backgroundColor: colors.surface,
    padding: 48,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 48,
  },
  xpAmount: {
    fontSize: 64,
    color: colors.warning,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pbBadge: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 48,
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
