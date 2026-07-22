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
          // rechercher_agences (cf. 0003/0006_functions.sql) : ne renvoie que
          // les agences ayant au moins une nounou disponible dans ce
          // quartier, triées par note. Renvoie des lignes `agences` brutes
          // (note_moyenne, pas de nbNounous/nbAvis) : on complète ces champs
          // via agences_public pour rester cohérent avec AgencyCard.jsx.
          const { data: matches, error } = await supabase.rpc("rechercher_agences", {
            p_quartier: filters.quartier,
            p_besoin: filters.besoin ?? null,
          });
          if (error) throw error;
          if (!matches?.length) return [];
          const { data, error: publicError } = await supabase
            .from("agences_public")
            .select("*")
            .in(
              "id",
              matches.map((a) => a.id)
            );
          if (publicError) throw publicError;
          return data;
        }
        // `agences_public` (cf. 0007_calibrage_affichage.sql) expose déjà
        // `note`, `nbNounous` et `nbAvis` dans la forme attendue par
        // AgencyCard.jsx / AgencyProfile.jsx.
        const { data, error } = await supabase.from("agences_public").select("*");
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
          .from("agences_public")
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

export function useNounousByAgence(agenceId, { table = "nounous" } = {}) {
  return useQuery({
    queryKey: ["nounous", table, "agence", agenceId],
    enabled: Boolean(agenceId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        // `note:note_moyenne` : alias attendu par NannyCard.jsx. Fonctionne
        // pour `nounous` comme pour `nounous_public`, les deux exposent
        // note_moyenne.
        const { data, error } = await supabase
          .from(table)
          .select("*, note:note_moyenne")
          .eq("agence_id", agenceId);
        if (error) throw error;
        return data;
      }
      await wait(150);
      return NOUNOUS.filter((n) => n.agenceId === agenceId);
    },
  });
}

// Variante publique : à utiliser sur les écrans consultés par un ménage
// (ou un visiteur non connecté) pour lister le vivier d'une agence. Elle
// lit `nounous_public` (cf. 0006_nounou_telephone_privacy.sql), une vue
// qui expose les mêmes nounous SANS le champ `telephone`.
export function useNounousPublicByAgence(agenceId) {
  return useNounousByAgence(agenceId, { table: "nounous_public" });
}

export function useNounou(id, { table = "nounous" } = {}) {
  return useQuery({
    queryKey: ["nounou", table, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from(table)
          .select("*, note:note_moyenne")
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

// Avis d'une nounou (table à part, lecture publique — cf. policy
// avis_select_public). Utilisé par NannyProfile.jsx (ménage) et
// Reviews.jsx (nounou), plutôt que d'attendre un `nounou.avis` imbriqué
// qui n'existe pas côté base (avis est une table séparée).
export function useAvisByNounou(nounouId) {
  return useQuery({
    queryKey: ["avis", "nounou", nounouId],
    enabled: Boolean(nounouId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("avis")
          .select("*")
          .eq("nounou_id", nounouId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }
      await wait(150);
      return NOUNOUS.find((n) => n.id === nounouId)?.avis || [];
    },
  });
}

// Missions assignées à une nounou (AssignmentHistory.jsx). Nécessite la
// policy `demandes_select_nounou_assignee` (0007) pour qu'une nounou
// puisse lire ses propres demandes assignées, et `menages_select_via_demande`
// (0007) pour voir le nom du ménage.
export function useMissionsAssignees(nounouId) {
  return useQuery({
    queryKey: ["missions", "nounou", nounouId],
    enabled: Boolean(nounouId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("demandes")
          .select("id, date, statut, menage:menages(nom)")
          .eq("nounou_assignee_id", nounouId)
          .order("date", { ascending: false });
        if (error) throw error;
        return data.map((h) => ({ ...h, menage: h.menage?.nom }));
      }
      await wait(150);
      return NOUNOUS.find((n) => n.id === nounouId)?.historique || [];
    },
  });
}

// Variante publique : fiche nounou consultée par un ménage. Lit
// `nounous_public` (pas de `telephone` exposé) — voir
// 0006_nounou_telephone_privacy.sql.
export function useNounouPublic(id) {
  return useNounou(id, { table: "nounous_public" });
}

function flattenDemande(d) {
  return {
    ...d,
    menage: d.menage?.nom,
    nounouAssignee: d.nounou_assignee?.nom,
  };
}

export function useDemandes(agenceId) {
  return useQuery({
    queryKey: ["demandes", agenceId],
    enabled: Boolean(agenceId),
    queryFn: async () => {
      if (isSupabaseConfigured) {
        // Embedding PostgREST : `menage:menages(nom)` et
        // `nounou_assignee:nounous!nounou_assignee_id(nom)` nécessitent la
        // policy `menages_select_via_demande` (0007) pour être lisibles par
        // l'agence — sans elle, ces champs remonteraient toujours null.
        const { data, error } = await supabase
          .from("demandes")
          .select("*, menage:menages(nom), nounou_assignee:nounous!nounou_assignee_id(nom)")
          .eq("agence_id", agenceId)
          .order("date", { ascending: false });
        if (error) throw error;
        return data.map(flattenDemande);
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
          .select("*, menage:menages(nom), nounou_assignee:nounous!nounou_assignee_id(nom)")
          .eq("id", id)
          .single();
        if (error) throw error;
        return flattenDemande(data);
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
