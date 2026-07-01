import { create } from 'zustand';
import type { Format } from '@unisson/content';

const RECENT_FORMATS_WINDOW = 5;

/**
 * État éphémère de LA session de pratique en cours. Stocke aussi le flag de misconception
 * et le dernier concept pour l'interleaving (PEDAGOG § phases 10-13).
 */
interface SessionState {
  itemsCompleted: number;
  recentFormats: Format[];
  pendingMisconception: boolean;
  lastConceptId: string | null;
  recordCompletion: (format: Format) => void;
  setPendingMisconception: (value: boolean) => void;
  setLastConceptId: (conceptId: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  itemsCompleted: 0,
  recentFormats: [],
  pendingMisconception: false,
  lastConceptId: null,
  recordCompletion: (format) =>
    set((state) => ({
      itemsCompleted: state.itemsCompleted + 1,
      recentFormats: [...state.recentFormats, format].slice(-RECENT_FORMATS_WINDOW),
    })),
  setPendingMisconception: (value) => set({ pendingMisconception: value }),
  setLastConceptId: (conceptId) => set({ lastConceptId: conceptId }),
  reset: () => set({ itemsCompleted: 0, recentFormats: [], pendingMisconception: false, lastConceptId: null }),
}));
