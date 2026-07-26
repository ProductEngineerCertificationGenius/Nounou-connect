// src/pages/EspaceAgence.tsx
import { useState } from "react";
import {
  Home,
  Users,
  UserCheck,
  Inbox,
  MessageCircle,
  User,
  LogOut,
  Bell,
  MapPin,
  Baby,
  ArrowRight,
  TrendingUp,
  Heart,
  ChevronLeft,
  ChevronRight,
  Handshake,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  XCircle,
  FileWarning,
  Upload,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { useAgenceDemandes } from "../hooks/useAgence";
import { useAgenceProfil } from "../hooks/useAgence";
import { useUploaderDocumentAgence, validerFichierDocument } from "../hooks/useAgence";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import GestionNounous from "./GestionNounous";
import DemandesAgence from "./DemandesAgence";
import ProfilAgence from "./ProfilAgence";
import { getErrorMessage } from "../lib/errorHandler";

type Tab = "accueil" | "nounous" | "demandes" | "profil";

// ================================================================
// Réécriture complète du tableau de bord : le fichier d'origine
// utilisait exclusivement des données codées en dur (MOCK_STATS,
// MOCK_DEMANDES, MOCK_EVOLUTION_TABLEAU, MOCK_NOUNOUS_RECENTS,
// MOCK_TEMOIGNAGES). Ce qui a été branché sur du réel, et ce qui a
// été retiré faute d'équivalent dans notre schéma :
//
// - Stats (nounous total / disponibles / demandes en attente /
//   placements réalisés) -> réel, via agence_stats (0007) + nounous.
// - "Demandes en attente" -> réel, via useAgenceDemandes (RLS incluse).
// - "Dernières mises en relation" -> réel : une "mise en relation" chez
//   nous EST une demande au statut 'Assignée' (pas une table séparée,
//   celle-ci n'existe pas dans notre schéma) -> réutilise les mêmes
//   demandes, filtrées.
// - "Témoignages récents" -> réel, via la table `avis` jointe à
//   `nounous` de cette agence.
// - "Évolution du vivier sur 6 mois" (tableau mensuel) -> SUPPRIMÉ :
//   aucune table de snapshots historiques n'existe dans notre base.
//   L'inventer aurait affiché de faux chiffres dans une vraie appli.
//   À reconstruire plus tard si un vrai historique est nécessaire
//   (nécessiterait une table de snapshots alimentée par un cron).
// ================================================================

function StatCard({
  icon: Icon,
  number,
  label,
  color,
}: {
  icon: React.ComponentType<{ size?: number }>;
  number: number;
  label: string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>
        <Icon size={24} />
      </div>
      <div>
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

interface DemandeAffichee {
  id: string;
  nom?: string;
  quartier: string;
  besoin: string;
  temps?: string;
  logement?: string;
  date: string;
  estAujourdhui: boolean;
}

function DemandeItem({ demande, onVoir }: { demande: DemandeAffichee; onVoir: (id: string) => void }) {
  const getBesoinIcon = (besoin: string) => {
    if (besoin === "Garde d'enfants") return <Baby size={14} />;
    if (besoin === "Aide ménagère") return <Home size={14} />;
    return <Users size={14} />;
  };

  return (
    <div className="demande-item">
      <div className="demande-info">
        {demande.estAujourdhui && <span className="badge-new">🆕 Nouvelle</span>}
        <span className="demande-nom">{demande.nom || "Ménage"}</span>
        <span className="demande-quartier"><MapPin size={12} /> {demande.quartier}</span>
        <span className="demande-besoin">{getBesoinIcon(demande.besoin)} {demande.besoin}</span>
        <span className="demande-date"><Calendar size={12} /> {demande.date}</span>
      </div>
      <button className="btn-voir" onClick={() => onVoir(demande.id)}>Voir <ArrowRight size={14} /></button>
    </div>
  );
}

interface RelationAffichee {
  id: string;
  nounou: string;
  famille: string;
  quartier: string;
  date: string;
  telephoneNounou?: string;
}

function RelationItem({ item }: { item: RelationAffichee }) {
  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <div className="relation-item">
      <div className="relation-info">
        <span className="relation-nounou">{item.nounou}</span>
        <span className="relation-famille">→ {item.famille}</span>
        <span className="relation-quartier"><MapPin size={12} /> {item.quartier}</span>
        <span className="relation-date"><Calendar size={12} /> {item.date}</span>
      </div>
      {item.telephoneNounou && (
        <button className="btn-whatsapp" onClick={() => handleWhatsApp(item.telephoneNounou)}>
          <MessageCircle size={16} /> WhatsApp
        </button>
      )}
    </div>
  );
}

// ================================================================
// ===== PAGE PRINCIPALE ===========================================
// ================================================================

// ================================================================
// Écran bloquant tant que `statut_verification` de l'agence n'est
// pas "valide". L'agence ne doit voir NI les stats, NI le vivier,
// NI les demandes tant qu'un admin n'a pas validé son document
// justificatif (cf. 0014_agences_document_verification.sql).
// - "en_attente" : simple message d'attente.
// - "refuse" : motif affiché + possibilité de renvoyer un document
//   (repasse automatiquement en "en_attente" après renvoi).
// ================================================================
function VerificationEnAttente({
  agenceId,
  statut,
  documentEnvoye,
  motifRefus,
  onLogout,
}: {
  agenceId: string;
  statut: "en_attente" | "refuse";
  documentEnvoye: boolean;
  motifRefus?: string;
  onLogout: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [erreur, setErreur] = useState("");
  const uploadDocument = useUploaderDocumentAgence();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validerFichierDocument(f);
    if (err) {
      setErreur(err);
      setFile(null);
      return;
    }
    setErreur("");
    setFile(f);
  };

  const handleEnvoyer = () => {
    if (!file) return;
    uploadDocument.mutate({ agenceId, file }, { onSuccess: () => setFile(null) });
  };

  const estRefuse = statut === "refuse";
  // Trois cas distincts :
  // 1. Jamais envoyé -> formulaire d'envoi (bloque l'inscription tant
  //    que ce n'est pas fait, quel que soit le chemin emprunté pour
  //    arriver ici : juste après inscription, ou reconnexion plus tard
  //    si l'envoi initial n'a pas abouti).
  // 2. Envoyé, en attente -> message d'attente, pas de formulaire.
  // 3. Refusé -> motif + formulaire de renvoi.
  const demandeUnEnvoi = !documentEnvoye || estRefuse;

  return (
    <div className="verification-attente">
      <div className="verification-card">
        <div className={`verification-icon ${estRefuse ? "refuse" : ""}`}>
          {estRefuse ? <XCircle size={40} /> : <Clock size={40} />}
        </div>
        <h1>
          {estRefuse
            ? "Document refusé"
            : documentEnvoye
              ? "Vérification en cours"
              : "Encore une étape : votre document justificatif"}
        </h1>
        {estRefuse && (
          <>
            <p>
              Le document que vous avez envoyé n'a pas été validé par notre équipe.
              {motifRefus && <> Motif : <strong>{motifRefus}</strong>.</>}
            </p>
            <p>Merci d'envoyer un nouveau document pour continuer.</p>
          </>
        )}
        {!estRefuse && documentEnvoye && (
          <p>
            Votre document justificatif a bien été reçu. Notre équipe le vérifie et vous
            aurez accès à votre tableau de bord dès sa validation. Cela ne prend
            généralement pas longtemps.
          </p>
        )}
        {!estRefuse && !documentEnvoye && (
          <p>
            Pour activer votre espace agence, envoyez un document prouvant l'existence
            de votre agence (registre de commerce, RCCM, ou équivalent). Votre tableau
            de bord sera accessible dès sa validation par notre équipe.
          </p>
        )}

        {demandeUnEnvoi && (
          <div className="verification-reupload">
            <label className="verification-upload-zone">
              <Upload size={20} />
              <span>{file ? file.name : "Choisir un document (PDF, JPG, PNG — 5 Mo max)"}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: "none" }} />
            </label>
            {erreur && <p className="verification-erreur"><FileWarning size={14} /> {erreur}</p>}
            {uploadDocument.isError && (
              <p className="verification-erreur">
                <FileWarning size={14} /> {getErrorMessage(uploadDocument.error)}
              </p>
            )}
            {uploadDocument.isSuccess && (
              <p className="verification-succes">Document envoyé ✅ En attente de vérification.</p>
            )}
            <button
              className="btn-add"
              disabled={!file || uploadDocument.isPending}
              onClick={handleEnvoyer}
            >
              {uploadDocument.isPending ? "Envoi..." : estRefuse ? "Renvoyer le document" : "Envoyer le document"}
            </button>
          </div>
        )}

        <button className="verification-logout" onClick={onLogout}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      <style>{`
        .verification-attente {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5F0EB;
          padding: 24px;
          font-family: "Inter", sans-serif;
        }
        .verification-card {
          max-width: 460px;
          width: 100%;
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(28, 25, 23, 0.08);
        }
        .verification-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #D4B89622;
          color: #C2614F;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .verification-icon.refuse { background: #E87A7A22; color: #E87A7A; }
        .verification-card h1 { font-size: 20px; font-weight: 700; color: #1C1917; margin-bottom: 12px; }
        .verification-card p { font-size: 14px; color: #78716C; line-height: 1.6; margin-bottom: 8px; }
        .verification-reupload { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .verification-upload-zone {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border: 1.5px dashed #D4B896;
          border-radius: 12px;
          color: #78716C;
          font-size: 14px;
          cursor: pointer;
          background: #FAF7F2;
        }
        .verification-erreur {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #E87A7A;
          font-size: 13px;
        }
        .verification-succes {
          color: #4A7C59;
          font-size: 13px;
          font-weight: 600;
        }
        .verification-logout {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #78716C;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default function EspaceAgence() {
  const onLogout = useLogout();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>("accueil");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [demandeId, setDemandeId] = useState<string | undefined>(undefined);

  // La fiche agence (id réel, distinct du user_id Auth) est nécessaire
  // pour toutes les requêtes filtrées par agence_id.
  const { data: agenceProfil, isError: agenceProfilError, error: agenceProfilErrorDetail } = useAgenceProfil();
  const agenceId = agenceProfil?.id;

  const { data: nounous } = useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from("nounous").select("*").eq("agence_id", agenceId!);
      if (error) throw error;
      return data;
    },
  });
  const { data: demandes } = useAgenceDemandes(agenceId);
  const { data: avisRecents } = useQuery({
    queryKey: ["avis", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const nounouIds = (nounous ?? []).map((n) => n.id);
      if (nounouIds.length === 0) return [];
      const { data, error } = await supabase
        .from("avis")
        .select("*, nounou:nounous(nom)")
        .in("nounou_id", nounouIds)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const handleVoirDemande = (id: string) => {
    setDemandeId(id);
    setActiveTab("demandes");
  };

  const handleBackFromDemandes = () => {
    setActiveTab("accueil");
    setDemandeId(undefined);
  };

  const totalNounous = nounous?.length ?? 0;
  const disponibles = nounous?.filter((n) => n.disponible).length ?? 0;
  const demandesEnAttente = (demandes ?? []).filter((d) => d.statut === "En attente");
  const demandesAssignees = (demandes ?? []).filter((d) => d.statut === "Assignée");
  const today = new Date().toLocaleDateString("fr-FR");

  const renderSidebar = () => (
    <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <div className="sidebar-logo"><Logo size={28} /><span>Nounou</span></div>
      <nav className="sidebar-nav">
        {[
          { id: "accueil", icon: <Home size={20} />, label: "Accueil" },
          { id: "nounous", icon: <Users size={20} />, label: "Nounous" },
          { id: "demandes", icon: <Inbox size={20} />, label: "Demandes" },
          { id: "profil", icon: <User size={20} />, label: "Profil" },
        ].map((item) => (
          <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => {
            setActiveTab(item.id as Tab);
            setDemandeId(undefined);
          }}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}><LogOut size={20} /><span>Déconnexion</span></button>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );

  const renderAccueil = () => (
    <div className="tab-content">
      <div className="stats-grid">
        <StatCard icon={Users} number={totalNounous} label="Nounous total" color="#C2614F" />
        <StatCard icon={UserCheck} number={disponibles} label="Nounous disponibles" color="#4A7C59" />
        <StatCard icon={Inbox} number={demandesEnAttente.length} label="Demandes en attente" color="#D4B896" />
        <StatCard icon={TrendingUp} number={demandesAssignees.length} label="Placements réalisés" color="#25D366" />
      </div>

      <section className="demandes-section">
        <div className="section-header"><h3><Inbox size={18} /> Demandes en attente</h3><button className="see-all" onClick={() => setActiveTab("demandes")}>Voir toutes <ArrowRight size={14} /></button></div>
        <div className="demandes-list">
          {demandesEnAttente.slice(0, 5).map((d) => (
            <DemandeItem
              key={d.id}
              demande={{
                id: d.id,
                nom: d.menage,
                quartier: d.quartier,
                besoin: d.besoin,
                date: new Date(d.date).toLocaleDateString("fr-FR"),
                estAujourdhui: new Date(d.date).toLocaleDateString("fr-FR") === today,
              }}
              onVoir={handleVoirDemande}
            />
          ))}
          {demandesEnAttente.length === 0 && <p style={{ color: "#78716C", fontSize: 14 }}>Aucune demande en attente.</p>}
        </div>
      </section>

      <section className="relation-section">
        <div className="section-header"><h3><Handshake size={18} /> Dernières mises en relation</h3></div>
        <div className="relation-list">
          {demandesAssignees.slice(0, 3).map((d) => (
            <RelationItem
              key={d.id}
              item={{
                id: d.id,
                nounou: d.nounouAssignee || "Nounou",
                famille: d.menage || "Ménage",
                quartier: d.quartier,
                date: new Date(d.date).toLocaleDateString("fr-FR"),
                telephoneNounou: (nounous ?? []).find((n) => n.id === d.nounou_assignee_id)?.telephone,
              }}
            />
          ))}
          {demandesAssignees.length === 0 && <p style={{ color: "#78716C", fontSize: 14 }}>Aucune mise en relation pour le moment.</p>}
        </div>
      </section>

      <section className="temoignages-section">
        <div className="section-header"><h3><MessageSquare size={18} /> Témoignages récents</h3></div>
        <div className="temoignages-grid">
          {(avisRecents ?? []).map((t) => (
            <div key={t.id} className="temoignage-card">
              <div className="temoignage-stars">{"⭐".repeat(t.note)}{"☆".repeat(5 - t.note)}</div>
              <p className="temoignage-texte">"{t.commentaire}"</p>
              <span className="temoignage-auteur">— {t.nounou?.nom}</span>
            </div>
          ))}
          {(avisRecents ?? []).length === 0 && <p style={{ color: "#78716C", fontSize: 14 }}>Pas encore d'avis.</p>}
        </div>
      </section>

      <section className="illustration-section">
        <div className="illustration-flowers"><Sparkles size={24} /> <Heart size={28} /> <Sparkles size={24} /></div>
        <div className="illustration-message">"Votre vivier grandit chaque jour"</div>
        <div className="illustration-sub">🌸 Continuons à faire briller nos nounous 🌸</div>
        <div className="illustration-divider" />
      </section>
    </div>
  );

  const renderContent = () => {
    if (agenceProfilError) {
      return (
        <div className="tab-content" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1917" }}>
            Impossible de charger votre profil agence
          </h2>
          <p style={{ color: "#78716C", fontSize: 14, marginTop: 8, maxWidth: 480, marginInline: "auto" }}>
            {getErrorMessage(agenceProfilErrorDetail)}
            {" "}Déconnectez-vous puis reconnectez-vous ; si le problème persiste, la fiche agence n'a
            peut-être pas été créée à l'inscription.
          </p>
          <button className="btn-add" style={{ marginTop: 16 }} onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      );
    }
    switch (activeTab) {
      case "accueil": return renderAccueil();
      case "nounous": return <GestionNounous agenceId={agenceId} onBack={() => setActiveTab("accueil")} />;
      case "demandes": return <DemandesAgence agenceId={agenceId} onBack={handleBackFromDemandes} demandeId={demandeId} />;
      case "profil": return <ProfilAgence onBack={() => setActiveTab("accueil")} onLogout={onLogout} />;
      default: return null;
    }
  };

  const initiales = (agenceProfil?.nom || currentUser?.nom || "?")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Gate d'accès : tant que le document justificatif n'est pas validé,
  // l'agence ne voit ni sidebar, ni stats, ni vivier — seulement cet
  // écran (avec le formulaire d'envoi si rien n'a encore été envoyé).
  // `statut_verification` peut être `undefined` si la migration 0014
  // n'est pas encore appliquée côté base : dans ce cas on ne bloque
  // pas, pour ne pas casser les comptes existants avant que le backend
  // n'ait déployé la colonne.
  const statutVerification = agenceProfil?.statut_verification as
    | "en_attente"
    | "valide"
    | "refuse"
    | undefined;
  if (agenceProfil && statutVerification && statutVerification !== "valide") {
    return (
      <VerificationEnAttente
        agenceId={agenceProfil.id}
        statut={statutVerification}
        documentEnvoye={Boolean(agenceProfil.document_url)}
        motifRefus={agenceProfil.motif_refus as string | undefined}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="agence-container">
      {renderSidebar()}
      <main className={`main-content ${sidebarOpen ? "with-sidebar" : "full"}`}>
        <header className="main-header">
          <div className="greeting"><h1>Bonjour, <span>{agenceProfil?.nom || "..."}</span> 👋</h1><p>Votre vivier est prêt à être mis en lumière</p></div>
          <div className="header-actions">
            <button className="notif-btn"><Bell size={20} /></button>
            <button className="avatar-btn"><span className="avatar-text">{initiales}</span></button>
          </div>
        </header>
        {renderContent()}
      </main>

      <style>{`
        /* ============================================================ */
        /* CONTAINER PRINCIPAL                                          */
        /* ============================================================ */
        .agence-container { display: flex; min-height: 100vh; background: #F5F0EB; font-family: "Inter", sans-serif; }

        /* ============================================================ */
        /* SIDEBAR                                                      */
        /* ============================================================ */
        .sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 220px; background: #1C1917; display: flex; flex-direction: column; padding: 20px 12px; transition: transform 0.3s ease; z-index: 1000; border-right: 1px solid rgba(255,255,255,0.06); }
        .sidebar.closed { transform: translateX(-220px); }
        .sidebar.open { transform: translateX(0); }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 8px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px; }
        .sidebar-logo span { color: white; font-size: 18px; font-weight: 700; }
        .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .sidebar-nav button { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: none; border-radius: 12px; background: transparent; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; }
        .sidebar-nav button:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .sidebar-nav button.active { background: rgba(194,97,79,0.15); color: #C2614F; }
        .sidebar-nav button.active svg { color: #C2614F; }
        .sidebar-logout { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: none; border-radius: 12px; background: transparent; color: rgba(255,255,255,0.3); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; margin-top: auto; }
        .sidebar-logout:hover { background: rgba(255,255,255,0.06); color: #E87A7A; }
        .sidebar-toggle { position: absolute; right: -12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%; border: none; background: #1C1917; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: all 0.2s; }
        .sidebar-toggle:hover { background: #C2614F; }

        /* ============================================================ */
        /* MAIN CONTENT                                                 */
        /* ============================================================ */
        .main-content { flex: 1; padding: 16px 20px 40px; margin-left: 220px; transition: margin-left 0.3s ease; min-height: 100vh; max-width: calc(100% - 220px); }
        .main-content.full { margin-left: 0; max-width: 100%; }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .greeting h1 { font-size: 20px; font-weight: 700; color: #1C1917; }
        .greeting h1 span { color: #C2614F; }
        .greeting p { color: #78716C; font-size: 13px; }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .notif-btn { position: relative; background: transparent; border: none; color: #78716C; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s; }
        .notif-btn:hover { background: rgba(28,25,23,0.06); }
        .notif-badge { position: absolute; top: 2px; right: 2px; background: #C2614F; color: white; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 50px; min-width: 18px; text-align: center; }
        .avatar-btn { width: 38px; height: 38px; border-radius: 50%; background: #F2D6D8; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .avatar-btn:hover { border: 2px solid #C2614F; }
        .avatar-text { font-size: 13px; font-weight: 700; color: #C2614F; }

        /* ============================================================ */
        /* TAB CONTENT                                                  */
        /* ============================================================ */
        .tab-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ============================================================ */
        /* STATS                                                        */
        /* ============================================================ */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(28,25,23,0.04); border: 1px solid rgba(212,184,150,0.08); display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(28,25,23,0.08); }
        .stat-icon { flex-shrink: 0; }
        .stat-number { font-size: 22px; font-weight: 800; color: #1C1917; line-height: 1.2; }
        .stat-label { font-size: 12px; color: #78716C; font-weight: 500; }
        .stat-trend { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 50px; margin-top: 2px; }
        .stat-trend.up { background: #D1FAE5; color: #065F46; }
        .stat-trend.down { background: #FEE2E2; color: #991B1B; }

        /* ============================================================ */
        /* SECTION HEADER                                               */
        /* ============================================================ */
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
        .section-header h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #1C1917; }
        .see-all { background: transparent; border: none; color: #C2614F; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: opacity 0.2s; }
        .see-all:hover { opacity: 0.8; }

        /* ============================================================ */
        /* ÉVOLUTION                                                    */
        /* ============================================================ */
        .evolution-section { background: white; border-radius: 16px; padding: 18px 20px 20px; margin-bottom: 20px; border: 1px solid rgba(212,184,150,0.1); box-shadow: 0 2px 8px rgba(28,25,23,0.04); }
        .evolution-period { font-size: 12px; color: #78716C; background: #F5F0EB; padding: 3px 14px; border-radius: 50px; font-weight: 500; }
        .tableau-container { overflow-x: auto; margin: 8px 0 12px; }
        .evolution-tableau { width: 100%; border-collapse: collapse; font-size: 14px; }
        .evolution-tableau th { text-align: left; padding: 10px 12px; font-weight: 600; color: #78716C; border-bottom: 2px solid #F5F0EB; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
        .evolution-tableau td { padding: 10px 12px; border-bottom: 1px solid #F5F0EB; color: #1C1917; }
        .evolution-tableau .current-month td { font-weight: 700; background: #FAF7F2; border-bottom: 2px solid #C2614F; }
        .variation-row td { font-weight: 600; padding-top: 12px; border-bottom: none; color: #1C1917; }
        .variation-row .positive { color: #065F46; background: #D1FAE5; border-radius: 4px; padding: 2px 8px; display: inline-block; }
        .variation-row .negative { color: #991B1B; background: #FEE2E2; border-radius: 4px; padding: 2px 8px; display: inline-block; }
        .evolution-recap { text-align: center; font-size: 13px; color: #78716C; padding-top: 12px; border-top: 1px solid #F5F0EB; }
        .evolution-recap strong { color: #1C1917; }

        /* ============================================================ */
        /* DEMANDES (page d'accueil)                                    */
        /* ============================================================ */
        .demandes-section { margin-bottom: 20px; }
        .demandes-list { display: flex; flex-direction: column; gap: 8px; }
        .demande-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border-radius: 12px; border: 1px solid rgba(212,184,150,0.08); box-shadow: 0 2px 6px rgba(28,25,23,0.04); flex-wrap: wrap; gap: 8px; }
        .demande-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .badge-new { background: #C2614F; color: white; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 50px; }
        .demande-nom { font-weight: 600; color: #1C1917; font-size: 14px; }
        .demande-quartier { color: #78716C; font-size: 12px; display: flex; align-items: center; gap: 3px; }
        .demande-besoin { font-size: 12px; color: #78716C; background: #F5F0EB; padding: 2px 10px; border-radius: 50px; display: flex; align-items: center; gap: 4px; }
        .demande-type { font-size: 11px; color: #4A7C59; background: #D1FAE5; padding: 1px 8px; border-radius: 50px; }
        .badge-urgent { color: #991B1B; font-size: 11px; font-weight: 600; background: #FEE2E2; padding: 1px 8px; border-radius: 50px; }
        .demande-date { font-size: 11px; color: #78716C; display: flex; align-items: center; gap: 3px; }
        .badge-relance { color: #991B1B; font-size: 10px; font-weight: 600; }
        .btn-voir { background: #C2614F; color: white; border: none; padding: 5px 14px; border-radius: 50px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: background 0.2s; }
        .btn-voir:hover { background: #B25545; }

        /* ============================================================ */
        /* MISES EN RELATION                                            */
        /* ============================================================ */
        .relation-section { margin-bottom: 20px; }
        .relation-list { display: flex; flex-direction: column; gap: 8px; }
        .relation-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border-radius: 12px; border: 1px solid rgba(212,184,150,0.08); box-shadow: 0 2px 6px rgba(28,25,23,0.04); flex-wrap: wrap; gap: 8px; }
        .relation-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .relation-nounou { font-weight: 600; color: #1C1917; font-size: 14px; }
        .relation-famille { color: #78716C; font-size: 13px; }
        .relation-quartier { color: #78716C; font-size: 12px; display: flex; align-items: center; gap: 3px; }
        .relation-date { font-size: 12px; color: #78716C; display: flex; align-items: center; gap: 3px; }
        .btn-whatsapp { background: #25D366; color: white; border: none; padding: 5px 14px; border-radius: 50px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .btn-whatsapp:hover { background: #1EBE5E; transform: scale(1.02); }

        /* ============================================================ */
        /* TÉMOIGNAGES                                                  */
        /* ============================================================ */
        .temoignages-section { margin-bottom: 20px; }
        .temoignages-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .temoignage-card { background: white; border-radius: 12px; padding: 14px 16px; border: 1px solid rgba(212,184,150,0.08); box-shadow: 0 2px 6px rgba(28,25,23,0.04); }
        .temoignage-stars { font-size: 13px; margin-bottom: 4px; }
        .temoignage-texte { font-size: 13px; font-style: italic; color: #1C1917; }
        .temoignage-auteur { font-size: 12px; color: #78716C; display: block; margin-top: 4px; }

        /* ============================================================ */
        /* ILLUSTRATION FINALE                                          */
        /* ============================================================ */
        .illustration-section { text-align: center; padding: 24px 16px 8px; }
        .illustration-flowers { display: flex; justify-content: center; gap: 12px; color: #D4B896; margin-bottom: 8px; }
        .illustration-message { font-size: 18px; font-weight: 700; color: #C2614F; margin-bottom: 4px; }
        .illustration-sub { font-size: 13px; color: #78716C; font-weight: 500; }
        .illustration-divider { width: 50px; height: 3px; background: #F2D6D8; margin: 8px auto 0; border-radius: 50px; }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main-content { margin-left: 0; padding: 12px 12px 80px; max-width: 100%; }
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .stat-card { padding: 12px 14px; }
          .stat-number { font-size: 18px; }
          .demande-item { flex-direction: column; align-items: stretch; }
          .demande-item .btn-voir { width: 100%; justify-content: center; }
          .relation-item { flex-direction: column; align-items: stretch; }
          .btn-whatsapp { width: 100%; justify-content: center; }
          .temoignages-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .main-content { padding: 10px 10px 80px; }
          .stats-grid { grid-template-columns: 1fr; }
          .stat-card { padding: 10px 12px; }
          .stat-number { font-size: 16px; }
          .greeting h1 { font-size: 16px; }
          .greeting p { font-size: 12px; }
        }
        @media (min-width: 769px) { 
          .stats-grid { grid-template-columns: repeat(4, 1fr); }
          .main-content { padding: 20px 28px 40px; }
          .stat-card { padding: 18px 20px; }
          .demande-item { padding: 14px 18px; }
          .relation-item { padding: 14px 18px; }
          .temoignage-card { padding: 16px 20px; }
        }
      `}</style>
    </div>
  );
}
