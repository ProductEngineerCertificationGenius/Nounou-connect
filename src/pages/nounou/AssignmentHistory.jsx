import { useNounou } from "../../hooks/useData";
import { useAuthStore } from "../../store/useAuthStore";
import EmptyState from "../../components/ui/EmptyState";

const STATUT_STYLE = {
  "En cours": "border-palm/30 bg-palm-light text-palm-dark",
  Terminée: "",
};

export default function AssignmentHistory() {
  const nounouId = useAuthStore((s) => s.user?.id);
  const { data: nounou } = useNounou(nounouId);

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold">Missions assignées</h1>
      <p className="mb-6 text-sm text-ink/60">Missions confiées par votre agence.</p>

      {nounou?.historique.length === 0 && (
        <EmptyState
          title="Aucune mission pour le moment"
          description="Les missions assignées par votre agence apparaîtront ici."
        />
      )}

      <div className="flex flex-col gap-2">
        {nounou?.historique.map((h) => (
          <div key={h.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{h.menage}</p>
              <p className="text-xs text-ink/50">
                {new Date(h.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <span className={`chip ${STATUT_STYLE[h.statut] || ""}`}>{h.statut}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
