// src/pages/DemandesAffiliationAgence.tsx
import { useState } from "react";
import { ChevronLeft, MapPin, Phone, Clock, CheckCircle, XCircle, Inbox, UserPlus } from "lucide-react";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import {
  useDemandesAffiliationAgence,
  useRepondreDemandeAffiliation,
  type DemandeAffiliationAvecNounou,
} from "../hooks/useAffiliation";
import { getErrorMessage } from "../lib/errorHandler";

// ================================================================
// Page côté agence : liste des demandes d'affiliation envoyées par
// des nounous sans agence (cf. useAffiliation.ts /
// 0015_demandes_affiliation_nounou.sql). Jusqu'ici, ce hook n'était
// branché que côté nounou (EspaceNounou) — l'agence ne voyait donc
// jamais la demande ni le profil de la nounou. Cette page comble ce
// trou : affichage du profil (nom, quartier, téléphone, photo) +
// actions Accepter / Refuser.
// ================================================================

function StatutBadge({ statut }: { statut: DemandeAffiliationAvecNounou["statut"] }) {
  if (statut === "acceptee") {
    return <span className="statut-badge statut-acceptee"><CheckCircle size={14} /> Acceptée</span>;
  }
  if (statut === "refusee") {
    return <span className="statut-badge statut-refusee"><XCircle size={14} /> Refusée</span>;
  }
  return <span className="statut-badge statut-en-attente"><Clock size={14} /> En attente</span>;
}

function DemandeAffiliationCard({
  demande,
  onRepondre,
  isResponding,
}: {
  demande: DemandeAffiliationAvecNounou;
  onRepondre: (demandeId: string, accepter: boolean) => void;
  isResponding: boolean;
}) {
  const nounou = demande.nounou;

  return (
    <div className="affiliation-card">
      <div className="affiliation-card-header">
        <div className="affiliation-nounou">
          <Avatar src={nounou?.photo_url} alt={nounou?.nom ?? "Nounou"} size={48} />
          <div>
            <h3>{nounou?.nom ?? "Profil indisponible"}</h3>
            <div className="nounou-meta">
              {nounou?.quartier && <span><MapPin size={12} /> {nounou.quartier}</span>}
              {nounou?.telephone && <span><Phone size={12} /> {nounou.telephone}</span>}
            </div>
          </div>
        </div>
        <StatutBadge statut={demande.statut} />
      </div>

      {demande.statut === "en_attente" && (
        <div className="affiliation-card-actions">
          <button
            className="btn-refuser"
            disabled={isResponding}
            onClick={() => onRepondre(demande.id, false)}
          >
            <XCircle size={16} /> Refuser
          </button>
          <button
            className="btn-accepter"
            disabled={isResponding}
            onClick={() => onRepondre(demande.id, true)}
          >
            <CheckCircle size={16} /> Accepter
          </button>
        </div>
      )}

      {nounou?.telephone && (
        <button
          className="btn-whatsapp"
          onClick={() => window.open(`https://wa.me/${nounou.telephone.replace(/[^0-9]/g, "")}`, "_blank")}
        >
          Contacter sur WhatsApp
        </button>
      )}
    </div>
  );
}

