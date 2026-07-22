import { useNounou } from "../../hooks/useData";
import { useAuthStore } from "../../store/useAuthStore";
import Stars from "../../components/ui/Stars";
import EmptyState from "../../components/ui/EmptyState";

export default function Reviews() {
  const nounouId = useAuthStore((s) => s.user?.id);
  const { data: nounou } = useNounou(nounouId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Avis reçus</h1>
          <p className="text-sm text-ink/60">Ce que les familles disent de vous.</p>
        </div>
        {nounou && (
          <div className="text-right">
            <p className="font-mono text-xl text-palm-dark">{nounou.note}</p>
            <Stars rating={nounou.note} />
          </div>
        )}
      </div>

      {nounou?.avis.length === 0 && (
        <EmptyState title="Aucun avis pour le moment" description="Vos premiers avis apparaîtront ici." />
      )}

      <div className="flex flex-col gap-2">
        {nounou?.avis.map((a) => (
          <div key={a.id} className="card">
            <Stars rating={a.note} />
            <p className="mt-1 text-sm text-ink/70">{a.commentaire}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
