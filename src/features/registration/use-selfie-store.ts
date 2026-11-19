import { create } from 'zustand';

/** Hands the photo taken on the selfie screen back to "Photo and name". Memory only. */
interface SelfieState {
  uri: string | null;
  setUri: (uri: string | null) => void;
}

export const useSelfieStore = create<SelfieState>((set) => ({
  uri: null,
  setUri: (uri) => set({ uri }),
}));
