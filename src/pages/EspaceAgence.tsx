// src/pages/EspaceAgence.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ArrowLeft,
  Users,
  UserCheck,
  Inbox,
  User,
  LogOut,
  MapPin,
  Baby,
  ArrowRight,
  Heart,
  Handshake,
  MessageSquare,
  Sparkles,
  Calendar,
  Star,
  Clock,
  XCircle,
  FileWarning,
  Upload,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAgenceDemandes, useAgenceProfil, useUploaderDocumentAgence, validerFichierDocument } from "../hooks/useAgence";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import GestionNounous from "./GestionNounous";
import DemandesAgence from "./DemandesAgence";
import DemandesAffiliationAgence from "./DemandesAffiliationAgence";
import ProfilAgence from "./ProfilAgence";
import { getErrorMessage } from "../lib/errorHandler";
import { useDemandesAffiliationAgence } from "../hooks/useAffiliation";

type Tab = "accueil" | "nounous" | "demandes" | "affiliations" | "profil";

// ============================================================
// DONNÉES FICTIVES POUR LE DÉVELOPPEMENT
// ============================================================
const MOCK_AGENCE = {
  id: "mock-agence-1",
  user_id: "mock-user-1",
  nom: "Agence Étoile du Foyer",
  telephone: "+2250700000001",
  quartier: "Cocody",
  description: "Agence familiale active à Cocody depuis 2016, spécialisée dans la garde d'enfants.",
  note_moyenne: 4.6,
  photo_url: null,
  created_at: new Date().toISOString(),
};

const MOCK_NOUNOUS = [
  { id: "1", nom: "Mariam T.", telephone: "+2250700000004", quartier: "Cocody", experience: "3 ans", langues: ["Français", "Dioula"], tarif: 50000, disponible: true, note_moyenne: 4.8 },
  { id: "2", nom: "Fatou C.", telephone: "+2250700000005", quartier: "Cocody", experience: "5 ans", langues: ["Français", "Baoulé"], tarif: 65000, disponible: true, note_moyenne: 4.5 },
  { id: "3", nom: "Adjoua Y.", telephone: "+2250700000006", quartier: "Yopougon", experience: "2 ans", langues: ["Français"], tarif: 40000, disponible: false, note_moyenne: 4.2 },
  { id: "4", nom: "Aminata K.", telephone: "+2250700000007", quartier: "Cocody", experience: "4 ans", langues: ["Français", "Malinké"], tarif: 55000, disponible: true, note_moyenne: 4.9 },
  { id: "5", nom: "Nadège B.", telephone: "+2250700000008", quartier: "Marcory", experience: "6 ans", langues: ["Français", "Baoulé", "Dioula"], tarif: 70000, disponible: false, note_moyenne: 4.7 },
];

const MOCK_DEMANDES = [
  { id: "d1", menage: "Ménage Koné", quartier: "Cocody", besoin: "Garde d'enfants", date: new Date().toISOString(), statut: "En attente", menage_telephone: "+2250700000010" },
  { id: "d2", menage: "Ménage Yao", quartier: "Marcory", besoin: "Aide ménagère", date: new Date(Date.now() - 86400000).toISOString(), statut: "En attente", menage_telephone: "+2250700000011" },
  { id: "d3", menage: "Ménage Bamba", quartier: "Cocody", besoin: "Garde d'enfants", date: new Date(Date.now() - 172800000).toISOString(), statut: "Assignée", menage_telephone: "+2250700000012", nounou_assignee_id: "1", nounouAssignee: "Mariam T." },
  { id: "d4", menage: "Ménage Kouadio", quartier: "Yopougon", besoin: "Mixte (Garde + Ménage)", date: new Date(Date.now() - 259200000).toISOString(), statut: "Assignée", menage_telephone: "+2250700000013", nounou_assignee_id: "2", nounouAssignee: "Fatou C." },
  { id: "d5", menage: "Ménage Diallo", quartier: "Plateau", besoin: "Garde d'enfants", date: new Date().toISOString(), statut: "En attente", menage_telephone: "+2250700000014" },
];

const MOCK_AVIS = [
  { id: "a1", note: 5, commentaire: "Très ponctuelle et attentionnée avec mes enfants.", nounou: { nom: "Mariam T." }, menage: { nom: "Ménage Koné" } },
  { id: "a2", note: 5, commentaire: "Nounou sérieuse, je recommande vivement.", nounou: { nom: "Mariam T." }, menage: { nom: "Ménage Bamba" } },
  { id: "a3", note: 4, commentaire: "Bonne nounou, mes enfants l'adorent.", nounou: { nom: "Fatou C." }, menage: { nom: "Ménage Kouadio" } },
  { id: "a4", note: 5, commentaire: "Excellente expérience, nounou très professionnelle.", nounou: { nom: "Aminata K." }, menage: { nom: "Ménage Yao" } },
];

