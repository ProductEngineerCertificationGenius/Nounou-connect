import { create } from "zustand";
import { persist } from "zustand/middleware";

// Etat global léger (cf. ADR 0006) : le profil actif (ménage / agence /
// nounou) et l'utilisateur connecté, partagés entre tous les écrans.
export const useAuthStore = create(
  persist(
    (set) => ({
      profileType: null, // "menage" | "agence" | "nounou"
      user: null, // { id, phone, name, quartier, ... }
      setProfileType: (profileType) => set({ profileType }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, profileType: null }),
    }),
    { name: "nounou-connect-auth" }
  )
);
