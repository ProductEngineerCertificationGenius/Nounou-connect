// src/hooks/useAuth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { pinToPassword, isValidPin } from "../lib/pin";
import { normalizePhoneCI } from "../lib/phone";
import { buildProfileInsert, PROFILE_TABLES } from "../lib/profiles";
import { useAuthStore, type ProfileType } from "../store/useAuthStore";
import { getErrorMessage } from "../lib/errorHandler";

// ============================================================
// HOOK : Connexion (ménage / agence / nounou)
// ============================================================

async function fetchOrClaimProfile(
  profileType: ProfileType,
  userId: string,
  // Auto-inscription nounou (sans agence, cf. migration
  // 0012_nounou_self_insert.sql) : si fourni, on crée/récupère la
  // fiche via nounou_self_register plutôt que via claim_nounou_profile,
  // qui lui suppose une fiche déjà créée par une agence.
  nounouSelfRegister?: { telephone: string; nom: string; quartier: string; ethnie?: string }
): Promise<ProfileRow | null> {
  if (profileType === "nounou") {
    if (nounouSelfRegister) {
      const { data, error } = await supabase.rpc("nounou_self_register", {
        p_phone: nounouSelfRegister.telephone,
        p_nom: nounouSelfRegister.nom,
        p_quartier: nounouSelfRegister.quartier,
        p_ethnie: nounouSelfRegister.ethnie ?? null,
      });
      if (error) throw error;
      return data?.id ? data : null;
    }
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
      nounouSelfRegister,
    }: {
      phone: string;
      pin: string;
      profileType: ProfileType;
      pendingProfile?: { nom: string; telephone: string; quartier: string };
      // Auto-inscription nounou sans agence (feature Noah, cf.
      // migration 0012). Si absent pour profileType === "nounou", on
      // garde le comportement existant : rattachement à une fiche déjà
      // créée par une agence via claim_nounou_profile.
      nounouSelfRegister?: { nom: string; quartier: string; ethnie?: string };
    }) => {
      const normalizedPhone = normalizePhoneCI(phone);
      const nounouSelfRegisterPayload =
        profileType === "nounou" && nounouSelfRegister
          ? { telephone: normalizedPhone, nom: nounouSelfRegister.nom, quartier: nounouSelfRegister.quartier, ethnie: nounouSelfRegister.ethnie }
          : undefined;
      console.log("[useInscription] Début inscription:", { normalizedPhone, profileType, isSupabaseConfigured });
      
      if (!isSupabaseConfigured) {
        throw new Error("Supabase non configuré");
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
            let row = await fetchOrClaimProfile(profileType, signInData.user.id, nounouSelfRegisterPayload);
            
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
                  ? nounouSelfRegisterPayload
                    ? "Impossible de créer votre profil nounou. Réessayez dans quelques instants."
                    : "Aucune fiche nounou ne correspond à ce numéro. Vérifiez que votre agence a bien renseigné le même numéro de téléphone."
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
              "Aucun profil nounou trouvé. Veuillez vous inscrire ou contacter votre agence."
            );
          }

          // Stocker dans le store
          setUser(existingNounou);
          setProfileType("nounou");
          return { profileType: "nounou", row: existingNounou };
        }

        if (!nounouProfile) {
          throw new Error("Aucun profil nounou trouvé. Veuillez contacter votre agence.");
        }

        // Stocker dans le store
        setUser(nounouProfile);
        setProfileType("nounou");
        return { profileType: "nounou", row: nounouProfile };
      }

      // ---- CAS MÉNAGE / AGENCE (avec PIN) ----
      if (!isValidPin(pin)) {
        throw new Error(`Le PIN doit contenir ${pin.length} chiffres.`);
      }

      // 1. Connexion avec téléphone + mot de passe (PIN transformé)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password: pinToPassword(pin),
      });

      if (signInError) throw signInError;

      const authUser = signInData.user;
      const table = PROFILE_TABLES[profileType];

      // 2. Récupérer le profil correspondant
      const { data: profile, error: profileError } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (profileError) {
        // Si le profil n'existe pas encore, on le crée (cas d'inscription)
        const pendingProfile = JSON.parse(
          localStorage.getItem("pendingProfile") || "null"
        );
        if (pendingProfile) {
          const insertData = buildProfileInsert(profileType, authUser.id, pendingProfile);
          const { data: newProfile, error: insertError } = await supabase
            .from(table)
            .insert(insertData)
            .select()
            .single();

          if (insertError) throw insertError;
          localStorage.removeItem("pendingProfile");
          setUser(newProfile);
          setProfileType(profileType);
          return { profileType, row: newProfile };
        }
      } else {
        row = await fetchOrClaimProfile(profileType, data.user.id, nounouSelfRegisterPayload);
      }

        throw new Error("Profil non trouvé. Veuillez vous inscrire.");
      }

      setUser(profile);
      setProfileType(profileType);
      return { profileType, row: profile };
    },
    onError: (error) => {
      console.error("[useConnexion] Erreur:", error);
    },
  });
}

