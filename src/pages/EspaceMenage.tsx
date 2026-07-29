// src/pages/EspaceMenage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  FileText,
  User,
  Search,
  MapPin,
  Star,
  Briefcase,
  Shield,
  Languages,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";
import RechercheNounou from "./RechercheNounou";
import DemandesPage from "./DemandesPage";
import ProfilPage from "./ProfilPage";

type Tab = "accueil" | "demandes" | "profil";
type View = "list" | "detail";

interface NounouAffichee {
  id: string;
  nom: string;
  quartier: string;
  tache?: string;
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

interface DemandeAAvis {
  id: string;
  date_assignation: string;
  nounou_assignee: { id: string; nom: string; photo_url?: string } | null;
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
  const navigate = useNavigate();
  const onLogout = useLogout();
  const { user, profileType } = useAuthStore();
  const currentUserId = user?.id;
  
  console.log("[EspaceMenage] Montage, user/profileType:", { userId: user?.id, profileType });
  
  const [activeTab, setActiveTab] = useState<Tab>("accueil");
  const [selectedNounouId, setSelectedNounouId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
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
          // Une nounou sans agence (auto-inscription, agence_id NULL,
          // cf. 0012_nounou_self_insert.sql) ne doit pas apparaître ici :
          // elle n'est pas encore affiliée/validée par une agence, donc
          // aucune demande ne peut être créée pour elle (demandes.agence_id
          // est NOT NULL, cf. 0001_schema.sql). Même correctif que la RPC
          // rechercher_nounous (0022_rechercher_nounous_avec_agence.sql).
          .not("agence_id", "is", null)
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

  // ------------------------------------------------------------
  // Relance d'avis à J+7 : une fois qu'une agence a confirmé
  // l'assignation d'une nounou (statut "Assignée", date_assignation
  // posée par assigner_nounou() — cf. 0019_relance_avis_j7.sql) et
  // que 7 jours se sont écoulés, on invite la famille à noter la
  // nounou si ce n'est pas déjà fait pour CETTE mise en relation
  // précise (via avis.demande_id, pas juste nounou_id+menage_id, pour
  // ne pas bloquer une relance sur un 2e séjour avec la même nounou).
  // ------------------------------------------------------------
  const queryClient = useQueryClient();

  const { data: demandesAAvis } = useQuery({
    queryKey: ["demandes-a-avis", currentUserId],
    enabled: Boolean(currentUserId) && isSupabaseConfigured,
    queryFn: async () => {
      const ilYA7Jours = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("demandes")
        .select("id, date_assignation, nounou_assignee:nounous!nounou_assignee_id(id, nom, photo_url)")
        .eq("menage_id", currentUserId!)
        .eq("statut", "Assignée")
        .not("nounou_assignee_id", "is", null)
        .lte("date_assignation", ilYA7Jours);
      if (error) throw error;

      const { data: avisExistants, error: avisError } = await supabase
        .from("avis")
        .select("demande_id")
        .eq("menage_id", currentUserId!)
        .not("demande_id", "is", null);
      if (avisError) throw avisError;

      const demandesDejaNotees = new Set((avisExistants ?? []).map((a) => a.demande_id));
      return (data ?? []).filter((d) => !demandesDejaNotees.has(d.id)) as unknown as DemandeAAvis[];
    },
  });

  const [avisEnCours, setAvisEnCours] = useState<{ demandeId: string; note: number; commentaire: string } | null>(null);

  const envoyerAvis = useMutation({
    mutationFn: async (params: { demandeId: string; nounouId: string; note: number; commentaire: string }) => {
      const { error } = await supabase.from("avis").insert({
        demande_id: params.demandeId,
        nounou_id: params.nounouId,
        menage_id: currentUserId!,
        note: params.note,
        commentaire: params.commentaire.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAvisEnCours(null);
      queryClient.invalidateQueries({ queryKey: ["demandes-a-avis", currentUserId] });
    },
    onError: (err) => alert(getErrorMessage(err)),
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

  const renderMobileHeader = () => (
    <header className="mobile-header">
      <div className="mobile-logo">
        <button className="btn-home" onClick={() => navigate("/")} title="Retour à l'accueil">
          <ArrowLeft size={18} />
        </button>
        <Logo size={28} /><span>Nounou Connect</span>
      </div>
    </header>
  );

  const renderNounouCardMobile = (nounou: NounouAffichee) => (
    <div key={nounou.id} className="nounou-card-mobile" onClick={() => handleNounouClick(nounou)}>
      <img src={nounou.photo_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(nounou.nom)} alt={nounou.nom} />
      <div className="nounou-card-info">
        <div className="nounou-name">{nounou.nom}</div>
        <div className="nounou-quartier"><MapPin size={10} /> {nounou.quartier}</div>
        <div className="nounou-prix-mobile">{nounou.tarif.toLocaleString()} FCFA / mois</div>
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
        {nounou.tache && (
          <div className="nounou-card-details">
            <span>{nounou.tache}</span>
          </div>
        )}
        <div className="nounou-card-tags">
          {(nounou.langues ?? []).map((l) => <span key={l} className="tag">{l}</span>)}
        </div>
        <div className="nounou-card-footer">
          <div className="nounou-prix-desktop"><span>{nounou.tarif.toLocaleString()} FCFA</span><small> / mois</small></div>
          {nounou.agence?.nom && <div className="nounou-agence"><Shield size={14} /><span>{nounou.agence.nom}</span></div>}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="content-area">
      <div className="greeting"><h1>Bonjour, <strong>{user?.nom || "..."}</strong> 👋</h1><p>Trouvez la nounou idéale près de chez vous</p></div>

      {(demandesAAvis ?? []).map((demande) => {
        if (!demande.nounou_assignee) return null;
        const enCours = avisEnCours?.demandeId === demande.id;
        return (
          <div key={demande.id} className="avis-reminder">
            <div className="avis-reminder-header">
              {demande.nounou_assignee.photo_url ? (
                <img src={demande.nounou_assignee.photo_url} alt={demande.nounou_assignee.nom} />
              ) : (
                <div className="avis-reminder-avatar-fallback">{demande.nounou_assignee.nom[0]}</div>
              )}
              <div>
                <strong>{demande.nounou_assignee.nom}</strong> s'occupe de votre famille depuis une semaine.
                <br />Comment ça se passe ?
              </div>
            </div>

            {!enCours ? (
              <button
                className="avis-reminder-cta"
                onClick={() => setAvisEnCours({ demandeId: demande.id, note: 0, commentaire: "" })}
              >
                Laisser un avis
              </button>
            ) : (
              <div className="avis-reminder-form">
                <div className="avis-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAvisEnCours({ ...avisEnCours, note: n })}
                      aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                    >
                      <Star size={26} color="#F59E0B" fill={n <= avisEnCours.note ? "#F59E0B" : "none"} />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Dites-nous ce que vous en pensez (facultatif)"
                  value={avisEnCours.commentaire}
                  onChange={(e) => setAvisEnCours({ ...avisEnCours, commentaire: e.target.value })}
                  rows={3}
                />
                <div className="avis-reminder-actions">
                  <button className="btn-annuler" onClick={() => setAvisEnCours(null)}>Annuler</button>
                  <button
                    className="btn-envoyer-avis"
                    disabled={avisEnCours.note === 0 || envoyerAvis.isPending}
                    onClick={() =>
                      envoyerAvis.mutate({
                        demandeId: demande.id,
                        nounouId: demande.nounou_assignee!.id,
                        note: avisEnCours.note,
                        commentaire: avisEnCours.commentaire,
                      })
                    }
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="search-bar" onClick={handleSearchClick}>
        <span className="search-bar-placeholder">Rechercher une nounou</span>
        <Search size={20} strokeWidth={2} />
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
          <p style={{ color: "#8A867A", fontSize: 14 }}>Aucune nounou disponible pour le moment.</p>
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
                {selectedNounou.tache && <span>{selectedNounou.tache}</span>}
              </div>
              {selectedNounou.agence?.nom && (
                <div className="detail-agence"><Shield size={16} color="#F3811E" /><span>Agence: <strong>{selectedNounou.agence.nom}</strong></span></div>
              )}
              <div className="detail-tags">
                {(selectedNounou.langues ?? []).map((l) => <span key={l} className="tag"><Languages size={12} /> {l}</span>)}
              </div>
            </div>
            <div className="detail-actions">
              <div className="detail-prix"><span>{selectedNounou.tarif.toLocaleString()} FCFA</span><small>/ mois</small></div>
              <button className="contact-btn" onClick={() => handleContactWhatsApp(selectedNounou.telephone)}><Phone size={20} /> Contacter</button>
            </div>
          </div>

          <div className="detail-body">
            <div className="detail-avis">
              <h3>📝 Avis des ménages</h3>
              {(avisNounou ?? []).length > 0 ? (
                (avisNounou ?? []).map((a) => (
                  <div key={a.id} className="avis-item">
                    <div className="avis-header">
                      <span className="avis-nom"><strong>{a.menage?.nom || "Ménage"}</strong></span>
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
      <main className="main-content">
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
          background: #F1F0EC;
          font-family: "Inter", sans-serif;
        }

        /* ============================================================ */
        /* SIDEBAR (DESKTOP)                                            */
        /* ============================================================ */
        /* ============================================================ */
        /* MAIN CONTENT                                                 */
        /* ============================================================ */
        .main-content {
          flex: 1;
          width: 100%;
          padding: 16px 20px 100px;
          min-height: 100vh;
        }

        /* ============================================================ */
        /* HEADER (logo + nom de l'app, en haut à gauche)               */
        /* ============================================================ */
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
          gap: 10px;
        }

        .mobile-logo span {
          font-size: 18px;
          font-weight: 700;
          color: #211B14;
        }

        .btn-home {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(33, 27, 20, 0.1);
          background: #FFFFFF;
          color: #211B14;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-home:hover {
          background: #F3811E;
          border-color: #F3811E;
          color: white;
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
          color: #211B14;
          margin-bottom: 2px;
        }

        .greeting p {
          color: #8A867A;
          font-size: 14px;
        }

        /* ============================================================ */
        /* RELANCE D'AVIS À J+7                                         */
        /* ============================================================ */
        .avis-reminder {
          background: #FEF3C7;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .avis-reminder-header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: #8A867A;
          line-height: 1.4;
        }

        .avis-reminder-header img,
        .avis-reminder-avatar-fallback {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .avis-reminder-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFF3D6;
          color: #F3811E;
          font-weight: 700;
          font-size: 16px;
        }

        .avis-reminder-header strong {
          color: #211B14;
        }

        .avis-reminder-cta {
          margin-top: 12px;
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: none;
          background: #F3811E;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .avis-reminder-form {
          margin-top: 14px;
        }

        .avis-stars {
          display: flex;
          gap: 4px;
          margin-bottom: 10px;
        }

        .avis-stars button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
        }

        .avis-reminder-form textarea {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(212, 184, 150, 0.3);
          padding: 10px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
          background: white;
        }

        .avis-reminder-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-annuler, .btn-envoyer-avis {
          flex: 1;
          padding: 9px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-annuler {
          background: white;
          color: #8A867A;
        }

        .btn-envoyer-avis {
          background: #F3811E;
          color: white;
        }

        .btn-envoyer-avis:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ============================================================ */
        /* BARRE DE RECHERCHE                                           */
        /* ============================================================ */
        .search-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid rgba(33, 27, 20, 0.1);
          border-radius: 50px;
          padding: 14px 20px;
          margin: 8px 0 24px;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(33, 27, 20, 0.05);
          transition: all 0.2s ease;
        }

        .search-bar:hover {
          border-color: #F3811E;
          box-shadow: 0 4px 16px rgba(243, 129, 30, 0.12);
        }

        .search-bar-placeholder {
          font-size: 14px;
          font-weight: 500;
          color: #8A867A;
        }

        .search-bar svg {
          color: #F3811E;
          flex-shrink: 0;
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
          color: #211B14;
        }

        .see-all {
          background: transparent;
          border: none;
          color: #F3811E;
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
          border: 2px solid #F1F0EC;
        }

        .nounou-name {
          font-weight: 700;
          font-size: 13px;
          color: #211B14;
        }

        .nounou-quartier {
          font-size: 10px;
          color: #5C574C;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .nounou-prix-mobile {
          font-size: 12px;
          font-weight: 700;
          color: #F3811E;
          margin-top: 2px;
        }

        .nounou-type-mobile {
          font-size: 9px;
          font-weight: 600;
          color: #5C574C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          background: #F1F0EC;
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
          color: #211B14;
        }

        .nounou-note {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: #211B14;
          font-size: 13px;
        }

        .nounou-card-details {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: #8A867A;
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
          background: #F1F0EC;
          color: #5C574C;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tag-type {
          background: #F3811E18;
          color: #F3811E;
          font-weight: 600;
        }

        .nounou-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #F1F0EC;
        }

        .nounou-prix-desktop {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: #F3811E;
          font-size: 15px;
        }

        .nounou-agence {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #8A867A;
        }

        /* ============================================================ */
        /* BOTTOM NAV (MOBILE)                                          */
        /* ============================================================ */
        .bottom-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #FFFFFF;
          border-top: 1px solid rgba(33, 27, 20, 0.08);
          justify-content: space-around;
          align-items: center;
          padding: 6px 10px;
          z-index: 100;
          box-shadow: 0 -2px 16px rgba(33, 27, 20, 0.06);
        }

        .bottom-nav button {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          color: #8A867A;
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
          color: #211B14;
        }

        .bottom-nav button.active .nav-icon-wrapper {
          background: rgba(243, 129, 30, 0.12);
          color: #F3811E;
        }

        .bottom-nav button span {
          font-size: 9px;
          color: #8A867A;
          letter-spacing: 0.2px;
        }

        .bottom-nav button.active span {
          color: #211B14;
          font-weight: 600;
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
          color: #8A867A;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 16px;
          transition: color 0.2s;
        }

        .back-btn:hover {
          color: #F3811E;
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
          border-bottom: 1px solid #F1F0EC;
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
          border: 3px solid #F1F0EC;
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
          color: #211B14;
          margin-bottom: 6px;
        }

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #8A867A;
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
          color: #8A867A;
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
          color: #F3811E;
        }

        .detail-prix small {
          color: #8A867A;
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
          color: #211B14;
          margin-bottom: 6px;
        }

        .detail-description p {
          color: #8A867A;
          line-height: 1.6;
          font-size: 14px;
        }

        .detail-avis h3 {
          font-size: 16px;
          color: #211B14;
          margin-bottom: 12px;
        }

        .avis-item {
          padding: 12px 16px;
          background: #F1F0EC;
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
          color: #211B14;
        }

        .avis-note {
          display: flex;
          gap: 2px;
        }

        .avis-commentaire {
          color: #8A867A;
          font-style: italic;
          font-size: 13px;
        }

        .empty-avis {
          color: #8A867A;
          font-style: italic;
          font-size: 14px;
        }

        /* ============================================================ */
        /* RESPONSIVE - MOBILE (<= 768px)                               */
        /* ============================================================ */
        @media (max-width: 768px) {
          .main-content {
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
            color: #211B14;
          }

          .mobile-actions {
            display: flex;
            gap: 4px;
          }

          .icon-btn {
            background: transparent;
            border: none;
            color: #8A867A;
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
            color: #211B14;
          }

          .nounous-grid {
            display: none;
          }

          .scroll-wrapper {
            display: block;
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

          .greeting h1 {
            font-size: 26px;
          }

          .greeting p {
            font-size: 15px;
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
