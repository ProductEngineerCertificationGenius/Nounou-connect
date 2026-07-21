import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { QUARTIERS } from "../../data/mockData";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";

export default function MenageSignup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    // TODO Supabase : auth.signUp (téléphone) + insert dans la table `menages`.
    setUser(data);
    navigate("/menage/recherche");
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ecru px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate("/")} className="mb-6 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>
        <h1 className="mb-1 font-display text-xl font-semibold">Créer mon compte</h1>
        <p className="mb-6 text-sm text-ink/60">
          Quelques informations pour lancer votre recherche.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom" error={errors.name?.message}>
            <input className="input" placeholder="Aïcha Koné" {...register("name", { required: "Le nom est requis" })} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <input className="input" placeholder="+225 07 00 00 00" {...register("phone", { required: "Le téléphone est requis" })} />
          </Field>
          <Field label="Quartier" error={errors.quartier?.message}>
            <Select options={QUARTIERS} placeholder="Choisir un quartier" {...register("quartier", { required: "Le quartier est requis" })} />
          </Field>
          <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
            Créer mon compte
          </button>
        </form>
      </div>
    </div>
  );
}
