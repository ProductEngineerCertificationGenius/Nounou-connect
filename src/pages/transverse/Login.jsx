import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { PROFILE_TABLES, buildProfileInsert } from "../../lib/profiles";
import { normalizePhoneCI } from "../../lib/phone";
import Field from "../../components/ui/Field";

const PROFILE_LANDING = {
  menage: "/menage/recherche",
  agence: "/agence/tableau-de-bord",
  nounou: "/nounou/profil",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  // Si on arrive depuis un écran Signup (Ménage/Agence), la demande d'OTP a
  // déjà été envoyée là-bas et le formulaire est déjà rempli : on saute
  // directement à l'étape "code".
  const pending = location.state || null; // { phone, profileType, pendingProfile }
  const [step, setStep] = useState(pending ? "code" : "phone");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { phone: pending?.phone || "", profileType: pending?.profileType || "menage" },
  });

  const onSubmitPhone = async () => {
    setServerError("");
    const phone = normalizePhoneCI(getValues().phone);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setServerError(error.message);
        return;
      }
    }
    setStep("code");
  };

  const onSubmitCode = async (data) => {
    setServerError("");
    const { profileType } = getValues();
    const phone = normalizePhoneCI(getValues().phone);

    if (!isSupabaseConfigured) {
      // Mode démo (pas de projet Supabase configuré) : on simule la
      // connexion sans vérifier le code.
      setUser({ phone });
      if (profileType) useAuthStore.getState().setProfileType(profileType);
      navigate(PROFILE_LANDING[profileType] || "/");
      return;
    }

    const { data: authData, error: otpError } = await supabase.auth.verifyOtp({
      phone,
      token: data.code,
      type: "sms",
    });
    if (otpError) {
      setServerError("Code invalide ou expiré. Réessayez.");
      return;
    }
    const userId = authData.user.id;
    const table = PROFILE_TABLES[profileType];

    if (pending?.pendingProfile) {
      // On vient d'un écran Signup : le profil n'existe pas encore, on le crée.
      const insertValues = buildProfileInsert(profileType, userId, pending.pendingProfile);
      const { data: row, error: insertError } = await supabase
        .from(table)
        .insert(insertValues)
        .select()
        .single();
      if (insertError) {
        setServerError(insertError.message);
        return;
      }
      setUser(row);
    } else {
      // Connexion classique : le profil doit déjà exister.
      let row = null;
      let selectError = null;

      if (profileType === "nounou") {
        // Cas spécifique nounou : la fiche a été créée par l'agence sans
        // user_id. Au tout premier login, on tente de rattacher
        // automatiquement le compte via la fonction RPC sécurisée (elle
        // matche sur le téléphone vérifié par Supabase Auth côté serveur).
        const { data: claimed, error: claimError } = await supabase.rpc(
          "claim_nounou_profile"
        );
        if (claimError) {
          selectError = claimError;
        } else if (claimed?.id) {
          row = claimed;
        }
      } else {
        const result = await supabase.from(table).select("*").eq("user_id", userId).single();
        row = result.data;
        selectError = result.error;
      }

      if (!row) {
        setServerError(
          selectError?.message ||
            `Aucun compte ${profileType} associé à ce numéro. Vérifiez le profil sélectionné ou inscrivez-vous.`
        );
        return;
      }
      setUser(row);
    }

    useAuthStore.getState().setProfileType(profileType);
    navigate(PROFILE_LANDING[profileType] || "/");
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-ink/50 hover:text-ink"
        >
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">Connexion</h1>
        <p className="mb-6 text-sm text-ink/60">
          Recevez un code par SMS pour vous connecter.
        </p>

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        {step === "phone" && (
          <form onSubmit={handleSubmit(onSubmitPhone)} className="flex flex-col gap-4">
            <Field label="Téléphone" error={errors.phone?.message}>
              <input
                className="input"
                placeholder="+225 07 00 00 00"
                {...register("phone", { required: "Le numéro de téléphone est requis" })}
              />
            </Field>
            <select className="input" {...register("profileType")}>
              <option value="menage">Ménage</option>
              <option value="agence">Agence</option>
              <option value="nounou">Nounou</option>
            </select>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Recevoir le code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
            <Field label="Code reçu par SMS" error={errors.code?.message}>
              <input
                className="input text-center tracking-[0.4em]"
                placeholder="— — — —"
                maxLength={4}
                {...register("code", { required: "Le code est requis" })}
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Vérification..." : "Continuer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
