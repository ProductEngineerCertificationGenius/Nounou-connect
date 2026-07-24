// src/pages/EspaceMenage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  FileText,
  User,
  Bell,
  LogOut,
  Search,
  MapPin,
  Star,
  Briefcase,
  Shield,
  Languages,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import RechercheNounou from "./RechercheNounou";
import DemandesPage from "./DemandesPage";
import ProfilPage from "./ProfilPage";

type Tab = "accueil" | "demandes" | "profil";
type View = "list" | "detail";

interface NounouAffichee {
  id: string;
  nom: string;
  quartier: string;
  tarif: number;
  experience: string;
  langues: string[];
  disponible: boolean;
  telephone: string;
  note_moyenne?: number;
  photo_url?: string;
  agence?: { nom: string };
}

interface Avis {
  id: string;
  note: number;
  commentaire?: string;
  menage?: { nom: string };
}

// ================================================================
// Réécriture complète, branchée sur la vue publique `nounous_public`.
//
// Point de conception corrigé : chez Noah, l'accueil listait des
// nounous codées en dur directement, avec un champ `type` (Garde
// d'enfants / Aide ménagère / Mixte) qui n'existe pas sur `nounous`
// chez nous (ce champ n'existe que sur `demandes.besoin`, propre à
// chaque demande, pas à la nounou elle-même) — retiré. Le champ
// `avis` intégré à chaque nounou mockée est remplacé par une vraie
// requête sur la table `avis`, chargée à l'ouverture du détail.
// ================================================================

