// src/pages/DemandesAgence.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Calendar,
  Phone,
  MessageCircle,
  Search,
  UserCheck,
  X,
  Inbox,
  Baby,
  Home,
  Users,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";

// ================================================================
// TYPES
// ================================================================

interface DemandeAgence {
  id: string;
  menage?: { 
    id: string;
    nom: string; 
    telephone: string; 
    quartier: string;
  };
  quartier: string;
  besoin: string;
  temps: string;
  logement: string;
  statut: "En attente" | "Assignée";
  date: string;
  nounou_assignee?: { id: string; nom: string };
}

interface NounouDispo {
  id: string;
  nom: string;
  telephone?: string;
  quartier?: string;
  disponible?: boolean;
}

// ================================================================
// COMPOSANTS
// ================================================================

function StatutBadge({ statut }: { statut: DemandeAgence["statut"] }) {
  if (statut === "Assignée") {
    return <span className="statut-badge statut-assignee"><UserCheck size={14} /> Assignée</span>;
  }
  return <span className="statut-badge statut-en-attente"><Clock size={14} /> En attente</span>;
}

function DemandeCard({
  demande,
  isHighlighted,
  onContacter,
  onAssigner,
  nounousDispo,
  isAssigning,
}: {
  demande: DemandeAgence;
  isHighlighted: boolean;
  onContacter: (telephone?: string) => void;
  onAssigner: (demandeId: string, nounouId: string) => void;
  nounousDispo: NounouDispo[];
  isAssigning: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNounou, setSelectedNounou] = useState(demande.nounou_assignee?.id ?? "");

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      cardRef.current.style.transition = "all 0.3s ease";
      cardRef.current.style.borderColor = "#C2614F";
      cardRef.current.style.boxShadow = "0 0 0 4px rgba(194, 97, 79, 0.15), 0 8px 30px rgba(28, 25, 23, 0.12)";
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.borderColor = "";
          cardRef.current.style.boxShadow = "";
        }
      }, 3000);
    }
  }, [isHighlighted]);

  const formattedDate = new Date(demande.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getBesoinIcon = (besoin: string) => {
    if (besoin === "Garde d'enfants") return <Baby size={14} />;
    if (besoin === "Aide ménagère") return <Home size={14} />;
    if (besoin === "Mixte (Garde + Ménage)") return <Users size={14} />;
    return <Briefcase size={14} />;
  };

  const handleAssignSubmit = () => {
    if (selectedNounou) {
      onAssigner(demande.id, selectedNounou);
      setShowAssignModal(false);
      setSelectedNounou("");
    }
  };

  return (
    <div ref={cardRef} className={`demande-card ${isHighlighted ? "highlighted" : ""}`}>
      <div className="demande-card-header">
        <div className="demande-menage">
          <div className="menage-avatar"><span>👤</span></div>
          <div>
            <h4>{demande.menage?.nom || "Ménage"}</h4>
            <div className="menage-meta">
              <span><Phone size={12} /> {demande.menage?.telephone || "—"}</span>
              <span><MapPin size={12} /> {demande.quartier}</span>
            </div>
          </div>
        </div>
        <StatutBadge statut={demande.statut} />
      </div>

      <div className="demande-card-body">
        {/* Informations complètes de la demande */}
        <div className="demande-infos">
          <div className="info-item">
            <span className="info-label">Besoin</span>
            <span className="info-value">{getBesoinIcon(demande.besoin)} {demande.besoin}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Temps</span>
            <span className="info-value">{demande.temps}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Logement</span>
            <span className="info-value">{demande.logement}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Quartier</span>
            <span className="info-value"><MapPin size={14} /> {demande.quartier}</span>
          </div>
        </div>

        {/* Ménage - coordonnées complètes */}
        <div className="demande-menage-detail">
          <div className="detail-label">👤 Informations du ménage</div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-key">Nom :</span>
              <span className="detail-value">{demande.menage?.nom || "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Téléphone :</span>
              <span className="detail-value">{demande.menage?.telephone || "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Quartier :</span>
              <span className="detail-value">{demande.quartier}</span>
            </div>
          </div>
        </div>

        {/* Nounou assignée */}
        {demande.statut === "Assignée" && demande.nounou_assignee && (
          <div className="demande-nounou-assignee">
            <span className="assignee-label">👩 Nounou assignée</span>
            <span className="assignee-name">{demande.nounou_assignee.nom}</span>
            <span className="assignee-badge"><CheckCircle size={14} /> Assignée</span>
          </div>
        )}

        {/* La famille a choisi une nounou directement depuis sa recherche :
            on le met en avant pour que l'agence n'ait plus qu'à confirmer. */}
        {demande.statut === "En attente" && demande.nounou_assignee && (
          <div className="demande-nounou-souhaitee">
            <span className="assignee-label">🙋 Nounou souhaitée par la famille</span>
            <span className="assignee-name">{demande.nounou_assignee.nom}</span>
          </div>
        )}
      </div>

      <div className="demande-card-footer">
        <div className="demande-date">
          <Calendar size={14} />
          <span>{formattedDate}</span>
        </div>
        <div className="demande-actions">
          {demande.statut === "En attente" ? (
            <>
              <button className="btn-contacter" onClick={() => onContacter(demande.menage?.telephone)}>
                <MessageCircle size={14} /> Contacter
              </button>
              <button className="btn-assigner" onClick={() => setShowAssignModal(true)}>
                <UserCheck size={14} /> Assigner
              </button>
            </>
          ) : (
            <span className="nounou-assignee-label">
              <UserCheck size={14} /> {demande.nounou_assignee?.nom || "Assignée"}
            </span>
          )}
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && (
        <div className="assign-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="assign-modal-header">
              <h4>Assigner une nounou</h4>
              <button className="assign-modal-close" onClick={() => setShowAssignModal(false)}><X size={18} /></button>
            </div>
            <div className="assign-modal-body">
              <p>Choisissez une nounou disponible pour cette demande</p>
              
              {/* Infos de la demande dans le modal */}
              <div className="modal-demande-info">
                <div className="modal-info-item">
                  <span className="modal-info-label">👤 Ménage</span>
                  <span className="modal-info-value">{demande.menage?.nom || "—"}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">📍 Quartier</span>
                  <span className="modal-info-value">{demande.quartier}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">📋 Besoin</span>
                  <span className="modal-info-value">{demande.besoin}</span>
                </div>
              </div>

              <select 
                value={selectedNounou} 
                onChange={(e) => setSelectedNounou(e.target.value)} 
                className="assign-select"
              >
                <option value="">Sélectionner une nounou</option>
                {nounousDispo.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nom} {n.quartier ? `- ${n.quartier}` : ""}
                  </option>
                ))}
              </select>
              {nounousDispo.length === 0 && (
                <p className="no-nounou-message">
                  ⚠️ Aucune nounou disponible actuellement dans votre vivier.
                </p>
              )}
            </div>
            <div className="assign-modal-footer">
              <button className="btn-cancel-assign" onClick={() => setShowAssignModal(false)}>Annuler</button>
              <button 
                className="btn-confirm-assign" 
                onClick={handleAssignSubmit} 
                disabled={!selectedNounou || isAssigning}
              >
                {isAssigning ? "Assignation..." : "✅ Assigner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ===== PAGE PRINCIPALE ===========================================
// ================================================================

export default function DemandesAgence({
  agenceId,
  onBack,
  demandeId,
}: {
  agenceId?: string;
  onBack: () => void;
  demandeId?: string;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "En attente" | "Assignée">("tous");

  // Récupérer toutes les demandes
  const { data: demandes, isLoading } = useQuery({
    queryKey: ["demandes", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes")
        .select("*, menage:menages(id, nom, telephone, quartier), nounou_assignee:nounous!nounou_assignee_id(id, nom)")
        .eq("agence_id", agenceId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as DemandeAgence[];
    },
  });

  // Récupérer les nounous disponibles
  const { data: nounousDispo } = useQuery({
    queryKey: ["nounous", "agence", agenceId, "disponibles"],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nounous")
        .select("id, nom, telephone, quartier")
        .eq("agence_id", agenceId!)
        .eq("disponible", true);
      if (error) throw error;
      return data as NounouDispo[];
    },
  });

  // Mutation pour assigner une nounou
  const assignerNounou = useMutation({
    mutationFn: async ({ demandeIdToAssign, nounouId }: { demandeIdToAssign: string; nounouId: string }) => {
      const { error } = await supabase.rpc("assigner_nounou", {
        p_demande_id: demandeIdToAssign,
        p_nounou_id: nounouId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes", "agence", agenceId] });
      queryClient.invalidateQueries({ queryKey: ["nounous", "agence", agenceId, "disponibles"] });
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleContacter = (telephone?: string) => {
    if (!telephone) return;
    window.open(`https://wa.me/${telephone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const handleAssigner = (demandeIdToAssign: string, nounouId: string) => {
    assignerNounou.mutate({ demandeIdToAssign, nounouId });
  };

  // Filtrage des demandes
  const filteredDemandes = (demandes ?? [])
    .filter((d) => {
      const matchSearch = 
        (d.menage?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.quartier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.besoin.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatut = filterStatut === "tous" || d.statut === filterStatut;
      return matchSearch && matchStatut;
    });

  // Trouver l'index de la demande à mettre en surbrillance
  const highlightIndex = demandeId ? filteredDemandes.findIndex((d) => d.id === demandeId) : -1;

  // Statistiques
  const stats = {
    total: (demandes ?? []).length,
    enAttente: (demandes ?? []).filter((d) => d.statut === "En attente").length,
    assignees: (demandes ?? []).filter((d) => d.statut === "Assignée").length,
  };

  if (isLoading) {
    return (
      <div className="demandes-agence">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="demandes-agence">
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronLeft size={20} /></button>
          <Logo size={28} />
          <span className="header-title">📩 Demandes</span>
          <span className="header-count">{stats.total} demandes</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">📋 Total</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{stats.enAttente}</span>
          <span className="stat-label">⏳ En attente</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-number">{stats.assignees}</span>
          <span className="stat-label">✅ Assignées</span>
        </div>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, quartier ou besoin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as "tous" | "En attente" | "Assignée")}
            className="filter-select"
          >
            <option value="tous">📊 Tous statuts</option>
            <option value="En attente">⏳ En attente</option>
            <option value="Assignée">✅ Assignée</option>
          </select>
        </div>
      </div>

      <div className="demandes-list">
        {filteredDemandes.length > 0 ? (
          filteredDemandes.map((demande, index) => (
            <DemandeCard
              key={demande.id}
              demande={demande}
              isHighlighted={index === highlightIndex}
              onContacter={handleContacter}
              onAssigner={handleAssigner}
              nounousDispo={nounousDispo ?? []}
              isAssigning={assignerNounou.isPending}
            />
          ))
        ) : (
          <div className="empty-state">
            <Inbox size={48} strokeWidth={1.5} />
            <h3>Aucune demande trouvée</h3>
            <p>Essayez de modifier vos filtres ou revenez plus tard.</p>
          </div>
        )}
      </div>

      <style>{`
        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .demandes-agence {
          padding: 0;
          font-family: "Inter", sans-serif;
        }

        /* ============================================================ */
        /* LOADING                                                      */
        /* ============================================================ */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #78716C;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #F2D6D8;
          border-top-color: #C2614F;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
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
          color: #78716C;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-back:hover {
          background: #F2D6D8;
          color: #C2614F;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
        }

        .header-count {
          font-size: 13px;
          color: #78716C;
          background: #F5F0EB;
          padding: 2px 12px;
          border-radius: 50px;
        }

        /* ============================================================ */
        /* STATS                                                        */
        /* ============================================================ */
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
          color: #1C1917;
        }

        .stat-label {
          font-size: 11px;
          color: #78716C;
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 30px;
          background: rgba(212, 184, 150, 0.2);
        }

        /* ============================================================ */
        /* SEARCH + FILTRES                                             */
        /* ============================================================ */
        .search-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-bar {
          flex: 1;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border-radius: 12px;
          padding: 10px 16px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          transition: all 0.25s ease;
        }

        .search-bar:focus-within {
          border-color: #C2614F;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        .search-bar svg {
          color: #78716C;
          flex-shrink: 0;
        }

        .search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #1C1917;
          outline: none;
          font-family: inherit;
        }

        .search-bar input::placeholder {
          color: #78716C;
          opacity: 0.6;
        }

        .filter-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 10px 14px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          border-radius: 12px;
          background: white;
          font-size: 13px;
          color: #1C1917;
          outline: none;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: inherit;
          min-width: 120px;
        }

        .filter-select:focus {
          border-color: #C2614F;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        /* ============================================================ */
        /* LISTE DES DEMANDES                                           */
        /* ============================================================ */
        .demandes-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ============================================================ */
        /* CARTE DEMANDE                                                */
        /* ============================================================ */
        .demande-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          transition: all 0.3s ease;
        }

        .demande-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(28, 25, 23, 0.08);
        }

        .demande-card.highlighted {
          border-color: #C2614F;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.15), 0 8px 30px rgba(28, 25, 23, 0.12);
          animation: pulse-border 0.6s ease;
        }

        @keyframes pulse-border {
          0% { transform: scale(1); }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }

        .demande-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .demande-menage {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .menage-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #F2D6D8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .demande-menage h4 {
          font-size: 16px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 2px 0;
        }

        .menage-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #78716C;
          flex-wrap: wrap;
        }

        .menage-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* ============================================================ */
        /* STATUT BADGE                                                 */
        /* ============================================================ */
        .statut-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .statut-en-attente {
          background: #FEF3C7;
          color: #92400E;
        }

        .statut-assignee {
          background: #D1FAE5;
          color: #065F46;
        }

        /* ============================================================ */
        /* CORPS DE LA CARTE                                            */
        /* ============================================================ */
        .demande-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid #F5F0EB;
          border-bottom: 1px solid #F5F0EB;
        }

        .demande-infos {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-label {
          font-size: 10px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-value {
          font-size: 13px;
          font-weight: 600;
          color: #1C1917;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ============================================================ */
        /* MÉNAGE DÉTAIL                                                */
        /* ============================================================ */
        .demande-menage-detail {
          background: #FAF7F2;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 6px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 16px;
        }

        .detail-item {
          display: flex;
          gap: 4px;
          font-size: 13px;
        }

        .detail-key {
          color: #78716C;
          font-weight: 500;
        }

        .detail-value {
          color: #1C1917;
          font-weight: 600;
        }

        /* ============================================================ */
        /* NOUNOU ASSIGNÉE                                              */
        /* ============================================================ */
        .demande-nounou-assignee {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #D1FAE5;
          border-radius: 10px;
        }

        .assignee-label {
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
        }

        .assignee-name {
          font-size: 14px;
          font-weight: 700;
          color: #065F46;
        }

        .assignee-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #065F46;
          margin-left: auto;
        }

        .demande-nounou-souhaitee {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #FEF3C7;
          border-radius: 10px;
        }

        .demande-nounou-souhaitee .assignee-name {
          color: #92400E;
        }

        /* ============================================================ */
        /* FOOTER DE LA CARTE                                           */
        /* ============================================================ */
        .demande-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .demande-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #78716C;
        }

        .demande-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-contacter {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-contacter:hover {
          background: #1EBE5E;
          transform: scale(1.02);
        }

        .btn-assigner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #C2614F;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-assigner:hover {
          background: #B25545;
        }

        .nounou-assignee-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #D1FAE5;
          color: #065F46;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ============================================================ */
        /* MODAL D'ASSIGNATION                                          */
        /* ============================================================ */
        .assign-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(28, 25, 23, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .assign-modal {
          background: white;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          padding: 24px;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .assign-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .assign-modal-header h4 {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
        }

        .assign-modal-close {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .assign-modal-close:hover {
          background: #F5F0EB;
          color: #1C1917;
        }

        .assign-modal-body p {
          font-size: 14px;
          color: #78716C;
          margin-bottom: 12px;
        }

        .modal-demande-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          background: #FAF7F2;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }

        .modal-info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .modal-info-label {
          font-size: 9px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .modal-info-value {
          font-size: 12px;
          font-weight: 600;
          color: #1C1917;
        }

        .assign-select {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #F2D6D8;
          border-radius: 12px;
          font-size: 14px;
          background: #FAF7F2;
          color: #1C1917;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .assign-select:focus {
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .no-nounou-message {
          font-size: 12px;
          color: #E87A7A;
          margin-top: 8px;
        }

        .assign-modal-footer {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          justify-content: flex-end;
        }

        .btn-cancel-assign {
          padding: 10px 20px;
          background: transparent;
          border: 1.5px solid #F2D6D8;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #78716C;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-cancel-assign:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .btn-confirm-assign {
          padding: 10px 24px;
          background: #C2614F;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-confirm-assign:hover:not(:disabled) {
          background: #B25545;
          box-shadow: 0 4px 16px rgba(194, 97, 79, 0.3);
        }

        .btn-confirm-assign:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ============================================================ */
        /* EMPTY STATE                                                  */
        /* ============================================================ */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #78716C;
        }

        .empty-state svg {
          color: #D4B896;
          margin-bottom: 12px;
        }

        .empty-state h3 {
          font-size: 18px;
          color: #1C1917;
          margin-bottom: 4px;
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 768px) {
          .demande-infos {
            grid-template-columns: 1fr 1fr;
          }

          .demande-card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .demande-card-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .demande-date {
            justify-content: center;
          }

          .demande-actions {
            justify-content: center;
          }

          .btn-contacter,
          .btn-assigner,
          .nounou-assignee-label {
            flex: 1;
            justify-content: center;
          }

          .stats-row {
            padding: 10px 12px;
          }

          .stat-number {
            font-size: 17px;
          }

          .search-filters {
            flex-direction: column;
          }

          .filter-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .header-count {
            display: none;
          }

          .assign-modal {
            padding: 20px;
            margin: 10px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .modal-demande-info {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .demande-infos {
            grid-template-columns: 1fr;
          }

          .demande-menage {
            flex-direction: column;
            align-items: flex-start;
          }

          .menage-avatar {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .demande-menage h4 {
            font-size: 14px;
          }

          .menage-meta {
            flex-direction: column;
            gap: 2px;
          }

          .filter-group {
            grid-template-columns: 1fr;
          }

          .header-title {
            font-size: 16px;
          }

          .stat-number {
            font-size: 15px;
          }

          .stat-label {
            font-size: 10px;
          }

          .demande-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn-contacter,
          .btn-assigner,
          .nounou-assignee-label {
            width: 100%;
            justify-content: center;
          }

          .assign-modal {
            padding: 16px;
          }
        }

        @media (min-width: 769px) {
          .demande-card {
            padding: 24px;
          }

          .demande-infos {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}