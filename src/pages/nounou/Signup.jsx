import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { normalizePhoneCI } from "../../lib/phone";
import { PIN_LENGTH, pinToPassword } from "../../lib/pin";
import Field from "../../components/ui/Field";

// Ce n'est pas une inscription : la fiche `nounous` existe déjà, créée par
// l'agence (agence_id est NOT NULL, cf. cahier des charges §6). Cet écran
// sert uniquement à ACTIVER l'accès de la nounou avec un PIN, sur le
// téléphone que son agence a renseigné. Après confirmation du code SMS
// (Login.jsx, étape "code"), le compte est automatiquement rattaché à sa
// fiche via la fonction RPC `claim_nounou_profile` (déjà en place).
export default function NounouSignup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    if (!isSupabaseConfigured) {
      setUser(data);
      navigate("/nounou/profil");
      return;
    }
    setServerError("");
    const phone = normalizePhoneCI(data.phone);
    const { error } = await supabase.auth.signUp({
      phone,
      password: pinToPassword(data.pin),
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    navigate("/connexion", {
      state: { phone, profileType: "nounou" },
    });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate("/")} className="mb-6 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">Activer mon compte</h1>
        <p className="mb-6 text-sm text-ink/60">
          Utilisez le numéro que votre agence a renseigné pour vous ajouter à son
          vivier, et choisissez un PIN pour vous connecter ensuite.
        </p>

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Téléphone" error={errors.phone?.message}>
            <input
              className="input"
              placeholder="+225 07 00 00 00"
              {...register("phone", { required: "Le téléphone est requis" })}
            />
          </Field>
          <Field label={`Code PIN (${PIN_LENGTH} chiffres)`} error={errors.pin?.message}>
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
          <Field label="Confirmer le PIN" error={errors.pinConfirm?.message}>
            <input
              className="input text-center tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              placeholder="— — — —"
              {...register("pinConfirm", {
                required: "Confirmez le PIN",
                validate: (value) => value === getValues("pin") || "Les deux PIN ne correspondent pas",
              })}
            />
          </Field>
          <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
            Recevoir le code de confirmation
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/50">
          Déjà activé votre compte ?{" "}
          <button
            onClick={() => navigate("/connexion")}
            className="font-medium text-palm-dark underline underline-offset-2"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
