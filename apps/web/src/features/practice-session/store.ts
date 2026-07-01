import { create } from 'zustand';
import type { Format } from '@unisson/content';

const RECENT_FORMATS_WINDOW = 5;

/**
 * État éphémère de LA session de pratique en cours (§2 du plan frontend : "petit store Zustand
 * scopant la session en cours seulement" — pas d'état global applicatif). `recentFormats`
 * alimente l'anti-monotonie du Format Selector (`LearnerFormatContext.recentFormats`, §6.5).
 */
interface SessionState {
  itemsCompleted: number;
  recentFormats: Format[];
  recordCompletion: (format: Format) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  itemsCompleted: 0,
  recentFormats: [],
  recordCompletion: (format) =>
    set((state) => ({
      itemsCompleted: state.itemsCompleted + 1,
      recentFormats: [...state.recentFormats, format].slice(-RECENT_FORMATS_WINDOW),
    })),
  reset: () => set({ itemsCompleted: 0, recentFormats: [] }),
}));
