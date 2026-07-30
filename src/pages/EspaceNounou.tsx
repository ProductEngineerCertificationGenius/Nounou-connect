// src/pages/EspaceNounou.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  X,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  FileText,
  Building2,
  MessageCircle,
  Camera,
  Edit2,
  Save,
  LogOut,
  Users,
  Phone,
  ShieldCheck,
  Home,
  Menu as MenuIcon,
  Briefcase,
  Coins,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";
import { useMesDemandesAffiliation, useEnvoyerDemandeAffiliation, useAnnulerDemandeAffiliation } from "../hooks/useAffiliation";

// ================================================================
// Version alignée EXACTEMENT sur la maquette NOUNOU-PROFIL-WEB-v10.html :
// - palette identique (inchangée) ;
// - topbar "Airbnb-like" (logo + bouton retour accueil + menu compte
//   en dropdown avec "Mon profil" / "Déconnexion"), qui remplace
//   l'ancien app-topbar + bottomnav ;
// - carte profil avec halo autour de l'avatar, nom en dégradé,
//   badges, étoiles / stat-mini (avec agence) ;
// - grid 340px / 1fr (colonne profil + colonne contenu) ;
// - cartes, info-grid, agency-grid, whatsapp-card, tip : styles et
//   structure fidèles à la maquette.
//
// La logique métier (queries, mutations RLS, affiliation, upload
// photo...) est inchangée.
// ================================================================

const NOUNOU_LANDING_ROUTE = "/"; // LandingPage.tsx, qui redirige ensuite vers /espace-nounou via goToDashboard()

const QUARTIERS = [
  "Abobo",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Yopougon",
  "Anyama",
  "Bingerville",
  "Grand-Bassam",
  "Port-Bouët",
];

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

const digitsOnly = (v: string) => (v || "").replace(/\D/g, "");

// Icône WhatsApp fidèle au tracé de la maquette
const WhatsAppIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.09.2-.14.32-.28.49-.14.17-.29.38-.42.51-.14.14-.28.29-.12.57.16.28.71 1.18 1.53 1.91 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.16-.19.7-.82.89-1.1.19-.28.37-.23.63-.14.26.09 1.66.79 1.94.93.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
  </svg>
);

