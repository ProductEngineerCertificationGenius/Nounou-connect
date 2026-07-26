// src/pages/ProfilAgence.tsx
import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Edit2,
  Save,
  X,
  Camera,
  Building2,
  Star,
  Calendar,
  Shield,
  LogOut,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useAgenceProfil } from "../hooks/useAgence";
import { getErrorMessage } from "../lib/errorHandler";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ================================================================
// Réécriture complète, branchée sur la table réelle `agences`.
//
// Champs retirés (absents de notre schéma, cf. 0001_schema.sql) :
//   - `responsable` (nom du responsable) : pas de colonne dédiée,
//     seul `nom` (le nom de l'agence elle-même) existe.
//   - `email` : aucune colonne — l'agence n'a qu'un `telephone`
//     (c'est aussi son identifiant de connexion, cf. Supabase Auth).
//   - `statut` (actif/inactif) : n'existe pas ; un compte qui existe
//     est de fait actif, pas de statut à afficher/gérer.
// `date_inscription` -> mappé sur `created_at` (réel).
// Upload de photo : réel, vers Supabase Storage (bucket `photos`,
// chemin `agences/{agence_id}/photo.jpg`, policies de
// 0009_storage_policy_stricte.sql) — c'était une preview locale en
// base64 chez Noah, jamais persistée.
// ================================================================

