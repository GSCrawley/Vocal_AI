import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SessionState,
  initialSessionState,
  SessionEvent,
  LivePitchFrame,

} from '@voice/shared-types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
// Import SessionPlan and transition from @voice/exercise-engine (NOT @voice/curriculum due to name conflicts)
import { SessionPlan, transition, buildSessionPlan } from '@voice/exercise-engine';
import { BUILD_01_EXERCISE } from '../constants/exercise';

interface SessionStore {
  sessionState: SessionState;
  sessionPlan: SessionPlan | null;
  lastScore: number;
  bestScore: number;
  xpEarned: number;
  reflectionAnswers: Record<string, string>;
  frames: LivePitchFrame[];
  dispatch: (event: SessionEvent) => void;
  setFrames: (frames: LivePitchFrame[]) => void;
  setLastScore: (score: number) => void;
  setXpEarned: (xp: number) => void;
  setReflectionAnswer: (prompt: string, answer: string) => void;
  resetSession: () => void;
  initSessionPlan: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionState: initialSessionState,
      sessionPlan: null,
      lastScore: 0,
      bestScore: 0,
      xpEarned: 0,
      reflectionAnswers: {},
      frames: [],

      dispatch: (event) => {
        set((state) => ({
          sessionState: transition(state.sessionState, event),
        }));
      },

      setFrames: (frames) => set({ frames }),

      setLastScore: (score) =>
        set((state) => ({
          lastScore: score,
          bestScore: Math.max(state.bestScore, score),
        })),

      setXpEarned: (xp) => set((state) => ({ xpEarned: state.xpEarned + xp })),

      setReflectionAnswer: (prompt, answer) =>
        set((state) => ({
          reflectionAnswers: { ...state.reflectionAnswers, [prompt]: answer },
        })),

      resetSession: () =>
        set(() => ({
          sessionState: initialSessionState,
          sessionPlan: null,
          lastScore: 0,
          xpEarned: 0,
          reflectionAnswers: {},
          frames: [],
        })),

      initSessionPlan: () => {
        const plan = buildSessionPlan({
          sessionId: 'session-001',
          tier: 'singing',
          exercises: [BUILD_01_EXERCISE],
        });
        set({ sessionPlan: plan });
      },
    }),
    {
      name: 'best_score_sustained_note_001',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bestScore: state.bestScore }),
    }
  )
);
