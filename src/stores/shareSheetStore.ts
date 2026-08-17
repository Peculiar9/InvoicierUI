import { create } from 'zustand';

export interface SharePayload {
  /** the full sentence: who's asking, how much, the link */
  message: string;
  /** the bare payment link, for targets that take url and text separately */
  link: string;
  /** e.g. ADA-0004, for the sheet's title */
  number?: string;
}

interface ShareSheetState {
  payload: SharePayload | null;
  open: (payload: SharePayload) => void;
  close: () => void;
}

/**
 * The after-copy share sheet. Copying a payment link is almost always the
 * first half of "send it on WhatsApp", so the sheet offers the second half
 * the moment the copy lands, instead of leaving the user to go find the app.
 */
export const useShareSheetStore = create<ShareSheetState>((set) => ({
  payload: null,
  open: (payload) => set({ payload }),
  close: () => set({ payload: null }),
}));
