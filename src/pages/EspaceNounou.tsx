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
  Award,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";
import { useMesDemandesAffiliation, useEnvoyerDemandeAffiliation, useAnnulerDemandeAffiliation } from "../hooks/useAffiliation";

// ================================================================
// Version alignée EXACTEMENT sur la maquette AED.html :
// - palette identique (--argile est l'orange/doré #F7A82A de la
//   maquette, plus le rustique précédent) ;
// - plus de sidebar desktop : la nav est un "app-topbar" (logo +
//   bouton fermer) commun à toutes les tailles d'écran, exactement
//   comme dans la maquette (les anciennes classes .sidebar/.topbar
//   ne sont plus utilisées, comme dans AED.html où elles restent
//   déclarées mais mortes) ;
// - le bottomnav est fixe et visible à TOUTE taille d'écran (mobile
//   ET desktop), avec Profil / Demandes / Déconnexion, comme dans la
//   maquette (.bottomnav n'a aucune règle qui le masque en desktop) ;
// - .page-title est masqué sous 759px (comportement fidèle à la
//   maquette) ;
// - stats sur 3 colonnes (Expérience / Ménages aidés / FCFA/jour) ;
// - info-grid sur 4 colonnes dès 640px ;
// - décor (blob + points) en fond du .stack-v, comme dans la
//   maquette ;
// - icône WhatsApp fidèle au tracé SVG de la maquette.
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

