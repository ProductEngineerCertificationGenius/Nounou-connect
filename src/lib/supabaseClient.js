import { createClient } from "@supabase/supabase-js";

// Cf. ADR 0001 / 0002 : architecture BaaS, Supabase comme fournisseur.
// Les clés sont lues depuis les variables d'environnement Vite
// (fichier .env.local, non versionné) :
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // En l'absence de projet Supabase configuré, l'app tourne sur les
  // données de démonstration (src/data/mockData.js) afin de rester
  // utilisable pour le prototypage front-end. Voir src/hooks pour le
  // point de bascule entre mock et Supabase réel.
  console.warn(
    "[Nounou Connect] Supabase non configuré — utilisation des données de démonstration. " +
      "Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour vous connecter au vrai backend."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
