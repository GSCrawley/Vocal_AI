import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';

interface HomeScreenProps {
  onStartSession: () => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VOICE Build 0.1 Preview</Text>
      <Text style={styles.subtitle}>
        Your microphone is ready. Start a guided warm-up flow with mic check and a sustained-note
        attempt.
      </Text>
      <Button title="Start Session" onPress={onStartSession} color={colors.accent} />
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
});
