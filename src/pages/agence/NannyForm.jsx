import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useNounou } from "../../hooks/useData";
import { QUARTIERS } from "../../data/mockData";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import { useState, useEffect } from "react";

export default function NannyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { data: existing } = useNounou(id);
  const [disponible, setDisponible] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (existing) {
      reset({
        nom: existing.nom,
        experience: existing.experience,
        langues: existing.langues.join(", "),
        tarif: existing.tarif,
        quartier: existing.quartier,
      });
      setDisponible(existing.disponible);
    }
  }, [existing, reset]);

  const onSubmit = async (data) => {
    // TODO Supabase : insert/update dans la table `nounous`
    // (upsert selon isEditing), avec agence_id = agence authentifiée.
    console.info("[demo] Nounou enregistrée", { ...data, disponible });
    navigate("/agence/vivier");
  };

  return (
    <div className="lg:max-w-md">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-ink/50 hover:text-ink">
        &larr; Retour
      </button>
      <h1 className="mb-1 font-display text-xl font-semibold">
        {isEditing ? "Modifier la nounou" : "Ajouter une nounou"}
      </h1>
      <p className="mb-6 text-sm text-ink/60">
        Ces informations sont visibles par les familles en recherche.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Nom" error={errors.nom?.message}>
          <input className="input" placeholder="Mariam Traoré" {...register("nom", { required: "Le nom est requis" })} />
        </Field>
        <Field label="Expérience" error={errors.experience?.message}>
          <input className="input" placeholder="3 ans" {...register("experience", { required: "L'expérience est requise" })} />
        </Field>
        <Field label="Langues parlées" error={errors.langues?.message}>
          <input className="input" placeholder="Français, Dioula" {...register("langues", { required: "Au moins une langue est requise" })} />
        </Field>
        <Field label="Tarif mensuel (FCFA)" error={errors.tarif?.message}>
          <input
            className="input font-mono"
            type="number"
            placeholder="50000"
            {...register("tarif", { required: "Le tarif est requis" })}
          />
        </Field>
        <Field label="Quartier" error={errors.quartier?.message}>
          <Select options={QUARTIERS} placeholder="Choisir un quartier" {...register("quartier", { required: "Le quartier est requis" })} />
        </Field>
        <div className="card">
          <Toggle checked={disponible} onChange={setDisponible} label="Disponible dès maintenant" />
        </div>
        <button className="btn-primary mt-2" type="submit" disabled={isSubmitting}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
