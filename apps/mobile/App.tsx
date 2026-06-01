/** @jsx React.createElement */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useMicrophonePermission } from './src/hooks/useMicrophonePermission';
import { PermissionScreen } from './src/screens/PermissionScreen';
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

  return (
    <View style={styles.container}>
      <Button
        title="Try!"
        onPress={() => {
          Sentry.captureException(new Error('First error'));
        }}
      />
      <Text style={styles.text}>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
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
    color: colors.text,
  },
});
