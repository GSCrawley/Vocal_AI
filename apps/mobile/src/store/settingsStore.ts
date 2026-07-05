import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserProfile } from '@voice/shared-types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:10000';

interface SettingsStore {
  audioStorageConsent: boolean;
  hasPromptedForConsent: boolean;
  setAudioStorageConsent: (consent: boolean) => Promise<void>;
  setHasPromptedForConsent: (prompted: boolean) => void;
  fetchProfile: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      audioStorageConsent: false,
      hasPromptedForConsent: false,

      setAudioStorageConsent: async (consent: boolean) => {
        set({ audioStorageConsent: consent });
        try {
          await fetch(`${API_URL}/v1/profiles/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer placeholder-token',
            },
            body: JSON.stringify({ audioStorageConsent: consent }),
          });
        } catch (err) {
          console.warn('Failed to sync consent to API:', err);
        }
      },

      setHasPromptedForConsent: (prompted: boolean) => {
        set({ hasPromptedForConsent: prompted });
      },

      fetchProfile: async () => {
        try {
          const response = await fetch(`${API_URL}/v1/profiles/me`, {
            headers: {
              Authorization: 'Bearer placeholder-token',
            },
          });
          if (response.ok) {
            const profile = (await response.json()) as UserProfile;
            if (profile.audioStorageConsent !== undefined) {
              set({ audioStorageConsent: profile.audioStorageConsent });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch profile:', err);
        }
      },
    }),
    {
      name: 'voice_settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
