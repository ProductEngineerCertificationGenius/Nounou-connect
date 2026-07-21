import { Link } from "react-router-dom";
import { useRecherchesHistorique } from "../../hooks/useData";
import EmptyState from "../../components/ui/EmptyState";

export default function SearchHistory() {
  const { data: recherches, isLoading } = useRecherchesHistorique();

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold">Historique des recherches</h1>
      <p className="mb-6 text-sm text-ink/60">Vos recherches passées.</p>

      {isLoading && <p className="text-sm text-ink/50">Chargement...</p>}

      {!isLoading && recherches?.length === 0 && (
        <EmptyState
          title="Aucune recherche pour le moment"
          description="Vos recherches passées apparaîtront ici."
        />
      )}

      <div className="flex flex-col gap-2">
        {recherches?.map((r) => (
          <Link
            key={r.id}
            to={`/menage/resultats?quartier=${r.quartier}`}
            className="card flex items-center justify-between hover:shadow-md"
          >
            <div>
              <p className="font-medium">{r.besoin}</p>
              <p className="text-xs text-ink/50">{r.quartier}</p>
            </div>
            <span className="text-xs text-ink/40">
              {new Date(r.date).toLocaleDateString("fr-FR")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
