// Supabase Auth impose un mot de passe d'au moins 6 caractères (y compris
// sur le plan cloud géré, pas configurable en dessous de 6), ET, si la
// politique de force du mot de passe est activée (Authentication >
// Policies > Password Requirements), au moins une minuscule, une
// majuscule et un chiffre. Le PIN
// utilisateur ne fait que 4 chiffres (mobile money : Orange Money/Wave),
// donc on le complète de façon fixe et déterministe avant de l'envoyer à
// Supabase. L'utilisateur ne voit jamais cette transformation.
//
// Sécurité : ce préfixe n'ajoute AUCUNE entropie réelle (il est constant
// et public dans le code source) — il sert uniquement à satisfaire la
// contrainte technique de longueur de Supabase. La vraie protection
// contre le bruteforce d'un PIN à 4 chiffres (10 000 combinaisons) repose
// sur le rate limiting des tentatives de connexion configuré côté
// Supabase (Authentication > Rate Limits > "Sign in with password").
const PIN_PASSWORD_PREFIX = "Nc-Pin-V1-";

export const PIN_LENGTH = 4;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function pinToPassword(pin: string): string {
  return `${PIN_PASSWORD_PREFIX}${pin}`;
}