// src/lib/profiles.ts
import type { ProfileType } from "../store/useAuthStore";

export const PROFILE_TABLES: Record<ProfileType, string> = {
  menage: "menages",
  agence: "agences",
  nounou: "nounous",
};

interface SignupFormData {
  nom: string;
  telephone: string;
  quartier: string;
  [key: string]: unknown;
}

// nounou volontairement absent des cas gérés : `agence_id` est NOT NULL
// sur `nounous`, une nounou ne peut donc pas s'auto-inscrire sans être
// déjà rattachée à une agence (cf. cahier des charges §6). Le compte est
// créé par l'agence (écran Agence > Ajouter une nounou / GestionNounous).
export function buildProfileInsert(
  _profileType: "menage" | "agence",
  userId: string,
  formData: SignupFormData
) {
  return {
    user_id: userId,
    nom: formData.nom,
    telephone: formData.telephone,
    quartier: formData.quartier,
  };
}