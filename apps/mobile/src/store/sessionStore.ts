import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionState, SessionEvent } from '@voice/shared-types';
import { transition, SessionPlan } from '@voice/exercise-engine'; // Note: SessionPlan should be imported from @voice/exercise-engine, not @voice/curriculum

export interface AppSessionState {
  currentState: SessionState;
  plan: SessionPlan | null;
  lastScore: number | null;
  bestScore: number | null;
  xpEarned: number | null;
  reflectionAnswers: string[];

  dispatch: (event: SessionEvent) => void;
  setPlan: (plan: SessionPlan) => void;
  setLastScore: (score: number) => void;
  setXpEarned: (xp: number) => void;
  setReflectionAnswers: (answers: string[]) => void;
  resetSession: () => void;
}

export const useSessionStore = create<AppSessionState>()(
  persist(
    (set, get) => ({
      currentState: 'IDLE',
      plan: null,
      lastScore: null,
      bestScore: null,
      xpEarned: null,
      reflectionAnswers: [],

      dispatch: (event: SessionEvent) => {
        set((state) => ({
          currentState: transition(state.currentState, event)
        }));
      },

      setPlan: (plan: SessionPlan) => set({ plan }),

      setLastScore: (score: number) => {
        set((state) => {
          const newBestScore = state.bestScore === null || score > state.bestScore
            ? score
            : state.bestScore;
          return { lastScore: score, bestScore: newBestScore };
        });
      },

      setXpEarned: (xp: number) => set({ xpEarned: xp }),
      setReflectionAnswers: (answers: string[]) => set({ reflectionAnswers: answers }),

      resetSession: () => set({
        currentState: 'IDLE',
        plan: null,
        lastScore: null,
        xpEarned: null,
        reflectionAnswers: []
      })
    }),
    {
      name: 'best_score_sustained_note_001',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bestScore: state.bestScore }), // Only persist bestScore
    }
  )
);
