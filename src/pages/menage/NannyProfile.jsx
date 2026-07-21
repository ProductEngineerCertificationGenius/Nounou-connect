import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNounou, useAgence } from "../../hooks/useData";
import Avatar from "../../components/ui/Avatar";
import Stars from "../../components/ui/Stars";
import TrustSeal from "../../components/ui/TrustSeal";
import RatingModal from "../../components/ui/RatingModal";

export default function NannyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: nounou, isLoading } = useNounou(id);
  const { data: agence } = useAgence(nounou?.agenceId);
  const [showRating, setShowRating] = useState(false);

  if (isLoading || !nounou) return <p className="text-sm text-ink/50">Chargement...</p>;

  // Cf. ADR 0005 : mise en relation via lien direct WhatsApp (wa.me),
  // pas de messagerie interne. Le contact s'effectue avec l'agence,
  // garante du profil.
  const whatsappMessage = encodeURIComponent(
    `Bonjour, je vous contacte via Nounou Connect au sujet du profil de ${nounou.nom}.`
  );
  const whatsappHref = `https://wa.me/${agence?.telephone}?text=${whatsappMessage}`;

  return (
    <div className="lg:grid lg:grid-cols-3 lg:gap-8">
      <div className="lg:col-span-2">
        <button onClick={() => navigate(-1)} className="mb-4 text-sm text-ink/50 hover:text-ink">
          &larr; Retour
        </button>

        <div className="card mb-6 flex items-center gap-4">
          <Avatar name={nounou.nom} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-semibold">{nounou.nom}</h1>
              <TrustSeal size={18} />
            </div>
            <p className="text-sm text-ink/60">
              Garantie par {agence?.nom || "l'agence"} · {nounou.quartier}
            </p>
            <Stars rating={nounou.note} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <InfoBlock label="Expérience" value={nounou.experience} />
          <InfoBlock label="Langues" value={nounou.langues.join(", ")} />
          <InfoBlock
            label="Tarif"
            value={`${nounou.tarif.toLocaleString("fr-FR")} FCFA`}
            mono
          />
        </div>

        <h2 className="mb-3 font-display text-base font-semibold">Avis des familles</h2>
        <div className="flex flex-col gap-2">
          {nounou.avis.map((a) => (
            <div key={a.id} className="card">
              <Stars rating={a.note} />
              <p className="mt-1 text-sm text-ink/70">{a.commentaire}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 lg:mt-0">
        <div className="sticky top-8 flex flex-col gap-3">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-whatsapp">
            Contacter via WhatsApp
          </a>
          <button onClick={() => setShowRating(true)} className="btn-secondary">
            Noter une expérience passée
          </button>
        </div>
      </div>

      {showRating && <RatingModal nounou={nounou} onClose={() => setShowRating(false)} />}
    </div>
  );
}

function InfoBlock({ label, value, mono }) {
  return (
    <div className="card py-3 text-center">
      <p className={`text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-ink/50">{label}</p>
    </div>
  );
}
