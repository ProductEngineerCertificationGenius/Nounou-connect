import { useNounousByAgence, useDemandes } from "../../hooks/useData";
import { useAuthStore } from "../../store/useAuthStore";
import StatCard from "../../components/ui/StatCard";
import NannyCard from "../../components/ui/NannyCard";

export default function Dashboard() {
  const agenceId = useAuthStore((s) => s.user?.id);
  const { data: nounous } = useNounousByAgence(agenceId);
  const { data: demandes } = useDemandes(agenceId);
  const placements = demandes?.filter((d) => d.statut === "Assignée").length ?? 0;

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold">Tableau de bord</h1>
      <p className="mb-6 text-sm text-ink/60">Vue d'ensemble de votre activité.</p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatCard value={nounous?.length ?? "–"} label="Nounous au vivier" />
        <StatCard value={demandes?.length ?? "–"} label="Demandes reçues" />
        <StatCard value={placements} label="Placements réalisés" />
      </div>

      <h2 className="mb-3 font-display text-base font-semibold">Nounous récemment ajoutées</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {nounous?.slice(0, 4).map((n) => (
          <NannyCard key={n.id} nounou={n} to={`/agence/vivier/${n.id}/editer`} />
        ))}
      </div>
    </div>
  );
}
