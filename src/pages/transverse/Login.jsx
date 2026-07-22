import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { PROFILE_TABLES, buildProfileInsert } from "../../lib/profiles";
import { normalizePhoneCI } from "../../lib/phone";
import { PIN_LENGTH, pinToPassword } from "../../lib/pin";
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
  const pending = location.state || null;

  const [flow, setFlow] = useState(pending ? "signup" : "login");
  const [screen, setScreen] = useState(pending ? "code" : "login-form");
  const [serverError, setServerError] = useState("");
  const [verifiedUserId, setVerifiedUserId] = useState(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { phone: pending?.phone || "", profileType: pending?.profileType || "menage" },
  });

  const finalizeLogin = async (userId, profileType, phone) => {
    if (!isSupabaseConfigured) {
      setUser({ phone });
      useAuthStore.getState().setProfileType(profileType);
      navigate(PROFILE_LANDING[profileType] || "/");
      return;
    }

    if (pending?.pendingProfile) {
      const table = PROFILE_TABLES[profileType];
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
      let row = null;
      let selectError = null;

      if (profileType === "nounou") {
        const { data: claimed, error: claimError } = await supabase.rpc("claim_nounou_profile");
        if (claimError) {
          selectError = claimError;
        } else if (claimed?.id) {
          row = claimed;
        }
      } else {
        const table = PROFILE_TABLES[profileType];
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

  const onSubmitLogin = async () => {
    setServerError("");
    const { profileType } = getValues();
    const phone = normalizePhoneCI(getValues().phone);

    if (!isSupabaseConfigured) {
      await finalizeLogin(null, profileType, phone);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      phone,
      password: pinToPassword(getValues().pin),
    });
    if (error) {
      setServerError("Téléphone ou PIN incorrect.");
      return;
    }
    await finalizeLogin(authData.user.id, profileType, phone);
  };

  const onSubmitForgotPhone = async () => {
    setServerError("");
    const phone = normalizePhoneCI(getValues().phone);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      setServerError(error.message);
      return;
    }
    setFlow("reset");
    setScreen("code");
  };

  const onSubmitCode = async (data) => {
    setServerError("");
    const { profileType } = getValues();
    const phone = normalizePhoneCI(getValues().phone);

    if (!isSupabaseConfigured) {
      await finalizeLogin(null, profileType, phone);
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

    if (flow === "reset") {
      setVerifiedUserId(authData.user.id);
      setScreen("new-pin");
      return;
    }

    await finalizeLogin(authData.user.id, profileType, phone);
  };

  const onSubmitNewPin = async () => {
    setServerError("");
    const { profileType } = getValues();
    const phone = normalizePhoneCI(getValues().phone);
    const { error } = await supabase.auth.updateUser({
      password: pinToPassword(getValues().newPin),
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    await finalizeLogin(verifiedUserId, profileType, phone);
  };

  const title =
    screen === "new-pin"
      ? "Choisir un nouveau PIN"
      : flow === "reset"
      ? "Réinitialiser mon PIN"
      : flow === "signup"
      ? "Confirmation"
      : "Connexion";

  const subtitle =
    screen === "login-form"
      ? "Entrez votre téléphone et votre PIN."
      : screen === "code"
      ? "Entrez le code reçu par SMS."
      : screen === "new-pin"
      ? "Ce PIN remplacera l'ancien pour vos prochaines connexions."
      : "Un code SMS va vous être envoyé pour réinitialiser votre PIN.";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-ink/60">{subtitle}</p>

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
        )}

        {screen === "login-form" && (
          <form onSubmit={handleSubmit(onSubmitLogin)} className="flex flex-col gap-4">
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
            <Field label={`PIN (${PIN_LENGTH} chiffres)`} error={errors.pin?.message}>
              <input
                className="input text-center tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                placeholder="— — — —"
                {...register("pin", {
                  required: "Le PIN est requis",
                  pattern: { value: new RegExp(`^\\d{${PIN_LENGTH}}$`), message: `${PIN_LENGTH} chiffres exactement` },
                })}
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setServerError("");
                setFlow("reset");
                setScreen("forgot-phone");
              }}
              className="text-center text-sm text-ink/50 underline underline-offset-2"
            >
              PIN oublié ?
            </button>
          </form>
        )}

        {screen === "forgot-phone" && (
          <form onSubmit={handleSubmit(onSubmitForgotPhone)} className="flex flex-col gap-4">
            <Field label="Téléphone" error={errors.phone?.message}>
              <input
                className="input"
                placeholder="+225 07 00 00 00"
                {...register("phone", { required: "Le numéro de téléphone est requis" })}
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Recevoir le code"}
            </button>
          </form>
        )}

        {screen === "code" && (
          <form onSubmit={handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
            <Field label="Code reçu par SMS" error={errors.code?.message}>
              <input
                className="input text-center tracking-[0.4em]"
                placeholder="— — — — — —"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                {...register("code", {
                  required: "Le code est requis",
                  pattern: { value: /^\d{6}$/, message: "Le code contient 6 chiffres" },
                })}
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Vérification..." : "Continuer"}
            </button>
          </form>
        )}

        {screen === "new-pin" && (
          <form onSubmit={handleSubmit(onSubmitNewPin)} className="flex flex-col gap-4">
            <Field label={`Nouveau PIN (${PIN_LENGTH} chiffres)`} error={errors.newPin?.message}>
              <input
                className="input text-center tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                placeholder="— — — —"
                {...register("newPin", {
                  required: "Le PIN est requis",
                  pattern: { value: new RegExp(`^\\d{${PIN_LENGTH}}$`), message: `${PIN_LENGTH} chiffres exactement` },
                })}
              />
            </Field>
            <Field label="Confirmer le nouveau PIN" error={errors.newPinConfirm?.message}>
              <input
                className="input text-center tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                placeholder="— — — —"
                {...register("newPinConfirm", {
                  required: "Confirmez le PIN",
                  validate: (value) => value === getValues("newPin") || "Les deux PIN ne correspondent pas",
                })}
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Valider le nouveau PIN"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