export default function DemandesAffiliationAgence({
  agenceId,
  onBack,
}: {
  agenceId?: string;
  onBack: () => void;
}) {
  const [filterStatut, setFilterStatut] = useState<"en_attente" | "toutes">("en_attente");
  const [erreur, setErreur] = useState("");

  const { data: demandes, isLoading } = useDemandesAffiliationAgence(agenceId);
  const repondre = useRepondreDemandeAffiliation();

  const handleRepondre = (demandeId: string, accepter: boolean) => {
    setErreur("");
    repondre.mutate(
      { demandeId, accepter },
      { onError: (err) => setErreur(getErrorMessage(err)) }
    );
  };

  const toutesLesDemandes = demandes ?? [];
  const enAttente = toutesLesDemandes.filter((d) => d.statut === "en_attente");
  const demandesAffichees = filterStatut === "en_attente" ? enAttente : toutesLesDemandes;

  if (isLoading) {
    return (
      <div className="affiliation-agence">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des demandes d'affiliation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="affiliation-agence">
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronLeft size={20} /></button>
          <Logo size={28} />
          <span className="header-title"><UserPlus size={18} /> Demandes d'affiliation</span>
          <span className="header-count">{toutesLesDemandes.length} au total</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-number">{toutesLesDemandes.length}</span>
          <span className="stat-label">📋 Total</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{enAttente.length}</span>
          <span className="stat-label">⏳ En attente</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{toutesLesDemandes.filter((d) => d.statut === "acceptee").length}</span>
          <span className="stat-label">✅ Acceptées</span>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={filterStatut === "en_attente" ? "active" : ""}
          onClick={() => setFilterStatut("en_attente")}
        >
          En attente ({enAttente.length})
        </button>
        <button
          className={filterStatut === "toutes" ? "active" : ""}
          onClick={() => setFilterStatut("toutes")}
        >
          Toutes ({toutesLesDemandes.length})
        </button>
      </div>

      {erreur && <div className="erreur-banner">{erreur}</div>}

      <div className="affiliation-list">
        {demandesAffichees.length > 0 ? (
          demandesAffichees.map((demande) => (
            <DemandeAffiliationCard
              key={demande.id}
              demande={demande}
              onRepondre={handleRepondre}
              isResponding={repondre.isPending}
            />
          ))
        ) : (
          <div className="empty-state">
            <Inbox size={48} strokeWidth={1.5} />
            <h3>Aucune demande d'affiliation</h3>
            <p>
              Quand une nounou sans agence choisira la vôtre depuis son espace, sa demande
              apparaîtra ici avec son profil.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .affiliation-agence {
          padding: 0;
          font-family: "Inter", sans-serif;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #8A867A;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #FFF3D6;
          border-top-color: #F3811E;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-back {
          background: transparent;
          border: none;
          color: #8A867A;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-back:hover {
          background: #FFF3D6;
          color: #F3811E;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #211B14;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-count {
          font-size: 13px;
          color: #8A867A;
          background: #F1F0EC;
          padding: 2px 12px;
          border-radius: 50px;
        }

        .stats-row {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: white;
          border-radius: 14px;
          padding: 12px 16px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-number {
          font-size: 20px;
          font-weight: 800;
          color: #211B14;
        }

        .stat-label {
          font-size: 11px;
          color: #8A867A;
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 30px;
          background: rgba(212, 184, 150, 0.2);
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .filter-tabs button {
          padding: 8px 16px;
          border-radius: 50px;
          border: 1px solid rgba(212, 184, 150, 0.2);
          background: white;
          color: #8A867A;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tabs button.active {
          background: #F3811E;
          border-color: #F3811E;
          color: white;
        }

        .erreur-banner {
          background: #FEE2E2;
          color: #B91C1C;
          padding: 10px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .affiliation-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .affiliation-card {
          background: white;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          transition: all 0.3s ease;
        }

        .affiliation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(28, 25, 23, 0.08);
        }

        .affiliation-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          flex-wrap: wrap;
        }

        .affiliation-nounou {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .affiliation-nounou h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 700;
          color: #211B14;
        }

        .nounou-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #8A867A;
        }

        .nounou-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .statut-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 50px;
          white-space: nowrap;
        }

        .statut-en-attente {
          background: #FEF3C7;
          color: #B45309;
        }

        .statut-acceptee {
          background: #D1FAE5;
          color: #047857;
        }

        .statut-refusee {
          background: #FEE2E2;
          color: #B91C1C;
        }

        .affiliation-card-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .btn-refuser, .btn-accepter {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refuser {
          background: #F1F0EC;
          color: #8A867A;
        }

        .btn-refuser:hover {
          background: #FEE2E2;
          color: #B91C1C;
        }

        .btn-accepter {
          background: #F3811E;
          color: white;
        }

        .btn-accepter:hover {
          background: #C1631B;
        }

        .btn-refuser:disabled, .btn-accepter:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-whatsapp {
          margin-top: 10px;
          width: 100%;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid rgba(212, 184, 150, 0.2);
          background: white;
          color: #4A7C59;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-whatsapp:hover {
          background: #ECFDF5;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #8A867A;
          background: white;
          border-radius: 16px;
        }

        .empty-state svg {
          color: #C1631B;
          margin-bottom: 12px;
        }

        .empty-state h3 {
          font-size: 16px;
          color: #211B14;
          margin: 0 0 6px 0;
        }

        .empty-state p {
          font-size: 13px;
          max-width: 320px;
        }
      `}</style>
    </div>
  );
}
