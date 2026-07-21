import { Link } from "react-router-dom";
import { useDemandes } from "../../hooks/useData";
import EmptyState from "../../components/ui/EmptyState";

const CURRENT_AGENCE_ID = "ag-1";

const STATUT_STYLE = {
  "En attente": "text-clay",
  Assignée: "text-seal",
};

export default function RequestsList() {
  const { data: demandes, isLoading } = useDemandes(CURRENT_AGENCE_ID);

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold">Demandes reçues</h1>
      <p className="mb-6 text-sm text-ink/60">Demandes de mise en relation des ménages.</p>

      {isLoading && <p className="text-sm text-ink/50">Chargement...</p>}

      {!isLoading && demandes?.length === 0 && (
        <EmptyState
          title="Aucune demande pour le moment"
          description="Les demandes des ménages apparaîtront ici dès réception."
        />
      )}

      <div className="flex flex-col gap-2">
        {demandes?.map((d) => (
          <Link
            key={d.id}
            to={`/agence/demandes/${d.id}`}
            className="card flex items-center justify-between hover:shadow-md"
          >
            <div>
              <p className="font-medium">{d.menage}</p>
              <p className="text-xs text-ink/50">
                {d.besoin} · {d.quartier} · {d.temps}
              </p>
            </div>
            <span className={`chip ${STATUT_STYLE[d.statut] || ""}`}>{d.statut}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
