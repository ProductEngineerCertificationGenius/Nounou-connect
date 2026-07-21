import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import Stars from "./Stars";
import TrustSeal from "./TrustSeal";

export default function NannyCard({ nounou, to }) {
  return (
    <Link
      to={to || `/menage/nounous/${nounou.id}`}
      className="card flex items-center gap-3 transition-shadow hover:shadow-md"
    >
      <Avatar name={nounou.nom} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-ink">{nounou.nom}</p>
          <TrustSeal size={16} />
        </div>
        <p className="text-xs text-ink/60">
          {nounou.experience} · {nounou.langues.join(", ")}
        </p>
        <Stars rating={nounou.note} />
      </div>
      <div className="text-right">
        <p className="font-mono text-sm text-ink">{nounou.tarif.toLocaleString("fr-FR")}</p>
        <span
          className={`chip mt-1 ${
            nounou.disponible ? "border-seal/30 bg-seal-light text-seal" : ""
          }`}
        >
          {nounou.disponible ? "Disponible" : "Indisponible"}
        </span>
      </div>
    </Link>
  );
}