// ============================================================
// COMPOSANTS
// ============================================================

function StatCard({
  icon: Icon,
  number,
  label,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  number: number;
  label: string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color, background: `${color}15` }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function DemandeItem({ demande, onVoir }: { demande: any; onVoir: (id: string) => void }) {
  const getBesoinIcon = (besoin: string) => {
    if (besoin === "Garde d'enfants") return <Baby size={14} />;
    if (besoin === "Aide ménagère") return <Home size={14} />;
    if (besoin === "Mixte (Garde + Ménage)") return <Users size={14} />;
    return <Home size={14} />;
  };

  const getBesoinLabel = (besoin: string) => {
    if (besoin === "Garde d'enfants") return "Garde d'enfants";
    if (besoin === "Aide ménagère") return "Aide ménagère";
    if (besoin === "Mixte (Garde + Ménage)") return "Mixte";
    return besoin;
  };

  return (
    <div className="demande-item">
      <div className="demande-info">
        <span className="demande-nom">{demande.menage || "Ménage"}</span>
        <span className="demande-quartier"><MapPin size={12} /> {demande.quartier}</span>
        <span className="demande-besoin">{getBesoinIcon(demande.besoin)} {getBesoinLabel(demande.besoin)}</span>
      </div>
      <button className="btn-voir" onClick={() => onVoir(demande.id)}>
        Voir <ArrowRight size={14} />
      </button>
    </div>
  );
}

function RelationItem({ item }: { item: any }) {
  return (
    <div className="relation-item">
      <div className="relation-info">
        <span className="relation-nounou">{item.nounouAssignee || "Nounou"}</span>
        <span className="relation-arrow">→</span>
        <span className="relation-menage">{item.menage || "Ménage"}</span>
        <span className="relation-quartier"><MapPin size={12} /> {item.quartier}</span>
        <span className="relation-date"><Calendar size={12} /> {new Date(item.date).toLocaleDateString("fr-FR")}</span>
      </div>
    </div>
  );
}

function AvisItem({ avis }: { avis: any }) {
  return (
    <div className="avis-item">
      <div className="avis-header">
        <div className="avis-stars">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < avis.note ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
            />
          ))}
        </div>
        <span className="avis-nounou">👩 {avis.nounou?.nom || "Nounou"}</span>
      </div>
      {avis.commentaire && (
        <p className="avis-commentaire">"{avis.commentaire}"</p>
      )}
      <span className="avis-menage">— {avis.menage?.nom || "Ménage"}</span>
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

