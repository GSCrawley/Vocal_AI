import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useMicrophonePermission } from './src/hooks/useMicrophonePermission';
import { PermissionScreen } from './src/screens/PermissionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MicCheckScreen } from './src/screens/MicCheckScreen';
import { SustainedNoteDemoScreen } from './src/screens/SustainedNoteDemoScreen';
import { colors } from '@voice/ui-tokens';

Sentry.init({
  dsn: 'https://fe68662341268013a48f2f99eda677ba@o4509629278519296.ingest.us.sentry.io/4511355776729088',
  sendDefaultPii: false,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

export default Sentry.wrap(function App() {
  const { hasPermission, requestPermission } = useMicrophonePermission();
  const [stage, setStage] = useState<'home' | 'mic-check' | 'exercise' | 'complete'>('home');

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  if (stage === 'home') {
    return (
      <>
        <HomeScreen onStartSession={() => setStage('mic-check')} />
        <StatusBar style="light" />
      </>
    );
  }

  if (stage === 'mic-check') {
    return (
      <>
        <MicCheckScreen onComplete={() => setStage('exercise')} onBack={() => setStage('home')} />
        <StatusBar style="light" />
      </>
    );
  }

  if (stage === 'exercise') {
    return (
      <>
        <SustainedNoteDemoScreen
          onFinish={() => setStage('complete')}
          onBack={() => setStage('mic-check')}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete</Text>
      <Text style={styles.text}>Great work. You finished the Build 0.1 preview flow.</Text>
      <Text style={styles.subtext}>
        Next: score breakdown, best-take replay, and reflection prompts.
      </Text>
      <StatusBar style="light" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 8,
    color: colors.text,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtext: {
    marginTop: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
