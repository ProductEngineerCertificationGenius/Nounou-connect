import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/useAuthStore";
import { QUARTIERS } from "../../data/mockData";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import Avatar from "../../components/ui/Avatar";

export default function AgencySettings() {
  const { user } = useAuthStore();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      nom: user?.nom || "Agence Étoile du Foyer",
      quartier: user?.quartier || "Cocody",
      description: "Agence familiale spécialisée dans la garde d'enfants.",
    },
  });

  const onSubmit = async (data) => {
    // TODO Supabase : update de la table `agences` (infos publiques).
    console.info("[demo] Paramètres agence enregistrés", data);
  };

  return (
    <div className="lg:max-w-md">
      <h1 className="mb-1 font-display text-xl font-semibold">Profil de l'agence</h1>
      <p className="mb-6 text-sm text-ink/60">
        Ces informations sont visibles publiquement par les familles.
      </p>

      <div className="card mb-6 flex items-center gap-3">
        <Avatar name={user?.nom || "Agence"} size={48} />
        <p className="text-sm text-ink/60">Photo / logo de l'agence (à venir)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Nom de l'agence">
          <input className="input" {...register("nom")} />
        </Field>
        <Field label="Quartier">
          <Select options={QUARTIERS} {...register("quartier")} />
        </Field>
        <Field label="Description">
          <textarea className="input min-h-[100px] resize-none" {...register("description")} />
        </Field>
        <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );
}
