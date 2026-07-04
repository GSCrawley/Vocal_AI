import React, { useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useSettingsStore } from '../store/settingsStore';

export default function SettingsScreen() {
  const { audioStorageConsent, setAudioStorageConsent, fetchProfile } = useSettingsStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Audio Storage Consent</Text>
          <Text style={styles.settingDescription}>
            Enable deep analysis of your vocal exercises. This requires uploading your audio recordings securely to our servers.
          </Text>
        </View>
        <Switch
          value={audioStorageConsent}
          onValueChange={(value) => setAudioStorageConsent(value)}
          trackColor={{ false: colors.surface, true: colors.success }}
          thumbColor={colors.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  settingDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
