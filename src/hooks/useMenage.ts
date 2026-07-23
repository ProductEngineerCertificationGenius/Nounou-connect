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
    queryKey: ["menage", "profil", currentUser?.id],
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menages")
        .select("*")
        .eq("user_id", currentUser!.id)
        .single();
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
