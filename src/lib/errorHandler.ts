// ============================================================
// Traduction des erreurs techniques (Postgres/PostgREST via
// Supabase, erreurs réseau, erreurs JS génériques) en messages
// compréhensibles pour l'utilisateur final.
//
// Sans ça, l'utilisateur pouvait voir des messages du type :
//   "new row violates row-level security policy for table \"nounous\""
//   "duplicate key value violates unique constraint
//    \"nounous_user_id_key\""
// ... ce qui est le symptôme "erreurs qui s'affichent en brut".
//
// 🔧 Pour retrouver le message brut en dev (debug), voir le guide
// DEBUG_ERRORS.md à la racine du projet — NE PAS activer
// SHOW_RAW_ERRORS en production (voir explication du fichier).
// ============================================================

const SHOW_RAW_ERRORS = false;

interface KnownError {
  test: (message: string, code?: string) => boolean;
  friendly: string;
}

// Erreurs "signature technique connue" -> message FR compréhensible.
// Ordre important : on prend le premier qui matche.
const KNOWN_ERRORS: KnownError[] = [
  {
    test: (msg) => msg.includes("row-level security policy"),
    friendly: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  },
  {
    test: (msg, code) => code === "23505" || msg.includes("duplicate key value"),
    friendly: "Cette information existe déjà.",
  },
  {
    test: (msg, code) => code === "23503" || msg.includes("violates foreign key constraint"),
    friendly: "Action impossible : une donnée liée est manquante ou invalide.",
  },
  {
    test: (msg, code) => code === "23502" || msg.includes("null value in column"),
    friendly: "Certains champs obligatoires sont manquants.",
  },
  {
    test: (msg) =>
      msg.toLowerCase().includes("invalid login credentials") ||
      msg.toLowerCase().includes("invalid phone") && msg.toLowerCase().includes("password"),
    friendly: "Téléphone ou PIN incorrect.",
  },
  {
    test: (msg) => msg.includes("JWT") || msg.toLowerCase().includes("not authenticated"),
    friendly: "Votre session a expiré. Merci de vous reconnecter.",
  },
  {
    test: (msg) =>
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.toLowerCase().includes("network request failed"),
    friendly: "Problème de connexion. Vérifiez votre connexion internet et réessayez.",
  },
];

// Heuristique pour laisser passer tels quels les messages déjà
// écrits à la main pour l'utilisateur dans le code (ex: `throw new
// Error("Téléphone ou PIN incorrect.")` dans useAuth.ts) : ils sont
// courts, en français, sans jargon Postgres/HTTP.
function isLikelyUserFriendly(message: string): boolean {
  const technicalMarkers = [
    "relation",
    "constraint",
    "column",
    "syntax error",
    "permission denied",
    "violates",
    "duplicate key",
    "row-level security",
    "JWT",
    "PGRST",
    "fetch",
    "Failed to",
    "TypeError",
    "is not a function",
    "undefined is not",
  ];
  if (technicalMarkers.some((m) => message.includes(m))) return false;
  if (message.length > 160) return false;
  return true;
}

export const getErrorMessage = (error: any): string => {
  const rawMessage: string =
    error?.response?.data?.message ??
    (typeof error?.response?.data === "string" ? error.response.data : undefined) ??
    error?.message ??
    "";
  const code: string | undefined = error?.code;

  if (SHOW_RAW_ERRORS) {
    return rawMessage
      ? `[DEBUG] ${rawMessage}${code ? ` (code: ${code})` : ""}`
      : "Une erreur est survenue. Veuillez réessayer.";
  }

  const known = KNOWN_ERRORS.find((k) => k.test(rawMessage, code));
  if (known) return known.friendly;

  if (rawMessage && isLikelyUserFriendly(rawMessage)) {
    return rawMessage;
  }

  return "Une erreur est survenue. Veuillez réessayer.";
};
