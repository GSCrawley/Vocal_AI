import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '@voice/ui-tokens';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export function MicPermissionScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const requestPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      navigation.replace('MicCheck');
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Audio.getPermissionsAsync();
      if (status === 'granted') {
        navigation.replace('MicCheck');
      }
    })();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microphone Access</Text>
      <Text style={styles.text}>
        We need access to your microphone so you can sing and receive feedback on your pitch and stability.
      </Text>
      {hasPermission === false && (
        <Text style={styles.errorText}>
          Microphone permission was denied. Please allow it to continue.
        </Text>
      )}
      <Pressable style={styles.button} onPress={requestPermission}>
        <Text style={styles.buttonText}>Allow Microphone</Text>
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
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
