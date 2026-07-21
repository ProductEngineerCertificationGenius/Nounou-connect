import { useParams, useNavigate } from "react-router-dom";
import { useDemande, useNounousByAgence, useAssignerNounou } from "../../hooks/useData";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";

const CURRENT_AGENCE_ID = "ag-1";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: demande, isLoading } = useDemande(id);
  const { data: nounous } = useNounousByAgence(CURRENT_AGENCE_ID);
  const { mutate: assigner, isPending } = useAssignerNounou();

  if (isLoading || !demande) return <p className="text-sm text-ink/50">Chargement...</p>;

  const disponibles = nounous?.filter((n) => n.disponible) ?? [];

  return (
    <div className="lg:max-w-lg">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-ink/50 hover:text-ink">
        &larr; Retour
      </button>

      <div className="card mb-6">
        <p className="font-display text-lg font-semibold">{demande.menage}</p>
        <p className="mt-1 text-sm text-ink/60">
          {demande.besoin} · {demande.temps} · {demande.logement}
        </p>
        <p className="mt-1 text-xs text-ink/50">{demande.quartier}</p>
        {demande.statut === "Assignée" && (
          <p className="mt-3 text-sm font-medium text-palm-dark">
            Assignée à {demande.nounouAssignee}
          </p>
        )}
      </div>

      {demande.statut === "Assignée" ? (
        <p className="text-sm text-ink/60">
          Cette demande est déjà assignée. La mise en relation se poursuit directement via
          WhatsApp entre l'agence et le ménage.
        </p>
      ) : (
        <>
          <h2 className="mb-3 font-display text-base font-semibold">
            Assigner une nounou disponible
          </h2>
          {disponibles.length === 0 ? (
            <EmptyState
              title="Aucune nounou disponible"
              description="La demande reste visible ici, sans assignation automatique, en attendant qu'une nounou du vivier redevienne disponible."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {disponibles.map((n) => (
                <div key={n.id} className="card flex items-center gap-3">
                  <Avatar name={n.nom} size={40} />
                  <div className="flex-1">
                    <p className="font-medium">{n.nom}</p>
                    <p className="text-xs text-ink/50">
                      {n.experience} · {n.langues.join(", ")}
                    </p>
                  </div>
                  <button
                    className="btn-primary w-auto px-4 py-2 text-sm"
                    disabled={isPending}
                    onClick={() => assigner({ demandeId: demande.id, nounouNom: n.nom })}
                  >
                    Assigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
