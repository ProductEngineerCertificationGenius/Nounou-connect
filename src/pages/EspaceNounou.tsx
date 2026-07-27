// src/pages/EspaceNounou.tsx
import { useState, useRef } from "react";
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
// Réécriture complète, branchée sur la table réelle `nounous`.
//
// Mise à jour (feature-noah, migration 0012_nounou_self_insert.sql) :
// une nounou peut désormais exister SANS agence (auto-inscription).
// L'écran "en attente" retiré ci-dessous a donc été réintroduit sous
// une forme adaptée à notre schéma : `hasAgence` distingue les deux
// cas, et une nounou sans agence voit une liste d'agences de son
// quartier (vue publique `agences_public`) à contacter par WhatsApp
// pour rejoindre un vivier — repris de la version feature-noah.
//
// Limite connue : l'édition du profil (nom, tarif, photo...) par la
// nounou elle-même n'est PAS branchée ici, même pour une nounou sans
// agence pourtant autorisée à `update` sa propre ligne (policy
// nounous_update_self). Le upload de photo en particulier resterait
// bloqué : la policy Storage `storage_photo_est_proprietaire`
// (0009_storage_policy_stricte.sql) ne reconnaît que l'agence
// propriétaire comme uploadeur, pas la nounou elle-même. L'activer
// nécessiterait une nouvelle policy Storage dédiée à ce cas.
//
// Suppression majeure par rapport au design d'origine : l'écran
// "profil en attente de validation par une agence" a été retiré. Ce
// n'était pas un simple manque de données à brancher — c'est un flux
// incompatible avec notre architecture réelle. Chez Noah, la nounou
// s'inscrivait librement puis attendait qu'une agence la "récupère".
// Chez nous, c'est l'inverse strict : `nounous.agence_id` est NOT NULL
// (cf. cahier des charges §6), donc une nounou n'existe dans la base
// QUE si une agence l'a déjà ajoutée à son vivier. Au moment où elle
// peut se connecter ici, elle est nécessairement déjà rattachée — il
// n'y a jamais d'état "en attente" à afficher.
//
// Champs retirés (absents de notre schéma) : `prenom` (seul `nom`
// existe), `competences` (seul `langues` existe), `verifiee` (pas de
// colonne de vérification). `famillesAidees` est désormais un vrai
// compte (nombre de demandes assignées à elle avec statut='Assignée'),
// pas un chiffre inventé.
//
// Ajout : onglet "Mes demandes" (n'existait pas du tout auparavant —
// la nounou n'avait aucun moyen de voir les familles qui lui sont
// assignées). S'appuie sur la policy RLS `demandes_select_nounou_assignee`
// et sur `menages_select_via_demande` (0007_calibrage_affichage.sql),
// déjà posées côté base pour ce cas précis — seul l'écran manquait.
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

type Tab = "profil" | "demandes";

interface DemandeNounou {
  id: string;
  nom: string;
  quartier: string;
  telephone: string;
  description: string;
  note: number;
  nbNounous: number;
  photo_url?: string;
}

