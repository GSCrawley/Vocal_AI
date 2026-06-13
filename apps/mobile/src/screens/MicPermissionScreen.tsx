import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MicPermission'>;

export default function MicPermissionScreen() {
  const [status, setStatus] = useState<Audio.PermissionStatus | null>(null);
  const navigation = useNavigation<NavigationProp>();

  const requestPermission = async () => {
    const response = await Audio.requestPermissionsAsync();
    setStatus(response.status);
    if (response.status === 'granted') {
      navigation.navigate('MicCheck');
    }
  };

  useEffect(() => {
    Audio.getPermissionsAsync().then((response) => {
        setStatus(response.status);
        if (response.status === 'granted') {
            navigation.navigate('MicCheck');
        }
    })
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microphone Access</Text>
      <Text style={styles.body}>
        We need microphone access to hear you and provide feedback.
      </Text>
      {status === 'denied' && (
        <Text style={styles.error}>
          Permission denied. Please enable in your device settings to continue.
        </Text>
      )}
      <Button color={colors.accent} title="Grant Permission" onPress={requestPermission} />
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
});
