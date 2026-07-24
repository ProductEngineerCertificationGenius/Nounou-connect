// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "../store/useAuthStore";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
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
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

if (isSupabaseConfigured && typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    const storedUserId = useAuthStore.getState().user?.user_id;

    if (event === "SIGNED_OUT" || !session) {
      if (storedUserId) useAuthStore.getState().logout();
      return;
    }

    if (storedUserId && storedUserId !== session.user.id) {
      useAuthStore.getState().logout();
    }
  });
}