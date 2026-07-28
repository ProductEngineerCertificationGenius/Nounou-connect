// src/pages/EspaceNounou.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Star,
  MapPin,
  CheckCircle,
  FileText,
  Building2,
  MessageCircle,
  Camera,
  Edit2,
  Save,
  X,
  Users,
  Phone,
  Briefcase,
  Award,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";
import { useMesDemandesAffiliation, useEnvoyerDemandeAffiliation } from "../hooks/useAffiliation";

// ================================================================
// Réécriture visuelle (structure + CSS reprises de la maquette
// validée) — la logique de données existante est conservée à
// l'identique, seuls quatre points fonctionnels changent :
//
// 1. Le bouton "Marquer indisponible" est retiré : une nounou ne peut
//    plus que SE marquer disponible. Elle n'a plus de bouton une fois
//    disponible (repasser indisponible reste possible côté agence).
// 2. Le "Tarif" n'apparaît plus nulle part côté nounou sans agence
//    (ni dans les cartes d'information, ni dans le formulaire
//    d'édition) : cette donnée est réservée à une nounou affiliée.
// 3. Ajout d'un bouton WhatsApp pour la nounou AVEC agence : "Pour
//    modifier vos informations, contactez votre agence" est
//    maintenant actionnable — il ouvre une conversation WhatsApp
//    pré-remplie avec le numéro de l'agence (`agences.telephone`,
//    donc il faut l'ajouter au select ci-dessous).
// 4. L'onglet "Demandes" est retiré : l'espace nounou n'a plus qu'un
//    seul écran (Profil), plus de navigation par onglets ni de
//    requête `demandes` associée.
//
// Mise en page : structure en "shell" avec une sidebar sur desktop
// (>=760px) et un header + bottom-nav sur mobile, comme dans la
// maquette. Les classes CSS sont préfixées `nc-` pour éviter toute
// collision avec d'autres écrans de l'app.
// ================================================================

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

// Construit un lien wa.me à partir d'un numéro ivoirien tel que stocké
// en base (ex: "0152242299" ou "+225 01 52 24 22 99"). Les numéros CI
// post-2021 comportent déjà leur préfixe (0,1,2...) dans les 10
// chiffres : on ne retire donc rien, on ajoute juste l'indicatif 225
// s'il n'est pas déjà présent.
function buildWhatsappLink(telephone?: string | null, message?: string) {
  if (!telephone) return null;
  const digits = telephone.replace(/\D/g, "");
  if (!digits) return null;
  const withCountryCode = digits.startsWith("225") ? digits : `225${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${withCountryCode}${text}`;
}

