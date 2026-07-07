import { create } from 'zustand';

export type PendingUndoKind = 'habit_slip' | 'daily_complete';

export interface PendingUndo {
  kind: PendingUndoKind;
  /** habit_slip: the habit_slip event id. daily_complete: the daily's id. */
  id: string;
  label: string;
  offeredAt: number;
}

interface UndoStore {
  pending: PendingUndo | null;
  offer: (undo: Omit<PendingUndo, 'offeredAt'>) => void;
  dismiss: () => void;
}

/**
 * Ephemeral UI state, same tier as gameStore's `celebration` — deliberately
 * kept out of persistence and cloud sync. A missed undo window just means the
 * action stands, same as it always did.
 */
export const useUndoStore = create<UndoStore>()((set) => ({
  pending: null,
  offer: (undo) => set({ pending: { ...undo, offeredAt: Date.now() } }),
  dismiss: () => set({ pending: null }),
}));
