// Normalise un numéro de téléphone saisi par l'utilisateur (avec espaces,
// tirets, ou format local "0X XX XX XX XX") vers le format E.164 requis par
// les fournisseurs SMS (Twilio, Vonage, ...) branchés sur Supabase Auth.
//
// Exemples :
//   "07 00 00 00 00"        -> "+2250700000000"
//   "+225 07 00 00 00 00"   -> "+2250700000000"
//   "225 07 00 00 00 00"    -> "+2250700000000"
//   "+2250700000000"        -> "+2250700000000" (inchangé)
export function normalizePhoneCI(raw) {
  if (!raw) return raw;

  // On retire tout sauf les chiffres et le "+" initial éventuel.
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus) {
    return `+${digits}`;
  }
  if (digits.startsWith("225")) {
    return `+${digits}`;
  }
  // Numéro local ivoirien (10 chiffres, ex: 0700000000) -> on garde tel
  // quel après le "225" (la Côte d'Ivoire inclut le 0 initial en E.164).
  return `+225${digits}`;
}
