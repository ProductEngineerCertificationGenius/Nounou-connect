// src/hooks/useAffiliation.ts
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
    // s'arrête de lui-même (refetchInterval renvoie false). Ce même
    // polling permet aussi de "réévaluer" naturellement la fenêtre
    // d'annulation côté UI, sans timer dédié.
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

// ===== CÔTÉ NOUNOU : annuler une demande envoyée =====
// Vérification du délai de 1 minute et du statut "en_attente"
export function useAnnulerDemandeAffiliation() {
  const queryClient = useQueryClient();
  const DELAI_ANNULATION_MS = 60 * 1000; // 1 minute
  
  return useMutation({
    mutationFn: async (params: { demandeId: string; nounouId: string }) => {
      // 1. Récupérer la demande pour vérifier sa date de création
      const { data: demande, error: fetchError } = await supabase
        .from("demandes_affiliation")
        .select("created_at, statut")
        .eq("id", params.demandeId)
        .single();
      
      if (fetchError) {
        console.error("Erreur lors de la récupération de la demande:", fetchError);
        throw new Error("Impossible de récupérer les informations de la demande.");
      }
      
      // 2. Vérifier que la demande est encore en attente
      if (demande.statut !== "en_attente") {
        throw new Error("Cette demande a déjà été traitée et ne peut plus être annulée.");
      }
      
      // 3. Vérifier le délai de 1 minute
      const tempsEcoule = Date.now() - new Date(demande.created_at).getTime();
      if (tempsEcoule >= DELAI_ANNULATION_MS) {
        throw new Error("Le délai d'annulation de 1 minute est dépassé. L'agence a déjà été notifiée.");
      }
      
      // 4. Supprimer la demande
      const { data, error } = await supabase
        .from("demandes_affiliation")
        .delete()
        .eq("id", params.demandeId)
        .eq("statut", "en_attente")
        .select();
      
      if (error) {
        console.error("Erreur lors de la suppression:", error);
        throw new Error("Erreur lors de l'annulation de la demande. Veuillez réessayer.");
      }
      
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible d'annuler cette demande (délai dépassé ou accès refusé par la base)."
        );
      }
      
      return { success: true };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["affiliation", "nounou", variables.nounouId] });
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil"] });
    },
    onError: (error) => {
      console.error("Erreur d'annulation:", error);
    }
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