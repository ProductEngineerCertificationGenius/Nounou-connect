import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { QUARTIERS, BESOINS, TEMPS_TRAVAIL, LOGEMENT } from "../../data/mockData";
import { useEnregistrerRecherche } from "../../hooks/useData";
import { useAuthStore } from "../../store/useAuthStore";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";

export default function SearchForm() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const { mutate: enregistrerRecherche } = useEnregistrerRecherche();
  const menageId = useAuthStore((s) => s.user?.id);

  const onSubmit = (data) => {
    // Trace la recherche pour l'écran "Historique" (cf. SearchHistory.jsx) —
    // jamais fait auparavant, l'historique restait vide.
    enregistrerRecherche({ menageId, ...data });
    const params = new URLSearchParams(data).toString();
    navigate(`/menage/resultats?${params}`);
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold">Recherche guidée</h1>
      <p className="mb-6 text-sm text-ink/60">
        Précisez votre besoin pour trouver les agences les plus adaptées.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 lg:max-w-md">
        <Field label="Quartier">
          <Select options={QUARTIERS} placeholder="Choisir un quartier" {...register("quartier")} />
        </Field>
        <Field label="Type de besoin">
          <Select options={BESOINS} placeholder="Choisir un besoin" {...register("besoin")} />
        </Field>
        <Field label="Temps de travail">
          <Select options={TEMPS_TRAVAIL} placeholder="Choisir un temps de travail" {...register("temps")} />
        </Field>
        <Field label="Logement">
          <Select options={LOGEMENT} placeholder="Choisir un mode de logement" {...register("logement")} />
        </Field>
        <button className="btn-primary mt-2" type="submit">
          Rechercher
        </button>
      </form>
    </div>
  );
}
