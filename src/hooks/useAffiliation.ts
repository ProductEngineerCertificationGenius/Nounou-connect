import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ============================================================
// Système de demande d'affiliation (cf. migration
// 0015_demandes_affiliation_nounou.sql) : une nounou sans agence
// envoie une vraie demande traçable (au lieu d'un simple contact
// WhatsApp) à une agence de sa zone ; l'agence accepte ou refuse.
// ============================================================

export interface DemandeAffiliation {
  id: string;
  nounou_id: string;
  agence_id: string;
  statut: "en_attente" | "acceptee" | "refusee";
  created_at: string;
  updated_at: string;
}

// ===== CÔTÉ NOUNOU : mes demandes envoyées =====
export function useMesDemandesAffiliation(nounouId?: string) {
  return useQuery({
    queryKey: ["affiliation", "nounou", nounouId],
    enabled: Boolean(nounouId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes_affiliation")
        .select("*")
        .eq("nounou_id", nounouId!);
      if (error) throw error;
      return data as DemandeAffiliation[];
    },
    // Tant qu'une demande est "en_attente", on interroge le serveur
    // toutes les 8s pour détecter une réponse de l'agence (acceptation
    // ou refus) sans que la nounou ait besoin de recharger la page.
    // Dès que toutes les demandes ont un statut final, le polling
    // s'arrête de lui-même (refetchInterval renvoie false).
    refetchInterval: (query) => {
      const demandes = query.state.data as DemandeAffiliation[] | undefined;
      const enAttente = demandes?.some((d) => d.statut === "en_attente");
      return enAttente ? 8000 : false;
    },
  });
}

export function useEnvoyerDemandeAffiliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nounouId, agenceId }: { nounouId: string; agenceId: string }) => {
      const { data, error } = await supabase
        .from("demandes_affiliation")
        .insert({ nounou_id: nounouId, agence_id: agenceId })
        .select()
        .single();
      if (error) throw error;
      return data as DemandeAffiliation;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["affiliation", "nounou", variables.nounouId] });
    },
  });
}

// ===== CÔTÉ AGENCE : demandes reçues =====
export interface DemandeAffiliationAvecNounou extends DemandeAffiliation {
  nounou: { id: string; nom: string; telephone: string; quartier: string; photo_url?: string } | null;
}

export function useDemandesAffiliationAgence(agenceId?: string) {
  return useQuery({
    queryKey: ["affiliation", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes_affiliation")
        .select("*, nounou:nounous(id, nom, telephone, quartier, photo_url)")
        .eq("agence_id", agenceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DemandeAffiliationAvecNounou[];
    },
  });
}

export function useRepondreDemandeAffiliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ demandeId, accepter }: { demandeId: string; accepter: boolean }) => {
      const { data, error } = await supabase.rpc("repondre_demande_affiliation", {
        p_demande_id: demandeId,
        p_accepter: accepter,
      });
      if (error) throw error;
      return data as DemandeAffiliation;
    },
    onSuccess: () => {
      // On invalide largement : accepter une demande change aussi le
      // vivier de nounous de l'agence (agence_id mis à jour côté nounou).
      queryClient.invalidateQueries({ queryKey: ["affiliation"] });
      queryClient.invalidateQueries({ queryKey: ["nounous", "agence"] });
    },
  });
}
