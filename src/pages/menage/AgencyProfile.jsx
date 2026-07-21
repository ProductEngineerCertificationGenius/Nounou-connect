import { useParams, useNavigate } from "react-router-dom";
import { useAgence, useNounousByAgence } from "../../hooks/useData";
import Avatar from "../../components/ui/Avatar";
import Stars from "../../components/ui/Stars";
import TrustSeal from "../../components/ui/TrustSeal";
import NannyCard from "../../components/ui/NannyCard";
import EmptyState from "../../components/ui/EmptyState";

export default function AgencyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agence, isLoading } = useAgence(id);
  const { data: nounous } = useNounousByAgence(id);

  if (isLoading || !agence) return <p className="text-sm text-ink/50">Chargement...</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-ink/50 hover:text-ink">
        &larr; Retour
      </button>

      <div className="card mb-6 flex items-center gap-4">
        <Avatar name={agence.nom} size={56} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-semibold">{agence.nom}</h1>
            <TrustSeal size={18} />
          </div>
          <p className="text-sm text-ink/60">{agence.quartier}</p>
          <div className="mt-1 flex items-center gap-2">
            <Stars rating={agence.note} />
            <span className="text-xs text-ink/50">({agence.nbAvis} avis)</span>
          </div>
        </div>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-ink/70">{agence.description}</p>

      <h2 className="mb-3 font-display text-base font-semibold">Nounous disponibles</h2>
      {nounous?.length === 0 && (
        <EmptyState
          title="Aucune nounou disponible"
          description="Cette agence n'a pas de nounou disponible pour le moment."
        />
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {nounous
          ?.filter((n) => n.disponible)
          .map((n) => (
            <NannyCard key={n.id} nounou={n} />
          ))}
      </div>
    </div>
  );
}