export default function EspaceNounou() {
  const onLogout = useLogout();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: profil } = useQuery({
    queryKey: ["nounou", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      // NB : `telephone` ajouté à la sous-sélection agence pour
      // pouvoir construire le lien WhatsApp de contact agence.
      const { data, error } = await supabase
        .from("nounous")
        .select("*, agence:agences(nom, telephone)")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: nbMenagesAidees } = useQuery({
    queryKey: ["demandes", "nounou", profil?.id, "count"],
    enabled: Boolean(profil?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("demandes")
        .select("id", { count: "exact", head: true })
        .eq("nounou_assignee_id", profil!.id)
        .eq("statut", "Assignée");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const hasAgence = Boolean(profil?.agence_id);

  // ===== DEMANDES D'AFFILIATION ENVOYÉES (nounou sans agence) =====
  const { data: mesDemandesAffiliation } = useMesDemandesAffiliation(profil?.id);
  const envoyerDemande = useEnvoyerDemandeAffiliation();

  const demandeVientDetreAcceptee = mesDemandesAffiliation?.some((d) => d.statut === "acceptee");
  useEffect(() => {
    if (demandeVientDetreAcceptee && !hasAgence) {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] });
    }
  }, [demandeVientDetreAcceptee, hasAgence, queryClient, currentUser?.user_id]);

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
  // Le tarif n'est plus éditable ici : cette donnée n'a de sens que
  // pour une nounou affiliée, et elle est gérée par l'agence.
  const [isEditingProfil, setIsEditingProfil] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editFormData, setEditFormData] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    ethnie: "",
    experience: "",
  });
  const [editError, setEditError] = useState("");

  const startEditingProfil = () => {
    if (profil) {
      setEditFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        ethnie: profil.ethnie || "",
        experience: profil.experience || "",
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
          experience: editFormData.experience || "Non renseigné",
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
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] });
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

  const languesAffichees =
    profil?.langues && profil.langues.length > 0 ? profil.langues.join(", ") : "Non renseigné";

  const whatsappAgenceLink = buildWhatsappLink(
    profil?.agence?.telephone,
    "Bonjour, je souhaite modifier mes informations sur Nounou Connect."
  );

  // ---------------------------------------------------------------
  // NOUNOU AVEC AGENCE
  // ---------------------------------------------------------------
  const renderProfil = () => (
    <>
      <div className="nc-profile-card">
        <div className="nc-avatar-wrapper">
          {profil?.photo_url ? (
            <img src={profil.photo_url} alt={profil?.nom} className="nc-avatar-img" />
          ) : (
            <div className="nc-avatar-placeholder">{initiales}</div>
          )}
        </div>
        <div className="nc-profile-id">
          <div className="nc-profile-name-row">
            <h1>{profil?.nom || "..."}</h1>
            <span className="nc-badge nc-badge-argile">Nounou</span>
          </div>
          <div className="nc-profile-meta">
            <span><Star size={14} fill="#D89B3C" color="#D89B3C" /> {profil?.note_moyenne ?? "—"}/5</span>
            <span><MapPin size={13} /> {profil?.quartier}</span>
          </div>
        </div>
      </div>

      <div className="nc-stats">
        <div className="nc-stat-card">
          <span className="nc-stat-value">{profil?.experience || "Non renseigné"}</span>
          <span className="nc-stat-label">Expérience</span>
        </div>
        <div className="nc-stat-card">
          <span className="nc-stat-value">{nbMenagesAidees ?? 0}</span>
          <span className="nc-stat-label">Ménages aidés</span>
        </div>
        <div className="nc-stat-card">
          <span className="nc-stat-value">{(profil?.tarif ?? 0).toLocaleString()}</span>
          <span className="nc-stat-label">FCFA / jour</span>
        </div>
      </div>

      <div className="nc-card">
        <p className="nc-card-title">
          <Building2 size={15} /> Mon agence
        </p>
        <div className="nc-simple-row">
          <span className="nc-simple-row-label">Agence</span>
          <span className="nc-simple-row-value">{profil?.agence?.nom || "—"}</span>
        </div>
        <div className="nc-simple-row">
          <span className="nc-simple-row-label">Langues</span>
          <span className={`nc-simple-row-value ${languesAffichees === "Non renseigné" ? "empty" : ""}`}>
            {languesAffichees}
          </span>
        </div>
      </div>

      <div className="nc-whatsapp-card">
        <div className="nc-whatsapp-text">
          <p className="nc-card-title" style={{ marginBottom: 6 }}>
            <Edit2 size={15} /> Modifier mes informations
          </p>
          <p>
            Pour modifier vos informations, veuillez contacter votre agence
            {profil?.agence?.nom ? <> (<strong>{profil.agence.nom}</strong>)</> : null}.
          </p>
        </div>
        {whatsappAgenceLink ? (
          <a className="nc-whatsapp-btn" href={whatsappAgenceLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={17} /> Contacter sur WhatsApp
          </a>
        ) : (
          <span className="nc-whatsapp-btn nc-whatsapp-btn-disabled">
            <MessageCircle size={17} /> Numéro agence indisponible
          </span>
        )}
      </div>
    </>
  );

  // ---------------------------------------------------------------
  // NOUNOU SANS AGENCE
  // ---------------------------------------------------------------
  const renderSansAgence = () => {
    const agences = agencesQuartier ?? [];
    return (
      <>
        <div className="nc-profile-card">
          <div
            className="nc-avatar-wrapper"
            onClick={() => isEditingProfil && fileInputRef.current?.click()}
            style={{ cursor: isEditingProfil ? "pointer" : "default" }}
          >
            {previewUrl || profil?.photo_url ? (
              <img src={previewUrl || profil?.photo_url} alt={profil?.nom} className="nc-avatar-img" />
            ) : (
              <div className="nc-avatar-placeholder nc-avatar-neutral">{initiales}</div>
            )}
            {isEditingProfil && (
              <div className="nc-avatar-edit-overlay">
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
          <div className="nc-profile-id">
            <div className="nc-profile-name-row">
              <h1>{profil?.nom || "..."}</h1>
              <span className="nc-badge nc-badge-neutral">Sans agence</span>
            </div>
            <div className="nc-profile-meta">
              <span><MapPin size={13} /> {profil?.quartier}</span>
            </div>
          </div>
          {!isEditingProfil && (
            <div className="nc-profile-card-action">
              <button className="nc-btn nc-btn-outline" onClick={startEditingProfil}>
                <Edit2 size={14} /> Modifier
              </button>
            </div>
          )}
        </div>

        {isEditingProfil ? (
          <form onSubmit={handleSaveProfil} className="nc-card nc-edit-form">
            {editError && <p className="nc-edit-error">{editError}</p>}
            <div className="nc-edit-form-grid">
              <div className="nc-edit-form-group">
                <label>Prénom et nom</label>
                <input
                  type="text"
                  value={editFormData.nom}
                  onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="nc-edit-form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={editFormData.telephone}
                  onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                  required
                />
              </div>
              <div className="nc-edit-form-group">
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
              <div className="nc-edit-form-group">
                <label>Ethnie <span className="nc-optional">(optionnel)</span></label>
                <input
                  type="text"
                  value={editFormData.ethnie}
                  onChange={(e) => setEditFormData({ ...editFormData, ethnie: e.target.value })}
                  placeholder="Akan, Baoulé, Malinké, etc."
                />
              </div>
              <div className="nc-edit-form-group">
                <label>Expérience</label>
                <input
                  type="text"
                  value={editFormData.experience}
                  onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                  placeholder="3 ans"
                />
              </div>
            </div>
            <div className="nc-edit-form-actions">
              <button type="button" className="nc-btn nc-btn-outline" onClick={cancelEditingProfil}>
                <X size={14} /> Annuler
              </button>
              <button type="submit" className="nc-btn nc-btn-primary" disabled={updateProfilSelf.isPending}>
                <Save size={14} /> {updateProfilSelf.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="nc-card">
            <p className="nc-card-title">
              <FileText size={15} /> Informations
            </p>
            <div className="nc-info-grid">
              <div className="nc-info-tile">
                <div className="nc-info-tile-icon"><Phone size={15} /></div>
                <div className="nc-info-tile-label">Téléphone</div>
                <div className="nc-info-tile-value">{profil?.telephone || "—"}</div>
              </div>
              <div className="nc-info-tile">
                <div className="nc-info-tile-icon"><MapPin size={15} /></div>
                <div className="nc-info-tile-label">Quartier</div>
                <div className="nc-info-tile-value">{profil?.quartier || "—"}</div>
              </div>
              <div className="nc-info-tile">
                <div className="nc-info-tile-icon"><Award size={15} /></div>
                <div className="nc-info-tile-label">Ethnie</div>
                <div className={`nc-info-tile-value ${!profil?.ethnie ? "empty" : ""}`}>
                  {profil?.ethnie || "Non renseignée"}
                </div>
              </div>
              <div className="nc-info-tile">
                <div className="nc-info-tile-icon"><Briefcase size={15} /></div>
                <div className="nc-info-tile-label">Expérience</div>
                <div className={`nc-info-tile-value ${!profil?.experience ? "empty" : ""}`}>
                  {profil?.experience || "Non renseignée"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="nc-card">
          <div className="nc-commune-filter">
            <p className="nc-card-title" style={{ margin: 0 }}>
              <Building2 size={15} /> Agences disponibles · {agences.length}
            </p>
            <select
              value={filterQuartier || "toutes"}
              onChange={(e) => setFilterQuartier(e.target.value === "toutes" ? "" : e.target.value)}
            >
              <option value="toutes">🌍 Toutes les communes</option>
              {QUARTIERS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {agences.length > 0 ? (
            <div className="nc-agency-scroll">
              {agences.map((agence) => {
                const demande = mesDemandesAffiliation?.find((d) => d.agence_id === agence.id);
                return (
                  <div key={agence.id} className="nc-agency-card">
                    <div className="nc-agency-icon">
                      {agence.photo_url ? (
                        <img src={agence.photo_url} alt={agence.nom} />
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <div className="nc-agency-name">{agence.nom}</div>
                    <div className="nc-agency-meta">
                      <span><MapPin size={11} /> {agence.quartier}</span>
                      <span><Users size={11} /> {agence.nbNounous}</span>
                      <span><Star size={11} fill="#D89B3C" color="#D89B3C" /> {agence.note || "—"}</span>
                    </div>

                    {demande?.statut === "en_attente" && (
                      <div className="nc-agency-cta pending">
                        <span>Demande envoyée</span>
                        <span>En attente de réponse</span>
                      </div>
                    )}
                    {demande?.statut === "acceptee" && (
                      <div className="nc-agency-cta accepted">
                        <CheckCircle size={13} /> Demande acceptée
                      </div>
                    )}
                    {demande?.statut === "refusee" && (
                      <div className="nc-agency-cta refused">Demande refusée</div>
                    )}
                    {!demande && (
                      <button
                        className="nc-agency-cta send"
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
            <div className="nc-agency-empty">
              <Building2 size={36} />
              <p>Aucune agence trouvée pour cette commune.</p>
            </div>
          )}
        </div>

        <div className="nc-tip">
          <span>💡 <strong>Vous n'avez pas encore d'agence ?</strong> Contactez une des agences ci-dessus pour rejoindre leur vivier.</span>
        </div>
      </>
    );
  };

  return (
    <div className="nc-app">
      <div className="nc-shell">
        {/* -------- Sidebar (desktop) -------- */}
        <aside className="nc-sidebar">
          <div className="nc-brand">
            <Logo size={22} />
            <span>Nounou Connect</span>
          </div>
          <nav className="nc-nav-list">
            <button className="nc-nav-link active">
              <User size={17} /> Profil
            </button>
          </nav>
          <button className="nc-sidebar-logout" onClick={onLogout}>
            <LogOut size={17} /> Déconnexion
          </button>
        </aside>

        <div className="nc-main-col">
          {/* -------- Topbar (mobile) -------- */}
          <header className="nc-topbar">
            <div className="nc-brand">
              <Logo size={26} />
              <span>Nounou Connect</span>
            </div>
            <button className="nc-topbar-logout" onClick={onLogout}>
              <LogOut size={19} />
            </button>
          </header>

          <main className="nc-content">
            {hasAgence ? renderProfil() : renderSansAgence()}
          </main>

          {/* -------- Bottom nav (mobile) -------- */}
          <nav className="nc-bottomnav">
            <button className="nc-nav-item active">
              <User size={19} />
              <span>Profil</span>
            </button>
          </nav>
        </div>
      </div>

      <style>{`
        :root {
          --nc-sable: #FBF3EA;
          --nc-sable-deep: #F3E6D8;
          --nc-argile: #C1603F;
          --nc-argile-dark: #8F4128;
          --nc-argile-tint: #F1DACC;
          --nc-encre: #3D2B1F;
          --nc-encre-soft: #6B5744;
          --nc-muted: #9C8A76;
          --nc-feuille: #5E7C4C;
          --nc-or: #D89B3C;
          --nc-or-bg: #FBF0DC;
          --nc-rouge: #B5493A;
          --nc-whatsapp: #25D366;
          --nc-whatsapp-dark: #1DA851;
          --nc-line: #E8DCC9;
          --nc-white: #FFFFFF;
          --nc-sidebar: #241B15;
          --nc-sidebar-line: #3A2E24;
          --nc-sidebar-muted: #B8A995;
        }

        .nc-app { min-height: 100vh; background: var(--nc-sable); font-family: "Inter", sans-serif; color: var(--nc-encre); }
        .nc-shell { display: flex; min-height: 100vh; }

        /* Sidebar (desktop) */
        .nc-sidebar { width: 250px; flex: none; background: var(--nc-sidebar); color: var(--nc-white); display: none; flex-direction: column; padding: 22px 16px; }
        .nc-brand { display: flex; align-items: center; gap: 10px; font-family: inherit; font-weight: 700; font-size: 16.5px; padding: 6px 10px 24px; }
        .nc-sidebar .nc-brand { color: var(--nc-white); }
        .nc-nav-list { display: flex; flex-direction: column; gap: 3px; }
        .nc-nav-link { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: none; border: none; color: var(--nc-sidebar-muted); font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; }
        .nc-nav-link.active { background: rgba(193,96,63,.22); color: var(--nc-white); }
        .nc-sidebar-logout { margin-top: auto; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: none; border: none; border-top: 1px solid var(--nc-sidebar-line); color: #E0A99C; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; margin-top: 10px; padding-top: 16px; }

        .nc-main-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        /* Topbar (mobile) */
        .nc-topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: var(--nc-white); border-bottom: 1px solid var(--nc-line); position: sticky; top: 0; z-index: 50; }
        .nc-topbar .nc-brand { color: var(--nc-encre); padding: 0; }
        .nc-topbar-logout { background: transparent; border: none; color: var(--nc-encre-soft); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .nc-topbar-logout:hover { background: #FEE2E2; color: #DC2626; }

        .nc-content { flex: 1; max-width: 1080px; width: 100%; margin: 0 auto; padding: 16px 16px 90px; display: flex; flex-direction: column; gap: 16px; }

        /* Profile header card */
        .nc-profile-card { background: var(--nc-white); border-radius: 20px; padding: 18px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .nc-avatar-wrapper { position: relative; flex: none; }
        .nc-avatar-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
        .nc-avatar-placeholder { width: 60px; height: 60px; border-radius: 50%; background: var(--nc-argile); color: var(--nc-white); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; }
        .nc-avatar-placeholder.nc-avatar-neutral { background: var(--nc-sidebar); }
        .nc-avatar-edit-overlay { position: absolute; inset: 0; border-radius: 50%; background: rgba(28,25,23,.5); color: var(--nc-white); display: flex; align-items: center; justify-content: center; }
        .nc-profile-id { flex: 1; min-width: 180px; }
        .nc-profile-name-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .nc-profile-name-row h1 { font-size: 19px; font-weight: 700; margin: 0; color: var(--nc-encre); }
        .nc-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
        .nc-badge-argile { background: var(--nc-argile-tint); color: var(--nc-argile-dark); }
        .nc-badge-neutral { background: var(--nc-sable-deep); color: var(--nc-encre-soft); border: 1px solid var(--nc-line); }
        .nc-profile-meta { display: flex; align-items: center; gap: 14px; margin-top: 6px; font-size: 13.5px; color: var(--nc-encre-soft); flex-wrap: wrap; }
        .nc-profile-meta span { display: inline-flex; align-items: center; gap: 5px; }
        .nc-profile-card-action { flex: none; }

        .nc-btn { border: none; border-radius: 999px; padding: 11px 18px; font-family: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
        .nc-btn-primary { background: var(--nc-argile); color: var(--nc-white); }
        .nc-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .nc-btn-outline { background: var(--nc-white); color: var(--nc-argile); border: 1.5px solid var(--nc-argile); display: inline-flex; align-items: center; gap: 6px; }

        /* Stats */
        .nc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .nc-stat-card { background: var(--nc-white); border-radius: 18px; padding: 16px 8px; text-align: center; }
        .nc-stat-value { display: block; font-weight: 700; font-size: 20px; color: var(--nc-encre); line-height: 1.1; }
        .nc-stat-label { display: block; font-size: 11px; color: var(--nc-encre-soft); margin-top: 5px; }

        /* Generic card */
        .nc-card { background: var(--nc-white); border-radius: 20px; padding: 18px 20px; }
        .nc-card-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--nc-muted); margin: 0 0 12px; }

        .nc-simple-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--nc-line); }
        .nc-simple-row:first-child { padding-top: 0; }
        .nc-simple-row:last-child { border-bottom: none; padding-bottom: 0; }
        .nc-simple-row-label { font-size: 13.5px; color: var(--nc-muted); }
        .nc-simple-row-value { font-size: 14.5px; font-weight: 700; }
        .nc-simple-row-value.empty { color: var(--nc-muted); font-weight: 500; }

        /* WhatsApp contact card */
        .nc-whatsapp-card { background: var(--nc-white); border-radius: 20px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .nc-whatsapp-text { flex: 1; min-width: 220px; }
        .nc-whatsapp-text p { margin: 0; font-size: 13.5px; color: var(--nc-encre-soft); line-height: 1.5; }
        .nc-whatsapp-btn { flex: none; display: inline-flex; align-items: center; gap: 8px; background: var(--nc-whatsapp); color: var(--nc-white); text-decoration: none; border: none; border-radius: 999px; padding: 12px 20px; font-weight: 700; font-size: 13.5px; cursor: pointer; }
        .nc-whatsapp-btn:hover { background: var(--nc-whatsapp-dark); }
        .nc-whatsapp-btn-disabled { background: var(--nc-muted); cursor: not-allowed; }

        /* Info tiles */
        .nc-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .nc-info-tile { background: var(--nc-sable-deep); border-radius: 14px; padding: 13px 14px; }
        .nc-info-tile-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--nc-white); color: var(--nc-argile); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .nc-info-tile-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--nc-muted); }
        .nc-info-tile-value { font-size: 14px; font-weight: 700; color: var(--nc-encre); margin-top: 2px; }
        .nc-info-tile-value.empty { color: var(--nc-muted); font-weight: 500; }

        /* Edit form */
        .nc-edit-error { background: #FEE2E2; color: #DC2626; font-size: 13px; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; }
        .nc-edit-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .nc-edit-form-group { display: flex; flex-direction: column; gap: 4px; }
        .nc-edit-form-group label { font-size: 12px; font-weight: 600; color: var(--nc-muted); }
        .nc-optional { font-weight: 400; }
        .nc-edit-form-group input, .nc-edit-form-group select { padding: 10px 12px; border: 1.5px solid var(--nc-line); border-radius: 10px; font-size: 14px; background: var(--nc-sable-deep); color: var(--nc-encre); outline: none; font-family: inherit; }
        .nc-edit-form-group input:focus, .nc-edit-form-group select:focus { border-color: var(--nc-argile); }
        .nc-edit-form-actions { display: flex; justify-content: flex-end; gap: 10px; }

        /* Agencies (scroll horizontal — mobile ET desktop) */
        .nc-commune-filter { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
        .nc-commune-filter select { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--nc-encre); border: 1px solid var(--nc-line); background: var(--nc-sable-deep); border-radius: 999px; padding: 8px 14px; }
        .nc-agency-scroll { display: flex; gap: 14px; overflow-x: auto; padding: 2px 2px 10px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; }
        .nc-agency-scroll::-webkit-scrollbar { height: 6px; }
        .nc-agency-scroll::-webkit-scrollbar-thumb { background: var(--nc-argile-tint); border-radius: 99px; }
        .nc-agency-card { flex: 0 0 210px; scroll-snap-align: start; background: var(--nc-sable-deep); border-radius: 16px; padding: 16px; text-align: center; }
        .nc-agency-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--nc-white); margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; color: var(--nc-argile); overflow: hidden; }
        .nc-agency-icon img { width: 100%; height: 100%; object-fit: cover; }
        .nc-agency-name { font-size: 14px; font-weight: 700; line-height: 1.25; }
        .nc-agency-meta { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 6px; font-size: 11.5px; color: var(--nc-encre-soft); flex-wrap: wrap; }
        .nc-agency-meta span { display: inline-flex; align-items: center; gap: 3px; }
        .nc-agency-cta { margin-top: 12px; width: 100%; border-radius: 999px; padding: 9px 10px; font-size: 12px; font-weight: 700; border: none; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        .nc-agency-cta.send { background: var(--nc-feuille); color: var(--nc-white); }
        .nc-agency-cta.pending { background: var(--nc-or-bg); color: #8A5D18; flex-direction: column; gap: 2px; font-size: 11px; line-height: 1.3; }
        .nc-agency-cta.accepted { background: #DCFCE7; color: #166534; }
        .nc-agency-cta.refused { background: #FEE2E2; color: #991B1B; }
        .nc-agency-empty { text-align: center; padding: 30px 20px; color: var(--nc-encre-soft); }
        .nc-agency-empty svg { color: var(--nc-line); margin-bottom: 8px; }

        .nc-tip { display: flex; gap: 10px; background: #E7EEE0; border-radius: 14px; padding: 14px 16px; font-size: 13px; color: #3F5533; line-height: 1.5; }
        .nc-tip strong { color: #2E4022; }

        /* Bottom nav (mobile) */
        .nc-bottomnav { display: flex; position: sticky; bottom: 0; background: var(--nc-white); border-top: 1px solid var(--nc-line); }
        .nc-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 11px 0 13px; color: var(--nc-muted); font-size: 11px; font-weight: 700; background: none; border: none; cursor: pointer; }
        .nc-nav-item.active { color: var(--nc-argile); }

        /* ============ RESPONSIVE ============ */
        @media (min-width: 760px) {
          .nc-sidebar { display: flex; }
          .nc-topbar { display: none; }
          .nc-bottomnav { display: none; }
          .nc-content { padding: 32px 40px 60px; gap: 20px; }
          .nc-info-grid { grid-template-columns: repeat(4, 1fr); }
          .nc-agency-card { flex: 0 0 230px; }
        }

        @media (max-width: 480px) {
          .nc-edit-form-grid { grid-template-columns: 1fr; }
          .nc-profile-card { padding: 16px; }
          .nc-profile-card-action { width: 100%; }
          .nc-profile-card-action .nc-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
