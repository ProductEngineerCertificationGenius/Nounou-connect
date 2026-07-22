import { useSearchParams, Link } from "react-router-dom";
import { useAgences } from "../../hooks/useData";
import AgencyCard from "../../components/ui/AgencyCard";
import EmptyState from "../../components/ui/EmptyState";

export default function SearchResults() {
  const [params] = useSearchParams();
  const quartier = params.get("quartier");
  const besoin = params.get("besoin");
  const { data: agences, isLoading } = useAgences({ quartier, besoin });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Résultats</h1>
          <p className="text-sm text-ink/60">
            Agences correspondant à votre recherche
            {quartier ? ` · ${quartier}` : ""}
          </p>
        </div>
        <Link to="/menage/recherche" className="text-sm font-medium text-palm-dark">
          Modifier
        </Link>
      </div>

      {isLoading && <p className="text-sm text-ink/50">Recherche en cours...</p>}

      {!isLoading && agences?.length === 0 && (
        <EmptyState
          title="Aucune agence trouvée"
          description="Essayez d'élargir votre recherche à un autre quartier."
          action={
            <Link to="/menage/recherche" className="btn-secondary mt-2 w-auto px-6">
              Nouvelle recherche
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {agences?.map((a) => (
          <AgencyCard key={a.id} agence={a} />
        ))}
      </div>
    </div>
  );
}