export default function EspaceNounou() {
  const onLogout = useLogout();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterQuartier, setFilterQuartier] = useState<string>("");
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    ethnie: "",
    experience: "",
  });

  const hasAgence = Boolean(currentUser?.agence_id);

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

  // ===== AGENCES DU QUARTIER (pour le scroll) =====
  const { data: agencesQuartier } = useQuery({
    queryKey: ["agences", "quartier", filterQuartier || profil?.quartier],
    enabled: Boolean(profil?.quartier) && isSupabaseConfigured && !hasAgence,
    queryFn: async () => {
      const quartierFilter = filterQuartier || profil!.quartier;
      
      let query = supabase.from("agences_public").select("*");
      
      if (quartierFilter !== "toutes") {
        query = query.eq("quartier", quartierFilter);
      }
      
      const { data, error } = await query.order("note", { ascending: false });
      if (error) throw error;
      return data as AgencePublique[];
    },
  });

  const hasAgence = Boolean(profil?.agence_id);

  // ===== DEMANDES D'AFFILIATION ENVOYÉES (nounou sans agence) =====
  const { data: mesDemandesAffiliation } = useMesDemandesAffiliation(profil?.id);
  const envoyerDemande = useEnvoyerDemandeAffiliation();

  // ===== AGENCES DISPONIBLES (nounou sans agence uniquement) =====
  // Filtre par commune ajouté (repris de la version de l'ami B) : "" =
  // toutes les communes, sinon restreint à la commune choisie. NB : la
  // version d'origine de B avait un bug ici — le choix "Toutes les
  // communes" retombait silencieusement sur le quartier de la nounou
  // au lieu de vraiment tout afficher. Corrigé ci-dessous.
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

  const handleWhatsAppContact = (telephone: string, message?: string) => {
    const cleanPhone = telephone.replace(/[^0-9]/g, "");
    const encodedMessage = message ? encodeURIComponent(message) : "";
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");
  };

  // ===== ÉDITION DU PROFIL (nounou sans agence uniquement) =====
  // Autorisée par la policy RLS `nounous_update_self` (migration 0012)
  // et, pour la photo, par la policy Storage étendue en 0013 : ni l'une
  // ni l'autre n'existent pour une nounou rattachée à une agence, dont
  // le profil reste modifiable uniquement par cette agence (inchangé).
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
    tarif: "",
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
        tarif: profil.tarif?.toString() || "",
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
          tarif: parseInt(editFormData.tarif, 10) || 0,
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

  const toggleDisponible = useMutation({
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

      const updateData: any = {
        nom: formData.nom,
        telephone: formData.telephone,
        quartier: formData.quartier,
        ethnie: formData.ethnie,
        experience: formData.experience,
        photo_url,
      };

      const { error } = await supabase
        .from("nounous")
        .update(updateData)
        .eq("id", profil.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] });
      setIsEditing(false);
      setPhotoFile(null);
      setPreviewUrl(null);
      refetchProfil();
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  // ===== CONTACT WHATSAPP =====
  const handleWhatsAppContact = (telephone: string, message?: string) => {
    const cleanPhone = telephone.replace(/[^0-9]/g, "");
    const encodedMessage = message ? encodeURIComponent(message) : "";
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");
  };

  // ===== HANDLE EDIT =====
  const startEditing = () => {
    if (profil) {
      setFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        ethnie: profil.ethnie || "",
        experience: profil.experience || "",
      });
      setPreviewUrl(profil.photo_url || null);
    }
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateProfil.mutate();
  };

  // ============================================================
  // RENDU PROFIL AVEC AGENCE (PAGE UNIQUE)
  // ============================================================
  const renderProfilAvecAgence = () => {
    const initiales = (profil?.nom || "?")
      .split(" ")
      .map((p: string) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const stars = Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={18}
        className={i < Math.floor(profil?.note_moyenne || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
      />
    ));

    return (
      <div className="profil-container with-agence">
        {/* En-tête avec avatar */}
        <div className="profil-header">
          <div className="avatar-wrapper">
            {profil?.photo_url ? (
              <img src={profil.photo_url} alt={profil.nom} />
            ) : (
              <div className="avatar-placeholder">{initiales}</div>
            )}
            {profil?.disponible && (
              <span className="status-badge disponible">
                <CheckCircle size={14} /> Disponible
              </span>
            )}
          </div>
          <div className="profil-info">
            <h1>{profil?.nom || "Nounou"}</h1>
            <div className="stars-container">{stars}</div>
            <p className="note-text">{profil?.note_moyenne || "—"} / 5</p>
          </div>
        </div>

        {/* Message info agence */}
        <div className="agence-info-message">
          <Building2 size={20} />
          <span>
            Vous êtes rattachée à <strong>{profil?.agence?.nom || "une agence"}</strong>
          </span>
          <span className="separator">•</span>
          <MapPin size={16} />
          <span>{profil?.agence?.quartier || profil?.quartier}</span>
        </div>

        {/* Cartes d'informations (sans Langues, sans Tarif) */}
        <div className="info-cards">
          <div className="info-card">
            <div className="info-card-icon"><Briefcase size={20} /></div>
            <div className="info-card-content">
              <span className="info-card-label">Expérience</span>
              <span className="info-card-value">{profil?.experience || "Non renseigné"}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-icon"><Award size={20} /></div>
            <div className="info-card-content">
              <span className="info-card-label">Ethnie</span>
              <span className="info-card-value">{profil?.ethnie || "Non renseignée"}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-icon"><MapPin size={20} /></div>
            <div className="info-card-content">
              <span className="info-card-label">Quartier</span>
              <span className="info-card-value">{profil?.quartier || "—"}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-icon"><Phone size={20} /></div>
            <div className="info-card-content">
              <span className="info-card-label">Téléphone</span>
              <span className="info-card-value">{profil?.telephone || "—"}</span>
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-icon"><Users size={20} /></div>
            <div className="info-card-content">
              <span className="info-card-label">Type de service</span>
              <span className="info-card-value">{profil?.type_service || "Nounou"}</span>
            </div>
          </div>
        </div>

        {/* Message contact agence */}
        <div className="contact-agence-message">
          <div className="message-icon">📝</div>
          <div className="message-content">
            <p className="message-title">Besoin de modifier vos informations ?</p>
            <p className="message-text">
              Pour modifier votre nom, expérience ou photo, contactez votre agence. 
              Elle seule peut mettre à jour votre profil.
            </p>
          </div>
          <button
            className="btn-contact-agence"
            onClick={() => handleWhatsAppContact(
              profil?.agence?.telephone || profil?.telephone || "",
              `Bonjour, je souhaite modifier mes informations sur mon profil Nounou Connect.\n\n👤 Nom: ${profil?.nom}\n📱 Téléphone: ${profil?.telephone}\n\nMerci de me contacter pour faire les mises à jour.`
            )}
          >
            <MessageCircle size={18} />
            Contacter mon agence
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU PROFIL SANS AGENCE (avec agences en scroll)
  // ============================================================
  const renderProfilSansAgence = () => {
    const initiales = (profil?.nom || "?")
      .split(" ")
      .map((p: string) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const agences = agencesQuartier || [];

    return (
      <div className="profil-container without-agence">
        {/* En-tête avec avatar et édition */}
        <div className="profil-header editable">
          <div className="avatar-wrapper" onClick={() => isEditing && fileInputRef.current?.click()}>
            {previewUrl || profil?.photo_url ? (
              <img src={previewUrl || profil?.photo_url} alt={profil?.nom} />
            ) : (
              <div className="avatar-placeholder">{initiales}</div>
            )}
            {isEditing && (
              <div className="avatar-edit-overlay">
                <Camera size={20} />
                <span>Changer</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          <div className="profil-info">
            <div className="name-edit">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="edit-input name-input"
                  placeholder="Votre nom"
                />
              ) : (
                <h1>{profil?.nom || "Nounou"}</h1>
              )}
              {!isEditing && (
                <button className="btn-edit" onClick={startEditing}>
                  <Edit2 size={16} /> Modifier
                </button>
              )}
            </div>

            {!isEditing && profil?.note_moyenne != null && (
              <div className="stars-container">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={i < Math.floor(profil.note_moyenne || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                  />
                ))}
                <span className="note-text">{profil.note_moyenne} / 5</span>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="edit-actions">
              <button className="btn-cancel-edit" onClick={() => setIsEditing(false)}>
                <X size={18} /> Annuler
              </button>
              <button className="btn-save-edit" onClick={handleSave} disabled={updateProfil.isPending}>
                <Save size={18} /> {updateProfil.isPending ? "..." : "Enregistrer"}
              </button>
            </div>
          )}
        </div>

  const renderSansAgence = () => {
    const agences = agencesQuartier ?? [];
    return (
      <>
        <section className="profile-section">
          <div className="profile-header">
            <div
              className="avatar-wrapper editable"
              onClick={() => isEditingProfil && fileInputRef.current?.click()}
              style={{ cursor: isEditingProfil ? "pointer" : "default" }}
            >
              {previewUrl || profil?.photo_url ? (
                <img src={previewUrl || profil?.photo_url} alt={profil?.nom} />
              ) : (
                <div className="avatar-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24 }}>
                  {initiales}
                </div>
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
            <div className="profile-info">
              <div className="profile-name">
                <h1>{profil?.nom || "..."}</h1>
                <span className="role-badge without-agence">Sans agence</span>
              </div>
              <div className="profile-meta">
                <span><MapPin size={16} /> {profil?.quartier}</span>
              </div>
            </div>
            {!isEditingProfil && (
              <button className="btn-edit-profil" onClick={startEditingProfil}>
                <Edit2 size={16} /> Modifier
              </button>
            )}
          </div>
        </section>

        {isEditingProfil ? (
          <form onSubmit={handleSaveProfil} className="edit-profil-form">
            {editError && <p className="edit-error">{editError}</p>}
            <div className="edit-form-grid">
              <div className="edit-form-group">
                <label>Prénom et nom</label>
                <input
                  type="text"
                  value={editFormData.nom}
                  onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="edit-form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={editFormData.telephone}
                  onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                  required
                />
              </div>
              <div className="edit-form-group">
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
              <div className="edit-form-group">
                <label>Ethnie <span className="optional">(optionnel)</span></label>
                <input
                  type="text"
                  value={editFormData.ethnie}
                  onChange={(e) => setEditFormData({ ...editFormData, ethnie: e.target.value })}
                  placeholder="Akan, Baoulé, Malinké, etc."
                />
              </div>
              <div className="edit-form-group">
                <label>Expérience</label>
                <input
                  type="text"
                  value={editFormData.experience}
                  onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                  placeholder="3 ans"
                />
              </div>
              <div className="edit-form-group">
                <label>Tarif (FCFA / jour)</label>
                <input
                  type="number"
                  min={0}
                  value={editFormData.tarif}
                  onChange={(e) => setEditFormData({ ...editFormData, tarif: e.target.value })}
                />
              </div>
            </div>
            <div className="edit-form-actions">
              <button type="button" className="btn-cancel-edit" onClick={cancelEditingProfil}>
                <X size={16} /> Annuler
              </button>
              <button type="submit" className="btn-save-edit" disabled={updateProfilSelf.isPending}>
                <Save size={16} /> {updateProfilSelf.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon"><Phone size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Téléphone</span>
                <span className="info-card-value">{profil?.telephone || "—"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><MapPin size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Quartier</span>
                <span className="info-card-value">{profil?.quartier || "—"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><Award size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Ethnie</span>
                <span className="info-card-value">{profil?.ethnie || "Non renseignée"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><Briefcase size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Expérience</span>
                <span className="info-card-value">{profil?.experience || "Non renseigné"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><Heart size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Tarif</span>
                <span className="info-card-value">{profil?.tarif ? `${profil.tarif.toLocaleString()} FCFA` : "—"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="agences-scroll-section">
          <div className="agences-scroll-header">
            <div className="header-left">
              <h3>🏢 Agences disponibles</h3>
              <span className="agences-count">{agences.length} agence{agences.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="filter-group">
              <label>Filtrer par commune :</label>
              <select
                value={filterQuartier || "toutes"}
                onChange={(e) => setFilterQuartier(e.target.value === "toutes" ? "" : e.target.value)}
                className="filter-select"
              >
                <option value="toutes">🌍 Toutes les communes</option>
                {QUARTIERS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {agences.length > 0 ? (
            <div className="agences-scroll-wrapper">
              <div className="agences-scroll">
                {agences.map((agence) => {
                  const demande = mesDemandesAffiliation?.find((d) => d.agence_id === agence.id);
                  return (
                    <div key={agence.id} className="agence-scroll-card">
                      <div className="agence-card-content">
                        <div className="agence-avatar-small">
                          {agence.photo_url ? (
                            <img src={agence.photo_url} alt={agence.nom} />
                          ) : (
                            <div className="agence-placeholder-small">🏢</div>
                          )}
                        </div>
                        <div className="agence-info-small">
                          <h4>{agence.nom}</h4>
                          <div className="agence-meta-small">
                            <span><MapPin size={12} /> {agence.quartier}</span>
                            <span><Users size={12} /> {agence.nbNounous}</span>
                            <span><Star size={12} fill="#F59E0B" color="#F59E0B" /> {agence.note || "—"}</span>
                          </div>
                        </div>
                      </div>

                      {demande?.statut === "en_attente" && (
                        <div className="affiliation-badge en-attente">
                          <Clock size={14} /> Demande envoyée, en attente de réponse
                        </div>
                      )}
                      {demande?.statut === "acceptee" && (
                        <div className="affiliation-badge acceptee">
                          <CheckCircle size={14} /> Demande acceptée ! Rechargez la page.
                        </div>
                      )}
                      {demande?.statut === "refusee" && (
                        <div className="affiliation-badge refusee">
                          ❌ Demande refusée par cette agence
                        </div>
                      )}

                      {!demande && (
                        <button
                          className="btn-whatsapp-small"
                          disabled={envoyerDemande.isPending}
                          onClick={() => {
                            if (!profil?.id) return;
                            envoyerDemande.mutate({ nounouId: profil.id, agenceId: agence.id });
                            handleWhatsAppContact(
                              agence.telephone,
                              `Bonjour, je suis nounou et je souhaite rejoindre votre agence.\n\n👤 Nom: ${profil?.nom || "Nounou"}\n📱 Téléphone: ${profil?.telephone || "Non renseigné"}\n📍 Quartier: ${profil?.quartier || "Non renseigné"}\n\nJe viens de vous envoyer une demande d'affiliation depuis l'application, pouvez-vous me donner plus d'informations ?`
                            );
                          }}
                        >
                          <MessageCircle size={16} />
                          {envoyerDemande.isPending ? "Envoi..." : "Envoyer une demande"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-agences-scroll">
              <Building2 size={40} />
              <p>Aucune agence trouvée pour cette commune.</p>
            </div>
          )}

          <div className="rejoindre-message">
            <p>💡 <strong>Vous n'avez pas encore d'agence ?</strong> Contactez une des agences ci-dessus pour rejoindre leur vivier.</p>
          </div>
        </div>

        <button className="btn-logout" onClick={onLogout}><LogOut size={20} /> Se déconnecter</button>
      </>
    );
  };

  const renderDemandes = () => (
    <section className="demandes-section">
      <h2 className="demandes-title">Mes demandes</h2>
      <p className="demandes-subtitle">Familles pour lesquelles votre agence vous a assignée</p>
      <div className="demandes-list">
        {(mesDemandes ?? []).map((d) => (
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
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ethnie</label>
                <input
                  type="text"
                  value={formData.ethnie}
                  onChange={(e) => setFormData({ ...formData, ethnie: e.target.value })}
                  placeholder="Votre ethnie"
                />
              </div>
              <div className="form-group">
                <label>Expérience</label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Ex: 3 ans"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Affichage des infos (sans Langues, sans Tarif) */
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon"><Phone size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Téléphone</span>
                <span className="info-card-value">{profil?.telephone || "—"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><MapPin size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Quartier</span>
                <span className="info-card-value">{profil?.quartier || "—"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><Award size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Ethnie</span>
                <span className="info-card-value">{profil?.ethnie || "Non renseignée"}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon"><Briefcase size={20} /></div>
              <div className="info-card-content">
                <span className="info-card-label">Expérience</span>
                <span className="info-card-value">{profil?.experience || "Non renseigné"}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== SECTION AGENCES EN SCROLL ===== */}
        <div className="agences-scroll-section">
          <div className="agences-scroll-header">
            <div className="header-left">
              <h3>🏢 Agences disponibles</h3>
              <span className="agences-count">{agences.length} agences</span>
            </div>
            <div className="filter-group">
              <label>Filtrer par commune :</label>
              <select
                value={filterQuartier || "toutes"}
                onChange={(e) => setFilterQuartier(e.target.value === "toutes" ? "" : e.target.value)}
                className="filter-select"
              >
                <option value="toutes">🌍 Toutes les communes</option>
                {QUARTIERS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {agences.length > 0 ? (
            <div className="agences-scroll-wrapper">
              <div className="agences-scroll">
                {agences.map((agence) => (
                  <div key={agence.id} className="agence-scroll-card">
                    <div className="agence-card-content">
                      <div className="agence-avatar-small">
                        {agence.photo_url ? (
                          <img src={agence.photo_url} alt={agence.nom} />
                        ) : (
                          <div className="agence-placeholder-small">🏢</div>
                        )}
                      </div>
                      <div className="agence-info-small">
                        <h4>{agence.nom}</h4>
                        <div className="agence-meta-small">
                          <span><MapPin size={12} /> {agence.quartier}</span>
                          <span><Users size={12} /> {agence.nbNounous}</span>
                          <span><Star size={12} className="text-yellow-400 fill-yellow-400" /> {agence.note || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-whatsapp-small"
                      onClick={() => handleWhatsAppContact(
                        agence.telephone,
                        `Bonjour, je suis nounou et je souhaite rejoindre votre agence.\n\n👤 Nom: ${profil?.nom || "Nounou"}\n📱 Téléphone: ${profil?.telephone || "Non renseigné"}\n📍 Quartier: ${profil?.quartier || "Non renseigné"}\n\nPouvez-vous me donner plus d'informations sur votre agence ?`
                      )}
                    >
                      <MessageCircle size={16} />
                      Contacter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-agences-scroll">
              <Building2 size={40} />
              <p>Aucune agence trouvée dans cette commune.</p>
            </div>
          )}

          <div className="rejoindre-message">
            <p>💡 <strong>Vous n'avez pas encore d'agence ?</strong> Contactez une des agences ci-dessus pour rejoindre leur vivier.</p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="espace-nounou">
      <header className="nounou-header">
        <div className="header-left">
          <Logo size={28} />
          <span className="header-title">Nounou Connect</span>
          {hasAgence ? (
            <span className="header-badge with-agence">✅ Rattachée</span>
          ) : (
            <span className="header-badge without-agence">⏳ Sans agence</span>
          )}
        </div>
        <button className="btn-logout-header" onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </header>

      <main className="nounou-content">
        {activeTab === "profil" ? (hasAgence ? renderProfil() : renderSansAgence()) : renderDemandes()}
      </main>

      <nav className="bottom-nav">
        <button className={activeTab === "profil" ? "active" : ""} onClick={() => setActiveTab("profil")}>
          <div className={`nav-icon-wrapper ${activeTab === "profil" ? "active-icon" : ""}`}><User size={20} /></div>
          <span>Profil</span>
        </button>
        {hasAgence && (
          <button className={activeTab === "demandes" ? "active" : ""} onClick={() => setActiveTab("demandes")}>
            <div className={`nav-icon-wrapper ${activeTab === "demandes" ? "active-icon" : ""}`}><FileText size={20} /></div>
            <span>Demandes</span>
          </button>
        )}
      </nav>

      <style>{`
        /* ============================================================ */
        /* PAGE PRINCIPALE                                              */
        /* ============================================================ */
        .espace-nounou {
          min-height: 100vh;
          background: #F5F0EB;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding-bottom: 20px;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .nounou-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.15);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
        }

        .header-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 12px;
          border-radius: 50px;
        }

        .header-badge.with-agence {
          background: #D1FAE5;
          color: #065F46;
        }

        .header-badge.without-agence {
          background: #FEF3C7;
          color: #92400E;
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

        /* ============================================================ */
        /* CONTENU                                                      */
        /* ============================================================ */
        .nounou-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 16px 20px 20px;
        }

        /* ============================================================ */
        /* PROFIL AVEC AGENCE                                           */
        /* ============================================================ */
        .profil-container {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .profil-header {
          display: flex;
          align-items: center;
          gap: 24px;
          background: white;
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
          flex-wrap: wrap;
        }

        .profil-header.editable {
          flex-wrap: wrap;
        }

        .avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-wrapper img {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #F2D6D8;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #705334;
          color: white;
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .avatar-wrapper.editable {
          transition: opacity 0.2s;
        }

        .avatar-wrapper.editable:hover {
          opacity: 0.85;
        }

        .avatar-edit-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(28, 25, 23, 0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-edit-profil {
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 1.5px solid #E8DDD0;
          color: #1C1917;
          padding: 8px 14px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
          align-self: flex-start;
        }

        .btn-edit-profil:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .edit-profil-form {
          background: white;
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .edit-error {
          background: #FEE2E2;
          color: #DC2626;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .edit-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .edit-form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .edit-form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
        }

        .edit-form-group .optional {
          font-weight: 400;
        }

        .edit-form-group input,
        .edit-form-group select {
          padding: 10px 12px;
          border: 1.5px solid #E8DDD0;
          border-radius: 10px;
          font-size: 14px;
          background: #FAF7F2;
          color: #1C1917;
          outline: none;
          font-family: inherit;
        }

        .edit-form-group input:focus,
        .edit-form-group select:focus {
          border-color: #C2614F;
        }

        .edit-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn-cancel-edit,
        .btn-save-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel-edit {
          background: transparent;
          border: 1.5px solid #E8DDD0;
          color: #78716C;
        }

        .btn-cancel-edit:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .btn-save-edit {
          background: #C2614F;
          border: none;
          color: white;
        }

        .btn-save-edit:hover:not(:disabled) {
          background: #B25545;
        }

        .btn-save-edit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .edit-form-grid {
            grid-template-columns: 1fr;
          }
        }

        .verify-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: white;
          border-radius: 50%;
          background: #C2614F;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 700;
          border: 3px solid #F2D6D8;
        }

        .status-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 50px;
          background: white;
          border: 2px solid #4A7C59;
          color: #4A7C59;
        }

        .status-badge.disponible {
          background: #4A7C59;
          color: white;
          border-color: #4A7C59;
        }

        .role-badge.without-agence {
          background: #C2614F;
        }

        .profile-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease;
          gap: 2px;
          cursor: pointer;
        }

        .avatar-wrapper:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .avatar-edit-overlay span {
          font-size: 11px;
          font-weight: 600;
        }

        .profil-info {
          flex: 1;
          min-width: 180px;
        }

        .profil-info h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px 0;
        }

        .name-edit {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .name-edit h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1C1917;
          margin: 0;
        }

        .btn-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: 2px solid #F2D6D8;
          border-radius: 50px;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          color: #C2614F;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-edit:hover {
          background: #F8EDEE;
          border-color: #C2614F;
        }

        .stars-container {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 2px;
          flex-wrap: wrap;
        }

        .text-yellow-400 { color: #F59E0B; }
        .fill-yellow-400 { fill: #F59E0B; }
        .text-gray-300 { color: #D1D5DB; }

        .note-text {
          font-size: 13px;
          color: #78716C;
          margin-left: 6px;
          font-weight: 500;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
        }

        .btn-cancel-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 2px solid #D4B896;
          border-radius: 50px;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #78716C;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-cancel-edit:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .btn-save-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          background: #4A7C59;
          border: none;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-save-edit:hover {
          background: #3A6248;
        }

        .btn-save-edit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ============================================================ */
        /* MESSAGE AGENCE                                               */
        /* ============================================================ */
        .agence-info-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: #E8F5E8;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid #4A7C59;
          color: #065F46;
          font-size: 14px;
          flex-wrap: wrap;
        }

        .agence-info-message .separator {
          color: #4A7C59;
          opacity: 0.5;
        }

        /* ============================================================ */
        /* INFO CARDS                                                   */
        /* ============================================================ */
        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: white;
          border-radius: 14px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.03);
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #F8EDEE;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C2614F;
          flex-shrink: 0;
        }

        .info-card-content {
          flex: 1;
          min-width: 0;
        }

        .info-card-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-card-value {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
          word-break: break-word;
        }

        /* ============================================================ */
        /* CONTACT AGENCE MESSAGE                                       */
        /* ============================================================ */
        .contact-agence-message {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          background: linear-gradient(145deg, #FFF9F5, #F8EDEE);
          border-radius: 16px;
          border: 1px solid rgba(194, 97, 79, 0.12);
          flex-wrap: wrap;
        }

        .message-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .message-content {
          flex: 1;
          min-width: 180px;
        }

        .message-title {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px 0;
        }

        .message-text {
          font-size: 13px;
          color: #78716C;
          margin: 0;
          line-height: 1.6;
        }

        .btn-contact-agence {
          display: flex;
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
          transition: all 0.25s ease;
          flex-shrink: 0;
        }

        .btn-contact-agence:hover {
          background: #1EBE5E;
          transform: scale(1.02);
        }

        /* ============================================================ */
        /* FORMULAIRE D'ÉDITION                                         */
        /* ============================================================ */
        .edit-form {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.03);
        }

        .edit-form .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .edit-form .form-row:last-child {
          margin-bottom: 0;
        }

        .edit-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .edit-form .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .edit-form .form-group input,
        .edit-form .form-group select {
          padding: 10px 14px;
          border: 2px solid #F2D6D8;
          border-radius: 12px;
          font-size: 14px;
          background: #FAF7F2;
          color: #1C1917;
          transition: all 0.25s ease;
          font-family: inherit;
          outline: none;
        }

        .edit-form .form-group input:focus,
        .edit-form .form-group select:focus {
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        /* ============================================================ */
        /* INFO CARDS (repris de la version de l'ami B)                 */
        /* ============================================================ */
        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: white;
          border-radius: 14px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.03);
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #F8EDEE;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C2614F;
          flex-shrink: 0;
        }

        .info-card-content {
          flex: 1;
          min-width: 0;
        }

        .info-card-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-card-value {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
          word-break: break-word;
        }

        /* ============================================================ */
        /* AGENCES DISPONIBLES — scroll horizontal filtrable            */
        /* ============================================================ */
        .agences-scroll-section {
          margin-top: 16px;
          background: white;
          border-radius: 16px;
          padding: 16px 20px 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.03);
        }

        .agences-scroll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .agences-scroll-header .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .agences-scroll-header h3 {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
          margin: 0;
        }

        .agences-count {
          font-size: 12px;
          color: #78716C;
          background: #F5F0EB;
          padding: 2px 12px;
          border-radius: 50px;
          font-weight: 500;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
        }

        .filter-select {
          padding: 6px 12px;
          border: 2px solid #F2D6D8;
          border-radius: 10px;
          font-size: 13px;
          background: #FAF7F2;
          color: #1C1917;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s ease;
        }

        .filter-select:focus {
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .agences-scroll-wrapper {
          position: relative;
          overflow: hidden;
        }

        .agences-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 4px 0 12px;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }

        .agences-scroll::-webkit-scrollbar {
          height: 4px;
        }

        .agences-scroll::-webkit-scrollbar-track {
          background: #F5F0EB;
          border-radius: 10px;
        }

        .agences-scroll::-webkit-scrollbar-thumb {
          background: #D4B896;
          border-radius: 10px;
        }

        .agence-scroll-card {
          flex: 0 0 260px;
          background: #FAF7F2;
          border-radius: 14px;
          padding: 14px 16px 16px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          scroll-snap-align: start;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .agence-scroll-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(28, 25, 23, 0.08);
          border-color: rgba(194, 97, 79, 0.15);
        }

        .agence-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 10px;
        }

        .agence-avatar-small {
          flex-shrink: 0;
          margin-bottom: 8px;
        }

        .agence-avatar-small img {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #F5F0EB;
        }

        .agence-placeholder-small {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #F2D6D8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .agence-info-small h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px 0;
        }

        .agence-meta-small {
          display: flex;
          justify-content: center;
          gap: 10px;
          font-size: 11px;
          color: #78716C;
          flex-wrap: wrap;
        }

        .agence-meta-small span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .affiliation-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
        }

        .affiliation-badge.en-attente {
          background: #FEF3C7;
          color: #92400E;
        }

        .affiliation-badge.acceptee {
          background: #DCFCE7;
          color: #166534;
        }

        .affiliation-badge.refusee {
          background: #FEE2E2;
          color: #991B1B;
        }

        .btn-whatsapp-small {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-whatsapp-small:hover {
          background: #1EBE5E;
          transform: scale(1.02);
        }

        .empty-agences-scroll {
          text-align: center;
          padding: 30px 20px;
          color: #78716C;
        }

        .empty-agences-scroll svg {
          color: #D4B896;
          margin-bottom: 8px;
        }

        .rejoindre-message {
          margin-top: 14px;
          padding: 12px 16px;
          background: #FEF3C7;
          border-radius: 12px;
          border: 1px solid #F59E0B;
          text-align: center;
          font-size: 13px;
          color: #92400E;
        }

        .rejoindre-message strong {
          color: #1C1917;
        }

        @media (max-width: 480px) {
          .info-cards {
            grid-template-columns: 1fr;
          }
          .agences-scroll-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .agence-scroll-card {
            flex: 0 0 220px;
          }
        }

        .agences-section {
          margin-bottom: 16px;
        }

        .agences-section-title {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 10px;
        }

        .agences-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .agence-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(212, 184, 150, 0.15);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .agence-card-avatar {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 12px;
          background: #F5F0EB;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-size: 20px;
        }

        .agence-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .agence-card-info {
          flex: 1;
          min-width: 0;
        }

        .agence-card-info h4 {
          font-size: 14px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 2px;
        }

        .agence-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: #78716C;
        }

        .agence-card-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .btn-contact-agence-small {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #25D366;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-contact-agence-small:hover {
          background: #1EBE5E;
        }

        .btn-logout {
          width: 100%;
          max-width: 300px;
        }

        .edit-input:focus {
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .edit-input.name-input {
          font-size: 22px;
        }

        /* ============================================================ */
        /* AGENCES EN SCROLL (SANS AGENCE)                              */
        /* ============================================================ */
        .agences-scroll-section {
          margin-top: 16px;
          background: white;
          border-radius: 16px;
          padding: 16px 20px 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.03);
        }

        .agences-scroll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .agences-scroll-header .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .agences-scroll-header h3 {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
          margin: 0;
        }

        .agences-count {
          font-size: 12px;
          color: #78716C;
          background: #F5F0EB;
          padding: 2px 12px;
          border-radius: 50px;
          font-weight: 500;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
        }

        .filter-select {
          padding: 6px 12px;
          border: 2px solid #F2D6D8;
          border-radius: 10px;
          font-size: 13px;
          background: #FAF7F2;
          color: #1C1917;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s ease;
        }

        .filter-select:focus {
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .agences-scroll-wrapper {
          position: relative;
          overflow: hidden;
        }

        .agences-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 4px 0 12px;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }

        .agences-scroll::-webkit-scrollbar {
          height: 4px;
        }

        .agences-scroll::-webkit-scrollbar-track {
          background: #F5F0EB;
          border-radius: 10px;
        }

        .agences-scroll::-webkit-scrollbar-thumb {
          background: #D4B896;
          border-radius: 10px;
        }

        .agence-scroll-card {
          flex: 0 0 260px;
          background: #FAF7F2;
          border-radius: 14px;
          padding: 14px 16px 16px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          scroll-snap-align: start;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .agence-scroll-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(28, 25, 23, 0.08);
          border-color: rgba(194, 97, 79, 0.15);
        }

        .agence-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 10px;
        }

        .agence-avatar-small {
          flex-shrink: 0;
          margin-bottom: 8px;
        }

        .agence-avatar-small img {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #F5F0EB;
        }

        .agence-placeholder-small {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #F2D6D8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .agence-info-small h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px 0;
        }

        .agence-meta-small {
          display: flex;
          justify-content: center;
          gap: 10px;
          font-size: 11px;
          color: #78716C;
          flex-wrap: wrap;
        }

        .agence-meta-small span {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .btn-whatsapp-small {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-whatsapp-small:hover {
          background: #1EBE5E;
          transform: scale(1.02);
        }

        .empty-agences-scroll {
          text-align: center;
          padding: 30px 20px;
          color: #78716C;
        }

        .empty-agences-scroll svg {
          color: #D4B896;
          margin-bottom: 8px;
        }

        .rejoindre-message {
          margin-top: 14px;
          padding: 12px 16px;
          background: #FEF3C7;
          border-radius: 12px;
          border: 1px solid #F59E0B;
          text-align: center;
          font-size: 13px;
          color: #92400E;
        }

        .rejoindre-message strong {
          color: #1C1917;
        }

        /* ============================================================ */
        /* RESPONSIVE MOBILE                                            */
        /* ============================================================ */
        @media (max-width: 768px) {
          .nounou-header {
            padding: 10px 14px;
          }

          .header-title {
            font-size: 15px;
          }

          .nounou-content {
            padding: 12px 14px 20px;
          }

          .profil-header {
            padding: 16px 18px;
            gap: 16px;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .avatar-wrapper img,
          .avatar-placeholder {
            width: 70px;
            height: 70px;
            font-size: 24px;
          }

          .profil-info {
            text-align: center;
          }

          .profil-info h1 {
            font-size: 20px;
          }

          .name-edit {
            justify-content: center;
          }

          .edit-input.name-input {
            font-size: 18px;
            max-width: 100%;
          }

          .stars-container {
            justify-content: center;
          }

          .info-cards {
            grid-template-columns: 1fr;
          }

          .edit-form .form-row {
            grid-template-columns: 1fr;
          }

          .agence-info-message {
            font-size: 13px;
            justify-content: center;
            text-align: center;
          }

          .contact-agence-message {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px 18px;
          }

          .btn-contact-agence {
            width: 100%;
            justify-content: center;
          }

          .agences-scroll-header {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-select {
            width: 100%;
          }

          .agence-scroll-card {
            flex: 0 0 220px;
          }

          .edit-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn-cancel-edit,
          .btn-save-edit {
            width: 100%;
            justify-content: center;
          }

          .header-badge {
            font-size: 9px;
            padding: 2px 10px;
          }
        }

        @media (max-width: 480px) {
          .nounou-content {
            padding: 8px 10px 16px;
          }

          .profil-header {
            padding: 14px 14px;
          }

          .info-card {
            padding: 12px 14px;
          }

          .agence-scroll-card {
            flex: 0 0 180px;
            padding: 12px 12px 14px;
          }

          .agence-info-small h4 {
            font-size: 13px;
          }

          .agence-meta-small {
            font-size: 10px;
            gap: 6px;
          }

          .btn-whatsapp-small {
            font-size: 12px;
            padding: 6px 10px;
          }

          .contact-agence-message {
            padding: 14px 16px;
          }

          .agences-scroll-section {
            padding: 12px 14px 16px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .info-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .agence-scroll-card {
            flex: 0 0 240px;
          }
        }

        @media (min-width: 1025px) {
          .info-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
