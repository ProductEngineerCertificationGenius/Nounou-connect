import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import Field from "../../components/ui/Field";

export default function NounouSignup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    // TODO Supabase : auth.signUp (téléphone) + insert dans `nounous`
    // rattachée à l'agence qui l'a présentée (si compte créé par l'agence,
    // cette étape est sautée et gérée depuis l'écran Agence > Ajout nounou).
    setUser(data);
    navigate("/nounou/profil");
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate("/")} className="mb-6 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">Créer mon compte</h1>
        <p className="mb-6 text-sm text-ink/60">
          Optionnel — si votre agence vous a déjà inscrite, vous pouvez vous connecter
          directement.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom" error={errors.name?.message}>
            <input className="input" placeholder="Mariam Traoré" {...register("name", { required: "Le nom est requis" })} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <input className="input" placeholder="+225 07 00 00 00" {...register("phone", { required: "Le téléphone est requis" })} />
          </Field>
          <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
            Créer mon compte
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/50">
          Déjà inscrite par votre agence ?{" "}
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