export default function EspaceMenage() {
  const onLogout = useLogout();
  const { user, profileType } = useAuthStore();
  
  console.log("[EspaceMenage] Montage, user/profileType:", { userId: user?.id, profileType });
  
  const [activeTab, setActiveTab] = useState<Tab>("accueil");
  const [selectedNounouId, setSelectedNounouId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showDemandes, setShowDemandes] = useState(false);
  const [showProfil, setShowProfil] = useState(false);

  const { data: nounousDisponibles } = useQuery({
    queryKey: ["nounous_public", "disponibles"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      try {
        const session = await supabase.auth.getSession();
        console.log("[EspaceMenage] Session actuelle:", { user: session.data?.session?.user?.id, hasSession: !!session.data?.session });
        
        const { data, error } = await supabase
          .from("nounous_public")
          .select("*, agence:agences(nom)")
          .eq("disponible", true)
          .limit(20);
        if (error) throw error;
        return data as NounouAffichee[];
      } catch (err) {
        console.error("[EspaceMenage] Erreur nounousDisponibles:", err);
        throw err;
      }
    },
  });

  const selectedNounou = (nounousDisponibles ?? []).find((n) => n.id === selectedNounouId) || null;

  const { data: avisNounou } = useQuery({
    queryKey: ["avis", "nounou", selectedNounouId],
    enabled: Boolean(selectedNounouId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avis")
        .select("*, menage:menages(nom)")
        .eq("nounou_id", selectedNounouId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Avis[];
    },
  });

  const handleNounouClick = (nounou: NounouAffichee) => {
    setSelectedNounouId(nounou.id);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedNounouId(null);
  };

  const handleContactWhatsApp = (telephone: string) => {
    window.open(`https://wa.me/${telephone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  // Un seul point d'entrée pour changer d'onglet : `activeTab` (utilisé
  // pour l'état visuel actif du menu) et les flags showDemandes/showProfil
  // (qui pilotent réellement ce qui est affiché, cf. return principal plus
  // bas) doivent toujours changer ensemble. Avant ce correctif, le bouton
  // "Accueil" ne mettait à jour que `activeTab` : depuis l'onglet Demandes
  // ou Profil, cliquer sur Accueil (ou tout autre item) changeait la
  // surbrillance du menu mais l'écran restait bloqué sur l'onglet précédent.
  const handleGoTo = (tab: Tab) => {
    setActiveTab(tab);
    setShowDemandes(tab === "demandes");
    setShowProfil(tab === "profil");
    setShowSearch(false);
    if (tab === "accueil") setView("list");
  };
  const handleSearchClick = () => setShowSearch(true);
  const handleSearchClose = () => setShowSearch(false);
  const handleDemandesClose = () => handleGoTo("accueil");
  const handleProfilClose = () => handleGoTo("accueil");

  const renderSidebar = () => (
    <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <div className="sidebar-header"><Logo size={32} /><span className="sidebar-title">Nounou Connect</span></div>
      <nav className="sidebar-nav">
        <button className={activeTab === "accueil" ? "active" : ""} onClick={() => handleGoTo("accueil")}>
          <Home size={20} /><span>Accueil</span>
        </button>
        <button className={activeTab === "demandes" ? "active" : ""} onClick={() => handleGoTo("demandes")}>
          <FileText size={20} /><span>Demandes</span>
        </button>
        <button className={activeTab === "profil" ? "active" : ""} onClick={() => handleGoTo("profil")}>
          <User size={20} /><span>Profil</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn"><LogOut size={20} /><span>Déconnexion</span></button>
      </div>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </aside>
  );

  const renderMobileHeader = () => (
    <header className="mobile-header">
      <div className="mobile-logo"><Logo size={28} /><span>Nounou Connect</span></div>
      <div className="mobile-actions">
        <button className="icon-btn"><Bell size={18} /></button>
        <button className="icon-btn" onClick={onLogout}><LogOut size={18} /></button>
      </div>
    </header>
  );

  const renderNounouCardMobile = (nounou: NounouAffichee) => (
    <div key={nounou.id} className="nounou-card-mobile" onClick={() => handleNounouClick(nounou)}>
      <img src={nounou.photo_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(nounou.nom)} alt={nounou.nom} />
      <div className="nounou-card-info">
        <div className="nounou-name">{nounou.nom}</div>
        <div className="nounou-quartier"><MapPin size={10} /> {nounou.quartier}</div>
        <div className="nounou-prix-mobile">{nounou.tarif.toLocaleString()} FCFA</div>
        {nounou.disponible && <span className="badge-disponible-mobile">✅ Disponible</span>}
      </div>
    </div>
  );

  const renderNounouCardDesktop = (nounou: NounouAffichee) => (
    <div key={nounou.id} className="nounou-card-desktop" onClick={() => handleNounouClick(nounou)}>
      <div className="nounou-card-image">
        <img src={nounou.photo_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(nounou.nom)} alt={nounou.nom} />
        {nounou.disponible ? <span className="badge-disponible">✅ Disponible</span> : <span className="badge-indisponible">❌ Indisponible</span>}
      </div>
      <div className="nounou-card-body">
        <div className="nounou-card-header">
          <h3>{nounou.nom}</h3>
          <div className="nounou-note"><Star size={16} color="#F59E0B" fill="#F59E0B" /><span>{nounou.note_moyenne ?? "—"}</span></div>
        </div>
        <div className="nounou-card-details">
          <span><MapPin size={14} /> {nounou.quartier}</span>
          <span><Briefcase size={14} /> {nounou.experience}</span>
        </div>
        <div className="nounou-card-tags">
          {(nounou.langues ?? []).map((l) => <span key={l} className="tag">{l}</span>)}
        </div>
        <div className="nounou-card-footer">
          <div className="nounou-prix-desktop"><span>{nounou.tarif.toLocaleString()} FCFA</span></div>
          {nounou.agence?.nom && <div className="nounou-agence"><Shield size={14} /><span>{nounou.agence.nom}</span></div>}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="content-area">
      <div className="greeting"><h1>Bonjour 👋</h1><p>Trouvez la nounou idéale près de chez vous</p></div>

      <div className="search-wrapper" onClick={handleSearchClick}>
        <div className="search-circle"><Search size={40} strokeWidth={1.5} /></div>
        <span className="search-label">Rechercher une nounou</span>
      </div>

      <section className="nounous-section">
        <div className="section-header"><h3>✨ Nounous disponibles</h3></div>
        <div className="scroll-wrapper">
          <div className="nounous-scroll">
            {(nounousDisponibles ?? []).map((nounou) => renderNounouCardMobile(nounou))}
          </div>
        </div>
        <div className="nounous-grid">
          {(nounousDisponibles ?? []).map((nounou) => renderNounouCardDesktop(nounou))}
        </div>
        {(nounousDisponibles ?? []).length === 0 && (
          <p style={{ color: "#78716C", fontSize: 14 }}>Aucune nounou disponible pour le moment.</p>
        )}
      </section>
    </div>
  );

  const renderDetailView = () => {
    if (!selectedNounou) return null;
    return (
      <div className="content-area">
        <button className="back-btn" onClick={handleBackToList}><ArrowLeft size={20} /> Retour</button>
        <div className="detail-container">
          <div className="detail-header">
            <div className="detail-avatar">
              <img src={selectedNounou.photo_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(selectedNounou.nom)} alt={selectedNounou.nom} />
              {selectedNounou.disponible ? <span className="badge-disponible">✅ Disponible</span> : <span className="badge-indisponible">❌ Indisponible</span>}
            </div>
            <div className="detail-info">
              <h1>{selectedNounou.nom}</h1>
              <div className="detail-meta">
                <span><MapPin size={16} color="#4A7C59" /> {selectedNounou.quartier}</span>
                <span><Star size={16} color="#F59E0B" fill="#F59E0B" /> {selectedNounou.note_moyenne ?? "—"} / 5</span>
                <span><Briefcase size={16} /> {selectedNounou.experience}</span>
              </div>
              {selectedNounou.agence?.nom && (
                <div className="detail-agence"><Shield size={16} color="#C2614F" /><span>Agence: <strong>{selectedNounou.agence.nom}</strong></span></div>
              )}
              <div className="detail-tags">
                {(selectedNounou.langues ?? []).map((l) => <span key={l} className="tag"><Languages size={12} /> {l}</span>)}
              </div>
            </div>
            <div className="detail-actions">
              <div className="detail-prix"><span>{selectedNounou.tarif.toLocaleString()} FCFA</span><small>/ jour</small></div>
              <button className="contact-btn" onClick={() => handleContactWhatsApp(selectedNounou.telephone)}><Phone size={20} /> Contacter</button>
            </div>
          </div>

          <div className="detail-body">
            <div className="detail-avis">
              <h3>📝 Avis des familles</h3>
              {(avisNounou ?? []).length > 0 ? (
                (avisNounou ?? []).map((a) => (
                  <div key={a.id} className="avis-item">
                    <div className="avis-header">
                      <span className="avis-nom"><strong>{a.menage?.nom || "Famille"}</strong></span>
                      <div className="avis-note">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={14} color={j < a.note ? "#F59E0B" : "#E5E7EB"} fill={j < a.note ? "#F59E0B" : "none"} />
                        ))}
                      </div>
                    </div>
                    {a.commentaire && <p className="avis-commentaire">"{a.commentaire}"</p>}
                  </div>
                ))
              ) : (
                <p className="empty-avis">Aucun avis pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderSidebar()}
      <main className={`main-content ${sidebarOpen ? "with-sidebar" : ""}`}>
        {showSearch ? (
          <RechercheNounou onClose={handleSearchClose} />
        ) : showDemandes ? (
          <DemandesPage onBack={handleDemandesClose} />
        ) : showProfil ? (
          <ProfilPage onBack={handleProfilClose} onLogout={onLogout} />
        ) : (
          <>
            {renderMobileHeader()}
            {view === "list" ? renderListView() : renderDetailView()}
          </>
        )}
      </main>

      {!showSearch && !showDemandes && !showProfil && (
        <nav className="bottom-nav">
          <button className={activeTab === "accueil" ? "active" : ""} onClick={() => handleGoTo("accueil")}>
            <div className="nav-icon-wrapper"><Home size={18} /></div>
            <span>Accueil</span>
          </button>
          <button className={activeTab === "demandes" ? "active" : ""} onClick={() => handleGoTo("demandes")}>
            <div className="nav-icon-wrapper"><FileText size={18} /></div>
            <span>Demandes</span>
          </button>
          <button className={activeTab === "profil" ? "active" : ""} onClick={() => handleGoTo("profil")}>
            <div className="nav-icon-wrapper"><User size={18} /></div>
            <span>Profil</span>
          </button>
        </nav>
      )}

      <style>{`
        /* ============================================================ */
        /* CONTAINER PRINCIPAL                                          */
        /* ============================================================ */
        .app-container {
          display: flex;
          min-height: 100vh;
          background: #F5F0EB;
          font-family: "Inter", sans-serif;
        }

        /* ============================================================ */
        /* SIDEBAR (DESKTOP)                                            */
        /* ============================================================ */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 260px;
          background: #1C1917;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          transition: transform 0.3s ease;
          z-index: 1000;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar.closed {
          transform: translateX(-260px);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 24px;
        }

        .sidebar-title {
          color: white;
          font-size: 18px;
          font-weight: 700;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .sidebar-nav button {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .sidebar-nav button:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }

        .sidebar-nav button.active {
          background: rgba(194, 97, 79, 0.15);
          color: #C2614F;
        }

        .sidebar-nav button.active svg {
          color: #C2614F;
        }

        .sidebar-footer {
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #E87A7A;
        }

        .sidebar-toggle {
          position: absolute;
          right: -14px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #1C1917;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.2s;
        }

        .sidebar-toggle:hover {
          background: #C2614F;
        }

        /* ============================================================ */
        /* MAIN CONTENT                                                 */
        /* ============================================================ */
        .main-content {
          flex: 1;
          width: 100%;
          padding: 16px 20px 80px;
          transition: margin-left 0.3s ease;
          min-height: 100vh;
        }

        .main-content.with-sidebar {
          margin-left: 260px;
        }

        /* ============================================================ */
        /* HEADER MOBILE                                                */
        /* ============================================================ */
        .mobile-header {
          display: none;
        }

        /* ============================================================ */
        /* CONTENU                                                      */
        /* ============================================================ */
        .content-area {
          max-width: 1200px;
          margin: 0 auto;
        }

        .greeting {
          margin-bottom: 12px;
        }

        .greeting h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1C1917;
          margin-bottom: 2px;
        }

        .greeting p {
          color: #78716C;
          font-size: 14px;
        }

        /* ============================================================ */
        /* CERCLE DE RECHERCHE                                          */
        /* ============================================================ */
        .search-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0 20px;
          cursor: pointer;
        }

        .search-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(145deg, #2D2A26 0%, #1C1917 100%);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 12px 40px rgba(28, 25, 23, 0.15);
        }

        .search-circle svg {
          color: #C2614F;
        }

        .search-circle:hover {
          transform: scale(1.05);
          box-shadow: 0 16px 48px rgba(28, 25, 23, 0.2);
        }

        .search-label {
          margin-top: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
        }

        /* ============================================================ */
        /* SECTION NOUNOUS                                              */
        /* ============================================================ */
        .nounous-section {
          margin-top: 8px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #1C1917;
        }

        .see-all {
          background: transparent;
          border: none;
          color: #C2614F;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .see-all:hover {
          opacity: 1;
        }

        /* ============================================================ */
        /* SCROLL MOBILE                                                */
        /* ============================================================ */
        .scroll-wrapper {
          display: none;
        }

        .nounous-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 4px 0 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .nounous-scroll::-webkit-scrollbar {
          display: none;
        }

        /* ============================================================ */
        /* CARTE NOUNOU (MOBILE)                                        */
        /* ============================================================ */
        .nounou-card-mobile {
          flex: 0 0 140px;
          background: white;
          border-radius: 16px;
          padding: 12px 10px 14px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .nounou-card-mobile:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(28, 25, 23, 0.08);
        }

        .nounou-card-mobile img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          margin: 0 auto 6px;
          border: 2px solid #F5F0EB;
        }

        .nounou-name {
          font-weight: 700;
          font-size: 13px;
          color: #1C1917;
        }

        .nounou-quartier {
          font-size: 10px;
          color: #6B5E4F;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .nounou-prix-mobile {
          font-size: 12px;
          font-weight: 700;
          color: #C2614F;
          margin-top: 2px;
        }

        .nounou-type-mobile {
          font-size: 9px;
          font-weight: 600;
          color: #6B5E4F;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          background: #F5F0EB;
          padding: 1px 8px;
          border-radius: 50px;
          display: inline-block;
          margin-top: 2px;
        }

        .badge-disponible-mobile {
          font-size: 9px;
          color: #4A7C59;
          font-weight: 600;
          display: block;
          margin-top: 4px;
        }

        /* ============================================================ */
        /* GRILLE NOUNOUS (DESKTOP)                                     */
        /* ============================================================ */
        .nounous-grid {
          display: none;
        }

        /* ============================================================ */
        /* CARTE NOUNOU (DESKTOP)                                       */
        /* ============================================================ */
        .nounou-card-desktop {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .nounou-card-desktop:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(28, 25, 23, 0.08);
          border-color: rgba(194, 97, 79, 0.15);
        }

        .nounou-card-image {
          position: relative;
          height: 180px;
          overflow: hidden;
        }

        .nounou-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nounou-card-image .badge-disponible,
        .nounou-card-image .badge-indisponible {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 11px;
          padding: 3px 12px;
          border-radius: 50px;
          font-weight: 600;
        }

        .badge-disponible {
          background: #4A7C59;
          color: white;
        }

        .badge-indisponible {
          background: #E87A7A;
          color: white;
        }

        .nounou-card-body {
          padding: 14px 16px 16px;
        }

        .nounou-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .nounou-card-header h3 {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
        }

        .nounou-note {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: #1C1917;
          font-size: 13px;
        }

        .nounou-card-details {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: #78716C;
          margin-bottom: 6px;
        }

        .nounou-card-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .nounou-card-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .tag {
          font-size: 10px;
          padding: 2px 10px;
          border-radius: 50px;
          background: #F5F0EB;
          color: #6B5E4F;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tag-type {
          background: #C2614F18;
          color: #C2614F;
          font-weight: 600;
        }

        .nounou-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #F5F0EB;
        }

        .nounou-prix-desktop {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: #C2614F;
          font-size: 15px;
        }

        .nounou-agence {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #78716C;
        }

        /* ============================================================ */
        /* BOTTOM NAV (MOBILE)                                          */
        /* ============================================================ */
        .bottom-nav {
          display: none;
        }

        /* ============================================================ */
        /* VUE DÉTAIL                                                   */
        /* ============================================================ */
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #78716C;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 16px;
          transition: color 0.2s;
        }

        .back-btn:hover {
          color: #C2614F;
        }

        .detail-container {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .detail-header {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #F5F0EB;
        }

        .detail-avatar {
          position: relative;
          width: 100px;
          height: 100px;
          flex-shrink: 0;
        }

        .detail-avatar img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #F5F0EB;
        }

        .detail-avatar .badge-disponible,
        .detail-avatar .badge-indisponible {
          position: absolute;
          bottom: 0;
          right: 0;
          font-size: 10px;
          padding: 2px 10px;
          border-radius: 50px;
          font-weight: 600;
        }

        .detail-info {
          flex: 1;
        }

        .detail-info h1 {
          font-size: 24px;
          color: #1C1917;
          margin-bottom: 6px;
        }

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #78716C;
          margin-bottom: 6px;
        }

        .detail-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .detail-agence {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #78716C;
          margin-bottom: 6px;
        }

        .detail-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .detail-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .detail-prix {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .detail-prix span {
          font-size: 24px;
          font-weight: 700;
          color: #C2614F;
        }

        .detail-prix small {
          color: #78716C;
          font-size: 13px;
        }

        .contact-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-btn:hover {
          background: #1EBE5E;
        }

        .detail-body {
          padding-top: 20px;
        }

        .detail-description {
          margin-bottom: 20px;
        }

        .detail-description h3 {
          font-size: 16px;
          color: #1C1917;
          margin-bottom: 6px;
        }

        .detail-description p {
          color: #78716C;
          line-height: 1.6;
          font-size: 14px;
        }

        .detail-avis h3 {
          font-size: 16px;
          color: #1C1917;
          margin-bottom: 12px;
        }

        .avis-item {
          padding: 12px 16px;
          background: #FAF7F2;
          border-radius: 12px;
          margin-bottom: 10px;
        }

        .avis-item:last-child {
          margin-bottom: 0;
        }

        .avis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .avis-nom {
          font-size: 13px;
          color: #1C1917;
        }

        .avis-note {
          display: flex;
          gap: 2px;
        }

        .avis-commentaire {
          color: #78716C;
          font-style: italic;
          font-size: 13px;
        }

        .empty-avis {
          color: #78716C;
          font-style: italic;
          font-size: 14px;
        }

        /* ============================================================ */
        /* RESPONSIVE - MOBILE (<= 768px)                               */
        /* ============================================================ */
        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }

          .main-content {
            margin-left: 0 !important;
            padding: 12px 16px 80px;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 0 12px;
            margin-bottom: 12px;
          }

          .mobile-logo {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .mobile-logo span {
            font-size: 16px;
            font-weight: 700;
            color: #1C1917;
          }

          .mobile-actions {
            display: flex;
            gap: 4px;
          }

          .icon-btn {
            background: transparent;
            border: none;
            color: #78716C;
            cursor: pointer;
            padding: 6px;
            border-radius: 50%;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .icon-btn:hover {
            background: rgba(28, 25, 23, 0.06);
            color: #1C1917;
          }

          .nounous-grid {
            display: none;
          }

          .scroll-wrapper {
            display: block;
          }

          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(28, 25, 23, 0.92);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 50px;
            justify-content: space-around;
            padding: 4px 10px;
            z-index: 100;
            box-shadow: 0 8px 40px rgba(28, 25, 23, 0.25);
            min-width: 200px;
            max-width: 280px;
            border: 1px solid rgba(255, 255, 255, 0.06);
          }

          .bottom-nav button {
            background: transparent;
            border: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1px;
            color: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            padding: 6px 14px;
            font-size: 9px;
            font-weight: 500;
            transition: all 0.25s ease;
            border-radius: 40px;
          }

          .bottom-nav button .nav-icon-wrapper {
            width: 38px;
            height: 38px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .bottom-nav button.active {
            color: white;
          }

          .bottom-nav button.active .nav-icon-wrapper {
            background: rgba(194, 97, 79, 0.18);
            color: #C2614F;
          }

          .bottom-nav button span {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.25);
            letter-spacing: 0.2px;
          }

          .bottom-nav button.active span {
            color: rgba(255, 255, 255, 0.6);
            font-weight: 600;
          }

          /* Détail mobile */
          .detail-container {
            padding: 16px;
          }

          .detail-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .detail-avatar {
            margin-bottom: 8px;
          }

          .detail-meta {
            justify-content: center;
          }

          .detail-agence {
            justify-content: center;
          }

          .detail-tags {
            justify-content: center;
          }

          .detail-actions {
            align-items: center;
            width: 100%;
            margin-top: 12px;
          }

          .contact-btn {
            width: 100%;
            justify-content: center;
          }

          .detail-prix span {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 10px 12px 80px;
          }

          .greeting h1 {
            font-size: 18px;
          }

          .greeting p {
            font-size: 13px;
          }

          .search-circle {
            width: 64px;
            height: 64px;
          }

          .search-circle svg {
            width: 32px;
            height: 32px;
          }

          .search-label {
            font-size: 13px;
          }

          .nounou-card-mobile {
            flex: 0 0 120px;
            padding: 10px 8px 12px;
          }

          .nounou-card-mobile img {
            width: 40px;
            height: 40px;
          }

          .nounou-name {
            font-size: 12px;
          }

          .bottom-nav {
            min-width: 160px;
            padding: 3px 6px;
          }

          .bottom-nav button {
            padding: 4px 10px;
          }

          .bottom-nav button .nav-icon-wrapper {
            width: 32px;
            height: 32px;
          }

          .bottom-nav button svg {
            width: 16px;
            height: 16px;
          }

          .bottom-nav button span {
            font-size: 8px;
          }
        }

        /* ============================================================ */
        /* RESPONSIVE - DESKTOP (>= 769px)                              */
        /* ============================================================ */
        @media (min-width: 769px) {
          .mobile-header {
            display: none;
          }

          .bottom-nav {
            display: none;
          }

          .scroll-wrapper {
            display: none;
          }

          .nounous-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
            margin-top: 4px;
          }

          .main-content {
            padding: 24px 32px 40px;
          }

          .main-content.with-sidebar {
            margin-left: 260px;
          }

          .greeting h1 {
            font-size: 26px;
          }

          .greeting p {
            font-size: 15px;
          }

          .search-circle {
            width: 100px;
            height: 100px;
          }

          .search-circle svg {
            width: 40px;
            height: 40px;
          }

          .search-label {
            font-size: 16px;
          }

          .section-header h3 {
            font-size: 18px;
          }

          /* Détail desktop */
          .detail-container {
            padding: 32px;
          }

          .detail-header {
            flex-direction: row;
            text-align: left;
            align-items: flex-start;
            gap: 24px;
          }

          .detail-avatar {
            margin-bottom: 0;
            flex-shrink: 0;
          }

          .detail-info {
            flex: 1;
          }

          .detail-meta {
            justify-content: flex-start;
          }

          .detail-agence {
            justify-content: flex-start;
          }

          .detail-tags {
            justify-content: flex-start;
          }

          .detail-actions {
            margin-top: 0;
            align-items: flex-end;
            flex-shrink: 0;
          }

          .contact-btn {
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
