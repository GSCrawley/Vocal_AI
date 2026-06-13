import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';

interface MicCheckScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MicCheckScreen({ onComplete, onBack }: MicCheckScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mic Check</Text>
      <Text style={styles.subtitle}>
        Say "ah" at a comfortable volume for two seconds. If your room is quiet and the mic signal
        is clear, continue.
      </Text>
      <View style={styles.buttonRow}>
        <Button title="Back" onPress={onBack} color={colors.muted} />
        <Button title="Mic Check Passed" onPress={onComplete} color={colors.success} />
      </View>
      <Text style={styles.note}>Safety reminder: stop if your voice feels strained.</Text>
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
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  note: {
    marginTop: 16,
    color: colors.warning,
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
