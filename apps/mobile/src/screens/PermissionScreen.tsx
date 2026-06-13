import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';

interface PermissionScreenProps {
  onRequestPermission: () => void | Promise<boolean>;
}

export function PermissionScreen({ onRequestPermission }: PermissionScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        VOICE needs access to your microphone to analyze your singing.
      </Text>
      <Button
        title="Grant Microphone Permission"
        onPress={() => {
          void onRequestPermission();
        }}
        color={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: colors.text,
  },
});
