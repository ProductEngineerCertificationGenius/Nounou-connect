// src/store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProfileType = "menage" | "agence" | "nounou";

export type NounouMode = "avec-agence" | "sans-agence" | null;

export interface ProfileRow {
  id: string;
  user_id?: string;
  nom?: string;
  telephone?: string;
  quartier?: string;
  agence_id?: string | null;
  identifiant?: string | null;
  ethnie?: string | null;
  experience?: string;
  langues?: string[];
  tarif?: number;
  disponible?: boolean;
  photo_url?: string;
  note_moyenne?: number;
  created_at?: string;
  agence?: {
    id: string;
    nom: string;
    quartier: string;
    telephone: string;
  };
  [key: string]: unknown;
}

interface AuthState {
  // État
  profileType: ProfileType | null;
  user: ProfileRow | null;
  nounouMode: NounouMode;
  nounouIdentifiant: string | null;

  // Setters
  setProfileType: (profileType: ProfileType | null) => void;
  setUser: (user: ProfileRow | null) => void;
  setNounouMode: (mode: NounouMode) => void;           // ✅ Existe
  setNounouIdentifiant: (identifiant: string | null) => void;

  // Actions
  logout: () => void;
  getAuthUserId: () => string | null;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      profileType: null,
      user: null,
      nounouMode: null,
      nounouIdentifiant: null,

      // Setters
      setProfileType: (profileType) => set({ profileType }),
      setUser: (user) => set({ user }),
      setNounouMode: (mode) => set({ nounouMode: mode }),
      setNounouIdentifiant: (identifiant) => set({ nounouIdentifiant: identifiant }),

      // Actions
      logout: () => set({
        user: null,
        profileType: null,
        nounouMode: null,
        nounouIdentifiant: null,
      }),

      getAuthUserId: () => {
        const user = get().user;
        return user?.user_id || user?.id || null;
      },

      isAuthenticated: () => {
        const state = get();
        return Boolean(state.user && state.profileType);
      },
    }),
    {
      name: "nounou-connect-auth",
    }
  )
);