export default function ProfilAgence({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: profil } = useAgenceProfil();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    description: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profil) {
      setFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        description: profil.description || "",
      });
      setPreviewUrl(profil.photo_url);
    }
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profil || !isSupabaseConfigured) return;
      let photo_url = profil.photo_url;
      if (photoFile) {
        const path = `agences/${profil.id}/photo.jpg`;
        const { error: uploadError } = await supabase.storage.from("photos").upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase
        .from("agences")
        .update({ ...formData, photo_url })
        .eq("id", profil.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agence", "profil", profil?.user_id] });
      setIsEditing(false);
      setPhotoFile(null);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleCancel = () => {
    if (profil) {
      setFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        description: profil.description || "",
      });
      setPreviewUrl(profil.photo_url);
    }
    setPhotoFile(null);
    setIsEditing(false);
  };

  const formattedDate = profil?.created_at
    ? new Date(profil.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="profil-agence">
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronLeft size={20} /></button>
          <Logo size={28} />
          <span className="header-title">🏢 Profil agence</span>
        </div>
        <div className="header-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}><Edit2 size={18} /> Modifier</button>
          ) : (
            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancel}><X size={18} /> Annuler</button>
              <button className="btn-save" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save size={18} /> {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="avatar-section">
        <div className="avatar-wrapper" onClick={() => isEditing && fileInputRef.current?.click()}>
          {previewUrl ? (
            <img src={previewUrl} alt={profil?.nom} />
          ) : (
            <div className="avatar-placeholder"><Building2 size={40} /></div>
          )}
          {isEditing && (
            <div className="avatar-edit-overlay"><Camera size={20} /><span>Changer</span></div>
          )}
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </div>
        <div className="avatar-info">
          <h2>{profil?.nom || "..."}</h2>
          <div className="avatar-meta">
            <span className="statut-actif"><Shield size={14} /> Compte actif</span>
            {profil?.note_moyenne != null && (
              <span className="note"><Star size={14} color="#F59E0B" fill="#F59E0B" /> {profil.note_moyenne} / 5</span>
            )}
          </div>
        </div>
      </div>

      <div className="infos-section">
        <div className="info-group">
          <label>Nom de l'agence <span className="required">*</span></label>
          {isEditing ? (
            <input type="text" name="nom" value={formData.nom} onChange={handleChange} placeholder="Nom de l'agence" required />
          ) : (
            <div className="info-value"><Building2 size={18} /><span>{profil?.nom}</span></div>
          )}
        </div>

        <div className="info-group">
          <label>Téléphone <span className="required">*</span></label>
          {isEditing ? (
            <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange} placeholder="07 XX XX XX XX" required />
          ) : (
            <div className="info-value"><Phone size={18} /><span>{profil?.telephone}</span></div>
          )}
        </div>

        <div className="info-group">
          <label>Quartier <span className="required">*</span></label>
          {isEditing ? (
            <select name="quartier" value={formData.quartier} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Abobo">Abobo</option>
              <option value="Cocody">Cocody</option>
              <option value="Koumassi">Koumassi</option>
              <option value="Marcory">Marcory</option>
              <option value="Plateau">Plateau</option>
              <option value="Yopougon">Yopougon</option>
              <option value="Anyama">Anyama</option>
              <option value="Bingerville">Bingerville</option>
              <option value="Grand-Bassam">Grand-Bassam</option>
              <option value="Port-Bouët">Port-Bouët</option>
            </select>
          ) : (
            <div className="info-value"><MapPin size={18} /><span>{profil?.quartier}</span></div>
          )}
        </div>

        <div className="info-group">
          <label>Description <span className="optional">(optionnel)</span></label>
          {isEditing ? (
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Présentez votre agence..." rows={4} />
          ) : (
            <div className="info-value description"><span>{profil?.description || "Aucune description"}</span></div>
          )}
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <Calendar size={20} />
          <div><span className="stat-number">Membre depuis</span><span className="stat-label">{formattedDate}</span></div>
        </div>
        <div className="stat-card">
          <MapPin size={20} />
          <div><span className="stat-number">Quartier</span><span className="stat-label">{profil?.quartier}</span></div>
        </div>
        <div className="stat-card">
          <Shield size={20} />
          <div><span className="stat-number">Statut</span><span className="stat-label">✅ Actif</span></div>
        </div>
      </div>

      <button className="btn-logout" onClick={onLogout}><LogOut size={20} /> Se déconnecter</button>

      <style>{`
        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .profil-agence {
          padding: 0;
          font-family: "Inter", sans-serif;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-back {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-back:hover {
          background: #F2D6D8;
          color: #C2614F;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: #F2D6D8;
          border: 2px solid #F2D6D8;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: #C2614F;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-edit:hover {
          background: #F8EDEE;
          border-color: #C2614F;
        }

        .edit-actions {
          display: flex;
          gap: 6px;
        }

        .btn-cancel {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: 2px solid #D4B896;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: #78716C;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-cancel:hover {
          border-color: #C2614F;
          color: #C2614F;
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: #4A7C59;
          border: none;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-save:hover {
          background: #3A6248;
          box-shadow: 0 4px 16px rgba(74, 124, 89, 0.3);
        }

        /* ============================================================ */
        /* AVATAR                                                       */
        /* ============================================================ */
        .avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          flex-wrap: wrap;
        }

        .avatar-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          cursor: ${isEditing ? "pointer" : "default"};
          border: 3px solid #F2D6D8;
          transition: all 0.3s ease;
        }

        .avatar-wrapper:hover {
          border-color: ${isEditing ? "#C2614F" : "#F2D6D8"};
        }

        .avatar-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #F2D6D8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C2614F;
        }

        .avatar-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(28, 25, 23, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease;
          gap: 4px;
        }

        .avatar-wrapper:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .avatar-edit-overlay span {
          font-size: 11px;
          font-weight: 600;
        }

        .avatar-info h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px 0;
        }

        .avatar-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .statut-actif {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #4A7C59;
          font-weight: 600;
        }

        .note {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #1C1917;
          font-weight: 600;
        }

        /* ============================================================ */
        /* INFOS                                                        */
        /* ============================================================ */
        .infos-section {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .info-group {
          margin-bottom: 16px;
        }

        .info-group:last-child {
          margin-bottom: 0;
        }

        .info-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }

        .info-group .required {
          color: #C2614F;
        }

        .info-group .optional {
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          color: #78716C;
          font-size: 11px;
        }

        .info-group input,
        .info-group select,
        .info-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #F2D6D8;
          border-radius: 12px;
          font-size: 14px;
          background: #FAF7F2;
          color: #1C1917;
          transition: all 0.25s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .info-group input:focus,
        .info-group select:focus,
        .info-group textarea:focus {
          outline: none;
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .info-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .info-value {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 0;
          color: #1C1917;
          font-size: 14px;
        }

        .info-value svg {
          color: #C2614F;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-value.description span {
          color: #78716C;
          line-height: 1.6;
        }

        /* ============================================================ */
        /* STATS                                                        */
        /* ============================================================ */
        .stats-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-card svg {
          color: #C2614F;
        }

        .stat-card .stat-number {
          font-size: 13px;
          font-weight: 600;
          color: #1C1917;
        }

        .stat-card .stat-label {
          font-size: 11px;
          color: #78716C;
        }

        /* ============================================================ */
        /* DÉCONNEXION                                                  */
        /* ============================================================ */
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

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 768px) {
          .avatar-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
          }

          .avatar-meta {
            justify-content: center;
          }

          .infos-section {
            padding: 16px;
          }

          .stats-section {
            grid-template-columns: 1fr 1fr;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .btn-edit,
          .btn-cancel,
          .btn-save {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .stats-section {
            grid-template-columns: 1fr;
          }

          .avatar-wrapper {
            width: 64px;
            height: 64px;
          }

          .avatar-info h2 {
            font-size: 17px;
          }

          .header-title {
            font-size: 16px;
          }

          .infos-section {
            padding: 14px;
          }
        }

        @media (min-width: 769px) {
          .avatar-wrapper {
            width: 100px;
            height: 100px;
          }

          .infos-section {
            padding: 24px 28px;
          }
        }
      `}</style>
    </div>
  );
}
