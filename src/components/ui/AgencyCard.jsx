import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import Stars from "./Stars";
import TrustSeal from "./TrustSeal";

export default function AgencyCard({ agence }) {
  return (
    <Link
      to={`/menage/agences/${agence.id}`}
      className="card flex items-center gap-3 transition-shadow hover:shadow-md"
    >
      <Avatar name={agence.nom} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-ink">{agence.nom}</p>
          <TrustSeal size={16} />
        </div>
        <p className="text-xs text-ink/60">{agence.quartier}</p>
        <div className="mt-1 flex items-center gap-2">
          <Stars rating={agence.note} />
          <span className="text-xs text-ink/50">({agence.nbAvis})</span>
        </div>
      </div>
      <span className="chip whitespace-nowrap font-mono">{agence.nbNounous} nounous</span>
    </Link>
  );
}
