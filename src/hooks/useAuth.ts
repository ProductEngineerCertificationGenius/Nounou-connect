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
export function useConnexion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, setProfileType, setNounouMode, setNounouIdentifiant } = useAuthStore();

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
      if (!isSupabaseConfigured) {
        throw new Error("Supabase non configuré");
      }

      const normalizedPhone = normalizePhoneCI(phone);

      // ---- CAS NOUNOU ----
      if (profileType === "nounou") {
        // 1. Connexion avec téléphone (sans PIN)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
        });

        if (signInError) throw signInError;

        // 2. Récupérer la session après connexion
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error("Impossible de récupérer la session");
        }

        const authUser = sessionData.session.user;

        // 3. Appeler la RPC claim_nounou_profile pour rattacher le compte
        const { data: nounouProfile, error: claimError } = await supabase.rpc(
          "claim_nounou_profile"
        );

        if (claimError) {
          console.error("Erreur claim_nounou_profile:", claimError);
          // Si la RPC échoue, on tente une récupération directe
          const { data: existingNounou, error: fetchError } = await supabase
            .from("nounous")
            .select("*")
            .eq("user_id", authUser.id)
            .single();

          if (fetchError || !existingNounou) {
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

// ============================================================
// HOOK : Inscription
// ============================================================
export function useInscription() {
  const navigate = useNavigate();
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