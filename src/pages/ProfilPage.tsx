// src/pages/ProfilPage.tsx
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, MapPin, Phone, Edit2, Save, X, ChevronRight, LogOut, Shield } from "lucide-react";
import { Logo } from "../components/Logo";
import { useMenageProfil } from "../hooks/useMenage";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ================================================================
// Réécriture, branchée sur la table réelle `menages`.
//
// Champ retiré : `photo_url` — n'existe pas sur `menages` (seules
// `agences` et `nounous` ont une colonne photo, cf. 0001_schema.sql /
// 0005_nounou_telephone.sql). L'avatar affiche désormais les initiales,
// comme fait ailleurs dans l'app pour ce même cas (nounou sans photo).
// ================================================================

export default function ProfilPage({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { data: profil } = useMenageProfil();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nom: "", telephone: "", quartier: "" });

  useEffect(() => {
    if (profil) {
      setFormData({ nom: profil.nom || "", telephone: profil.telephone || "", quartier: profil.quartier || "" });
    }
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      
      const { error } = await supabase.from("menages").update(formData).eq("user_id", authUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menage", "profil", currentUser?.user_id] });
      setIsEditing(false);
    },
    onError: (err) => alert(err instanceof Error ? err.message : "Erreur lors de l'enregistrement."),
  });

  const handleCancel = () => {
    if (profil) {
      setFormData({ nom: profil.nom || "", telephone: profil.telephone || "", quartier: profil.quartier || "" });
    }
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
        <div className="avatar-wrapper">
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 28, background: "#F2D6D8", color: "#C2614F" }}>
            {initiales}
          </div>
          <div className="avatar-badge"><Shield size={14} /></div>
        </div>
        <h2>{profil?.nom || "..."}</h2>
        <p className="profil-statut"><span className="statut-dot"></span>Compte actif</p>
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
          --terracotta: #C2614F;
          --terracotta-light: #D4818A;
          --terracotta-lighter: #F2D6D8;
          --terracotta-pale: #F8EDEE;
          --sauge: #4A7C59;
          --beige-light: #F8F6F5;
          --gris-fonce: #1C1917;
          --gris-moyen: #78716C;
          --blanc: #FFFFFF;
          --shadow: 0 4px 20px rgba(28, 25, 23, 0.06);
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
          text-align: center;
          margin-bottom: 24px;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-block;
        }

        .avatar-wrapper img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--terracotta-lighter);
        }

        .avatar-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: var(--sauge);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--blanc);
        }

        .avatar-section h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin: 8px 0 2px 0;
        }

        .profil-statut {
          font-size: 14px;
          color: var(--gris-moyen);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .statut-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--sauge);
          display: inline-block;
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

          .avatar-wrapper img {
            width: 80px;
            height: 80px;
          }

          .avatar-section h2 {
            font-size: 19px;
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
