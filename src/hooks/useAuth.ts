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

// ===== INSCRIPTION / ACTIVATION (étape 1 : créer le compte + PIN) =====
export function useInscription() {
  return useMutation({
    mutationFn: async ({ phone, pin }: { phone: string; pin: string }) => {
      const normalizedPhone = normalizePhoneCI(phone);
      if (!isSupabaseConfigured) return { phone: normalizedPhone };
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: pinToPassword(pin),
      });
      if (error) throw error;
      return { phone: normalizedPhone, userId: data.user?.id };
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

// ===== VÉRIFICATION OTP (inscription/activation ET réinitialisation PIN) =====
// `intent`: "signup" -> crée la fiche métier après confirmation ;
//           "reset-pin" -> confirme juste l'identité, cf. useDefinirNouveauPin.
export function useVerifierOtp() {
  const { setUser, setProfileType } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      phone,
      otp,
      profileType,
      intent = "signup",
      pendingProfile,
    }: {
      phone: string;
      otp: string;
      profileType: ProfileType;
      intent?: "signup" | "reset-pin";
      pendingProfile?: { nom: string; telephone: string; quartier: string };
    }) => {
      const normalizedPhone = normalizePhoneCI(phone);
      if (!isSupabaseConfigured) return { userId: null, profileType, intent, row: null };

      const { data: authData, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: "sms",
      });
      if (error) throw new Error("Code invalide ou expiré. Réessayez.");

      if (intent === "reset-pin") {
        return { userId: authData.user!.id, profileType, intent, row: null };
      }

      let row: ProfileRow | null;
      if (pendingProfile && (profileType === "menage" || profileType === "agence")) {
        const table = PROFILE_TABLES[profileType];
        const insertValues = buildProfileInsert(profileType, authData.user!.id, pendingProfile);
        const { data: created, error: insertError } = await supabase
          .from(table)
          .insert(insertValues)
          .select()
          .single();
        if (insertError) throw insertError;
        row = created;
      } else {
        row = await fetchOrClaimProfile(profileType, authData.user!.id);
        if (!row) {
          throw new Error(
            "Aucune fiche nounou ne correspond à ce numéro. Vérifiez auprès de votre agence."
          );
        }
      }
      return { userId: authData.user!.id, profileType, intent, row };
    },
    onSuccess: (result) => {
      if (result.intent === "signup" && result.row) {
        setUser(result.row);
        setProfileType(result.profileType);
      }
    },
  });
}

// ===== DÉFINIR UN NOUVEAU PIN (PIN oublié, après OTP vérifié) =====
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

// ===== RENVOYER UN CODE (PIN oublié, étape 1) =====
export function useDemanderResetPin() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const normalizedPhone = normalizePhoneCI(phone);
      if (!isSupabaseConfigured) return { phone: normalizedPhone };
      const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      if (error) throw error;
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
