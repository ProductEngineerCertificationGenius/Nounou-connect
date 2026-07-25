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
  MessageCircle,
  Building2,
  Users,
  Search,
  X,
  Camera,
  Edit2,
  Save,
  Phone,
  Briefcase,
  Languages,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";

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

  // ===== MISE À JOUR DU PROFIL =====
  const updateProfil = useMutation({
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

        {/* Formulaire d'édition ou affichage (sans Langues, sans Tarif) */}
        {isEditing ? (
          <div className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="07 XX XX XX XX"
                />
              </div>
              <div className="form-group">
                <label>Quartier</label>
                <select
                  value={formData.quartier}
                  onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                >
                  {QUARTIERS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
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
        {hasAgence ? renderProfilAvecAgence() : renderProfilSansAgence()}
      </main>

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
          width: 90px;
          height: 90px;
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

        .avatar-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(28, 25, 23, 0.55);
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

        .edit-input {
          padding: 8px 12px;
          border: 2px solid #F2D6D8;
          border-radius: 10px;
          font-size: 18px;
          font-weight: 700;
          background: #FAF7F2;
          color: #1C1917;
          outline: none;
          font-family: inherit;
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
