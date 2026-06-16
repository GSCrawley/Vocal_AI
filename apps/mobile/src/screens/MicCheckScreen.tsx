import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useRecording } from '../hooks/useRecording';
import { usePitchAnalysis } from '../hooks/usePitchAnalysis';
import { BUILD_01_EXERCISE } from '../constants/exercise';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MicCheck'>;

export default function MicCheckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { startRecording, stopRecording, isRecording } = useRecording();
  const { analyzeRecording } = usePitchAnalysis();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runCheck = async () => {
    setErrorMsg(null);
    await startRecording();

    // Record for 2 seconds
    setTimeout(async () => {
      const { uri, frames } = await stopRecording();
      const result = await analyzeRecording(uri, frames, BUILD_01_EXERCISE);

      if (result.ok) {
        navigation.navigate('ExerciseIntro');
      } else {
        setErrorMsg(`Mic check failed: ${result.reason || 'Unknown error'}. Please try again.`);
      }
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let's check your mic</Text>
      <Text style={styles.body}>Say something for 2 seconds.</Text>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <Button
        color={colors.accent}
        title={isRecording ? 'Listening...' : 'Start Mic Check'}
        onPress={runCheck}
        disabled={isRecording}
      />
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