// Icône WhatsApp fidèle au tracé de la maquette (AED.html)
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

  // ===================== AVEC AGENCE =====================
  const renderProfil = () => {
    const agenceTelephone = digitsOnly(profil?.agence?.telephone || "");
    const whatsappHref = agenceTelephone
      ? `https://wa.me/${agenceTelephone}?text=${encodeURIComponent(
          "Bonjour, je souhaite modifier mes informations sur Nounou Connect."
        )}`
      : undefined;

    return (
      <div className="stack-v">
        <div className="decor-wrap">
          <div className="decor-blob" />
          <div className="decor-dots">
            <svg width="40" height="90" viewBox="0 0 40 90" fill="none">
              <circle cx="16" cy="14" r="9" style={{ fill: "var(--argile)", opacity: 0.5 }} />
              <circle cx="30" cy="42" r="6" style={{ fill: "var(--or)", opacity: 0.65 }} />
              <circle cx="14" cy="70" r="5" style={{ fill: "var(--argile)", opacity: 0.35 }} />
            </svg>
          </div>
        </div>

        <div className="profile-card">
          <div className="avatar">
            {profil?.photo_url ? <img src={profil.photo_url} alt={profil?.nom} /> : initiales}
          </div>
          <div className="profile-id">
            <div className="profile-name-row">
              <p className="profile-name">{profil?.nom || "..."}</p>
              <span className="badge badge-argile">Nounou</span>
            </div>
            <div className="profile-meta">
              <span className="star">
                <Star size={14} fill="currentColor" /> {profil?.note_moyenne ?? 0} / 5
              </span>
              <span>
                <MapPin size={13} /> {profil?.quartier || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className={`stat-value ${profil?.experience ? "" : "dim"}`}>
              {profil?.experience || "Non renseignée"}
            </div>
            <div className="stat-label">Expérience</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(profil?.tarif ?? 0).toLocaleString()}</div>
            <div className="stat-label">FCFA / mois</div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <p className="card-title">
              <Clock size={15} /> Mon statut
            </p>
            <div className="status-row">
              <div className="status-info">
                <div className="status-icon">
                  {profil?.disponible ? <CheckCircle size={18} /> : <Clock size={18} />}
                </div>
                <div>
                  <p className="status-label">Actuellement</p>
                  <p className={`status-value ${profil?.disponible ? "on" : "off"}`}>
                    {profil?.disponible ? "Disponible" : "Indisponible"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="card-title">
              <Building2 size={15} /> Mon agence
            </p>
            <div className="simple-row">
              <span className="simple-row-label">Agence</span>
              <span className="simple-row-value">{profil?.agence?.nom || "—"}</span>
            </div>
            <div className="simple-row">
              <span className="simple-row-label">Langues</span>
              <span className={`simple-row-value ${(profil?.langues ?? []).length === 0 ? "empty" : ""}`}>
                {(profil?.langues ?? []).length > 0 ? profil.langues.join(", ") : "Non renseigné"}
              </span>
            </div>
          </div>
        </div>

        <div className="whatsapp-card">
          <div className="whatsapp-text">
            <p className="card-title" style={{ marginBottom: 6 }}>
              <Edit2 size={15} /> Modifier mes informations
            </p>
            <p>Pour modifier vos informations, veuillez contacter votre agence.</p>
          </div>
          <a
            className="whatsapp-btn"
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
    );
  };

  // ===================== SANS AGENCE =====================
  const renderSansAgence = () => {
    const agences = agencesQuartier ?? [];
    return (
      <div className="stack-v">
        <div className="decor-wrap">
          <div className="decor-blob" />
          <div className="decor-dots">
            <svg width="40" height="90" viewBox="0 0 40 90" fill="none">
              <circle cx="16" cy="14" r="9" style={{ fill: "var(--argile)", opacity: 0.5 }} />
              <circle cx="30" cy="42" r="6" style={{ fill: "var(--or)", opacity: 0.65 }} />
              <circle cx="14" cy="70" r="5" style={{ fill: "var(--argile)", opacity: 0.35 }} />
            </svg>
          </div>
        </div>

        <div className="profile-card">
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
                <Camera size={16} />
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
          <div className="profile-id">
            <div className="profile-name-row">
              <p className="profile-name">{profil?.nom || "..."}</p>
              <span className="badge badge-neutral">Sans agence</span>
            </div>
            <div className="profile-meta">
              <span>
                <MapPin size={13} /> {profil?.quartier || "—"}
              </span>
            </div>
          </div>
          {!isEditingProfil && (
            <div className="profile-card-action">
              <button className="btn btn-outline" onClick={startEditingProfil}>
                <Edit2 size={13} /> Modifier
              </button>
            </div>
          )}
        </div>

        {isEditingProfil ? (
          <form onSubmit={handleSaveProfil} className="card">
            <p className="card-title">
              <Edit2 size={15} /> Modifier mes informations
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
              <button type="button" className="btn btn-outline" onClick={cancelEditingProfil}>
                <X size={14} /> Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateProfilSelf.isPending}>
                <Save size={14} /> {updateProfilSelf.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="card">
            <p className="card-title">
              <FileText size={15} /> Informations
            </p>
            <div className="info-grid">
              <div className="info-tile">
                <div className="info-tile-icon"><Phone size={15} /></div>
                <div className="info-tile-label">Téléphone</div>
                <div className="info-tile-value">{profil?.telephone || "—"}</div>
              </div>
              <div className="info-tile">
                <div className="info-tile-icon"><MapPin size={15} /></div>
                <div className="info-tile-label">Quartier</div>
                <div className="info-tile-value">{profil?.quartier || "—"}</div>
              </div>
              <div className="info-tile">
                <div className="info-tile-icon"><Award size={15} /></div>
                <div className="info-tile-label">Ethnie</div>
                <div className={`info-tile-value ${profil?.ethnie ? "" : "empty"}`}>
                  {profil?.ethnie || "Non renseignée"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="commune-filter">
            <p className="card-title" style={{ margin: 0 }}>
              <Building2 size={15} /> Agences disponibles · {agences.length}
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
            <div className="agency-scroll">
              {agences.map((agence) => {
                const demande = mesDemandesAffiliation?.find((d) => d.agence_id === agence.id);
                return (
                  <div key={agence.id} className="agency-card">
                    <div className="agency-icon">
                      <Building2 size={20} />
                    </div>
                    <div className="agency-name">{agence.nom}</div>
                    <div className="agency-meta">
                      <span><MapPin size={11} /> {agence.quartier}</span>
                      <span><Users size={11} /> {agence.nbNounous}</span>
                    </div>

                    {demande?.statut === "en_attente" && (
                      <div className="agency-cta pending">
                        <span>Demande envoyée</span>
                        <span>En attente de réponse</span>
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
                          <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                            Délai d'annulation dépassé
                          </span>
                        )}
                        {annulerDemande.error && (
                          <div style={{ color: 'var(--rouge)', fontSize: '11px', marginTop: '4px' }}>
                            {getErrorMessage(annulerDemande.error)}
                          </div>
                        )}
                      </div>
                    )}
                    {demande?.statut === "acceptee" && (
                      <div className="agency-cta accepted">
                        <CheckCircle size={13} />
                        <span>Demande acceptée</span>
                      </div>
                    )}
                    {demande?.statut === "refusee" && (
                      <div className="agency-cta refused">
                        <span>Demande refusée</span>
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

        <div className="tip">
          <CheckCircle size={17} />
          <span><strong>Vous n'avez pas encore d'agence ?</strong> Contactez l'une des agences ci-dessus pour rejoindre leur vivier.</span>
        </div>
      </div>
    );
  };

  return (
    <div className="espace-nounou">
      <div className="shell">
        <main className="main">
          <div className="main-inner">
            {/* ---- App topbar : logo + bouton fermer (identique à la maquette, toutes tailles d'écran) ---- */}
            <div className="app-topbar">
              <div className="brand">
                <Logo size={36} />
                <span className="brand-name">Nounou Connect</span>
              </div>
              <button className="app-topnav-close" onClick={goToLanding} title="Fermer">
                <X size={16} />
              </button>
            </div>

            <div className="page-title">
              <h1>Mon profil</h1>
              <p>
                {hasAgence
                  ? "Toutes vos informations en un coup d'œil"
                  : "Complétez votre profil et rejoignez une agence"}
              </p>
            </div>

            {profilLoading ? (
              <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
                Chargement de votre profil...
              </div>
            ) : profilError ? (
              <div className="card" style={{ color: "#DC2626" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Impossible de charger votre profil</p>
                <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>{getErrorMessage(profilError)}</p>
              </div>
            ) : (
              hasAgence ? renderProfil() : renderSansAgence()
            )}
          </div>
        </main>
      </div>

      {/* ---- Bottom nav : Profil / Déconnexion — fixe, visible mobile ET desktop, comme la maquette ---- */}
      <div className="bottomnav">
        <button className="nav-item active">
          <User size={19} />
          Profil
        </button>
        <button className="nav-item nav-item-logout" onClick={onLogout}>
          <LogOut size={19} />
          Déconnexion
        </button>
      </div>

      <style>{`
        :root{
          --sable:#FBF3EA;
          --sable-deep:#F3E6D8;
          --argile:#F7A82A;
          --argile-dark:#D98A12;
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
          --sidebar-line:#3A2E24;
          --sidebar-muted:#B8A995;
          --radius-lg:20px;
          --radius-md:14px;
        }

        .espace-nounou *{ box-sizing: border-box; }

        .espace-nounou{
          min-height: 100vh;
          background: var(--sable);
          font-family: 'Public Sans', sans-serif;
          color: var(--encre);
          -webkit-font-smoothing: antialiased;
        }

        /* ---------- App shell ---------- */
        .shell{ display:flex; min-height:100vh; }
        .main{ flex:1; min-width:0; padding:32px 40px 60px; }
        .main-inner{ max-width:1080px; margin:0 auto; }

        /* ---------- App topbar (remplace la sidebar) ---------- */
        .app-topbar{
          display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:22px;
        }
        .app-topbar .brand{ display:flex; align-items:center; gap:10px; padding:0; }
        .brand-name{ font-family:'Fraunces', serif; font-weight:600; font-size:16.5px; color:var(--encre); }
        .app-topnav-close{
          flex:none; width:38px;height:38px; border-radius:50%; border:none;
          background:var(--white); color:var(--encre-soft); display:flex; align-items:center; justify-content:center;
          cursor:pointer; box-shadow:0 1px 3px rgba(61,43,31,.12); transition: all .2s;
        }
        .app-topnav-close:hover{ background:var(--sable-deep); color:var(--argile); }

        .page-title{ margin:0 0 22px; }
        .page-title h1{ font-family:'Fraunces', serif; font-weight:600; font-size:26px; margin:0; }
        .page-title p{ margin:4px 0 0; color:var(--encre-soft); font-size:14px; }

        .stack-v > * + *{ margin-top:16px; }
        .decor-wrap{ position:relative; height:0; }
        .decor-blob{
          position:absolute; top:-22px; right:30px; width:150px; height:150px;
          background:radial-gradient(circle, var(--argile-tint) 0%, rgba(253,236,200,0) 72%);
          border-radius:50%; pointer-events:none; z-index:0;
        }
        .decor-dots{ position:absolute; top:56px; left:-26px; pointer-events:none; z-index:0; }
        .profile-card{ position:relative; z-index:1; }

        /* ---------- Profile header card ---------- */
        .profile-card{
          background:var(--white); border-radius:var(--radius-lg); padding:20px 22px;
          display:flex; align-items:center; gap:18px; flex-wrap:wrap;
        }
        .avatar{
          width:60px;height:60px;border-radius:50%;
          background:var(--argile); color:var(--white);
          display:flex;align-items:center;justify-content:center;
          font-family:'Fraunces', serif; font-weight:600; font-size:20px; flex:none;
          overflow:hidden; position:relative;
        }
        .avatar img{ width:100%; height:100%; object-fit:cover; }
        .avatar.neutral{ background:var(--sidebar); }
        .avatar.editable{ cursor:pointer; }
        .avatar-edit-overlay{
          position:absolute; inset:0; border-radius:50%; background:rgba(36,27,21,.55);
          color:#fff; display:flex; align-items:center; justify-content:center;
        }
        .profile-id{ flex:1; min-width:180px; }
        .profile-name-row{ display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
        .profile-name{ font-family:'Fraunces', serif; font-weight:600; font-size:19px; margin:0; color:var(--encre); }
        .badge{ display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; }
        .badge-argile{ background:var(--argile-tint); color:var(--argile-dark); }
        .badge-neutral{ background:var(--sable-deep); color:var(--encre-soft); border:1px solid var(--line); }
        .badge-assignee{ background:var(--feuille-bg); color:#2E4022; }
        .badge-attente{ background:var(--argile-tint); color:var(--argile-dark); }
        .profile-meta{ display:flex; align-items:center; gap:14px; margin-top:6px; font-size:13.5px; color:var(--encre-soft); flex-wrap:wrap; }
        .profile-meta span{ display:inline-flex; align-items:center; gap:5px; }
        .star{ color:var(--or); }
        .profile-card-action{ flex:none; }

        .btn{ border:none; border-radius:999px; padding:11px 18px; font-family:'Public Sans', sans-serif; font-weight:700; font-size:13.5px; cursor:pointer; white-space:nowrap; }
        .btn:disabled{ opacity:.6; cursor:not-allowed; }
        .btn-primary{ background:var(--argile); color:var(--white); }
        .btn-primary:hover:not(:disabled){ background:var(--argile-dark); }
        .btn-outline{ background:var(--white); color:var(--argile); border:1.5px solid var(--argile); display:inline-flex; align-items:center; gap:6px; }
        .btn-outline:hover:not(:disabled){ background:var(--argile-tint); }

        /* ---------- stats row ---------- */
        .stats{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .stat-card{ background:var(--white); border-radius:var(--radius-lg); padding:18px 10px; text-align:center; }
        .stat-value{ font-family:'Fraunces', serif; font-weight:600; font-size:22px; color:var(--encre); line-height:1.1; }
        .stat-value.dim{ color:var(--muted); font-size:14px; font-weight:600; }
        .stat-label{ font-size:11.5px; color:var(--encre-soft); margin-top:5px; }

        /* ---------- generic card ---------- */
        .card{ background:var(--white); border-radius:var(--radius-lg); padding:18px 20px; }
        .card-title{
          display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700;
          text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:0 0 12px;
        }

        .two-col{ display:grid; grid-template-columns:1fr; gap:16px; }
        @media (min-width:700px){ .two-col{ grid-template-columns:1fr 1fr; align-items:start; } }

        .status-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .status-info{ display:flex; align-items:center; gap:12px; }
        .status-icon{ width:38px;height:38px;border-radius:10px; background:var(--sable-deep); color:var(--argile); display:flex;align-items:center;justify-content:center; flex:none; }
        .status-label{ font-size:12px; color:var(--muted); margin:0 0 2px; }
        .status-value{ font-size:15px; font-weight:700; margin:0; display:flex; align-items:center; gap:6px; }
        .status-value.off{ color:var(--rouge); }
        .status-value.on{ color:var(--feuille); }

        .simple-row{ display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--line); }
        .simple-row:first-child{ padding-top:0; }
        .simple-row:last-child{ border-bottom:none; padding-bottom:0; }
        .simple-row-label{ font-size:13.5px; color:var(--muted); }
        .simple-row-value{ font-size:14.5px; font-weight:700; }
        .simple-row-value.empty{ color:var(--muted); font-weight:500; }

        /* ---------- WhatsApp contact card ---------- */
        .whatsapp-card{
          background:var(--white); border-radius:var(--radius-lg); padding:18px 20px;
          display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
        }
        .whatsapp-text{ flex:1; min-width:220px; }
        .whatsapp-text .card-title{ margin-bottom:4px; }
        .whatsapp-text p{ margin:0; font-size:13.5px; color:var(--encre-soft); line-height:1.5; }
        .whatsapp-text strong{ color:var(--encre); }
        .whatsapp-btn{
          flex:none; display:inline-flex; align-items:center; gap:8px;
          background:var(--whatsapp); color:var(--white); text-decoration:none;
          border-radius:999px; padding:12px 20px; font-weight:700; font-size:13.5px;
        }
        .whatsapp-btn:hover{ background:var(--whatsapp-dark); }

        /* ---------- info tiles (sans-agence) ---------- */
        .info-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        @media (min-width:640px){ .info-grid{ grid-template-columns:repeat(3,1fr); } }
        .info-tile{ background:var(--sable-deep); border-radius:var(--radius-md); padding:13px 14px; }
        .info-tile-icon{ width:30px;height:30px;border-radius:8px; background:var(--white); color:var(--argile); display:flex;align-items:center;justify-content:center; margin-bottom:8px; }
        .info-tile-label{ font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--muted); }
        .info-tile-value{ font-size:14px; font-weight:700; color:var(--encre); margin-top:2px; word-break:break-word; }
        .info-tile-value.empty{ color:var(--muted); font-weight:500; }

        /* ---------- edit form (sans-agence) ---------- */
        .edit-error{ background:#FEE2E2; color:#DC2626; font-size:13px; padding:8px 12px; border-radius:10px; margin-bottom:12px; }
        .edit-grid{ display:grid; grid-template-columns:1fr; gap:12px; }
        @media (min-width:640px){ .edit-grid{ grid-template-columns:1fr 1fr; } }
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

        /* Agencies: always horizontal scroll, mobile AND desktop */
        .agency-scroll{
          display:flex; gap:14px; overflow-x:auto; padding:2px 2px 10px;
          scroll-snap-type:x proximity;
        }
        .agency-scroll::-webkit-scrollbar{ height:7px; }
        .agency-scroll::-webkit-scrollbar-thumb{ background:var(--argile-tint); border-radius:99px; }
        .agency-card{
          flex:none; width:220px; scroll-snap-align:start;
          background:var(--sable-deep); border-radius:var(--radius-md); padding:16px; text-align:center;
        }
        .agency-icon{ width:44px;height:44px;border-radius:12px; background:var(--white); margin:0 auto 10px; display:flex;align-items:center;justify-content:center; color:var(--argile); }
        .agency-name{ font-size:14px; font-weight:700; line-height:1.25; }
        .agency-meta{ display:flex; align-items:center; justify-content:center; gap:10px; margin-top:6px; font-size:11.5px; color:var(--encre-soft); }
        .agency-meta span{ display:inline-flex; align-items:center; gap:3px; }
        .agency-cta{ margin-top:12px; width:100%; border-radius:999px; padding:9px 10px; font-size:12px; font-weight:700; border:none; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; font-family:inherit; }
        .agency-cta:disabled{ opacity:.6; cursor:not-allowed; }
        .agency-cta.send{ background:var(--argile); color:var(--white); }
        .agency-cta.send:hover:not(:disabled){ background:var(--argile-dark); }
        .agency-cta.pending{ background:var(--or-bg); color:#8A5D18; flex-direction:column; gap:2px; font-size:11px; line-height:1.3; cursor:default; }
        .agency-cta-cancel{
          margin-top:6px; background:transparent; border:none; padding:0; font-family:inherit;
          font-size:11px; font-weight:700; color:var(--rouge); text-decoration:underline; cursor:pointer;
        }
        .agency-cta-cancel:disabled{ opacity:.6; cursor:not-allowed; }
        .agency-cta.accepted{ background:var(--feuille-bg); color:#2E4022; cursor:default; }
        .agency-cta.refused{ background:#FEE2E2; color:#991B1B; cursor:default; }

        .empty-agences{ text-align:center; padding:30px 20px; color:var(--muted); }
        .empty-agences svg{ color:var(--argile-tint); margin-bottom:8px; }
        .empty-agences p{ margin:0; font-size:13.5px; }

        .tip{ display:flex; gap:10px; background:var(--feuille-bg); border-radius:var(--radius-md); padding:14px 16px; font-size:13px; color:#3F5533; line-height:1.5; }
        .tip strong{ color:#2E4022; }
        .tip svg{ flex:none; margin-top:1px; color:var(--feuille); }

        /* ---------- Bottom nav : fixe, visible à toute taille d'écran (comme la maquette) ---------- */
        .bottomnav{ display:flex; position:fixed; left:0; right:0; bottom:0; background:var(--white); border-top:1px solid var(--line); z-index:20; }
        .nav-item{ flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:11px 0 13px; color:var(--muted); font-size:11px; font-weight:700; background:transparent; border:none; cursor:pointer; font-family:inherit; }
        .nav-item.active{ color:var(--argile); }
        .nav-item-logout{ color:var(--rouge); }

        /* main padding accounts for the fixed bottomnav on every screen size */
        .main{ padding-bottom:90px; }

        @media (max-width:759px){
          .main{ padding:16px 14px 90px; }
          .page-title{ display:none; }
          .app-topbar .brand-name{ display:none; }
          .decor-dots{ left:-8px; top:44px; }
          .decor-dots svg{ transform:scale(.8); }
          .decor-blob{ right:6px; width:110px; height:110px; }
          .profile-card{ padding:18px; }
          .profile-card-action{ width:100%; }
          .profile-card-action .btn{ width:100%; }
        }
      `}</style>
    </div>
  );
}