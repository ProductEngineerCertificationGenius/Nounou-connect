import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "../store/useAuthStore";

// Le fichier était vide (`lib/supabase.ts`) : @supabase/supabase-js était
// déjà en dépendance mais jamais réellement instancié. C'est le client
// utilisé par tous les hooks (useAuth, useAgence, useMenage) à la place
// des appels axios vers un backend REST maison qui n'existe pas.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // On ne bloque pas le démarrage de l'app (utile en dev sans .env
  // renseigné), mais chaque appel Supabase échouera explicitement plutôt
  // que silencieusement. Voir .env.example à la racine du projet.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes : " +
      "les appels Supabase échoueront. Copiez .env.example vers .env.local."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      // Assurer la persistance de la session en localStorage
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Le store zustand (useAuthStore, persisté séparément en localStorage) et
// la session Supabase Auth peuvent diverger : déconnexion, expiration de
// session, ou reconnexion avec un autre numéro dans le même navigateur.
// Sans ce listener, l'app continue d'utiliser la fiche profil obsolète du
// store pour interroger la base avec le user_id de la NOUVELLE session
// Supabase → requêtes qui ne trouvent rien (406) puis écritures refusées
// par les policies RLS (403).
if (isSupabaseConfigured && typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    const storedUserId = useAuthStore.getState().user?.user_id;

    if (event === "SIGNED_OUT" || !session) {
      if (storedUserId) useAuthStore.getState().logout();
      return;
    }

    if (storedUserId && storedUserId !== session.user.id) {
      // Fiche locale associée à un autre compte : on force une
      // reconnexion propre plutôt que de laisser l'app requêter avec
      // des identifiants incohérents.
      useAuthStore.getState().logout();
    }
  });
}
