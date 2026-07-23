import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PROFILE_TABLES, buildProfileInsert } from "../lib/profiles";
import { normalizePhoneCI } from "../lib/phone";
import { pinToPassword } from "../lib/pin";
import { useAuthStore, type ProfileType, type ProfileRow } from "../store/useAuthStore";

// ============================================================
// Réécriture complète : la version d'origine appelait un backend REST
// maison (`api.post('/auth/...')`, cf. ancien lib/axios.ts, supprimé).
// L'authentification passe maintenant entièrement par Supabase Auth,
// branché sur notre vraie base (menages/agences/nounous).
//
// Différence de conception à connaître par rapport au design initial de
// ConnexionPage/InscriptionPage : le PIN n'y existait que pour les
// agences, en 2ᵉ facteur après un OTP à CHAQUE connexion. Dans notre
// architecture réelle, le PIN concerne les 3 profils et REMPLACE l'OTP
// au quotidien :
//   - OTP : uniquement à l'inscription/activation (une fois), et pour
//     réinitialiser un PIN oublié.
//   - PIN : mot de passe Supabase Auth (complété en interne à 6+
//     caractères par pinToPassword, cf. lib/pin.ts) pour toutes les
//     connexions normales, via signInWithPassword — sans SMS.
// ============================================================

async function fetchOrClaimProfile(
  profileType: ProfileType,
  userId: string
): Promise<ProfileRow | null> {
  if (profileType === "nounou") {
    // La fiche a pu être créée par une agence SANS user_id -> on passe
    // par la RPC sécurisée `claim_nounou_profile` (0005_nounou_telephone.sql),
    // qui rattache la ligne au premier appel et se contente de la
    // relire ensuite (idempotente).
    const { data, error } = await supabase.rpc("claim_nounou_profile");
    if (error) throw error;
    return data?.id ? data : null;
  }
  const table = PROFILE_TABLES[profileType];
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).single();
  if (error) return null;
  return data;
}

// ===== INSCRIPTION / ACTIVATION (création directe du compte + PIN) =====
export function useInscription() {
  const { setUser, setProfileType } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      phone,
      pin,
      profileType,
      pendingProfile,
    }: {
      phone: string;
      pin: string;
      profileType: ProfileType;
      pendingProfile?: { nom: string; telephone: string; quartier: string };
    }) => {
      const normalizedPhone = normalizePhoneCI(phone);
      console.log("[useInscription] Début inscription:", { normalizedPhone, profileType, isSupabaseConfigured });
      
      if (!isSupabaseConfigured) {
        console.error("[useInscription] Supabase n'est pas configuré !");
        throw new Error(
          "Supabase n'est pas configuré. Vérifiez les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local"
        );
      }

      console.log("[useInscription] Appel signUp...");
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: pinToPassword(pin),
      });
      
      console.log("[useInscription] Réponse signUp:", { user: data.user?.id, error: error?.message });

      // Traiter les erreurs
      if (error) {
        console.error("[useInscription] Erreur signUp:", error.message);
        
        // Si l'utilisateur existe déjà, essayer de se connecter et créer la fiche manquante
        if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
          console.log("[useInscription] Utilisateur existe, tentative de récupération...");
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              phone: normalizedPhone,
              password: pinToPassword(pin),
            });
            
            if (signInError) throw signInError;
            if (!signInData.user) throw new Error("Impossible de récupérer l'utilisateur");
            
            console.log("[useInscription] Utilisateur récupéré:", signInData.user.id);
            
            // S'assurer que la session est bien définie
            if (signInData.session) {
              await supabase.auth.setSession(signInData.session);
            }
            
            // Chercher ou créer la fiche
            let row = await fetchOrClaimProfile(profileType, signInData.user.id);
            
            if (!row && (profileType === "menage" || profileType === "agence")) {
              console.log("[useInscription] Création fiche manquante...");
              const table = PROFILE_TABLES[profileType];
              const insertValues = pendingProfile
                ? buildProfileInsert(profileType, signInData.user.id, pendingProfile)
                : null;
              if (insertValues) {
                const { data: created, error: insertError } = await supabase
                  .from(table)
                  .insert(insertValues)
                  .select()
                  .single();
                if (insertError) throw insertError;
                console.log("[useInscription] Fiche créée:", created.id);
                row = created;
              }
            }

            // Pour une nounou, `row` vient de la RPC claim_nounou_profile
            // (fetchOrClaimProfile), qui renvoie null si aucune ligne
            // `nounous` ne correspond au téléphone vérifié. Sans ce
            // contrôle, le flux se terminait en "succès" (compte auth
            // connecté) alors que la fiche n'était jamais rattachée, et
            // rien ne le signalait à l'écran.
            if (!row) {
              throw new Error(
                profileType === "nounou"
                  ? "Aucune fiche nounou ne correspond à ce numéro. Vérifiez que votre agence a bien renseigné le même numéro de téléphone."
                  : "Impossible de récupérer ou créer votre fiche profil."
              );
            }
            
            console.log("[useInscription] Succès (utilisateur existant)");
            return { phone: normalizedPhone, userId: signInData.user.id, profileType, row };
          } catch (e) {
            console.error("[useInscription] Erreur lors de la récupération:", e);
            // On ne remplace le message générique que pour les erreurs
            // réellement liées à signIn/signUp ; nos erreurs métier (fiche
            // manquante ci-dessus) doivent rester lisibles telles quelles.
            if (e instanceof Error && e.message.includes("Aucune fiche nounou")) {
              throw e;
            }
            throw new Error(
              "Un compte existe déjà avec ce numéro. Veuillez vous connecter à la place ou essayer un autre numéro."
            );
          }
        }
        
        // Autres erreurs
        throw error;
      }

      if (!data.user) throw new Error("Impossible de créer le compte");
      
      console.log("[useInscription] Nouvel utilisateur créé:", data.user.id);
      console.log("[useInscription] Session après signUp:", data.session ? "présente" : "absente");
      
      // Rafraîchir la session pour s'assurer qu'elle est bien établie
      if (data.session) {
        await supabase.auth.setSession(data.session);
        console.log("[useInscription] Session définie");
        
        // Vérifier que la session est bien établie
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        console.log("[useInscription] Vérification session:", {
          setUserId: data.user.id,
          verifyUserId: verifySession?.user?.id,
          match: data.user.id === verifySession?.user?.id
        });
      }
      
      let row: ProfileRow | null = null;
      
      if (profileType === "menage" || profileType === "agence") {
        const table = PROFILE_TABLES[profileType];
        const insertValues = pendingProfile
          ? buildProfileInsert(profileType, data.user.id, pendingProfile)
          : null;
        if (insertValues) {
          console.log("[useInscription] Création fiche:", table);
          const { data: created, error: insertError } = await supabase
            .from(table)
            .insert(insertValues)
            .select()
            .single();
          if (insertError) throw insertError;
          console.log("[useInscription] Fiche créée:", created.id);
          row = created;
        }
      } else {
        row = await fetchOrClaimProfile(profileType, data.user.id);
      }

      console.log("[useInscription] Succès, retour:", { userId: data.user.id, profileType, rowId: row?.id });
      return { phone: normalizedPhone, userId: data.user.id, profileType, row };
    },
    onSuccess: ({ row, profileType }) => {
      console.log("[useInscription] onSuccess:", { rowId: row?.id, profileType });
      if (row) {
        setUser(row);
        setProfileType(profileType);
      }
    },
    onError: (error) => {
      console.error("[useInscription] onError:", error.message);
    },
  });
}

