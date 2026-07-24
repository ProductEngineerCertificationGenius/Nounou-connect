// src/hooks/useAgence.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

// ===== PROFIL DE L'AGENCE CONNECTÉE =====
export function useAgenceProfil() {
  const currentUser = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["agence", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      if (currentUser?.user_id && currentUser.user_id !== authUserId) {
        throw new Error(
          "Session incohérente : profil local différent du compte connecté. Reconnectez-vous."
        );
      }

      const { data, error } = await supabase
        .from("agences")
        .select("*")
        .eq("user_id", authUserId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "Aucune fiche agence trouvée pour ce compte. La fiche n'a peut-être pas été créée à l'inscription."
        );
      }
      return data;
    },
  });
}

// ===== VIVIER DE NOUNOUS DE L'AGENCE =====
export function useAgenceNounous(agenceId?: string) {
  return useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nounous")
        .select("*, note:note_moyenne")
        .eq("agence_id", agenceId!);
      if (error) throw error;
      return data;
    },
  });
}

// ===== AJOUTER UNE NOUNOU AU VIVIER =====
interface NounouInput {
  agenceId: string;
  nom: string;
  telephone?: string;
  experience?: string;
  langues?: string[];
  tarif?: number;
  quartier?: string;
  disponible?: boolean;
}

export function useAjouterNounou() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agenceId, ...nounouData }: NounouInput) => {
      if (!isSupabaseConfigured) return { id: `demo-${Date.now()}`, ...nounouData };
      const { data, error } = await supabase
        .from("nounous")
        .insert({ ...nounouData, agence_id: agenceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nounous", "agence", variables.agenceId] });
    },
  });
}

// ===== MODIFIER UNE NOUNOU EXISTANTE =====
export function useModifierNounou() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agenceId: _agenceId, ...nounouData }: NounouInput & { id: string }) => {
      if (!isSupabaseConfigured) return { id, ...nounouData };
      const { data, error } = await supabase
        .from("nounous")
        .update(nounouData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nounous", "agence", variables.agenceId] });
    },
  });
}

// ===== DEMANDES REÇUES PAR L'AGENCE =====
export function useAgenceDemandes(agenceId?: string) {
  return useQuery({
    queryKey: ["demandes", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes")
        .select("*, menage:menages(nom), nounou_assignee:nounous!nounou_assignee_id(nom)")
        .eq("agence_id", agenceId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data.map((d) => ({
        ...d,
        menage: d.menage?.nom,
        nounouAssignee: d.nounou_assignee?.nom,
      }));
    },
  });
}

// ===== ASSIGNER UNE NOUNOU À UNE DEMANDE =====
export function useAssignerNounou() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ demandeId, nounouId }: { demandeId: string; nounouId: string }) => {
      if (!isSupabaseConfigured) return true;
      const { data, error } = await supabase.rpc("assigner_nounou", {
        p_demande_id: demandeId,
        p_nounou_id: nounouId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes"] });
    },
  });
}