// ================================================================
// Écran bloquant tant que `statut_verification` de l'agence n'est
// pas "valide". L'agence ne doit voir NI les stats, NI le vivier,
// NI les demandes tant qu'un admin n'a pas validé son document
// justificatif (cf. 0014_agences_document_verification.sql).
// - Jamais envoyé -> formulaire d'envoi (filet de sécurité si l'envoi
//   fait pendant l'inscription a échoué).
// - "en_attente" (déjà envoyé) : simple message d'attente.
// - "refuse" : motif affiché + possibilité de renvoyer un document.
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
          background: #F1F0EC;
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
          background: #C1631B22;
          color: #F3811E;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .verification-icon.refuse { background: #E87A7A22; color: #E87A7A; }
        .verification-card h1 { font-size: 20px; font-weight: 700; color: #211B14; margin-bottom: 12px; }
        .verification-card p { font-size: 14px; color: #8A867A; line-height: 1.6; margin-bottom: 8px; }
        .verification-reupload { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .verification-upload-zone {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border: 1.5px dashed #C1631B;
          border-radius: 12px;
          color: #8A867A;
          font-size: 14px;
          cursor: pointer;
          background: #F1F0EC;
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
          color: #8A867A;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default function EspaceAgence() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  const [activeTab, setActiveTab] = useState<Tab>("accueil");
  const [demandeId, setDemandeId] = useState<string | undefined>(undefined);
  // Chez l'ami B, ce mode démarrait à `true` (mode démo par défaut).
  // On veut la vraie appli, donc `false` par défaut : les données
  // viennent de Supabase. Le fallback vers le mode démo reste
  // disponible ci-dessous en cas d'erreur de chargement (bouton
  // "Utiliser les données de démo"), pratique pour développer sans
  // dépendre de données réelles déjà en base.
  const [useMock, setUseMock] = useState(false);

  // ============================================================
  // DONNÉES RÉELLES
  // ============================================================
  const { data: agenceProfilReal, isError: agenceProfilError, error: agenceProfilErrorDetail } = useAgenceProfil();
  const agenceId = agenceProfilReal?.id;

  const { data: nounousReal, isLoading: isLoadingNounousReal } = useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured && !useMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nounous")
        .select("*")
        .eq("agence_id", agenceId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: demandesReal, isLoading: isLoadingDemandesReal } = useAgenceDemandes(agenceId);

  const { data: demandesAffiliationReal } = useDemandesAffiliationAgence(agenceId);

  const { data: avisRecentsReal } = useQuery({
    queryKey: ["avis", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured && !useMock,
    queryFn: async () => {
      const nounouIds = (nounousReal ?? []).map((n) => n.id);
      if (nounouIds.length === 0) return [];
      const { data, error } = await supabase
        .from("avis")
        .select("*, nounou:nounous(nom), menage:menages(nom)")
        .in("nounou_id", nounouIds)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // ============================================================
  // DONNÉES UTILISÉES (mock ou réelles)
  // ============================================================
  const agenceProfil = useMock ? MOCK_AGENCE : agenceProfilReal;
  const nounous = useMock ? MOCK_NOUNOUS : (nounousReal ?? []);
  const demandes = useMock ? MOCK_DEMANDES : (demandesReal ?? []);
  const avisRecents = useMock ? MOCK_AVIS : (avisRecentsReal ?? []);

  const isLoading = useMock ? false : (isLoadingNounousReal || isLoadingDemandesReal);
  const isError = useMock ? false : agenceProfilError;

  const handleVoirDemande = (id: string) => {
    setDemandeId(id);
    setActiveTab("demandes");
  };

  const handleBackFromDemandes = () => {
    setActiveTab("accueil");
    setDemandeId(undefined);
  };

  // Statistiques
  const totalNounous = nounous?.length ?? 0;
  const disponibles = nounous?.filter((n) => n.disponible).length ?? 0;
  const totalDemandes = demandes?.length ?? 0;

  const demandesEnAttente = (demandes ?? []).filter((d) => d.statut === "En attente");
  const demandesAssignees = (demandes ?? []).filter((d) => d.statut === "Assignée");

  const affiliationsEnAttente = (demandesAffiliationReal ?? []).filter((d) => d.statut === "en_attente");

  // ============================================================
  // RENDU SIDEBAR
  // ============================================================
  const renderHeader = () => (
    <header className="top-header">
      <button className="btn-home" onClick={() => navigate("/")} title="Retour à l'accueil">
        <ArrowLeft size={18} />
      </button>
      <Logo size={28} />
      <span>Nounou Connect</span>
    </header>
  );

  const renderBottomNav = () => (
    <nav className="bottom-nav">
      {[
        { id: "accueil", icon: <Home size={20} />, label: "Accueil" },
        { id: "nounous", icon: <Users size={20} />, label: "Nounous" },
        { id: "demandes", icon: <Inbox size={20} />, label: "Demandes" },
        { id: "affiliations", icon: <Handshake size={20} />, label: "Affiliations" },
        { id: "profil", icon: <User size={20} />, label: "Profil" },
      ].map((item) => (
        <button
          key={item.id}
          className={activeTab === item.id ? "active" : ""}
          onClick={() => {
            setActiveTab(item.id as Tab);
            setDemandeId(undefined);
          }}
        >
          <span className="nav-icon-wrapper">
            {item.icon}
            {item.id === "demandes" && demandesEnAttente.length > 0 && (
              <span className="badge-count">{demandesEnAttente.length}</span>
            )}
            {item.id === "affiliations" && affiliationsEnAttente.length > 0 && (
              <span className="badge-count">{affiliationsEnAttente.length}</span>
            )}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  // ============================================================
  // RENDU ACCUEIL
  // ============================================================
  const renderAccueil = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de votre tableau de bord...</p>
        </div>
      );
    }

    if (isError && !useMock) {
      return (
        <div className="error-container">
          <h2>Impossible de charger votre profil agence</h2>
          <p>{getErrorMessage(agenceProfilErrorDetail)}</p>
          <button className="btn-primary" onClick={() => setUseMock(true)}>
            🔧 Utiliser les données de démo
          </button>
          <button className="btn-secondary" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      );
    }

    return (
      <div className="tab-content">
        {/* En-tête de bienvenue - réduit et en haut */}
        <div className="welcome-section-mini">
          <div className="welcome-text-mini">
            <span className="welcome-greeting">Bonjour, <strong>{agenceProfil?.nom || "..."}</strong></span>
          </div>
          <div className="welcome-date-mini">
            <Calendar size={14} />
            <span>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        </div>

        {/* Statistiques */}
        <div className="stats-grid">
          <StatCard
            icon={Users}
            number={totalNounous}
            label="Nounous total"
            color="#F3811E"
          />
          <StatCard
            icon={UserCheck}
            number={disponibles}
            label="Nounous disponibles"
            color="#4A7C59"
          />
          <StatCard
            icon={Inbox}
            number={totalDemandes}
            label="Demandes reçues"
            color="#C1631B"
          />
          <StatCard
            icon={Handshake}
            number={demandesAssignees.length}
            label="Placements effectués"
            color="#4A7C59"
          />
        </div>

        {/* Demandes */}
        <section className="demandes-section">
          <div className="section-header">
            <h3><Inbox size={18} /> Demandes</h3>
            <button className="see-all" onClick={() => setActiveTab("demandes")}>
              Voir toutes <ArrowRight size={14} />
            </button>
          </div>
          <div className="demandes-list">
            {demandes.length > 0 ? (
              demandes.slice(0, 5).map((d) => (
                <DemandeItem
                  key={d.id}
                  demande={d}
                  onVoir={handleVoirDemande}
                />
              ))
            ) : (
              <div className="empty-state">
                <Inbox size={32} strokeWidth={1.5} />
                <p>Aucune demande</p>
                <span>Les demandes des ménages apparaîtront ici</span>
              </div>
            )}
          </div>
        </section>

        {/* Dernières mises en relation */}
        <section className="relation-section">
          <div className="section-header">
            <h3><Handshake size={18} /> Dernières mises en relation</h3>
          </div>
          <div className="relation-list">
            {demandesAssignees.length > 0 ? (
              demandesAssignees.slice(0, 3).map((d) => (
                <RelationItem key={d.id} item={d} />
              ))
            ) : (
              <div className="empty-state">
                <Handshake size={32} strokeWidth={1.5} />
                <p>Aucune mise en relation</p>
                <span>Les placements réalisés apparaîtront ici</span>
              </div>
            )}
          </div>
        </section>

        {/* Témoignages récents */}
        <section className="avis-section">
          <div className="section-header">
            <h3><MessageSquare size={18} /> Témoignages récents</h3>
          </div>
          <div className="avis-grid">
            {avisRecents.length > 0 ? (
              avisRecents.slice(0, 4).map((a) => (
                <AvisItem key={a.id} avis={a} />
              ))
            ) : (
              <div className="empty-state">
                <MessageSquare size={32} strokeWidth={1.5} />
                <p>Pas encore d'avis</p>
                <span>Les témoignages des ménages apparaîtront ici</span>
              </div>
            )}
          </div>
        </section>

        {/* Inspiration */}
        <div className="inspiration-section">
          <div className="inspiration-content">
            <Sparkles size={24} />
            <Heart size={28} />
            <Sparkles size={24} />
          </div>
          <p className="inspiration-message">"Votre vivier grandit chaque jour"</p>
          <p className="inspiration-sub">🌸 Continuons à faire briller nos nounous 🌸</p>
          <div className="inspiration-divider" />
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU CONTENU
  // ============================================================
  const renderContent = () => {
    const effectiveAgenceId = useMock ? "mock-agence-1" : agenceId;

    switch (activeTab) {
      case "accueil":
        return renderAccueil();
      case "nounous":
        return <GestionNounous agenceId={effectiveAgenceId} onBack={() => setActiveTab("accueil")} />;
      case "demandes":
        return <DemandesAgence agenceId={effectiveAgenceId} onBack={handleBackFromDemandes} demandeId={demandeId} />;
      case "affiliations":
        return <DemandesAffiliationAgence agenceId={effectiveAgenceId} onBack={() => setActiveTab("accueil")} />;
      case "profil":
        return <ProfilAgence onBack={() => setActiveTab("accueil")} onLogout={onLogout} />;
      default:
        return null;
    }
  };

  // ============================================================
  // GATE DE VÉRIFICATION
  // Tant que le document justificatif n'est pas validé, on n'affiche
  // ni sidebar, ni stats, ni vivier — seulement l'écran de statut.
  // `statut_verification` peut être `undefined` si la migration 0014
  // n'est pas encore appliquée côté base, ou si `useMock` est actif
  // (MOCK_AGENCE n'a pas ce champ) : dans ces cas on ne bloque pas.
  // ============================================================
  const statutVerification = agenceProfil?.statut_verification as
    | "en_attente"
    | "valide"
    | "refuse"
    | undefined;
  if (!useMock && agenceProfil && statutVerification && statutVerification !== "valide") {
    return (
      <VerificationEnAttente
        agenceId={agenceProfil.id}
        statut={statutVerification}
        documentEnvoye={Boolean((agenceProfil as { document_url?: string }).document_url)}
        motifRefus={(agenceProfil as { motif_refus?: string }).motif_refus}
        onLogout={onLogout}
      />
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="agence-container">
      {renderHeader()}
      <main className="main-content">
        {renderContent()}
      </main>
      {renderBottomNav()}

      <style>{`
        /* ============================================================ */
        /* CONTAINER PRINCIPAL                                          */
        /* ============================================================ */
        .agence-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #F1F0EC;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ============================================================ */
        /* HEADER (logo + nom de l'app, en haut à gauche)               */
        /* ============================================================ */
        .top-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          background: #FFFFFF;
          border-bottom: 1px solid rgba(33, 27, 20, 0.08);
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

        .top-header span {
          color: #211B14;
          font-size: 18px;
          font-weight: 700;
        }

        /* ============================================================ */
        /* BOTTOM NAV (barre horizontale, en bas)                       */
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
          padding: 6px 4px;
          z-index: 100;
          box-shadow: 0 -2px 16px rgba(33, 27, 20, 0.06);
        }

        .bottom-nav button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 8px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #8A867A;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bottom-nav button:hover {
          color: #211B14;
        }

        .bottom-nav button.active {
          color: #F3811E;
        }

        .bottom-nav .nav-icon-wrapper {
          position: relative;
          display: flex;
        }

        .badge-count {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #F3811E;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 50px;
          min-width: 16px;
          text-align: center;
        }

        /* ============================================================ */
        /* MAIN CONTENT                                                 */
        /* ============================================================ */
        .main-content {
          flex: 1;
          padding: 16px 20px 90px;
          min-height: 100vh;
          max-width: 100%;
        }

        /* ============================================================ */
        /* TAB CONTENT                                                  */
        /* ============================================================ */
        .tab-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============================================================ */
        /* WELCOME MINI (réduit)                                        */
        /* ============================================================ */
        .welcome-section-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0 14px 0;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .welcome-text-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .welcome-greeting {
          font-size: 20px;
          color: #8A867A;
        }

        .welcome-greeting strong {
          color: #211B14;
          font-weight: 700;
        }

        .welcome-date-mini {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #8A867A;
        }

        /* ============================================================ */
        /* STATS                                                        */
        /* ============================================================ */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          border: 1px solid rgba(212, 184, 150, 0.08);
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(28, 25, 23, 0.08);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 800;
          color: #211B14;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 12px;
          color: #8A867A;
          font-weight: 500;
        }

        /* ============================================================ */
        /* SECTION HEADER                                               */
        /* ============================================================ */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          color: #211B14;
          margin: 0;
        }

        .see-all {
          background: transparent;
          border: none;
          color: #F3811E;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.2s;
        }

        .see-all:hover {
          opacity: 0.8;
        }

        /* ============================================================ */
        /* DEMANDES                                                     */
        /* ============================================================ */
        .demandes-section {
          margin-bottom: 20px;
        }

        .demandes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .demande-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 6px rgba(28, 25, 23, 0.04);
          flex-wrap: wrap;
          gap: 8px;
          transition: all 0.2s;
        }

        .demande-item:hover {
          border-color: rgba(194, 97, 79, 0.15);
        }

        .demande-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .demande-nom {
          font-weight: 600;
          color: #211B14;
          font-size: 14px;
        }

        .demande-quartier {
          color: #8A867A;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .demande-besoin {
          font-size: 12px;
          color: #8A867A;
          background: #F1F0EC;
          padding: 2px 10px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-voir {
          background: #F3811E;
          color: white;
          border: none;
          padding: 5px 14px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background 0.2s;
        }

        .btn-voir:hover {
          background: #C1631B;
        }

        /* ============================================================ */
        /* RELATIONS                                                    */
        /* ============================================================ */
        .relation-section {
          margin-bottom: 20px;
        }

        .relation-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .relation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 6px rgba(28, 25, 23, 0.04);
          flex-wrap: wrap;
          gap: 8px;
        }

        .relation-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .relation-nounou {
          font-weight: 600;
          color: #211B14;
          font-size: 14px;
        }

        .relation-arrow {
          color: #C1631B;
        }

        .relation-menage {
          color: #8A867A;
          font-size: 13px;
        }

        .relation-quartier {
          color: #8A867A;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .relation-date {
          font-size: 12px;
          color: #8A867A;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* ============================================================ */
        /* AVIS                                                         */
        /* ============================================================ */
        .avis-section {
          margin-bottom: 20px;
        }

        .avis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .avis-item {
          background: white;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 6px rgba(28, 25, 23, 0.04);
        }

        .avis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .avis-stars {
          display: flex;
          gap: 1px;
        }

        .text-yellow-400 { color: #F59E0B; }
        .fill-yellow-400 { fill: #F59E0B; }
        .text-gray-300 { color: #D1D5DB; }

        .avis-nounou {
          font-size: 12px;
          font-weight: 600;
          color: #8A867A;
        }

        .avis-commentaire {
          font-size: 13px;
          font-style: italic;
          color: #211B14;
          margin: 4px 0;
        }

        .avis-menage {
          font-size: 11px;
          color: #8A867A;
        }

        /* ============================================================ */
        /* EMPTY STATE                                                  */
        /* ============================================================ */
        .empty-state {
          text-align: center;
          padding: 24px 16px;
          color: #8A867A;
        }

        .empty-state svg {
          color: #C1631B;
          margin-bottom: 4px;
        }

        .empty-state p {
          font-weight: 600;
          color: #211B14;
          margin: 0;
        }

        .empty-state span {
          font-size: 12px;
        }

        /* ============================================================ */
        /* INSPIRATION                                                  */
        /* ============================================================ */
        .inspiration-section {
          text-align: center;
          padding: 24px 16px 8px;
        }

        .inspiration-content {
          display: flex;
          justify-content: center;
          gap: 12px;
          color: #C1631B;
          margin-bottom: 8px;
        }

        .inspiration-message {
          font-size: 18px;
          font-weight: 700;
          color: #F3811E;
          margin: 0;
        }

        .inspiration-sub {
          font-size: 13px;
          color: #8A867A;
          font-weight: 500;
          margin: 0;
        }

        .inspiration-divider {
          width: 50px;
          height: 3px;
          background: #FFF3D6;
          margin: 8px auto 0;
          border-radius: 50px;
        }

        /* ============================================================ */
        /* LOADING / ERROR                                              */
        /* ============================================================ */
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

        .error-container {
          text-align: center;
          padding: 40px 20px;
        }

        .error-container h2 {
          font-size: 18px;
          font-weight: 700;
          color: #211B14;
        }

        .error-container p {
          color: #8A867A;
          font-size: 14px;
          max-width: 480px;
          margin: 8px auto 16px;
        }

        .btn-primary {
          padding: 10px 28px;
          background: #F3811E;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          margin: 4px;
        }

        .btn-primary:hover {
          background: #C1631B;
        }

        .btn-secondary {
          padding: 10px 28px;
          background: transparent;
          color: #8A867A;
          border: 2px solid #C1631B;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          margin: 4px;
        }

        .btn-secondary:hover {
          border-color: #F3811E;
          color: #F3811E;
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 12px 12px 90px;
            max-width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .stat-card {
            padding: 12px 14px;
          }

          .stat-number {
            font-size: 18px;
          }

          .avis-grid {
            grid-template-columns: 1fr;
          }

          .demande-item {
            flex-direction: column;
            align-items: stretch;
          }

          .demande-item .btn-voir {
            width: 100%;
            justify-content: center;
          }

          .relation-item {
            flex-direction: column;
            align-items: stretch;
          }

          .welcome-section-mini {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 10px 10px 80px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 10px 12px;
          }

          .stat-number {
            font-size: 16px;
          }

          .demande-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .relation-info {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .avis-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (min-width: 1025px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .main-content {
            padding: 20px 28px 40px;
          }

          .stat-card {
            padding: 18px 20px;
          }

          .stat-number {
            font-size: 26px;
          }

          .demande-item {
            padding: 14px 18px;
          }

          .relation-item {
            padding: 14px 18px;
          }

          .avis-item {
            padding: 16px 20px;
          }
        }
      `}</style>
    </div>
  );
}