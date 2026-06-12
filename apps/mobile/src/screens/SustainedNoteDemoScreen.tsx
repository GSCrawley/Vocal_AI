import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';

interface SustainedNoteDemoScreenProps {
  onFinish: () => void;
  onBack: () => void;
}

export function SustainedNoteDemoScreen({ onFinish, onBack }: SustainedNoteDemoScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sustained Note</Text>
      <Text style={styles.subtitle}>
        Hold a comfortable "ah" for 3 to 5 seconds. Keep the tone steady and relaxed.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Target</Text>
        <Text style={styles.cardValue}>A3 (demo)</Text>
        <Text style={styles.cardHint}>Tolerance: +/- 35 cents</Text>
      </View>

      <View style={styles.buttonRow}>
        <Button title="Back" onPress={onBack} color={colors.muted} />
        <Button title="Complete Attempt" onPress={onFinish} color={colors.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  cardValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardHint: {
    color: colors.warning,
    fontSize: 14,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
