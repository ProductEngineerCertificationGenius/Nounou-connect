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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  const { data: profil } = useQuery({
    queryKey: ["nounou", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      // Récupérer le userId depuis la session Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;
      
      if (!authUserId) {
        throw new Error("Pas de session auth");
      }
      
      const { data, error } = await supabase
        .from("nounous")
        .select("*, agence:agences(nom)")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: nbFamillesAidees } = useQuery({
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

  const { data: mesDemandes } = useQuery({
    queryKey: ["demandes", "nounou", profil?.id],
    enabled: Boolean(profil?.id) && isSupabaseConfigured,
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

  const hasAgence = Boolean(profil?.agence_id);

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
      // .select() force Supabase à renvoyer les lignes modifiées.
      // Utile pour détecter un blocage RLS silencieux : dans ce cas
      // l'UPDATE "réussit" (pas d'erreur) mais ne touche aucune ligne,
      // et data ressort vide au lieu de contenir la ligne mise à jour.
      const { data, error } = await supabase
        .from("nounous")
        .update({ disponible: !profil.disponible })
        .eq("id", profil.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible de modifier la disponibilité (accès refusé par la base). Contactez votre agence."
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  const initiales = (profil?.nom || "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const besoinLabels: Record<string, string> = {
    "Garde d'enfants": "👶",
    "Aide ménagère": "🧹",
    "Mixte (Garde + Ménage)": "👶🧹",
  };

  const renderProfil = () => (
    <>
      <section className="profile-section">
        <div className="profile-header">
          <div className="avatar-wrapper">
            {profil?.photo_url ? (
              <img src={profil.photo_url} alt={profil?.nom} />
            ) : (
              <div className="avatar-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24 }}>
                {initiales}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">
              <h1>{profil?.nom || "..."}</h1>
              <span className="role-badge">Nounou</span>
            </div>
            <div className="profile-meta">
              <span><Star size={16} fill="#F59E0B" color="#F59E0B" /> {profil?.note_moyenne ?? "—"}/5</span>
              <span><MapPin size={16} /> {profil?.quartier}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{profil?.experience || "Non renseigné"}</span>
            <span className="stat-label">Expérience</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{nbFamillesAidees ?? 0}</span>
            <span className="stat-label">Familles aidées</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{(profil?.tarif ?? 0).toLocaleString()}</span>
            <span className="stat-label">FCFA / jour</span>
          </div>
        </div>
      </section>

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

      <section className="infos-section">
        <div className="info-card">
          <div className="info-card-header"><h3>Agence</h3></div>
          <p className="info-card-value">{profil?.agence?.nom || "—"}</p>
        </div>

        <div className="info-card">
          <div className="info-card-header"><h3>Langues</h3></div>
          <div className="info-card-tags">
            {(profil?.langues ?? []).map((l: string) => (
              <span key={l} className="tag">{l}</span>
            ))}
            {(profil?.langues ?? []).length === 0 && <span style={{ color: "#78716C", fontSize: 13 }}>Non renseigné</span>}
          </div>
        </div>
      </section>

      <div className="info-message">
        <Heart size={20} color="#C2614F" />
        <p>Pour modifier vos informations, contactez votre agence : <strong>{profil?.agence?.nom}</strong></p>
      </div>

      <button className="btn-logout" onClick={onLogout}><LogOut size={20} /> Se déconnecter</button>
    </>
  );

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
                          <span><Star size={12} fill="#F59E0B" color="#F59E0B" /> {agence.note || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-whatsapp-small"
                      onClick={() =>
                        handleWhatsAppContact(
                          agence.telephone,
                          `Bonjour, je suis nounou et je souhaite rejoindre votre agence.\n\n👤 Nom: ${profil?.nom || "Nounou"}\n📱 Téléphone: ${profil?.telephone || "Non renseigné"}\n📍 Quartier: ${profil?.quartier || "Non renseigné"}\n\nPouvez-vous me donner plus d'informations sur votre agence ?`
                        )
                      }
                    >
                      <MessageCircle size={16} /> Contacter
                    </button>
                  </div>
                ))}
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
              <span className={`demande-statut ${d.statut === "Assignée" ? "assignee" : "attente"}`}>
                {d.statut}
              </span>
            </div>
            <div className="demande-card-footer">
              <Calendar size={12} />
              <span>
                {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        ))}
        {(mesDemandes ?? []).length === 0 && (
          <p style={{ color: "#78716C", fontSize: 14 }}>Aucune demande pour le moment.</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="espace-nounou">
      <header className="nounou-header">
        <div className="header-left">
          <Logo size={28} />
          <span className="header-title">Nounou Connect</span>
        </div>
        <button className="btn-logout-header" onClick={onLogout}><LogOut size={20} /></button>
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
          position: relative;
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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }

        .profile-info {
          flex: 1;
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

        .role-badge.without-agence {
          background: #C2614F;
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

        .verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #D1FAE5;
          color: #065F46;
          font-size: 11px;
          font-weight: 600;
          padding: 1px 10px;
          border-radius: 50px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
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

        .infos-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .info-card-header svg {
          color: #C2614F;
        }

        .info-card-header h3 {
          font-size: 13px;
          font-weight: 600;
          color: #78716C;
          margin: 0;
        }

        .info-card-value {
          font-size: 15px;
          font-weight: 600;
          color: #1C1917;
          margin: 0;
        }

        .info-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          font-size: 12px;
          padding: 2px 12px;
          border-radius: 50px;
          background: #F5F0EB;
          color: #6B5E4F;
        }

        .tag.skill {
          background: #F2D6D8;
          color: #705334;
          font-weight: 500;
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

        .info-message strong {
          color: #1C1917;
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
          .bottom-nav button {
            padding: 4px 12px;
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
          .avatar-wrapper img {
            width: 100px;
            height: 100px;
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
        }

        /* ============================================================ */
        /* MES DEMANDES                                                 */
        /* ============================================================ */
        .demandes-title { font-size: 20px; font-weight: 700; color: #1C1917; margin: 0 0 2px; }
        .demandes-subtitle { font-size: 13px; color: #78716C; margin: 0 0 16px; }
        .demandes-list { display: flex; flex-direction: column; gap: 12px; }
        .demande-card { background: white; border-radius: 14px; padding: 14px 16px; border: 1px solid rgba(212,184,150,0.15); box-shadow: 0 2px 8px rgba(28,25,23,0.04); }
        .demande-card-header { display: flex; align-items: flex-start; gap: 10px; }
        .demande-icon { font-size: 20px; flex-shrink: 0; }
        .demande-content { flex: 1; min-width: 0; }
        .demande-content h4 { font-size: 15px; font-weight: 700; color: #1C1917; margin: 0 0 4px; }
        .demande-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #78716C; }
        .demande-meta span { display: flex; align-items: center; gap: 3px; }
        .demande-statut { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 50px; white-space: nowrap; }
        .demande-statut.assignee { background: #E8F5E8; color: #4A7C59; }
        .demande-statut.attente { background: #F2D6D8; color: #C2614F; }
        .demande-card-footer { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #78716C; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F5F0EB; }
      `}</style>
    </div>
  );
}
