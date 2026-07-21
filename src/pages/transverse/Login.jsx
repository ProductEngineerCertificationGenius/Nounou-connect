import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import Field from "../../components/ui/Field";

const PROFILE_LANDING = {
  menage: "/menage/recherche",
  agence: "/agence/tableau-de-bord",
  nounou: "/nounou/profil",
};

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState("phone"); // "phone" | "code"
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmitPhone = () => setStep("code");

  const onSubmitCode = async (data) => {
    // La vérification du code SMS est gérée par Supabase Auth
    // (auth.signInWithOtp / verifyOtp) une fois le projet provisionné.
    const { phone, profileType } = getValues();
    setUser({ phone });
    if (profileType) useAuthStore.getState().setProfileType(profileType);
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
            <button className="btn-primary" type="submit">
              Recevoir le code
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
