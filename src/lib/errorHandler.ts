// src/lib/errorHandler.ts

// ============================================================
// Traduction des erreurs techniques en messages compréhensibles
// ============================================================

const SHOW_RAW_ERRORS = false;

interface KnownError {
  test: (message: string, code?: string) => boolean;
  friendly: string;
}

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
      (msg.toLowerCase().includes("invalid phone") && msg.toLowerCase().includes("password")),
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

function isLikelyUserFriendly(message: string): boolean {
  const technicalMarkers = [
    "relation", "constraint", "column", "syntax error",
    "permission denied", "violates", "duplicate key",
    "row-level security", "JWT", "PGRST", "fetch",
    "Failed to", "TypeError", "is not a function", "undefined is not",
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