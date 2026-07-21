import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNounou } from "../../hooks/useData";
import { QUARTIERS } from "../../data/mockData";
import Avatar from "../../components/ui/Avatar";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";

// TODO Supabase : remplacer par l'id de la nounou authentifiée.
const CURRENT_NOUNOU_ID = "n-1";

export default function ProfileEdit() {
  const { data: nounou } = useNounou(CURRENT_NOUNOU_ID);
  const [disponible, setDisponible] = useState(true);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (nounou) {
      reset({
        experience: nounou.experience,
        langues: nounou.langues.join(", "),
        tarif: nounou.tarif,
        quartier: nounou.quartier,
      });
      setDisponible(nounou.disponible);
    }
  }, [nounou, reset]);

  const onSubmit = async (data) => {
    // TODO Supabase : update de la table `nounous` (profil + disponibilité).
    console.info("[demo] Profil nounou mis à jour", { ...data, disponible });
  };

  if (!nounou) return <p className="text-sm text-ink/50">Chargement...</p>;

  return (
    <div className="lg:max-w-md">
      <h1 className="mb-1 font-display text-xl font-semibold">Mon profil</h1>
      <p className="mb-6 text-sm text-ink/60">
        Ces informations sont visibles par les familles en recherche.
      </p>

      <div className="card mb-6 flex items-center gap-3">
        <Avatar name={nounou.nom} size={48} />
        <p className="font-medium">{nounou.nom}</p>
      </div>

      <div className="card mb-6">
        <Toggle checked={disponible} onChange={setDisponible} label="Disponible actuellement" />
        <p className="mt-2 text-xs text-ink/50">
          Si désactivé, votre profil n'apparaîtra plus dans les nouvelles recherches.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Expérience">
          <input className="input" {...register("experience")} />
        </Field>
        <Field label="Langues parlées">
          <input className="input" {...register("langues")} />
        </Field>
        <Field label="Tarif mensuel (FCFA)">
          <input className="input font-mono" type="number" {...register("tarif")} />
        </Field>
        <Field label="Quartier">
          <Select options={QUARTIERS} {...register("quartier")} />
        </Field>
        <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
