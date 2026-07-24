// src/pages/ProfilPage.tsx
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  MapPin, 
  Phone, 
  Edit2, 
  Save, 
  X, 
  ChevronRight, 
  LogOut, 
  Camera,
  Home,
  Calendar,
  Mail,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useMenageProfil } from "../hooks/useMenage";
import { getErrorMessage } from "../lib/errorHandler";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useLogout } from "../hooks/useAuth";

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

export default function ProfilPage({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const onLogout = useLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profil, refetch: refetchProfil } = useMenageProfil();
  
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    email: "",
  });
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (profil) {
      setFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        email: profil.email || "",
      });
      setPreviewUrl(profil.photo_url || null);
    }
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      if (!isSupabaseConfigured) return;

      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      if (!authUserId) {
        throw new Error("Pas de session auth");
      }

      let photo_url = profil?.photo_url;

      if (photoFile) {
        const path = `menages/${authUserId}/photo.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase
        .from("menages")
        .update({ 
          ...formData, 
          photo_url,
        })
        .eq("user_id", authUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menage", "profil", currentUser?.user_id] });
      setIsEditing(false);
      setPhotoFile(null);
      setPreviewUrl(null);
      refetchProfil();
    },
    onError: (err) => {
      setServerError(getErrorMessage(err));
    },
  });

  const handleCancel = () => {
    if (profil) {
      setFormData({
        nom: profil.nom || "",
        telephone: profil.telephone || "",
        quartier: profil.quartier || "",
        email: profil.email || "",
      });
      setPreviewUrl(profil.photo_url || null);
    }
    setPhotoFile(null);
    setIsEditing(false);
    setServerError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    saveMutation.mutate();
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
          <button className="btn-back" onClick={onBack}>
            <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
          </button>
          <Logo size={28} />
          <span className="header-title">Mon profil</span>
        </div>
        <div className="header-right">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              <Edit2 size={18} /> Modifier
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancel}>
                <X size={18} /> Annuler
              </button>
              <button className="btn-save" onClick={handleSubmit} disabled={saveMutation.isPending}>
                <Save size={18} /> {saveMutation.isPending ? "..." : "Enregistrer"}
              </button>
            </div>
          )}
        </div>
      </header>

      {serverError && (
        <div className="error-message">{serverError}</div>
      )}

      <div className="avatar-section">
        <div 
          className="avatar-wrapper" 
          onClick={() => isEditing && fileInputRef.current?.click()}
          style={{ cursor: isEditing ? "pointer" : "default" }}
        >
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
        <h2>{profil?.nom || "..."}</h2>
      </div>

      <div className="infos-section">
        <div className="info-group">
          <label>Nom complet</label>
          {isEditing ? (
            <input 
              type="text" 
              name="nom" 
              value={formData.nom} 
              onChange={handleChange} 
              placeholder="Votre nom" 
            />
          ) : (
            <div className="info-value">
              <User size={18} />
              <span>{profil?.nom}</span>
            </div>
          )}
        </div>

        <div className="info-group">
          <label>Téléphone</label>
          {isEditing ? (
            <input 
              type="tel" 
              name="telephone" 
              value={formData.telephone} 
              onChange={handleChange} 
              placeholder="07 XX XX XX XX" 
            />
          ) : (
            <div className="info-value">
              <Phone size={18} />
              <span>{profil?.telephone}</span>
            </div>
          )}
        </div>

        <div className="info-group">
          <label>Quartier</label>
          {isEditing ? (
            <select 
              name="quartier" 
              value={formData.quartier} 
              onChange={handleChange}
            >
              {QUARTIERS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          ) : (
            <div className="info-value">
              <MapPin size={18} />
              <span>{profil?.quartier}</span>
            </div>
          )}
        </div>

        <div className="info-group">
          <label>Email <span className="optional">(optionnel)</span></label>
          {isEditing ? (
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="votre@email.com" 
            />
          ) : (
            <div className="info-value">
              <Mail size={18} />
              <span>{profil?.email || "Non renseigné"}</span>
            </div>
          )}
        </div>
      </div>

      <button className="btn-logout" onClick={onLogout}>
        <LogOut size={20} /> Se déconnecter
      </button>

      <style>{`
        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .profil-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px 16px 40px;
          background: #F5F0EB;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
          flex-wrap: wrap;
          gap: 8px;
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
          background: #F8EDEE;
          color: #C2614F;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
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
          background: #F8EDEE;
          border: 2px solid #F2D6D8;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: #C2614F;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-edit:hover {
          background: #F2D6D8;
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
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          padding: 10px 16px;
          background: #FEE2E2;
          border-radius: 12px;
          color: #DC2626;
          font-size: 14px;
          margin-bottom: 16px;
          border: 1px solid #FEE2E2;
        }

        /* ============================================================ */
        /* AVATAR                                                       */
        /* ============================================================ */
        .avatar-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-block;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #F2D6D8;
          transition: all 0.3s ease;
          background: #F5F0EB;
        }

        .avatar-wrapper:hover {
          border-color: #C2614F;
        }

        .avatar-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #C2614F;
          color: white;
          font-size: 40px;
          font-weight: 700;
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
          gap: 2px;
        }

        .avatar-wrapper:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .avatar-edit-overlay span {
          font-size: 12px;
          font-weight: 600;
        }

        .avatar-section h2 {
          font-size: 22px;
          font-weight: 700;
          color: #1C1917;
          margin-top: 12px;
        }

        /* ============================================================ */
        /* INFOS                                                        */
        /* ============================================================ */
        .infos-section {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
          border: 1px solid rgba(212, 184, 150, 0.1);
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
        }

        .info-group {
          margin-bottom: 16px;
        }

        .info-group:last-child {
          margin-bottom: 0;
        }

        .info-group label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #78716C;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .info-group .optional {
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          color: #78716C;
          font-size: 11px;
        }

        .info-group input,
        .info-group select {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #F2D6D8;
          border-radius: 12px;
          font-size: 15px;
          background: #FAF7F2;
          color: #1C1917;
          transition: all 0.25s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .info-group input:focus,
        .info-group select:focus {
          outline: none;
          border-color: #C2614F;
          background: white;
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .info-group input::placeholder {
          color: #B8A89A;
        }

        .info-value {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          color: #1C1917;
          font-size: 15px;
        }

        .info-value svg {
          color: #C2614F;
          flex-shrink: 0;
        }

        .info-value span {
          word-break: break-word;
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
        /* RESPONSIVE MOBILE                                            */
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

          .avatar-wrapper {
            width: 100px;
            height: 100px;
          }

          .avatar-placeholder {
            font-size: 32px;
          }

          .avatar-section h2 {
            font-size: 19px;
          }

          .infos-section {
            padding: 16px;
          }

          .info-group input,
          .info-group select {
            padding: 8px 12px;
            font-size: 14px;
          }

          .info-value {
            font-size: 14px;
            gap: 10px;
          }

          .edit-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn-cancel,
          .btn-save {
            width: 100%;
            justify-content: center;
          }

          .profil-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-right {
            width: 100%;
          }

          .btn-edit {
            width: 100%;
            justify-content: center;
          }

          .edit-actions {
            width: 100%;
          }
        }

        @media (max-width: 380px) {
          .avatar-wrapper {
            width: 80px;
            height: 80px;
          }

          .avatar-placeholder {
            font-size: 28px;
          }

          .infos-section {
            padding: 14px;
          }

          .info-group input,
          .info-group select {
            font-size: 13px;
            padding: 6px 10px;
          }
        }

        @media (min-width: 769px) {
          .profil-page {
            padding: 24px 24px 40px;
          }

          .infos-section {
            padding: 24px 28px;
          }

          .avatar-wrapper {
            width: 140px;
            height: 140px;
          }

          .avatar-placeholder {
            font-size: 48px;
          }
        }
      `}</style>
    </div>
  );
}