import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

// ============================================================
// Réécriture complète : la version d'origine appelait un backend REST
// maison. Point de conception à corriger au passage : le nom
// `useRechercherNounous` laissait supposer qu'on recherche des NOUNOUS
// directement. Dans notre schéma réel, la recherche ménage cible des
// AGENCES ayant au moins une nounou disponible correspondant aux
// critères (RPC `rechercher_agences`) — le ménage consulte ensuite le
// vivier de l'agence choisie (useAgenceNounous, dans useAgence.ts,
// utilisable aussi côté ménage en lecture).
// ============================================================

// ===== PROFIL DU MÉNAGE CONNECTÉ =====
export function useMenageProfil() {
  const currentUser = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["menage", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      // Récupérer le userId depuis la session Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;
      
      console.log("[useMenageProfil] Session auth userId:", authUserId);
      console.log("[useMenageProfil] Store user_id:", currentUser!.user_id);
      
      if (!authUserId) {
        throw new Error("Pas de session auth");
      }
      
      // Vérifier la cohérence
      if (authUserId !== currentUser!.user_id) {
        console.warn("[useMenageProfil] MISMATCH: auth userId !== store user_id", {
          auth: authUserId,
          store: currentUser!.user_id
        });
      }
      
      // Utiliser TOUJOURS l'auth userId pour les requêtes RLS
      const { data, error } = await supabase
        .from("menages")
        .select("*")
        .eq("user_id", authUserId)
        .single();
      
      console.log("[useMenageProfil] Réponse:", { data, error: error?.message });
      
      if (error) throw error;
      return data;
    },
  });
}

interface RechercheCriteria {
  quartier: string;
  besoin?: string;
  temps?: string;
  logement?: string;
}

// ===== RECHERCHE (retourne des AGENCES, pas des nounous — voir note ci-dessus) =====
export function useRechercherNounous() {
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (criteria: RechercheCriteria) => {
      if (!isSupabaseConfigured) return [];

      const { data: matches, error } = await supabase.rpc("rechercher_agences", {
        p_quartier: criteria.quartier,
        p_besoin: criteria.besoin ?? null,
      });
      if (error) throw error;

      // Historique de recherche : uniquement si le ménage est connecté
      // (menage_id est requis par la policy RLS `recherches`).
      if (currentUser?.id) {
        await supabase.from("recherches").insert({
          menage_id: currentUser.id,
          quartier: criteria.quartier,
          besoin: criteria.besoin,
          temps: criteria.temps,
          logement: criteria.logement,
        });
      }

      if (!matches?.length) return [];
      const { data, error: publicError } = await supabase
        .from("agences_public")
        .select("*")
        .in(
          "id",
          matches.map((a: { id: string }) => a.id)
        );
      if (publicError) throw publicError;
      return data;
    },
  });
}

// ===== LISTE COMPLÈTE DES AGENCES (sans filtre) =====
export function useAgencesDisponibles() {
  return useQuery({
    queryKey: ["agences_public", "toutes"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase.from("agences_public").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// ===== HISTORIQUE DES RECHERCHES =====
export function useHistoriqueRecherches() {
  const currentUser = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["recherches", "historique", currentUser?.id],
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recherches")
        .select("*")
        .eq("menage_id", currentUser!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