// ===== CONNEXION PAR PIN (remplace l'OTP à chaque connexion) =====
export function useConnexion() {
  const { setUser, setProfileType } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      phone,
      pin,
      profileType,
    }: {
      phone: string;
      pin: string;
      profileType: ProfileType;
    }) => {
      const normalizedPhone = normalizePhoneCI(phone);
      if (!isSupabaseConfigured) return { row: null, profileType };

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password: pinToPassword(pin),
      });
      if (error) throw new Error("Téléphone ou PIN incorrect.");

      const row = await fetchOrClaimProfile(profileType, authData.user!.id);
      if (!row) {
        throw new Error(
          `Aucun compte ${profileType} associé à ce numéro. Vérifiez le profil sélectionné.`
        );
      }
      return { row, profileType };
    },
    onSuccess: ({ row, profileType }) => {
      if (row) {
        setUser(row);
        setProfileType(profileType);
      }
    },
  });
}

// ===== DÉFINIR UN NOUVEAU PIN (réinitialisation directe après authentification) =====
export function useDefinirNouveauPin() {
  const { setUser, setProfileType } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      pin,
      profileType,
      userId,
    }: {
      pin: string;
      profileType: ProfileType;
      userId: string;
    }) => {
      if (!isSupabaseConfigured) return { row: null, profileType };
      const { error } = await supabase.auth.updateUser({ password: pinToPassword(pin) });
      if (error) throw error;
      const row = await fetchOrClaimProfile(profileType, userId);
      return { row, profileType };
    },
    onSuccess: ({ row, profileType }) => {
      if (row) {
        setUser(row);
        setProfileType(profileType);
      }
    },
  });
}

// ===== RÉINITIALISATION DU PIN (sans vérification SMS) =====
export function useDemanderResetPin() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const normalizedPhone = normalizePhoneCI(phone);
      if (!isSupabaseConfigured) return { phone: normalizedPhone };
      return { phone: normalizedPhone };
    },
  });
}

// ===== DÉCONNEXION =====
// N'existait pas chez Noah (onLogout était une simple prop qui
// remettait App.tsx sur la page "home", sans jamais toucher à une
// session réelle).
export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    logout();
    navigate("/");
  };
}

// Renommé `useAgencesPubliques` pour ne pas entrer en collision avec le
// futur `useAgence(id)` (fiche d'une agence) de hooks/useAgence.ts.
export function useAgencesPubliques(enabled: boolean = true) {
  return useQuery({
    queryKey: ["agences_public", "liste"],
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase.from("agences_public").select("id, nom");
      if (error) throw error;
      return data;
    },
  });
}
