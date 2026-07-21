import { Link } from "react-router-dom";
import { useNounousByAgence } from "../../hooks/useData";
import NannyCard from "../../components/ui/NannyCard";
import EmptyState from "../../components/ui/EmptyState";

const CURRENT_AGENCE_ID = "ag-1";

export default function NannyPool() {
  const { data: nounous, isLoading } = useNounousByAgence(CURRENT_AGENCE_ID);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Vivier de nounous</h1>
          <p className="text-sm text-ink/60">{nounous?.length ?? 0} nounous enregistrées</p>
        </div>
        <Link to="/agence/vivier/nouveau" className="btn-primary w-auto px-5">
          + Ajouter
        </Link>
      </div>

      {isLoading && <p className="text-sm text-ink/50">Chargement...</p>}

      {!isLoading && nounous?.length === 0 && (
        <EmptyState
          title="Aucune nounou enregistrée"
          description="Ajoutez la première nounou de votre vivier."
          action={
            <Link to="/agence/vivier/nouveau" className="btn-primary mt-2 w-auto px-6">
              Ajouter une nounou
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {nounous?.map((n) => (
          <NannyCard key={n.id} nounou={n} to={`/agence/vivier/${n.id}/editer`} />
        ))}
      </div>
    </div>
  );
}
