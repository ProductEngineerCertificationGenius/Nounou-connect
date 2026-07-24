// src/pages/EspaceNounou.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  Heart,
  FileText,
  Calendar,
  MessageCircle,
  Building2,
  Users,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout, useRejoindreAgence } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";

type Tab = "profil" | "agences" | "demandes";

interface AgencePublique {
  id: string;
  nom: string;
  quartier: string;
  telephone: string;
  description: string;
  note: number;
  nbNounous: number;
  photo_url?: string;
}

interface DemandeNounou {
  id: string;
  quartier: string;
  besoin: string;
  temps: string;
  logement: string;
  statut: string;
  date: string;
  menage?: { nom: string } | null;
}

export default function EspaceNounou() {
  const onLogout = useLogout();
  const currentUser = useAuthStore((s) => s.user);
  const { nounouMode, nounouIdentifiant, setNounouMode, setNounouIdentifiant } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [showRejoindreModal, setShowRejoindreModal] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [selectedAgence, setSelectedAgence] = useState<AgencePublique | null>(null);
  const [searchQuartier, setSearchQuartier] = useState("");

  // ===== PROFIL NOUNOU =====
  const { data: profil, refetch: refetchProfil } = useQuery({
    queryKey: ["nounou", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      const { data, error } = await supabase
        .from("nounous")
        .select("*, agence:agences(nom, id, quartier, telephone)")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // ===== DEMANDES ASSIGNÉES =====
  const { data: mesDemandes } = useQuery({
    queryKey: ["demandes", "nounou", profil?.id],
    enabled: Boolean(profil?.id) && isSupabaseConfigured && profil?.agence_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes")
        .select("*, menage:menages(nom)")
        .eq("nounou_assignee_id", profil!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as DemandeNounou[];
    },
  });

  // ===== AGENCES DU QUARTIER =====
  const { data: agencesQuartier } = useQuery({
    queryKey: ["agences", "quartier", profil?.quartier],
    enabled: Boolean(profil?.quartier) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agences_public")
        .select("*")
        .eq("quartier", profil!.quartier)
        .order("note", { ascending: false });
      if (error) throw error;
      return data as AgencePublique[];
    },
  });

  // ===== TOGGLE DISPONIBILITÉ =====
  const toggleDisponible = useMutation({
    mutationFn: async () => {
      if (!profil) return;
      const { data, error } = await supabase
        .from("nounous")
        .update({ disponible: !profil.disponible })
        .eq("id", profil.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Impossible de modifier la disponibilité.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] });
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  // ===== REJOINDRE UNE AGENCE =====
  const rejoindreAgence = useRejoindreAgence();

  // ===== CONTACT WHATSAPP =====
  const handleWhatsAppContact = (telephone: string) => {
    const cleanPhone = telephone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  // ===== FILTRAGE AGENCES =====
  const filteredAgences = (agencesQuartier || []).filter((agence) =>
    agence.nom.toLowerCase().includes(searchQuartier.toLowerCase())
  );

  // ===== MESSAGE D'ACCUEIL =====
  const renderWelcomeMessage = () => {
    if (profil?.agence_id) {
      return (
        <div className="welcome-message with-agence">
          <div className="welcome-icon">✅</div>
          <div>
            <h4>Vous êtes rattachée à une agence</h4>
            <p>Votre profil est visible par les familles. Gérez vos disponibilités et consultez vos demandes.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="welcome-message without-agence">
        <div className="welcome-icon">🏢</div>
        <div>
          <h4>Vous n'avez pas encore d'agence</h4>
          <p>Consultez la liste des agences de votre quartier et rejoignez celle qui vous correspond.</p>
          <button className="btn-rejoindre" onClick={() => setActiveTab("agences")}>
            Voir les agences <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ===== RENDU PROFIL =====
  const renderProfil = () => {
    const initiales = (profil?.nom || "?")
      .split(" ")
      .map((p: string) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <>
        <section className="profile-section">
          <div className="profile-header">
            <div className="avatar-wrapper">
              {profil?.photo_url ? (
                <img src={profil.photo_url} alt={profil?.nom} />
              ) : (
                <div className="avatar-placeholder">{initiales}</div>
              )}
            </div>
            <div className="profile-info">
              <div className="profile-name">
                <h1>{profil?.nom || "..."}</h1>
                <span className="role-badge">Nounou</span>
                {profil?.agence_id && (
                  <span className="agence-badge">✅ Rattachée</span>
                )}
                {nounouIdentifiant && (
                  <span className="identifiant-badge">🆔 {nounouIdentifiant}</span>
                )}
              </div>
              <div className="profile-meta">
                <span><Star size={16} fill="#F59E0B" color="#F59E0B" /> {profil?.note_moyenne ?? "—"}/5</span>
                <span><MapPin size={16} /> {profil?.quartier}</span>
              </div>
              {profil?.agence && (
                <div className="profile-agence">
                  <Building2 size={14} />
                  <span>{profil.agence.nom}</span>
                  <span className="agence-separator">•</span>
                  <span>{profil.agence.quartier}</span>
                </div>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{profil?.experience || "Non renseigné"}</span>
              <span className="stat-label">Expérience</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{profil?.tarif ? profil.tarif.toLocaleString() : "—"}</span>
              <span className="stat-label">FCFA / jour</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{profil?.langues?.length || 0}</span>
              <span className="stat-label">Langues</span>
            </div>
          </div>

          {profil?.langues && profil.langues.length > 0 && (
            <div className="langues-section">
              <span className="langues-label">🗣️ Langues :</span>
              <div className="langues-tags">
                {profil.langues.map((l: string) => (
                  <span key={l} className="langue-tag">{l.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* MESSAGE D'ACCUEIL */}
        {renderWelcomeMessage()}

        <section className="statut-section">
          <div className="statut-card">
            <div className="statut-info">
              <span className="statut-icon">
                {profil?.disponible ? <CheckCircle size={24} /> : <Clock size={24} />}
              </span>
              <div>
                <span className="statut-label">Mon statut</span>
                <span className={`statut-value ${profil?.disponible ? "disponible" : "indisponible"}`}>
                  {profil?.disponible ? "✅ Disponible" : "❌ Indisponible"}
                </span>
              </div>
            </div>
            <button className="btn-toggle-statut" onClick={() => toggleDisponible.mutate()} disabled={toggleDisponible.isPending}>
              {toggleDisponible.isPending ? "..." : profil?.disponible ? "Marquer indisponible" : "Marquer disponible"}
            </button>
          </div>
        </section>

        <div className="info-message">
          <Heart size={20} color="#C2614F" />
          <p>
            {profil?.agence_id
              ? `Pour modifier vos informations, contactez votre agence : ${profil?.agence?.nom}`
              : "Pour modifier vos informations, veuillez rejoindre une agence."}
          </p>
        </div>

        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={20} /> Se déconnecter
        </button>
      </>
    );
  };

  // ===== RENDU AGENCES =====
  const renderAgences = () => (
    <section className="agences-section">
      <div className="agences-header">
        <h2>🏢 Agences de votre quartier</h2>
        <p className="agences-subtitle">
          {profil?.quartier
            ? `Agences disponibles à ${profil.quartier}`
            : "Veuillez renseigner votre quartier dans votre profil."}
        </p>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Rechercher une agence..."
          value={searchQuartier}
          onChange={(e) => setSearchQuartier(e.target.value)}
        />
      </div>

      <div className="agences-list">
        {filteredAgences.length > 0 ? (
          filteredAgences.map((agence) => (
            <div key={agence.id} className="agence-card">
              <div className="agence-card-header">
                <div className="agence-avatar">
                  {agence.photo_url ? (
                    <img src={agence.photo_url} alt={agence.nom} />
                  ) : (
                    <div className="agence-placeholder">🏢</div>
                  )}
                </div>
                <div className="agence-info">
                  <h4>{agence.nom}</h4>
                  <div className="agence-meta">
                    <span><MapPin size={12} /> {agence.quartier}</span>
                    <span><Users size={12} /> {agence.nbNounous} nounous</span>
                    <span><Star size={12} fill="#F59E0B" color="#F59E0B" /> {agence.note || "—"}</span>
                  </div>
                </div>
              </div>

              {agence.description && (
                <p className="agence-description">{agence.description}</p>
              )}

              <div className="agence-actions">
                <button
                  className="btn-whatsapp-agence"
                  onClick={() => handleWhatsAppContact(agence.telephone)}
                >
                  <MessageCircle size={16} />
                  Contacter sur WhatsApp
                </button>
                <button
                  className="btn-rejoindre-agence"
                  onClick={() => {
                    setSelectedAgence(agence);
                    setShowRejoindreModal(true);
                  }}
                >
                  Rejoindre cette agence
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-agences">
            <Building2 size={48} strokeWidth={1.5} />
            <h3>Aucune agence trouvée</h3>
            <p>Essayez de modifier votre recherche ou contactez le support.</p>
            <button
              className="btn-support"
              onClick={() => window.open("https://wa.me/2250152242299", "_blank")}
            >
              <MessageCircle size={16} />
              Contacter le support
            </button>
          </div>
        )}
      </div>
    </section>
  );

  // ===== RENDU DEMANDES =====
  const renderDemandes = () => {
    const besoinLabels: Record<string, string> = {
      "Garde d'enfants": "👶",
      "Aide ménagère": "🧹",
      "Mixte (Garde + Ménage)": "👶🧹",
    };

    return (
      <section className="demandes-section">
        <h2 className="demandes-title">📋 Mes demandes</h2>
        <p className="demandes-subtitle">
          {profil?.agence_id
            ? "Demandes assignées par votre agence"
            : "Rejoignez une agence pour voir vos demandes"}
        </p>

        {profil?.agence_id ? (
          <div className="demandes-list">
            {(mesDemandes ?? []).length > 0 ? (
              (mesDemandes ?? []).map((d) => (
                <div key={d.id} className="demande-card">
                  <div className="demande-card-header">
                    <span className="demande-icon">{besoinLabels[d.besoin] || "📋"}</span>
                    <div className="demande-content">
                      <h4>{d.menage?.nom || "Famille"}</h4>
                      <div className="demande-meta">
                        <span><MapPin size={12} /> {d.quartier}</span>
                        <span><Clock size={12} /> {d.temps}</span>
                        <span>🏠 {d.logement}</span>
                      </div>
                    </div>
                    <span className={`demande-statut ${d.statut === "Assignée" ? "assignee" : "attente"}`}>
                      {d.statut}
                    </span>
                  </div>
                  <div className="demande-card-footer">
                    <Calendar size={12} />
                    <span>
                      {new Date(d.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#78716C", fontSize: 14 }}>
                Aucune demande assignée pour le moment.
              </p>
            )}
          </div>
        ) : (
          <div className="empty-demandes">
            <FileText size={48} strokeWidth={1.5} />
            <h3>Rejoignez une agence</h3>
            <p>Pour voir vos demandes, vous devez d'abord rejoindre une agence.</p>
            <button className="btn-rejoindre" onClick={() => setActiveTab("agences")}>
              Voir les agences
            </button>
          </div>
        )}
      </section>
    );
  };

  // ===== MODAL REJOINDRE AGENCE =====
  const renderRejoindreModal = () => {
    if (!showRejoindreModal || !selectedAgence) return null;

    const handleSubmitRejoindre = () => {
      if (!identifiant || identifiant.length < 3) {
        alert("Veuillez entrer un identifiant valide.");
        return;
      }
      rejoindreAgence.mutate({
        agenceId: selectedAgence.id,
        identifiant: identifiant,
      }, {
        onSuccess: () => {
          setShowRejoindreModal(false);
          setIdentifiant("");
          setSelectedAgence(null);
          setNounouMode("avec-agence");
          setNounouIdentifiant(identifiant);
          refetchProfil();
          alert("✅ Vous avez rejoint l'agence avec succès !");
        },
        onError: (err) => alert(getErrorMessage(err)),
      });
    };

    return (
      <div className="modal-overlay" onClick={() => setShowRejoindreModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowRejoindreModal(false)}>
            <X size={20} />
          </button>

          <div className="modal-header">
            <h3>Rejoindre {selectedAgence.nom}</h3>
            <p>Entrez l'identifiant que l'agence vous a fourni.</p>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label>Identifiant</label>
              <input
                type="text"
                placeholder="Entrez votre identifiant"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
              />
              <p className="field-hint">
                💡 L'identifiant vous a été fourni par l'agence après validation de votre dossier.
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRejoindreModal(false)}>
                Annuler
              </button>
              <button
                className="btn-confirm"
                onClick={handleSubmitRejoindre}
                disabled={rejoindreAgence.isPending || !identifiant}
              >
                {rejoindreAgence.isPending ? "..." : "✅ Rejoindre"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== BOTTOM NAV =====
  const renderBottomNav = () => (
    <nav className="bottom-nav">
      <button className={activeTab === "profil" ? "active" : ""} onClick={() => setActiveTab("profil")}>
        <div className={`nav-icon-wrapper ${activeTab === "profil" ? "active-icon" : ""}`}>
          <User size={20} />
        </div>
        <span>Profil</span>
      </button>
      <button className={activeTab === "agences" ? "active" : ""} onClick={() => setActiveTab("agences")}>
        <div className={`nav-icon-wrapper ${activeTab === "agences" ? "active-icon" : ""}`}>
          <Building2 size={20} />
        </div>
        <span>Agences</span>
      </button>
      <button className={activeTab === "demandes" ? "active" : ""} onClick={() => setActiveTab("demandes")}>
        <div className={`nav-icon-wrapper ${activeTab === "demandes" ? "active-icon" : ""}`}>
          <FileText size={20} />
        </div>
        <span>Demandes</span>
      </button>
    </nav>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="espace-nounou">
      <header className="nounou-header">
        <div className="header-left">
          <Logo size={28} />
          <span className="header-title">Nounou Connect</span>
        </div>
        <button className="btn-logout-header" onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </header>

      <main className="nounou-content">
        {activeTab === "profil" && renderProfil()}
        {activeTab === "agences" && renderAgences()}
        {activeTab === "demandes" && renderDemandes()}
      </main>

      {renderBottomNav()}
      {renderRejoindreModal()}

      <style>{`
        .espace-nounou {
          min-height: 100vh;
          background: #FBF9F7;
          font-family: "Inter", sans-serif;
          padding-bottom: 80px;
        }

        .nounou-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #4A3520;
        }

        .btn-logout-header {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-logout-header:hover {
          background: #FEE2E2;
          color: #DC2626;
        }

        .nounou-content {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px 20px 20px;
        }

        .welcome-message {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.12);
        }

        .welcome-message.with-agence {
          background: #E8F5E8;
          border-color: #4A7C59;
        }

        .welcome-message.without-agence {
          background: #F8EDEE;
          border-color: #C2614F;
        }

        .welcome-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .welcome-message h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 2px;
        }

        .welcome-message p {
          font-size: 13px;
          color: #78716C;
          margin: 0;
        }

        .welcome-message .btn-rejoindre {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #C2614F;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .welcome-message .btn-rejoindre:hover {
          background: #B25545;
        }

        .profile-section {
          background: #F5EDE6;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .avatar-wrapper {
          flex-shrink: 0;
        }

        .avatar-wrapper img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #C2614F;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .profile-name {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .profile-name h1 {
          font-size: 20px;
          font-weight: 700;
          color: #4A3520;
          margin: 0;
        }

        .role-badge {
          font-size: 11px;
          font-weight: 600;
          background: #705334;
          color: white;
          padding: 2px 12px;
          border-radius: 50px;
        }

        .agence-badge {
          font-size: 10px;
          font-weight: 600;
          background: #D1FAE5;
          color: #065F46;
          padding: 2px 10px;
          border-radius: 50px;
        }

        .identifiant-badge {
          font-size: 10px;
          font-weight: 600;
          background: #FEF3C7;
          color: #92400E;
          padding: 2px 10px;
          border-radius: 50px;
        }

        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          color: #78716C;
          margin-top: 4px;
        }

        .profile-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .profile-agence {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4A7C59;
          margin-top: 4px;
        }

        .agence-separator {
          color: #D4B896;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: #705334;
        }

        .stat-label {
          display: block;
          font-size: 11px;
          color: #78716C;
          font-weight: 500;
          margin-top: 2px;
        }

        .langues-section {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .langues-label {
          font-size: 12px;
          color: #78716C;
          font-weight: 500;
        }

        .langues-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .langue-tag {
          font-size: 11px;
          padding: 2px 10px;
          border-radius: 50px;
          background: white;
          color: #6B5E4F;
        }

        .statut-section {
          margin-bottom: 16px;
        }

        .statut-card {
          background: white;
          border-radius: 14px;
          padding: 16px 18px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .statut-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .statut-icon {
          color: #705334;
        }

        .statut-label {
          display: block;
          font-size: 12px;
          color: #78716C;
          font-weight: 500;
        }

        .statut-value {
          display: block;
          font-size: 15px;
          font-weight: 700;
        }

        .statut-value.disponible {
          color: #4A7C59;
        }

        .statut-value.indisponible {
          color: #E87A7A;
        }

        .btn-toggle-statut {
          padding: 8px 18px;
          border: 2px solid #F2D6D8;
          border-radius: 50px;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #705334;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-toggle-statut:hover {
          background: #F2D6D8;
        }

        .info-message {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #F8EDEE;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(194, 97, 79, 0.12);
          margin-bottom: 16px;
        }

        .info-message p {
          font-size: 13px;
          color: #78716C;
          margin: 0;
          line-height: 1.5;
        }

        .btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: transparent;
          border: 2px solid #FEE2E2;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: #DC2626;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-logout:hover {
          background: #FEE2E2;
          border-color: #DC2626;
        }

        .agences-section {
          margin-top: 0;
        }

        .agences-header {
          margin-bottom: 16px;
        }

        .agences-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 2px;
        }

        .agences-subtitle {
          font-size: 13px;
          color: #78716C;
          margin: 0;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
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

        .agences-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .agence-card {
          background: white;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          transition: all 0.3s ease;
        }

        .agence-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(28, 25, 23, 0.08);
        }

        .agence-card-header {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }

        .agence-avatar {
          flex-shrink: 0;
        }

        .agence-avatar img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #F5F0EB;
        }

        .agence-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #F2D6D8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .agence-info h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1C1917;
          margin: 0 0 4px;
        }

        .agence-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: #78716C;
        }

        .agence-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .agence-description {
          font-size: 13px;
          color: #78716C;
          line-height: 1.6;
          margin: 0 0 12px;
          padding: 8px 12px;
          background: #FAF7F2;
          border-radius: 8px;
        }

        .agence-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-whatsapp-agence {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          justify-content: center;
        }

        .btn-whatsapp-agence:hover {
          background: #1EBE5E;
        }

        .btn-rejoindre-agence {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #C2614F;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          justify-content: center;
        }

        .btn-rejoindre-agence:hover {
          background: #B25545;
        }

        .empty-agences {
          text-align: center;
          padding: 40px 20px;
          color: #78716C;
        }

        .empty-agences svg {
          color: #D4B896;
          margin-bottom: 12px;
        }

        .empty-agences h3 {
          font-size: 18px;
          color: #1C1917;
          margin-bottom: 4px;
        }

        .btn-support {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: all 0.2s;
        }

        .btn-support:hover {
          background: #1EBE5E;
        }

        .demandes-section {
          margin-top: 0;
        }

        .demandes-title {
          font-size: 20px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 2px;
        }

        .demandes-subtitle {
          font-size: 13px;
          color: #78716C;
          margin: 0 0 16px;
        }

        .demandes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .demande-card {
          background: white;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .demande-card-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .demande-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .demande-content {
          flex: 1;
          min-width: 0;
        }

        .demande-content h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px;
        }

        .demande-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: #78716C;
        }

        .demande-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .demande-statut {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 50px;
          white-space: nowrap;
        }

        .demande-statut.assignee {
          background: #E8F5E8;
          color: #4A7C59;
        }

        .demande-statut.attente {
          background: #F2D6D8;
          color: #C2614F;
        }

        .demande-card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #78716C;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #F5F0EB;
        }

        .empty-demandes {
          text-align: center;
          padding: 40px 20px;
          color: #78716C;
        }

        .empty-demandes svg {
          color: #D4B896;
          margin-bottom: 12px;
        }

        .empty-demandes h3 {
          font-size: 18px;
          color: #1C1917;
          margin-bottom: 4px;
        }

        .modal-overlay {
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

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 420px;
          width: 100%;
          padding: 24px;
          animation: slideUp 0.3s ease;
          position: relative;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #F5F0EB;
          color: #1C1917;
        }

        .modal-header {
          margin-bottom: 16px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px;
        }

        .modal-header p {
          font-size: 14px;
          color: #78716C;
          margin: 0;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #D4B896;
          border-radius: 12px;
          font-size: 15px;
          background: #FAF7F2;
          outline: none;
          transition: border-color 0.2s;
          color: #1C1917;
        }

        .form-group input:focus {
          border-color: #C2614F;
        }

        .field-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 4px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-cancel {
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

        .btn-cancel:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .btn-confirm {
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

        .btn-confirm:hover:not(:disabled) {
          background: #B25545;
          box-shadow: 0 4px 16px rgba(194, 97, 79, 0.3);
        }

        .btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 12px 12px;
          border-top: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 -4px 20px rgba(74, 53, 32, 0.04);
          z-index: 100;
        }

        .bottom-nav button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 4px 16px;
          font-size: 10px;
          font-weight: 500;
          transition: all 0.2s;
          border-radius: 50px;
        }

        .bottom-nav button .nav-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .bottom-nav button.active {
          color: #705334;
        }

        .bottom-nav button.active .active-icon {
          background: #705334;
          color: white;
        }

        .bottom-nav button span {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .nounou-content {
            padding: 12px 14px 16px;
          }

          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .profile-name {
            justify-content: center;
          }

          .profile-meta {
            justify-content: center;
          }

          .profile-agence {
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .stat-card:last-child {
            grid-column: span 2;
          }

          .statut-card {
            flex-direction: column;
            text-align: center;
          }

          .statut-info {
            flex-direction: column;
          }

          .btn-toggle-statut {
            width: 100%;
            justify-content: center;
          }

          .info-message {
            flex-direction: column;
            text-align: center;
          }

          .welcome-message {
            flex-direction: column;
            text-align: center;
          }

          .welcome-icon {
            margin: 0 auto;
          }

          .agence-actions {
            flex-direction: column;
          }

          .btn-whatsapp-agence,
          .btn-rejoindre-agence {
            width: 100%;
          }

          .bottom-nav button {
            padding: 4px 12px;
          }

          .modal-content {
            padding: 16px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-confirm {
            width: 100%;
            justify-content: center;
          }

          .agence-card-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .agence-meta {
            justify-content: center;
          }
        }

        @media (min-width: 769px) {
          .nounou-content {
            max-width: 700px;
            padding: 20px 24px 24px;
          }

          .profile-header {
            gap: 24px;
          }

          .avatar-wrapper img,
          .avatar-placeholder {
            width: 100px;
            height: 100px;
            font-size: 32px;
          }

          .profile-name h1 {
            font-size: 24px;
          }

          .stats-grid {
            gap: 14px;
          }

          .stat-number {
            font-size: 28px;
          }

          .welcome-message {
            flex-direction: row;
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}