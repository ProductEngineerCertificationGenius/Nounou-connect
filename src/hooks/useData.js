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
        if (filters.quartier) {
          // rechercher_agences (cf. 0003_functions.sql) : ne renvoie que les
          // agences ayant au moins une nounou disponible dans ce quartier,
          // triées par note. Plus pertinent qu'un simple filtre sur
          // agences.quartier (qui est le quartier du siège, pas des nounous).
          const { data, error } = await supabase.rpc("rechercher_agences", {
            p_quartier: filters.quartier,
            p_besoin: filters.besoin ?? null,
          });
          if (error) throw error;
          return data;
        }
        const { data, error } = await supabase.from("agences").select("*");
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
    // NB : on passe nounouId (uuid), pas le nom. On appelle la fonction RPC
    // `assigner_nounou` (cf. 0003_functions.sql) plutôt qu'un update direct :
    // elle garantit côté serveur que la nounou est disponible et appartient
    // bien à l'agence de la demande (sinon exception -> throw ici).
    mutationFn: async ({ demandeId, nounouId }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc("assigner_nounou", {
          p_demande_id: demandeId,
          p_nounou_id: nounouId,
        });
        if (error) throw error;
        return data;
      }
      await wait(200);
      const demande = DEMANDES.find((d) => d.id === demandeId);
      const nounou = NOUNOUS.find((n) => n.id === nounouId);
      if (demande && nounou) {
        demande.statut = "Assignée";
        demande.nounouAssignee = nounou.nom;
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
    // menageId est requis : colonne NOT NULL et exigée par la policy RLS
    // "avis_insert_menage" (with check menage_id in (select id from
    // menages where user_id = auth.uid())).
    mutationFn: async ({ nounouId, menageId, note, commentaire }) => {
      if (isSupabaseConfigured) {
        if (!menageId) {
          throw new Error("Impossible d'enregistrer l'avis : ménage non identifié.");
        }
        const { error } = await supabase
          .from("avis")
          .insert({ nounou_id: nounouId, menage_id: menageId, note, commentaire });
        if (error) throw error;
        return true;
      }
      await wait(200);
      console.info("[demo] Avis enregistré", { nounouId, menageId, note, commentaire });
      return true;
    },
  });
}

export function useEnregistrerRecherche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ menageId, quartier, besoin, temps, logement }) => {
      if (isSupabaseConfigured) {
        if (!menageId) return null; // pas connecté : pas d'historique à tracer
        const { error } = await supabase
          .from("recherches")
          .insert({ menage_id: menageId, quartier, besoin, temps, logement });
        if (error) throw error;
        return true;
      }
      await wait(100);
      RECHERCHES_HISTORIQUE.unshift({
        id: `r-${Date.now()}`,
        quartier,
        besoin,
        temps,
        logement,
        date: new Date().toISOString(),
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recherches-historique"] });
    },
  });
}
