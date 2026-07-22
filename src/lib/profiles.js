// Mapping entre les champs des formulaires d'inscription (menage/agence) et
// les colonnes réelles des tables Supabase. Les noms de champs des
// formulaires ne correspondent pas toujours 1:1 aux colonnes (ex: le
// formulaire Ménage utilise `name`, la colonne est `nom`).

export const PROFILE_TABLES = {
  menage: "menages",
  agence: "agences",
  nounou: "nounous",
};

// nounou volontairement absent : agence_id est NOT NULL sur `nounous`,
// une nounou ne peut donc pas s'auto-inscrire sans être déjà rattachée à
// une agence (cf. cahier des charges §6). Le compte doit être créé par
// l'agence (écran Agence > Ajouter une nounou).
export function buildProfileInsert(profileType, userId, formData) {
  switch (profileType) {
    case "menage":
      return {
        user_id: userId,
        nom: formData.name,
        telephone: formData.phone,
        quartier: formData.quartier,
      };
    case "agence":
      return {
        user_id: userId,
        nom: formData.nom,
        telephone: formData.phone,
        quartier: formData.quartier,
      };
    default:
      throw new Error(`Inscription auto non supportée pour le profil "${profileType}".`);
  }
}
