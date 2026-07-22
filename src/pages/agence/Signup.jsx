import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { normalizePhoneCI } from "../../lib/phone";
import { PIN_LENGTH, pinToPassword } from "../../lib/pin";
import { QUARTIERS } from "../../data/mockData";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";

export default function AgenceSignup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    if (!isSupabaseConfigured) {
      setUser(data);
      navigate("/agence/tableau-de-bord");
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
    // La ligne `agences` est créée après vérification du code (cf. Login.jsx).
    navigate("/connexion", {
      state: { phone, profileType: "agence", pendingProfile: { ...data, phone } },
    });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate("/")} className="mb-6 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">Inscrire mon agence</h1>
        <p className="mb-6 text-sm text-ink/60">
          Rendez votre vivier de nounous visible auprès des familles.
        </p>

        {serverError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom de l'agence" error={errors.nom?.message}>
            <input className="input" placeholder="Agence Étoile du Foyer" {...register("nom", { required: "Le nom de l'agence est requis" })} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <input className="input" placeholder="+225 07 00 00 00" {...register("phone", { required: "Le téléphone est requis" })} />
          </Field>
          <Field label="Quartier" error={errors.quartier?.message}>
            <Select options={QUARTIERS} placeholder="Choisir un quartier" {...register("quartier", { required: "Le quartier est requis" })} />
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
                validate: (value, formValues) => value === formValues.pin || "Les deux PIN ne correspondent pas",
              })}
            />
          </Field>
          <p className="text-xs text-ink/50">
            Ce PIN vous servira à vous reconnecter directement, sans recevoir de SMS à chaque fois.
          </p>
          <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
            Créer le compte agence
          </button>
        </form>
      </div>
    </div>
  );
}
