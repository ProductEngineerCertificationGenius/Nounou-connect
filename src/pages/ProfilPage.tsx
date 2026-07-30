// src/pages/ProfilPage.tsx
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, MapPin, Phone, Edit2, Save, X, ChevronRight, LogOut, Shield, Camera } from "lucide-react";
import { Logo } from "../components/Logo";
import { useMenageProfil } from "../hooks/useMenage";
import { getErrorMessage } from "../lib/errorHandler";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ================================================================
// `photo_url` existe désormais sur `menages` (0021_photo_menage.sql).
// La famille peut ajouter/remplacer sa photo en mode édition ; sans
// photo, l'avatar retombe sur les initiales comme avant.
// ================================================================

export default function ProfilPage({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { data: profil } = useMenageProfil();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nom: "", telephone: "", quartier: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profil) {
      setFormData({ nom: profil.nom || "", telephone: profil.telephone || "", quartier: profil.quartier || "" });
      setPreviewUrl(profil.photo_url || undefined);
    }
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) return;

      // Récupérer le userId depuis la session Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      let photo_url = profil?.photo_url;
      if (photoFile && profil?.id) {
        const path = `menages/${profil.id}/photo.jpg`;
        const { error: uploadError } = await supabase.storage.from("photos").upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      }

      const { error } = await supabase.from("menages").update({ ...formData, photo_url }).eq("user_id", authUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menage", "profil", currentUser?.user_id] });
      setPhotoFile(null);
      setIsEditing(false);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleCancel = () => {
    if (profil) {
      setFormData({ nom: profil.nom || "", telephone: profil.telephone || "", quartier: profil.quartier || "" });
      setPreviewUrl(profil.photo_url || undefined);
    }
    setPhotoFile(null);
    setIsEditing(false);
  };

  const initiales = (profil?.nom || "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="profil-page">
      <header className="profil-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronRight size={20} style={{ transform: "rotate(180deg)" }} /></button>
          <Logo size={28} />
          <span className="header-title">Mon profil</span>
        </div>
        <div className="header-right">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}><Edit2 size={18} /> Modifier</button>
          ) : (
            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancel}><X size={18} /> Annuler</button>
              <button className="btn-save" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save size={18} /> {saveMutation.isPending ? "..." : "Enregistrer"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="avatar-section">
        <div className={`avatar-wrapper ${isEditing ? "editable" : ""}`} onClick={() => isEditing && fileInputRef.current?.click()}>
          {previewUrl ? (
            <img className="avatar-photo" src={previewUrl} alt={profil?.nom || "Profil"} />
          ) : (
            <div className="avatar-initials">{initiales}</div>
          )}
          {isEditing ? (
            <div className="avatar-edit-overlay"><Camera size={18} /></div>
          ) : (
            <div className="avatar-badge"><Shield size={14} /></div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoPick}
          />
        </div>
        <div className="avatar-info">
          <h2>{profil?.nom || "..."}</h2>
          <p className="profil-statut"><span className="statut-dot"></span>Compte actif</p>
        </div>
      </div>

      <div className="infos-section">
        <div className="info-group">
          <label>Nom complet</label>
          {isEditing ? (
            <input type="text" name="nom" value={formData.nom} onChange={handleChange} placeholder="Votre nom" />
          ) : (
            <div className="info-value"><User size={18} /><span>{profil?.nom}</span></div>
          )}
        </div>

        <div className="info-group">
          <label>Téléphone</label>
          {isEditing ? (
            <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange} placeholder="07 XX XX XX XX" />
          ) : (
            <div className="info-value"><Phone size={18} /><span>{profil?.telephone}</span></div>
          )}
        </div>

        <div className="info-group">
          <label>Quartier</label>
          {isEditing ? (
            <select name="quartier" value={formData.quartier} onChange={handleChange}>
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
      </div>

      <button className="btn-logout" onClick={onLogout}><LogOut size={20} /> Se déconnecter</button>

      <style>{`
        /* ============================================================ */
        /* VARIABLES                                                    */
        /* ============================================================ */
        :root {
          --terracotta: #F3811E;
          --terracotta-light: #F5A855;
          --terracotta-lighter: #FFF3D6;
          --terracotta-pale: #FFF7E6;
          --sauge: #4A7C59;
          --beige-light: #FBF8F4;
          --gris-fonce: #211B14;
          --gris-moyen: #8A867A;
          --blanc: #FFFFFF;
          --shadow: 0 4px 20px rgba(33, 27, 20, 0.06);
          --radius: 20px;
          --radius-sm: 14px;
        }

        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .profil-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px 16px 40px;
          background: var(--beige-light);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .profil-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0 16px;
          border-bottom: 1px solid rgba(212, 184, 150, 0.2);
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-back {
          background: transparent;
          border: none;
          color: var(--gris-moyen);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-back:hover {
          background: var(--terracotta-pale);
          color: var(--terracotta);
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--gris-fonce);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--terracotta-pale);
          border: 2px solid var(--terracotta-lighter);
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: var(--terracotta);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-edit:hover {
          background: var(--terracotta-lighter);
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
          border: 2px solid var(--gris-moyen);
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: var(--gris-moyen);
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-cancel:hover {
          background: var(--beige-light);
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--sauge);
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
        }

        /* ============================================================ */
        /* AVATAR                                                       */
        /* ============================================================ */
        .avatar-section {
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          background: var(--blanc);
          border-radius: var(--radius-sm);
          padding: 18px 20px;
          margin-bottom: 24px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: var(--shadow);
        }

        .avatar-wrapper {
          position: relative;
          width: 84px;
          height: 84px;
          flex-shrink: 0;
        }

        .avatar-wrapper.editable {
          cursor: pointer;
        }

        .avatar-wrapper img,
        .avatar-photo,
        .avatar-initials {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid var(--terracotta-lighter);
          box-sizing: border-box;
        }

        .avatar-wrapper img,
        .avatar-photo {
          object-fit: cover;
        }

        .avatar-initials {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 26px;
          background: var(--terracotta-lighter);
          color: var(--terracotta);
        }

        .avatar-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--sauge);
          color: white;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--blanc);
        }

        .avatar-edit-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(33, 27, 20, 0.45);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .avatar-wrapper.editable:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .avatar-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .avatar-info h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profil-statut {
          font-size: 13px;
          color: var(--sauge);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
        }

        .statut-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--sauge);
          display: inline-block;
          flex-shrink: 0;
        }

        /* ============================================================ */
        /* INFOS                                                        */
        /* ============================================================ */
        .infos-section {
          background: var(--blanc);
          border-radius: var(--radius-sm);
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: var(--shadow);
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
          color: var(--gris-moyen);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .info-group input,
        .info-group select {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          font-size: 15px;
          background: var(--beige-light);
          color: var(--gris-fonce);
          transition: all 0.25s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .info-group input:focus,
        .info-group select:focus {
          outline: none;
          border-color: var(--terracotta);
          background: var(--blanc);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        .info-value {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          color: var(--gris-fonce);
          font-size: 15px;
        }

        .info-value svg {
          color: var(--terracotta);
          flex-shrink: 0;
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
          border-radius: var(--radius-sm);
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
        @media (max-width: 480px) {
          .profil-page {
            padding: 12px 12px 40px;
          }

          .header-title {
            font-size: 16px;
          }

          .btn-edit,
          .btn-cancel,
          .btn-save {
            padding: 6px 12px;
            font-size: 12px;
          }

          .avatar-section {
            padding: 14px 16px;
            gap: 12px;
          }

          .avatar-wrapper {
            width: 64px;
            height: 64px;
          }

          .avatar-info h2 {
            font-size: 17px;
          }

          .infos-section {
            padding: 16px;
          }
        }

        @media (min-width: 769px) {
          .profil-page {
            padding: 24px 24px 40px;
          }

          .infos-section {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}
