import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { AGENCES, NOUNOUS, DEMANDES, RECHERCHES_HISTORIQUE } from "../data/mockData";

// Chaque hook suit le même principe : si Supabase est configuré
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY renseignées), la requête
// interroge les tables Postgres via l'API auto-générée. Sinon, l'app
// reste utilisable avec les données de démonstration, le temps que le
// schéma Supabase (agences, nounous, demandes, avis...) soit provisionné.

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

export function useAgences(filters = {}) {
  return useQuery({
    queryKey: ["agences", filters],
    queryFn: async () => {
      if (isSupabaseConfigured) {
        let query = supabase.from("agences").select("*");
        if (filters.quartier) query = query.eq("quartier", filters.quartier);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
      await wait(250);
      return filters.quartier
        ? AGENCES.filter((a) => a.quartier === filters.quartier)
        : AGENCES;
    },
  });
}

export function useAgence(id) {
  return useQuery({
    queryKey: ["agence", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("agences")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
      }
      await wait(150);
      return AGENCES.find((a) => a.id === id);
    },
  });
}

export function useNounousByAgence(agenceId) {
  return useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("nounous")
          .select("*")
          .eq("agence_id", agenceId);
        if (error) throw error;
        return data;
      }
      await wait(150);
      return NOUNOUS.filter((n) => n.agenceId === agenceId);
    },
  });
}

export function useNounou(id) {
  return useQuery({
    queryKey: ["nounou", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("nounous")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
      }
      await wait(150);
      return NOUNOUS.find((n) => n.id === id);
    },
  });
}

export function useDemandes(agenceId) {
  return useQuery({
    queryKey: ["demandes", agenceId],
    enabled: Boolean(agenceId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("demandes")
          .select("*")
          .eq("agence_id", agenceId)
          .order("date", { ascending: false });
        if (error) throw error;
        return data;
      }
      await wait(150);
      return DEMANDES.filter((d) => d.agenceId === agenceId);
    },
  });
}

export function useDemande(id) {
  return useQuery({
    queryKey: ["demande", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("demandes")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data;
      }
      await wait(120);
      return DEMANDES.find((d) => d.id === id);
    },
  });
}

export function useAssignerNounou() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ demandeId, nounouNom }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("demandes")
          .update({ statut: "Assignée", nounou_assignee: nounouNom })
          .eq("id", demandeId);
        if (error) throw error;
        return true;
      }
      await wait(200);
      const demande = DEMANDES.find((d) => d.id === demandeId);
      if (demande) {
        demande.statut = "Assignée";
        demande.nounouAssignee = nounouNom;
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes"] });
      queryClient.invalidateQueries({ queryKey: ["demande"] });
    },
  });
}

export function useRecherchesHistorique() {
  return useQuery({
    queryKey: ["recherches-historique"],
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("recherches")
          .select("*")
          .order("date", { ascending: false });
        if (error) throw error;
        return data;
      }
      await wait(150);
      return RECHERCHES_HISTORIQUE;
    },
  });
}

export function useEnregistrerAvis() {
  return useMutation({
    mutationFn: async ({ nounouId, note, commentaire }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("avis")
          .insert({ nounou_id: nounouId, note, commentaire });
        if (error) throw error;
        return true;
      }
      await wait(200);
      console.info("[demo] Avis enregistré", { nounouId, note, commentaire });
      return true;
    },
  });
}
