import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProfileType = "menage" | "agence" | "nounou";

export interface ProfileRow {
  id: string;
  user_id?: string;
  nom?: string;
  telephone?: string;
  quartier?: string;
  [key: string]: unknown;
}

interface AuthState {
  profileType: ProfileType | null;
  user: ProfileRow | null;
  setProfileType: (profileType: ProfileType | null) => void;
  setUser: (user: ProfileRow | null) => void;
  logout: () => void;
}

// zustand était en dépendance (package.json) mais jamais utilisé : la
// session/le profil actif n'existaient nulle part (Noah stockait un
// simple `token` dans localStorage, cf. ancien lib/axios.ts, supprimé).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profileType: null,
      user: null,
      setProfileType: (profileType) => set({ profileType }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, profileType: null }),
    }),
    { name: "nounou-connect-auth" }
  )
);
