// src/lib/pin.ts

// Supabase Auth impose un mot de passe d'au moins 6 caractères.
// Le PIN utilisateur ne fait que 4 chiffres, donc on le complète
// de façon fixe et déterministe avant de l'envoyer à Supabase.
// L'utilisateur ne voit jamais cette transformation.
const PIN_PASSWORD_PREFIX = "Nc-Pin-V1-";

export const PIN_LENGTH = 4;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function pinToPassword(pin: string): string {
  return `${PIN_PASSWORD_PREFIX}${pin}`;
}