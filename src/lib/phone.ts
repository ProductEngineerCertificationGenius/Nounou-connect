// Normalise un numéro de téléphone saisi par l'utilisateur (espaces,
// tirets, format local "0X XX XX XX XX") vers le format E.164 requis par
// les fournisseurs SMS (Twilio...) branchés sur Supabase Auth.
//
// Exemples :
//   "07 00 00 00 00"        -> "+2250700000000"
//   "+225 07 00 00 00 00"   -> "+2250700000000"
//   "225 07 00 00 00 00"    -> "+2250700000000"
//   "+2250700000000"        -> "+2250700000000" (inchangé)
export function normalizePhoneCI(raw: string): string {
  if (!raw) return raw;
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("225")) return `+${digits}`;
  return `+225${digits}`;
}
