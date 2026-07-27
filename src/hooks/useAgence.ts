import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

// ============================================================
// Réécriture complète : la version d'origine appelait un backend REST
// maison (`api.get('/agence/...')`, token localStorage). Branché
// maintenant sur Supabase Auth (session) + notre schéma réel.
// ============================================================

// ===== PROFIL DE L'AGENCE CONNECTÉE =====
export function useAgenceProfil() {
  const currentUser = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["agence", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      // Récupérer le userId depuis la session Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      // Le store zustand (currentUser) est persisté en localStorage et peut
      // référencer un compte différent de la session Supabase active
      // (ex: reconnexion avec un autre numéro sans logout propre). Dans ce
      // cas on ne veut pas requêter avec un user_id obsolète.
      if (currentUser?.user_id && currentUser.user_id !== authUserId) {
        throw new Error(
          "Session incohérente : profil local différent du compte connecté. Reconnectez-vous."
        );
      }

      // .maybeSingle() au lieu de .single() : une agence sans fiche encore
      // créée (0 ligne) ne doit pas remonter un 406 générique mais un
      // résultat exploitable (null) qu'on peut distinguer proprement.
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

// ===== UPLOAD DU DOCUMENT JUSTIFICATIF (étape obligatoire à l'inscription) =====
// Nécessite la migration 0014_agences_document_verification.sql (bucket
// privé `documents-agences` + colonnes document_url / statut_verification
// sur `agences`) — à faire appliquer par l'équipe backend avant que cet
// appel fonctionne réellement.
const DOCUMENT_TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const DOCUMENT_TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo

export function validerFichierDocument(file: File): string | null {
  if (!DOCUMENT_TYPES_ACCEPTES.includes(file.type)) {
    return "Format non supporté. Utilisez un PDF, JPG ou PNG.";
  }
  if (file.size > DOCUMENT_TAILLE_MAX_OCTETS) {
    return "Fichier trop volumineux (5 Mo maximum).";
  }
  return null;
}

export function useUploaderDocumentAgence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agenceId, file }: { agenceId: string; file: File }) => {
      const erreurValidation = validerFichierDocument(file);
      if (erreurValidation) throw new Error(erreurValidation);

      if (!isSupabaseConfigured) {
        // Permet de continuer à travailler sur l'UI sans dépendre de la
        // migration/bucket côté backend : voir DEBUG_ERRORS.md.
        return { document_url: "demo://document", statut_verification: "en_attente" as const };
      }

      const extension = file.name.split(".").pop() || "pdf";
      const path = `agences/${agenceId}/document.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("documents-agences")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("agences")
        .update({
          document_url: path,
          statut_verification: "en_attente",
          document_uploaded_at: new Date().toISOString(),
        })
        .eq("id", agenceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Clé réelle = ["agence", "profil", user_id] (cf. useAgenceProfil) :
      // on invalide par préfixe, react-query matche toutes les variantes.
      queryClient.invalidateQueries({ queryKey: ["agence", "profil"] });
    },
  });
}

// ===== VIVIER DE NOUNOUS DE L'AGENCE =====
export function useAgenceNounous(agenceId?: string) {
  return useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      // `note:note_moyenne` : alias pratique pour l'affichage (étoiles).
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
// N'existait pas chez Noah (GestionNounous.tsx ne gérait que l'ajout).
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
      // Embedding PostgREST : nécessite la policy RLS
      // `menages_select_via_demande` côté base pour que le nom du ménage
      // soit lisible par l'agence (sinon toujours null).
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
    // Passe par la RPC `assigner_nounou` (0003_functions.sql) plutôt
    // qu'un update direct : elle garantit côté serveur que la nounou est
    // disponible et appartient bien à l'agence de la demande.
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
