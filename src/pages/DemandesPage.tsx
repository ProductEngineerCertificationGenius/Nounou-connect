// src/pages/DemandesPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, MapPin, Calendar, ChevronRight, Clock, Search } from "lucide-react";
import { Logo } from "../components/Logo";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ================================================================
// Réécriture : branchée sur la vraie table `recherches`, remplie
// automatiquement à chaque recherche (cf. RechercheNounou.tsx). Les
// champs (quartier/besoin/temps/logement/date) correspondent
// exactement au schéma réel — rien à retirer ici.
// ================================================================

interface HistoriqueRecherche {
  id: string;
  quartier: string;
  besoin: string;
  temps?: string;
  logement?: string;
  date: string;
}

function HistoriqueCard({ item }: { item: HistoriqueRecherche }) {
  const besoinLabels: Record<string, string> = {
    "Garde d'enfants": "👶",
    "Aide ménagère": "🧹",
    "Mixte (Garde + Ménage)": "👶🧹",
  };

  const formattedDate = new Date(item.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="historique-card">
      <div className="historique-card-header">
        <span className="historique-icon">{besoinLabels[item.besoin] || "📋"}</span>
        <div className="historique-content">
          <h4>{item.besoin}</h4>
          <div className="historique-meta">
            <span><MapPin size={12} /> {item.quartier}</span>
            {item.temps && <span><Clock size={12} /> {item.temps}</span>}
            {item.logement && <span>🏠 {item.logement}</span>}
          </div>
        </div>
      </div>
      <div className="historique-card-footer">
        <div className="historique-date"><Calendar size={12} /><span>{formattedDate}</span></div>
      </div>
    </div>
  );
}

export default function DemandesPage({ onBack }: { onBack: () => void }) {
  const currentUser = useAuthStore((s) => s.user);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: historique } = useQuery({
    queryKey: ["recherches", "historique", currentUser?.id],
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recherches")
        .select("*")
        .eq("menage_id", currentUser!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as HistoriqueRecherche[];
    },
  });

  const filteredHistorique = (historique ?? []).filter(
    (item) =>
      item.quartier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.besoin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon"><FileText size={48} strokeWidth={1.5} /></div>
      <h3>Aucun historique</h3>
      <p>Vous n'avez pas encore effectué de recherche.</p>
      <button className="btn-lancer-recherche" onClick={onBack}><Search size={18} /> Lancer une recherche</button>
    </div>
  );

  return (
    <div className="demandes-page">
      <header className="demandes-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronRight size={20} style={{ transform: "rotate(180deg)" }} /></button>
          <Logo size={28} />
          <span className="header-title">Historique des recherches</span>
        </div>
        <div className="header-right"><span className="badge-count">{(historique ?? []).length}</span></div>
      </header>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-number">{(historique ?? []).length}</span>
          <span className="stat-label">Recherches</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{new Set((historique ?? []).map((i) => i.quartier)).size}</span>
          <span className="stat-label">Quartiers</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{new Set((historique ?? []).map((i) => i.besoin)).size}</span>
          <span className="stat-label">Types</span>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Filtrer par quartier ou type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="historique-list">
        {filteredHistorique.length > 0 ? (
          filteredHistorique.map((item) => <HistoriqueCard key={item.id} item={item} />)
        ) : (
          renderEmptyState()
        )}
      </div>

      <style>{`
        /* ============================================================ */
        /* VARIABLES                                                    */
        /* ============================================================ */
        :root {
          --terracotta: #C2614F;
          --terracotta-light: #D4818A;
          --terracotta-lighter: #F2D6D8;
          --terracotta-pale: #F8EDEE;
          --sauge: #4A7C59;
          --beige-light: #F8F6F5;
          --gris-fonce: #1C1917;
          --gris-moyen: #78716C;
          --blanc: #FFFFFF;
          --shadow: 0 4px 20px rgba(28, 25, 23, 0.06);
          --radius: 20px;
          --radius-sm: 14px;
        }

        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .demandes-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 16px 16px 80px;
          background: var(--beige-light);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .demandes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0 16px;
          border-bottom: 1px solid rgba(212, 184, 150, 0.2);
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-back {
          background: transparent;
          border: none;
          color: var(--gris-moyen);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-back:hover {
          background: var(--terracotta-pale);
          color: var(--terracotta);
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--gris-fonce);
        }

        .badge-count {
          background: var(--terracotta);
          color: white;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 50px;
          min-width: 24px;
          text-align: center;
        }

        /* ============================================================ */
        /* STATS                                                        */
        /* ============================================================ */
        .stats-row {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: var(--blanc);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: var(--shadow);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-number {
          font-size: 20px;
          font-weight: 800;
          color: var(--gris-fonce);
        }

        .stat-label {
          font-size: 11px;
          color: var(--gris-moyen);
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 30px;
          background: rgba(212, 184, 150, 0.2);
        }

        /* ============================================================ */
        /* SEARCH BAR                                                   */
        /* ============================================================ */
        .search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--blanc);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          box-shadow: var(--shadow);
          transition: all 0.25s ease;
        }

        .search-bar:focus-within {
          border-color: var(--terracotta);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        .search-bar svg {
          color: var(--gris-moyen);
          flex-shrink: 0;
        }

        .search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--gris-fonce);
          outline: none;
          font-family: inherit;
        }

        .search-bar input::placeholder {
          color: var(--gris-moyen);
          opacity: 0.6;
        }

        /* ============================================================ */
        /* LISTE                                                        */
        /* ============================================================ */
        .historique-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ============================================================ */
        /* CARTE HISTORIQUE                                             */
        /* ============================================================ */
        .historique-card {
          background: var(--blanc);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: var(--shadow);
          transition: all 0.25s ease;
        }

        .historique-card:hover {
          border-color: rgba(194, 97, 79, 0.15);
          box-shadow: 0 8px 30px rgba(28, 25, 23, 0.08);
        }

        .historique-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .historique-icon {
          font-size: 22px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .historique-content {
          flex: 1;
        }

        .historique-content h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin: 0 0 4px 0;
        }

        .historique-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: var(--gris-moyen);
        }

        .historique-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .historique-card-footer {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(212, 184, 150, 0.1);
        }

        .historique-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--gris-moyen);
        }

        /* ============================================================ */
        /* EMPTY STATE                                                  */
        /* ============================================================ */
        .empty-state {
          text-align: center;
          padding: 48px 20px;
        }

        .empty-icon {
          color: var(--terracotta-lighter);
          margin-bottom: 12px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin-bottom: 4px;
        }

        .empty-state p {
          color: var(--gris-moyen);
          font-size: 14px;
          max-width: 320px;
          margin: 0 auto 16px;
        }

        .btn-lancer-recherche {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: var(--terracotta);
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-lancer-recherche:hover {
          background: #B25545;
          box-shadow: 0 4px 16px rgba(194, 97, 79, 0.3);
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 480px) {
          .demandes-page {
            padding: 12px 12px 80px;
          }

          .historique-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .stats-row {
            padding: 10px 12px;
          }

          .stat-number {
            font-size: 17px;
          }

          .search-bar {
            padding: 8px 12px;
          }

          .search-bar input {
            font-size: 13px;
          }
        }

        @media (min-width: 769px) {
          .demandes-page {
            padding: 24px 24px 40px;
          }

          .historique-card {
            padding: 18px 20px;
          }

          .historique-content h4 {
            font-size: 17px;
          }

          .historique-meta {
            font-size: 13px;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