// ===== CONNEXION PAR PIN (remplace l'OTP à chaque connexion) =====
// Depuis le retrait du mode "J'ai une agence" sur la page Inscription
// (cf. commentaire dans InscriptionPage.tsx), c'est ICI que se joue
// l'activation d'une nounou déjà créée par une agence : si le login
// classique échoue, on tente une 1ère activation (signUp + rattachement
// via claim_nounou_profile) avant de conclure à un vrai échec.
export function useConnexion() {
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
      pendingProfile: any;
    }) => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase non configuré");
      }

      const normalizedPhone = normalizePhoneCI(phone);

      // ---- CAS NOUNOU (pas de PIN) ----
      if (profileType === "nounou") {
        // 1. Créer un compte auth avec téléphone (sans mot de passe)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          phone: normalizedPhone,
          password: pinToPassword("0000"), // mot de passe par défaut (jamais utilisé)
        });

        if (signUpError) throw signUpError;

        // 2. Récupérer l'utilisateur créé
        const authUser = signUpData.user;
        if (!authUser) throw new Error("Erreur lors de la création du compte");

        // 3. Insérer le profil nounou (agence_id NULL, user_id défini)
        const { data: nounouProfile, error: insertError } = await supabase
          .from("nounous")
          .insert({
            user_id: authUser.id,
            nom: pendingProfile.nom,
            telephone: normalizedPhone,
            quartier: pendingProfile.quartier,
            experience: pendingProfile.experience || "Non renseigné",
            langues: pendingProfile.langues || [],
            tarif: pendingProfile.tarif || 0,
            disponible: true,
            // agence_id reste NULL → la nounou n'est pas encore rattachée
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setUser(nounouProfile);
        setProfileType("nounou");
        return { profileType: "nounou", row: nounouProfile };
      }

      // ---- CAS MÉNAGE / AGENCE (avec PIN) ----
      if (!isValidPin(pin)) {
        throw new Error(`Le PIN doit contenir ${pin.length} chiffres.`);
      }

      // 1. Créer un compte auth avec téléphone + mot de passe (PIN transformé)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: pinToPassword(pin),
      });

      if (error) {
        // Uniquement pour une nounou : le compte Auth peut ne pas encore
        // exister (fiche créée par une agence, jamais activée). On tente
        // de le créer ; si Supabase répond "déjà inscrit", c'est que le
        // compte existe réellement -> le PIN saisi était juste faux.
        if (profileType === "nounou") {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            phone: normalizedPhone,
            password: pinToPassword(pin),
          });
          if (signUpError || !signUpData.user) {
            throw new Error("Téléphone ou PIN incorrect.");
          }
          if (signUpData.session) {
            await supabase.auth.setSession(signUpData.session);
          }
          const row = await fetchOrClaimProfile("nounou", signUpData.user.id);
          if (!row) {
            throw new Error(
              "Aucune fiche nounou ne correspond à ce numéro. Vérifiez que votre agence a bien renseigné exactement ce numéro, ou inscrivez-vous si vous n'avez pas d'agence."
            );
          }
          return { row, profileType };
        }
        throw new Error("Téléphone ou PIN incorrect.");
      }

      if (signUpError) throw signUpError;

      const authUser = signUpData.user;
      if (!authUser) throw new Error("Erreur lors de la création du compte");

      // 2. Insérer le profil (menage ou agence)
      const table = PROFILE_TABLES[profileType];
      const insertData = buildProfileInsert(profileType, authUser.id, pendingProfile);
      const { data: profile, error: insertError } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      setUser(profile);
      setProfileType(profileType);
      return { profileType, row: profile };
    },
    onError: (error) => {
      console.error("[useInscription] Erreur:", error);
    },
  });
}

// ============================================================
// HOOK : Déconnexion
// ============================================================
export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };
}

// ============================================================
// HOOK : Demander réinitialisation PIN (ménage/agence)
// ============================================================
export function useDemanderResetPin() {
  return useMutation({
    mutationFn: async (phone: string) => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase non configuré");
      }
      const normalizedPhone = normalizePhoneCI(phone);
      // Envoi d'un OTP pour réinitialisation (via WhatsApp/SMS)
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });
      if (error) throw error;
      return true;
    },
  });
}

// ============================================================
// HOOK : Définir nouveau PIN (ménage/agence)
// ============================================================
export function useDefinirNouveauPin() {
  const queryClient = useQueryClient();

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
      if (!isSupabaseConfigured) {
        throw new Error("Supabase non configuré");
      }
      if (!isValidPin(pin)) {
        throw new Error(`Le PIN doit contenir ${pin.length} chiffres.`);
      }

      // Mettre à jour le mot de passe de l'utilisateur
      const { error } = await supabase.auth.updateUser({
        password: pinToPassword(pin),
      });
      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ============================================================
// HOOK : Rattacher une nounou à une agence (via identifiant)
// ============================================================
export function useRejoindreAgence() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      agenceId,
      identifiant,
    }: {
      agenceId: string;
      identifiant: string;
    }) => {
      if (!user) throw new Error("Vous devez être connecté.");

      // 1. Vérifier que l'identifiant est valide (format NC-XXX-XXXX)
      if (!identifiant || identifiant.length < 5) {
        throw new Error("Identifiant invalide. Format: NC-XXX-XXXX");
      }

      // 2. Mettre à jour la nounou avec l'agence_id et l'identifiant
      const { data, error } = await supabase
        .from("nounous")
        .update({
          agence_id: agenceId,
          identifiant: identifiant,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // 3. Mettre à jour le store
      setUser(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil"] });
    },
  });
}