export default function EspaceNounou() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  const queryClient = useQueryClient();

  // On se base directement sur la session Supabase plutôt que sur le store
  // d'auth (currentUser) : juste après une inscription, le store peut ne
  // pas encore être à jour, ce qui empêchait la requête "profil" de se
  // déclencher (query désactivée) et laissait l'écran figé sur l'état vide.
  const [authUserId, setAuthUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setAuthUserId(session?.user?.id);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id);
    });

    return () => {
      isMounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const goToLanding = () => navigate(NOUNOU_LANDING_ROUTE);

  const { data: profil, isLoading: profilLoading, error: profilError, refetch: refetchProfil } = useQuery({
    queryKey: ["nounou", "profil", authUserId],
    enabled: Boolean(authUserId) && isSupabaseConfigured,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nounous")
        .select("*, agence:agences(nom, telephone)")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const hasAgence = Boolean(profil?.agence_id);

  // ===== DEMANDES D'AFFILIATION ENVOYÉES (nounou sans agence) =====
  const { data: mesDemandesAffiliation, refetch: refetchDemandes } = useMesDemandesAffiliation(profil?.id);
  const envoyerDemande = useEnvoyerDemandeAffiliation();
  const annulerDemande = useAnnulerDemandeAffiliation();

  // Une demande n'est annulable que dans la minute suivant son envoi. (CHANGÉ DE 1 HEURE À 1 MINUTE)
  const DELAI_ANNULATION_MS = 60 * 1000; // 1 minute
  const peutEncoreAnnuler = (createdAt: string) => {
    if (!createdAt) return false;
    const tempsEcoule = Date.now() - new Date(createdAt).getTime();
    return tempsEcoule < DELAI_ANNULATION_MS;
  };

  // État pour suivre l'annulation en cours
  const [annulationEnCours, setAnnulationEnCours] = useState<string | null>(null);

  // Fonction pour gérer l'annulation d'une demande
  const handleAnnulerDemande = async (demandeId: string, nounouId: string) => {
    if (!demandeId || !nounouId) return;
    
    // Vérifier une dernière fois le délai avant d'annuler
    const demande = mesDemandesAffiliation?.find(d => d.id === demandeId);
    if (!demande || !peutEncoreAnnuler(demande.created_at)) {
      // Le message a été retiré - l'interface se met à jour automatiquement
      return;
    }
    
    setAnnulationEnCours(demandeId);
    try {
      await annulerDemande.mutateAsync({ demandeId, nounouId });
      // Rafraîchir les données après annulation réussie
      await refetchDemandes();
      await refetchProfil();
      // Le message de succès a été retiré - l'interface se met à jour automatiquement
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      // Le message d'erreur a été retiré - l'erreur s'affiche dans l'interface via annulerDemande.error
    } finally {
      setAnnulationEnCours(null);
    }
  };

  // Timer pour rafraîchir automatiquement l'état après 1 minute
  useEffect(() => {
    if (!mesDemandesAffiliation || mesDemandesAffiliation.length === 0) return;
    
    // Trouver la demande la plus récente en attente
    const demandeEnAttente = mesDemandesAffiliation.find(d => d.statut === 'en_attente');
    if (!demandeEnAttente) return;
    
    const tempsRestant = DELAI_ANNULATION_MS - (Date.now() - new Date(demandeEnAttente.created_at).getTime());
    
    if (tempsRestant <= 0) {
      // Si le délai est dépassé, rafraîchir les données
      refetchDemandes();
      return;
    }
    
    // Configurer un timer pour rafraîchir après le délai
    const timer = setTimeout(() => {
      refetchDemandes();
    }, tempsRestant);
    
    return () => clearTimeout(timer);
  }, [mesDemandesAffiliation, refetchDemandes]);

  const demandeVientDetreAcceptee = mesDemandesAffiliation?.some((d) => d.statut === "acceptee");
  useEffect(() => {
    if (demandeVientDetreAcceptee && !hasAgence) {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", authUserId] });
    }
  }, [demandeVientDetreAcceptee, hasAgence, queryClient, authUserId]);

  // ===== AGENCES DISPONIBLES (nounou sans agence uniquement) =====
  const [filterQuartier, setFilterQuartier] = useState("");
  const { data: agencesQuartier } = useQuery({
    queryKey: ["agences", "quartier", filterQuartier],
    enabled: Boolean(profil?.quartier) && isSupabaseConfigured && !hasAgence,
    queryFn: async () => {
      let query = supabase.from("agences_public").select("*");
      if (filterQuartier) {
        query = query.eq("quartier", filterQuartier);
      }
      const { data, error } = await query.order("note", { ascending: false });
      if (error) throw error;
      return data as AgencePublique[];
    },
  });

  // ===== ÉDITION DU PROFIL (nounou sans agence uniquement) =====
  const [isEditingProfil, setIsEditingProfil] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editFormData, setEditFormData] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    ethnie: "",
  });
  const [editError, setEditError] = useState("");

  const startEditingProfil = () => {
    if (profil) {
      setEditFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        ethnie: profil.ethnie || "",
      });
      setPreviewUrl(profil.photo_url || null);
    }
    setEditError("");
    setIsEditingProfil(true);
  };

  const cancelEditingProfil = () => {
    setIsEditingProfil(false);
    setPhotoFile(null);
    setPreviewUrl(null);
    setEditError("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateProfilSelf = useMutation({
    mutationFn: async () => {
      if (!profil) return;

      let photo_url = profil.photo_url;
      if (photoFile) {
        const path = `nounous/${profil.id}/photo.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }

      const { data, error } = await supabase
        .from("nounous")
        .update({
          nom: editFormData.nom,
          telephone: editFormData.telephone,
          quartier: editFormData.quartier,
          ethnie: editFormData.ethnie || null,
          photo_url,
        })
        .eq("id", profil.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible de modifier votre profil (accès refusé par la base)."
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", authUserId] });
      setIsEditingProfil(false);
      setPhotoFile(null);
      setPreviewUrl(null);
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  const handleSaveProfil = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    updateProfilSelf.mutate();
  };

  const initiales = (profil?.nom || "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ===== Menu compte (dropdown topbar, style maquette) =====
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const AccountMenu = ({ neutral = false }: { neutral?: boolean }) => (
    <div className={`account-menu ${accountMenuOpen ? "open" : ""}`} ref={accountMenuRef}>
      <button
        className="account-pill"
        onClick={(e) => {
          e.stopPropagation();
          setAccountMenuOpen((v) => !v);
        }}
      >
        <MenuIcon className="ic" size={17} />
        <span className={`mini-avatar ${neutral ? "neutral" : ""}`}>
          {profil?.photo_url ? <img src={profil.photo_url} alt={profil?.nom} /> : initiales}
        </span>
      </button>
      <div className="account-dropdown">
        <div className="dropdown-item current">
          <User className="ic" size={17} /> Mon profil
        </div>
        <div className="dropdown-sep" />
        <div className="dropdown-item logout" onClick={onLogout}>
          <LogOut className="ic" size={17} /> Déconnexion
        </div>
      </div>
    </div>
  );

  const Topbar = ({ neutral = false }: { neutral?: boolean }) => (
    <div className="topbar-v2">
      <div className="topbar-inner">
        <div className="brand">
          <Logo size={38} />
          <span className="brand-name">Nounou Connect</span>
        </div>
        <div className="topbar-right">
          <button className="ghost-circle" title="Retour à l'accueil" onClick={goToLanding}>
            <Home className="ic" size={17} />
          </button>
          <AccountMenu neutral={neutral} />
        </div>
      </div>
    </div>
  );

  // ===================== AVEC AGENCE =====================
  const renderProfil = () => {
    const agenceTelephone = digitsOnly(profil?.agence?.telephone || "");
    const whatsappHref = agenceTelephone
      ? `https://wa.me/${agenceTelephone}?text=${encodeURIComponent(
          "Bonjour, je souhaite modifier mes informations sur Nounou Connect."
        )}`
      : undefined;

    const note = profil?.note_moyenne ?? 0;

    return (
      <div className="app-wrap">
        <Topbar />

        <div className="main-inner">
          <div className="grid">
            <div className="profile-card">
              <div className="avatar-wrap">
                <div className="avatar-halo">
                  <div className="avatar">
                    {profil?.photo_url ? <img src={profil.photo_url} alt={profil?.nom} /> : initiales}
                  </div>
                </div>
              </div>
              <div className="profile-info">
                <p className="profile-name">{profil?.nom || "..."}</p>
                <div className="badge-row">
                  <span className="badge badge-argile">
                    <ShieldCheck className="ic-sm" size={14} /> Nounou vérifiée
                  </span>
                </div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`star-ic ${i <= Math.round(note) ? "filled" : ""}`} size={16} fill={i <= Math.round(note) ? "currentColor" : "none"} />
                  ))}
                </div>
                <div className="meta-row">
                  <span>
                    <MapPin className="ic-sm" size={14} /> {profil?.quartier || "—"}
                  </span>
                </div>
                <div className="stat-mini-grid">
                  <div className="stat-mini exp">
                    <div className="stat-mini-icon">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <div className="stat-mini-val">{profil?.experience || "Non renseignée"}</div>
                      <div className="stat-mini-lbl">Expérience</div>
                    </div>
                  </div>
                  <div className="stat-mini tarif">
                    <div className="stat-mini-icon">
                      <Coins size={18} />
                    </div>
                    <div>
                      <div className="stat-mini-val">{(profil?.tarif ?? 0).toLocaleString()}</div>
                      <div className="stat-mini-lbl">FCFA / mois</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-stack">
              <div className="two-col">
                <div className="card">
                  <p className="card-title">
                    <Clock className="ic" size={17} /> Mon statut
                  </p>
                  <div className="status-row">
                    <div className={`status-icon ${profil?.disponible ? "on" : "off"}`}>
                      {profil?.disponible ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="status-lbl">Actuellement</p>
                      <p className={`status-val ${profil?.disponible ? "on" : "off"}`}>
                        {profil?.disponible ? "Disponible" : "Indisponible"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <p className="card-title">
                    <Building2 className="ic" size={17} /> Mon agence
                  </p>
                  <div className="simple-row">
                    <span className="simple-row-label">Agence</span>
                    <span className="simple-row-value">{profil?.agence?.nom || "—"}</span>
                  </div>
                  <div className="simple-row">
                    <span className="simple-row-label">Langues</span>
                    <span className="simple-row-value">
                      {(profil?.langues ?? []).length > 0 ? profil.langues.join(", ") : "Non renseigné"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card whatsapp-card">
                <div className="whatsapp-text">
                  <p className="card-title" style={{ marginBottom: 5 }}>
                    <Edit2 className="ic" size={17} /> Modifier mes informations
                  </p>
                  <p>Pour modifier vos informations, veuillez contacter votre agence.</p>
                </div>
                <a
                  className="wa-btn"
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!whatsappHref) e.preventDefault();
                  }}
                >
                  <WhatsAppIcon size={17} /> Contacter sur WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================== SANS AGENCE =====================
  const renderSansAgence = () => {
    const agences = agencesQuartier ?? [];
    return (
      <div className="app-wrap">
        <Topbar neutral />

        <div className="main-inner">
          <div className="grid">
            <div className="profile-card">
              <div className="avatar-wrap">
                <div className="avatar-halo">
                  <div
                    className={`avatar neutral ${isEditingProfil ? "editable" : ""}`}
                    onClick={() => isEditingProfil && fileInputRef.current?.click()}
                  >
                    {previewUrl || profil?.photo_url ? (
                      <img src={previewUrl || profil?.photo_url} alt={profil?.nom} />
                    ) : (
                      initiales
                    )}
                    {isEditingProfil && (
                      <div className="avatar-edit-overlay">
                        <Camera size={18} />
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
              </div>
              <div className="profile-info">
                <p className="profile-name">{profil?.nom || "..."}</p>
                <div className="badge-row">
                  <span className="badge badge-neutral">Sans agence</span>
                </div>
                <div className="meta-row">
                  <span>
                    <MapPin className="ic-sm" size={14} /> {profil?.quartier || "—"}
                  </span>
                </div>
                {!isEditingProfil && (
                  <button className="btn btn-outline" onClick={startEditingProfil}>
                    <Edit2 size={15} /> Modifier mon profil
                  </button>
                )}
              </div>
            </div>

            <div className="col-stack">
              {isEditingProfil ? (
                <form onSubmit={handleSaveProfil} className="card">
                  <p className="card-title">
                    <Edit2 className="ic" size={17} /> Modifier mes informations
                  </p>
                  {editError && <p className="edit-error">{editError}</p>}
                  <div className="edit-grid">
                    <div className="field">
                      <label>Prénom et nom</label>
                      <input
                        type="text"
                        value={editFormData.nom}
                        onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Téléphone</label>
                      <input
                        type="tel"
                        value={editFormData.telephone}
                        onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Quartier</label>
                      <select
                        value={editFormData.quartier}
                        onChange={(e) => setEditFormData({ ...editFormData, quartier: e.target.value })}
                        required
                      >
                        {QUARTIERS.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Ethnie <span className="optional">(optionnel)</span></label>
                      <input
                        type="text"
                        value={editFormData.ethnie}
                        onChange={(e) => setEditFormData({ ...editFormData, ethnie: e.target.value })}
                        placeholder="Akan, Baoulé, Malinké, etc."
                      />
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button type="button" className="btn btn-ghost" onClick={cancelEditingProfil}>
                      <X size={14} /> Annuler
                    </button>
                    <button type="submit" className="btn btn-solid" disabled={updateProfilSelf.isPending}>
                      <Save size={14} /> {updateProfilSelf.isPending ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="card">
                  <p className="card-title">
                    <FileText className="ic" size={17} /> Informations
                  </p>
                  <div className="info-grid">
                    <div className="info-tile">
                      <div className="info-tile-lbl">
                        <Phone className="ic" size={13} /> Téléphone
                      </div>
                      <div className="info-tile-val">{profil?.telephone || "—"}</div>
                    </div>
                    <div className="info-tile">
                      <div className="info-tile-lbl">
                        <MapPin className="ic" size={13} /> Quartier
                      </div>
                      <div className="info-tile-val">{profil?.quartier || "—"}</div>
                    </div>
                    <div className="info-tile">
                      <div className="info-tile-lbl">
                        <ShieldCheck className="ic" size={13} /> Ethnie
                      </div>
                      <div className="info-tile-val" style={!profil?.ethnie ? { color: "var(--muted)", fontWeight: 500 } : undefined}>
                        {profil?.ethnie || "Non renseignée"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="commune-filter">
                  <p className="card-title" style={{ margin: 0 }}>
                    <Building2 className="ic" size={17} /> Agences disponibles · {agences.length}
                  </p>
                  <select
                    value={filterQuartier || "toutes"}
                    onChange={(e) => setFilterQuartier(e.target.value === "toutes" ? "" : e.target.value)}
                  >
                    <option value="toutes">Toutes les communes</option>
                    {QUARTIERS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                {agences.length > 0 ? (
                  <div className="agency-grid">
                    {agences.map((agence) => {
                      const demande = mesDemandesAffiliation?.find((d) => d.agence_id === agence.id);
                      return (
                        <div key={agence.id} className="agency-card">
                          <div className="agency-icon">
                            <Building2 size={22} />
                          </div>
                          <div className="agency-name">{agence.nom}</div>
                          <div className="agency-meta">
                            <span><MapPin size={12} /> {agence.quartier}</span>
                            <span><Users size={12} /> {agence.nbNounous}</span>
                          </div>

                          {demande?.statut === "en_attente" && (
                            <div className="agency-cta pending">
                              <span>Demande envoyée</span>
                              {peutEncoreAnnuler(demande.created_at) ? (
                                <button
                                  className="agency-cta-cancel"
                                  disabled={annulationEnCours === demande.id || annulerDemande.isPending}
                                  onClick={() => {
                                    if (!profil?.id) return;
                                    handleAnnulerDemande(demande.id, profil.id);
                                  }}
                                >
                                  {annulationEnCours === demande.id || annulerDemande.isPending ? "Annulation..." : "Annuler la demande"}
                                </button>
                              ) : (
                                <span className="agency-cta-note">Délai d'annulation dépassé</span>
                              )}
                              {annulerDemande.error && (
                                <div className="agency-cta-error">
                                  {getErrorMessage(annulerDemande.error)}
                                </div>
                              )}
                            </div>
                          )}
                          {demande?.statut === "acceptee" && (
                            <div className="agency-cta accepted">
                              <CheckCircle size={14} /> Acceptée
                            </div>
                          )}
                          {demande?.statut === "refusee" && (
                            <div className="agency-cta refused">
                              Demande refusée
                            </div>
                          )}
                          {!demande && (
                            <button
                              className="agency-cta send"
                              disabled={envoyerDemande.isPending}
                              onClick={() => {
                                if (!profil?.id) return;
                                envoyerDemande.mutate({ nounouId: profil.id, agenceId: agence.id });
                              }}
                            >
                              <MessageCircle size={13} />
                              {envoyerDemande.isPending ? "Envoi..." : "Envoyer une demande"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-agences">
                    <Building2 size={36} />
                    <p>Aucune agence trouvée pour cette commune.</p>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="tip">
                  <CheckCircle className="ic" size={17} />
                  <span><strong>Vous n'avez pas encore d'agence ?</strong> Contactez l'une des agences ci-dessus pour rejoindre leur vivier.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="espace-nounou">
      {profilLoading ? (
        <div className="app-wrap">
          <Topbar />
          <div className="main-inner">
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              Chargement de votre profil...
            </div>
          </div>
        </div>
      ) : profilError ? (
        <div className="app-wrap">
          <Topbar />
          <div className="main-inner">
            <div className="card" style={{ color: "#DC2626" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Impossible de charger votre profil</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>{getErrorMessage(profilError)}</p>
            </div>
          </div>
        </div>
      ) : (
        hasAgence ? renderProfil() : renderSansAgence()
      )}

      <style>{`
        :root{
          --sable:#FBF3EA;
          --sable-deep:#F3E6D8;
          --argile:#F7A82A;
          --argile-dark:#D98A12;
          --argile-light:#FDBF37;
          --argile-tint:#FDECC8;
          --encre:#3D2B1F;
          --encre-soft:#6B5744;
          --muted:#9C8A76;
          --feuille:#5E7C4C;
          --feuille-bg:#E7EEE0;
          --or:#D89B3C;
          --or-bg:#FBF0DC;
          --rouge:#B5493A;
          --whatsapp:#25D366;
          --whatsapp-dark:#1DA851;
          --line:#E8DCC9;
          --white:#FFFFFF;
          --sidebar:#241B15;
          --radius-lg:20px;
          --radius-md:14px;
        }

        .espace-nounou *{ box-sizing:border-box; }
        .espace-nounou{
          min-height:100vh;
          background:var(--sable);
          font-family:'Public Sans', sans-serif;
          color:var(--encre);
          -webkit-font-smoothing:antialiased;
        }

        .ic{ width:17px; height:17px; flex:none; display:inline-block; vertical-align:middle; }
        .ic-sm{ width:14px; height:14px; }
        .ic-lg{ width:22px; height:22px; }

        .app-wrap{ position:relative; min-height:100vh; overflow:hidden; }

        /* ============ Top navbar ============ */
        .topbar-v2{ position:relative; z-index:5; background:var(--white); border-bottom:1px solid var(--line); }
        .topbar-inner{ max-width:1180px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; }
        .brand{ display:flex; align-items:center; gap:11px; }
        .brand-name{ font-family:'Fraunces', serif; font-weight:600; font-size:17px; }
        .topbar-right{ display:flex; align-items:center; gap:12px; }
        .ghost-circle{
          width:38px; height:38px; border-radius:50%; border:1px solid var(--line); background:var(--white);
          color:var(--encre-soft); display:flex; align-items:center; justify-content:center; cursor:pointer;
          transition:.2s;
        }
        .ghost-circle:hover{ background:var(--sable-deep); color:var(--argile-dark); }

        .account-menu{ position:relative; }
        .account-pill{
          display:flex; align-items:center; gap:10px;
          background:var(--white); border:1px solid var(--line); border-radius:999px;
          padding:6px 6px 6px 14px; cursor:pointer;
          box-shadow:0 1px 3px rgba(61,43,31,.08);
          transition:.2s;
        }
        .account-pill:hover{ box-shadow:0 5px 14px rgba(61,43,31,.16); }
        .account-pill .ic{ color:var(--encre-soft); }
        .mini-avatar{
          width:30px; height:30px; border-radius:50%;
          background:linear-gradient(135deg, var(--argile), var(--argile-dark));
          color:#fff; display:flex; align-items:center; justify-content:center;
          font-family:'Fraunces', serif; font-weight:700; font-size:12px; overflow:hidden;
        }
        .mini-avatar.neutral{ background:var(--sidebar); }
        .mini-avatar img{ width:100%; height:100%; object-fit:cover; }

        .account-dropdown{
          position:absolute; top:calc(100% + 10px); right:0; width:230px;
          background:#fff; border-radius:16px; border:1px solid var(--line);
          box-shadow:0 14px 34px rgba(61,43,31,.18);
          padding:8px; z-index:50;
          opacity:0; transform:translateY(-8px); pointer-events:none;
          transition:opacity .18s ease, transform .18s ease;
        }
        .account-menu.open .account-dropdown{ opacity:1; transform:translateY(0); pointer-events:auto; }
        .dropdown-item{
          display:flex; align-items:center; gap:11px; padding:11px 12px; border-radius:10px;
          font-size:13.5px; font-weight:700; cursor:pointer; transition:.15s;
        }
        .dropdown-item:hover{ background:var(--sable-deep); }
        .dropdown-item.current{ color:var(--argile-dark); }
        .dropdown-item.current .ic{ color:var(--argile-dark); }
        .dropdown-item.logout{ color:var(--rouge); }
        .dropdown-item.logout .ic{ color:var(--rouge); }
        .dropdown-sep{ height:1px; background:var(--line); margin:6px 6px; }

        /* ============ Contenu principal ============ */
        .main-inner{ max-width:1080px; margin:0 auto; position:relative; z-index:1; padding:32px 24px 70px; }

        // --- Version mobile (par défaut) ---
        .grid{ display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }
        
        .col-stack > * + * { margin-top:16px; }

        // --- Version desktop (écran large) ---
        @media (min-width: 1024px) {
          .grid { 
            display:flex; 
            flex-direction:column; 
            gap:20px; 
          }
          
          // La carte profil prend toute la largeur
          .profile-card { 
            width:100%; 
            display:grid; 
            grid-template-columns:auto 1fr; 
            gap:24px; 
            align-items:center;
            padding:24px 32px;
          }
          
          .profile-card .avatar-wrap { margin-bottom:0; }
          .profile-card .profile-name { text-align:left; margin:0 0 4px; }
          .profile-card .badge-row { justify-content:flex-start; }
          .profile-card .meta-row { justify-content:flex-start; margin-bottom:0; }
          .profile-card .stars { justify-content:flex-start; }
          .profile-card .divider { display:none; }
          .profile-card .stat-mini-grid { display:flex; gap:12px; }
          .profile-card .stat-mini { flex:1; }
          .profile-card::before { display:none; }
          
          // Les cartes sont empilées verticalement
          .col-stack { display:flex; flex-direction:column; gap:16px; }
          .col-stack > * + * { margin-top:0; }
          
          // Mon statut et Mon agence côte à côte
          .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          
          // La carte whatsapp en bas
          .whatsapp-card { display:flex; align-items:center; justify-content:space-between; flex-direction:row; }
        }

        // --- Version tablette (entre 640px et 1024px) ---
        @media (min-width: 641px) and (max-width: 1023px) {
          .grid{ grid-template-columns:1fr; }
          .profile-card { 
            display:grid; 
            grid-template-columns:auto 1fr; 
            gap:20px; 
            align-items:center;
            padding:20px 24px;
          }
          .profile-card .avatar-wrap { margin-bottom:0; }
          .profile-card .profile-name { text-align:left; margin:0 0 4px; }
          .profile-card .badge-row { justify-content:flex-start; }
          .profile-card .meta-row { justify-content:flex-start; margin-bottom:0; }
          .profile-card .stars { justify-content:flex-start; }
          .profile-card .divider { display:none; }
          .profile-card .stat-mini-grid { display:flex; gap:12px; }
          .profile-card .stat-mini { flex:1; }
          .two-col { grid-template-columns:1fr; }
        }

        /* ============ Carte profil ============ */
        .profile-card{
          background:var(--white); border-radius:var(--radius-lg); padding:26px 24px;
          box-shadow:0 2px 10px rgba(61,43,31,.05);
          transition:transform .25s ease, box-shadow .25s ease;
          position:relative; overflow:hidden;
        }
        .profile-card:hover{ transform:translateY(-3px); box-shadow:0 14px 30px rgba(61,43,31,.12); }
        .profile-card::before{
          content:""; position:absolute; top:14px; right:14px; width:64px; height:64px;
          background-image:radial-gradient(var(--argile-tint) 1.6px, transparent 1.6px);
          background-size:9px 9px; opacity:.6; pointer-events:none;
        }
        .avatar-wrap{ display:flex; justify-content:center; margin-bottom:14px; position:relative; }
        .avatar-wrap::before{
          content:""; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:120px; height:120px; border-radius:50%;
          background:radial-gradient(circle, var(--argile-tint) 0%, rgba(253,236,200,0) 72%);
          opacity:.5; z-index:0;
        }
        .avatar-halo{
          width:96px; height:96px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          background:conic-gradient(from 180deg, var(--argile-tint), var(--or-bg), var(--feuille-bg), var(--argile-tint));
          position:relative; z-index:1;
          animation: breathe 4.5s ease-in-out infinite;
        }
        @keyframes breathe{
          0%,100%{ box-shadow:0 0 0 0 rgba(247,168,42,.18); }
          50%{ box-shadow:0 0 0 8px rgba(247,168,42,0); }
        }
        .avatar{
          width:82px; height:82px; border-radius:50%; background:var(--white);
          display:flex; align-items:center; justify-content:center;
          font-family:'Fraunces', serif; font-weight:700; font-size:24px; color:var(--argile-dark);
          overflow:hidden; position:relative;
        }
        .avatar.neutral{ color:var(--sable); background:var(--sidebar); }
        .avatar img{ width:100%; height:100%; object-fit:cover; border-radius:50%; }
        .avatar.editable{ cursor:pointer; }
        .avatar-edit-overlay{
          position:absolute; inset:0; border-radius:50%; background:rgba(36,27,21,.55);
          color:#fff; display:flex; align-items:center; justify-content:center;
        }

        .profile-name{
          font-family:'Fraunces', serif; font-weight:700; font-size:20px; text-align:center; margin:14px 0 6px;
          position:relative; z-index:1;
          background:linear-gradient(90deg, var(--argile-dark), var(--or), var(--feuille));
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .badge-row{ display:flex; justify-content:center; gap:7px; margin-bottom:12px; }
        .badge{ display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:5px 12px; border-radius:999px; }
        .badge-argile{ background:linear-gradient(90deg, var(--argile-tint), var(--or-bg)); color:var(--argile-dark); }
        .badge-neutral{ background:var(--sable-deep); color:var(--encre-soft); border:1px solid var(--line); }

        .meta-row{ display:flex; justify-content:center; gap:16px; font-size:13px; color:var(--encre-soft); margin-bottom:16px; }
        .meta-row span{ display:inline-flex; align-items:center; gap:5px; }

        .stars{ display:flex; justify-content:center; gap:3px; margin-bottom:4px; }
        .star-ic{ color:var(--line); }
        .star-ic.filled{ color:var(--or); }

        .divider{ height:1px; background:var(--line); margin:16px 0; }

        .stat-mini-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .stat-mini{
          display:flex; align-items:center; gap:11px;
          background:var(--white); border:1.5px solid var(--line); border-radius:14px;
          padding:12px 12px; transition:.2s;
        }
        .stat-mini:hover{ transform:translateY(-2px); box-shadow:0 8px 18px rgba(61,43,31,.08); }
        .stat-mini-icon{ width:38px; height:38px; border-radius:11px; flex:none; display:flex; align-items:center; justify-content:center; }
        .stat-mini.exp .stat-mini-icon{ background:var(--argile-tint); color:var(--argile-dark); }
        .stat-mini.exp:hover{ border-color:var(--argile); }
        .stat-mini.tarif .stat-mini-icon{ background:var(--feuille-bg); color:var(--feuille); }
        .stat-mini.tarif:hover{ border-color:var(--feuille); }
        .stat-mini-val{ font-family:'Fraunces', serif; font-weight:700; font-size:16px; line-height:1.15; }
        .stat-mini-lbl{ font-size:11px; color:var(--muted); margin-top:1px; }

        .btn{
          border:none; border-radius:999px; font-weight:700; font-size:13.5px; cursor:pointer;
          padding:11px 18px; display:inline-flex; align-items:center; justify-content:center; gap:7px;
          transition:transform .15s ease, box-shadow .15s ease; font-family:inherit;
        }
        .btn:disabled{ opacity:.6; cursor:not-allowed; }
        .btn:hover:not(:disabled){ transform:translateY(-2px); }
        .btn-outline{
          background:linear-gradient(135deg, var(--argile-light), var(--argile), var(--argile-dark));
          color:#fff; border:none; width:100%;
          box-shadow:0 6px 16px rgba(216,138,18,.28);
        }
        .btn-outline:hover:not(:disabled){ box-shadow:0 10px 22px rgba(216,138,18,.38); }
        .btn-ghost{ background:var(--sable-deep); color:var(--encre-soft); }
        .btn-ghost:hover:not(:disabled){ background:var(--line); }
        .btn-solid{ background:var(--argile); color:#fff; }
        .btn-solid:hover:not(:disabled){ background:var(--argile-dark); }

        /* ============ Cartes secondaires ============ */
        .card{
          background:var(--white); border-radius:var(--radius-lg); padding:20px 22px;
          box-shadow:0 2px 10px rgba(61,43,31,.04);
          transition:transform .22s ease, box-shadow .22s ease;
        }
        .card:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(61,43,31,.09); }
        .card-title{
          display:flex; align-items:center; gap:9px; font-size:12px; font-weight:700;
          text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:0 0 18px;
          position:relative; padding-bottom:10px;
        }
        .card-title .ic{ color:var(--argile-dark); }
        .card-title::after{
          content:""; position:absolute; left:0; bottom:0; width:32px; height:3px; border-radius:3px;
          background:linear-gradient(90deg, var(--argile), var(--or), var(--feuille));
        }

        .two-col{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media (max-width:600px){ .two-col{ grid-template-columns:1fr; } }

        .status-row{ display:flex; align-items:center; gap:13px; }
        .status-icon{ width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex:none; }
        .status-icon.on{ background:var(--feuille-bg); color:var(--feuille); }
        .status-icon.off{ background:#F6E1DC; color:var(--rouge); }
        .status-lbl{ font-size:12px; color:var(--muted); margin:0 0 2px; }
        .status-val{ font-size:16px; font-weight:700; margin:0; }
        .status-val.on{ color:var(--feuille); }
        .status-val.off{ color:var(--rouge); }

        .simple-row{ display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--line); }
        .simple-row:last-child{ border-bottom:none; padding-bottom:0; }
        .simple-row:first-child{ padding-top:0; }
        .simple-row-label{ font-size:13px; color:var(--muted); }
        .simple-row-value{ font-size:14px; font-weight:700; }

        .whatsapp-card{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .whatsapp-text{ flex:1; min-width:220px; }
        .whatsapp-text p{ margin:0; font-size:13px; color:var(--encre-soft); }
        .wa-btn{
          display:inline-flex; align-items:center; gap:8px; text-decoration:none;
          background:var(--whatsapp); color:#fff; font-weight:700; font-size:13.5px;
          padding:12px 20px; border-radius:999px;
          transition:transform .15s ease, box-shadow .15s ease;
          box-shadow:0 6px 16px rgba(37,211,102,.3); flex:none;
        }
        .wa-btn:hover{ background:var(--whatsapp-dark); transform:translateY(-2px); box-shadow:0 10px 22px rgba(37,211,102,.4); }

        .info-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        @media (max-width:600px){ .info-grid{ grid-template-columns:1fr; } }
        .info-tile{ background:var(--sable-deep); border-radius:12px; padding:14px; transition:.2s; }
        .info-tile:hover{ background:var(--argile-tint); }
        .info-tile-lbl{ display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; text-transform:uppercase; color:var(--muted); letter-spacing:.4px; }
        .info-tile-val{ font-size:14px; font-weight:700; margin-top:5px; word-break:break-word; }

        /* ============ Formulaire d'édition (sans agence) ============ */
        .edit-error{ background:#FEE2E2; color:#DC2626; font-size:13px; padding:8px 12px; border-radius:10px; margin-bottom:12px; }
        .edit-grid{ display:grid; grid-template-columns:1fr; gap:12px; }
        @media (min-width:520px){ .edit-grid{ grid-template-columns:1fr 1fr; } }
        .field{ display:flex; flex-direction:column; gap:5px; }
        .field label{ font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.3px; }
        .field .optional{ text-transform:none; font-weight:500; }
        .field input, .field select{
          font-family:'Public Sans', sans-serif; font-size:14px; padding:10px 12px; border-radius:10px;
          border:1px solid var(--line); background:var(--sable-deep); color:var(--encre); outline:none;
        }
        .field input:focus, .field select:focus{ border-color:var(--argile); background:var(--white); }
        .edit-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:16px; flex-wrap:wrap; }

        .commune-filter{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
        select{
          font-family:'Public Sans', sans-serif; font-size:13px; font-weight:600; color:var(--encre);
          border:1px solid var(--line); background:var(--sable-deep); border-radius:999px; padding:8px 14px;
        }

        .agency-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media (max-width:700px){ .agency-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .agency-grid{ grid-template-columns:1fr; } }
        .agency-card{ background:var(--sable-deep); border-radius:var(--radius-md); padding:16px; text-align:center; }
        .agency-icon{ width:44px; height:44px; border-radius:12px; background:var(--white); margin:0 auto 10px; display:flex; align-items:center; justify-content:center; color:var(--argile); }
        .agency-name{ font-size:14px; font-weight:700; line-height:1.25; }
        .agency-meta{ display:flex; align-items:center; justify-content:center; gap:10px; margin-top:6px; font-size:11.5px; color:var(--encre-soft); }
        .agency-meta span{ display:inline-flex; align-items:center; gap:3px; }
        .agency-cta{
          margin-top:12px; width:100%; border-radius:999px; padding:9px 10px; font-size:12px; font-weight:700; border:none;
          display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; font-family:inherit;
        }
        .agency-cta:disabled{ opacity:.6; cursor:not-allowed; }
        .agency-cta.send{ background:var(--argile); color:#fff; }
        .agency-cta.send:hover:not(:disabled){ filter:brightness(1.05); }
        .agency-cta.pending{ background:var(--or-bg); color:#8A5D18; flex-direction:column; gap:2px; cursor:default; }
        .agency-cta.accepted{ background:var(--feuille-bg); color:#2E4022; cursor:default; }
        .agency-cta.refused{ background:#FEE2E2; color:#991B1B; cursor:default; }
        .agency-cta-cancel{
          margin-top:4px; background:transparent; border:none; padding:0; font-family:inherit;
          font-size:11px; font-weight:700; color:var(--rouge); text-decoration:underline; cursor:pointer;
        }
        .agency-cta-cancel:disabled{ opacity:.6; cursor:not-allowed; }
        .agency-cta-note{ font-size:10px; color:var(--muted); margin-top:4px; }
        .agency-cta-error{ color:var(--rouge); font-size:11px; margin-top:4px; }

        .empty-agences{ text-align:center; padding:30px 20px; color:var(--muted); }
        .empty-agences svg{ color:var(--argile-tint); margin-bottom:8px; }
        .empty-agences p{ margin:0; font-size:13.5px; }

        .tip{ display:flex; gap:11px; font-size:13px; color:#3F5533; line-height:1.5; align-items:flex-start; }
        .tip .ic{ color:var(--feuille); margin-top:1px; }
        .tip strong{ color:#2E4022; }

        /* ============ Responsive mobile ============ */
        @media (max-width:640px){
          .topbar-inner{ padding:12px 16px; }
          .brand-name{ font-size:15px; }
          .topbar-right{ gap:8px; }
          .ghost-circle{ width:34px; height:34px; }
          .account-pill{ padding:5px 5px 5px 10px; }
          .account-dropdown{ width:200px; right:0; }

          .main-inner{ padding:20px 16px 50px; }
          .grid{ gap:14px; }
          .profile-card{ padding:22px 18px; }
          .card{ padding:18px 16px; }

          .two-col{ gap:12px; }
          .info-grid{ gap:10px; }
          .agency-grid{ gap:10px; }

          .whatsapp-card{ flex-direction:column; align-items:flex-start; }
          .wa-btn{ width:100%; justify-content:center; }
        }

        @media (max-width:380px){
          .stat-mini-grid{ gap:8px; }
          .stat-mini-val{ font-size:16px; }
          .badge{ font-size:10px; padding:4px 10px; }
          .agency-name{ font-size:13px; }
        }
      `}</style>
    </div>
  );
}