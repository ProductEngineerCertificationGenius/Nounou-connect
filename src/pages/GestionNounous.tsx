// src/pages/GestionNounous.tsx
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  X,
  User,
  MapPin,
  Star,
  Briefcase,
  DollarSign,
  ChevronLeft,
  Camera,
  Save,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";
import { normalizePhoneCI } from "../lib/phone";

// ================================================================
// Réécriture complète, branchée sur la table réelle `nounous`.
//
// Champs retirés par rapport au design d'origine (absents de notre
// schéma, cf. 0001_schema.sql) :
//   - `ethnie` (obligatoire dans le formulaire d'origine !) : donnée
//     sensible (origine ethnique). L'afficher/la filtrer sur des
//     fiches de recrutement pose un vrai risque de discrimination
//     dans la mise en relation — retirée entièrement, pas seulement
//     "non branchée".
//   - `prenom` séparé du `nom` : notre schéma n'a qu'une colonne `nom`.
//   - `typeGarde` (nounou/babysitter) : un seul type chez nous.
//   - `competences` : n'existe pas (seul `langues` existe).
// Champ ajouté : upload de photo réel vers Supabase Storage (bucket
// `photos`, policies RLS strictes définies en 0009_storage_policy_stricte.sql)
// — c'était simulé (juste une preview locale en base64) chez Noah.
// ================================================================

interface Nounou {
  id: string;
  nom: string;
  telephone: string;
  quartier: string;
  experience: string;
  langues: string[];
  tarif: number;
  disponible: boolean;
  photo_url?: string;
  note_moyenne?: number;
}

function NounouCard({
  nounou,
  onEdit,
  onToggleDisponible,
}: {
  nounou: Nounou;
  onEdit: (nounou: Nounou) => void;
  onToggleDisponible: (nounou: Nounou) => void;
}) {
  return (
    <div className="nounou-card">
      <div className="nounou-card-top" onClick={() => onEdit(nounou)}>
        <div className="nounou-avatar">
          {nounou.photo_url ? (
            <img src={nounou.photo_url} alt={nounou.nom} />
          ) : (
            <div className="avatar-initials">
              {nounou.nom
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
          )}
        </div>
        <div className="nounou-info">
          <h3>{nounou.nom}</h3>
          <div className="nounou-meta">
            <span><MapPin size={12} /> {nounou.quartier}</span>
            <span><Briefcase size={12} /> {nounou.experience}</span>
          </div>
        </div>
      </div>

      <div className="nounou-card-bottom">
        <div className="nounou-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                color={i < Math.floor(nounou.note_moyenne || 0) ? "#F59E0B" : "#E5E7EB"}
                fill={i < Math.floor(nounou.note_moyenne || 0) ? "#F59E0B" : "none"}
              />
            ))}
          </div>
          <span className="note">{nounou.note_moyenne ?? "—"}</span>
        </div>
        <div className="nounou-price">
          <DollarSign size={14} />
          <span>{nounou.tarif.toLocaleString()} FCFA</span>
          <small>/ jour</small>
        </div>
        <div className="nounou-statut-toggle">
          <span className={`statut-label ${nounou.disponible ? "disponible" : "indisponible"}`}>
            {nounou.disponible ? "✅ Disponible" : "❌ Indisponible"}
          </span>
          <button
            className={`toggle-btn ${nounou.disponible ? "disponible" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleDisponible(nounou); }}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormNounouProps {
  agenceId?: string;
  nounou?: Nounou;
  onClose: () => void;
}

function FormNounou({ agenceId, nounou, onClose }: FormNounouProps) {
  const isEditing = Boolean(nounou);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(nounou?.photo_url);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    nom: nounou?.nom || "",
    telephone: nounou?.telephone || "",
    quartier: nounou?.quartier || "",
    experience: nounou?.experience || "",
    langues: nounou?.langues?.join(", ") || "",
    tarif: nounou?.tarif?.toString() || "",
  });
  const [serverError, setServerError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Upload réel vers Supabase Storage : convention de chemin
  // `nounous/{nounou_id}/photo.jpg`, contrôlée par la policy RLS de
  // 0009_storage_policy_stricte.sql (seule l'agence propriétaire de
  // cette nounou peut écrire à ce chemin).
  const uploadPhoto = async (nounouId: string): Promise<string | undefined> => {
    if (!photoFile || !isSupabaseConfigured) return undefined;
    setUploadingPhoto(true);
    try {
      const path = `nounous/${nounouId}/photo.jpg`;
      const { error } = await supabase.storage.from("photos").upload(path, photoFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const languesArray = formData.langues.split(",").map((l) => l.trim()).filter(Boolean);
      const payload = {
        nom: formData.nom,
        // Doit matcher le format E.164 (+225...) utilisé par Supabase
        // Auth (normalizePhoneCI, cf. useInscription) : la RPC
        // claim_nounou_profile compare les chiffres de ce champ à ceux
        // du téléphone vérifié par OTP à l'activation. Un téléphone
        // stocké en format local (ex: "0507069425") ne matchera jamais
        // "+2250507069425" -> la nounou ne peut jamais activer son compte.
        telephone: normalizePhoneCI(formData.telephone),
        quartier: formData.quartier,
        experience: formData.experience,
        langues: languesArray,
        tarif: parseInt(formData.tarif, 10),
      };

      if (!isSupabaseConfigured) {
        onClose();
        return;
      }

      if (isEditing && nounou) {
        const photo_url = await uploadPhoto(nounou.id);
        const { error } = await supabase
          .from("nounous")
          .update({ ...payload, ...(photo_url ? { photo_url } : {}) })
          .eq("id", nounou.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("nounous")
          .insert({ ...payload, agence_id: agenceId })
          .select()
          .single();
        if (error) throw error;
        if (photoFile) {
          const photo_url = await uploadPhoto(created.id);
          if (photo_url) {
            await supabase.from("nounous").update({ photo_url }).eq("id", created.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nounous", "agence", agenceId] });
      onClose();
    },
    onError: (err) => setServerError(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? "✏️ Modifier" : "➕ Ajouter"} une nounou</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {serverError && <p style={{ color: "#E87A7A", fontSize: 13, marginBottom: 8 }}>{serverError}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group photo-group">
            <label>📷 Photo</label>
            <div className="photo-upload" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="Aperçu" className="photo-preview" />
              ) : (
                <>
                  <Camera size={32} />
                  <span>Cliquez pour ajouter une photo</span>
                  <small style={{ color: "#78716C", fontSize: 11, marginTop: 4 }}>Format JPG, PNG (max 2MB)</small>
                </>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nom complet <span className="required">*</span></label>
              <input type="text" name="nom" placeholder="Fatima Ouédraogo" value={formData.nom} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Téléphone <span className="required">*</span></label>
              <input type="tel" name="telephone" placeholder="07 XX XX XX XX" value={formData.telephone} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quartier <span className="required">*</span></label>
              <select name="quartier" value={formData.quartier} onChange={handleChange} required>
                <option value="">Sélectionnez</option>
                <option value="Abobo">Abobo</option>
                <option value="Cocody">Cocody</option>
                <option value="Koumassi">Koumassi</option>
                <option value="Marcory">Marcory</option>
                <option value="Plateau">Plateau</option>
                <option value="Yopougon">Yopougon</option>
              </select>
            </div>
            <div className="form-group">
              <label>Expérience <span className="required">*</span></label>
              <input type="text" name="experience" placeholder="5 ans" value={formData.experience} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tarif (FCFA / jour) <span className="required">*</span></label>
              <input type="number" name="tarif" placeholder="8500" value={formData.tarif} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Langues <span className="required">*</span></label>
              <input type="text" name="langues" placeholder="Français, Moore, Dioula" value={formData.langues} onChange={handleChange} required />
              <small>Séparées par des virgules</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-submit" disabled={mutation.isPending || uploadingPhoto}>
              <Save size={18} /> {mutation.isPending || uploadingPhoto ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// ===== PAGE PRINCIPALE ===========================================
// ================================================================

export default function GestionNounous({ agenceId, onBack }: { agenceId?: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "disponible" | "indisponible">("tous");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNounou, setEditingNounou] = useState<Nounou | undefined>(undefined);

  const { data: nounous } = useQuery({
    queryKey: ["nounous", "agence", agenceId],
    enabled: Boolean(agenceId) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from("nounous").select("*").eq("agence_id", agenceId!);
      if (error) throw error;
      return data as Nounou[];
    },
  });

  const toggleDisponible = useMutation({
    mutationFn: async (nounou: Nounou) => {
      const { error } = await supabase
        .from("nounous")
        .update({ disponible: !nounou.disponible })
        .eq("id", nounou.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nounous", "agence", agenceId] }),
  });

  const filteredNounous = (nounous ?? []).filter((n) => {
    const matchSearch =
      n.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.quartier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut =
      filterStatut === "tous" ||
      (filterStatut === "disponible" ? n.disponible : !n.disponible);
    return matchSearch && matchStatut;
  });

  const openEditModal = (nounou: Nounou) => setEditingNounou(nounou);

  return (
    <div className="gestion-nounous">
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}><ChevronLeft size={20} /></button>
          <Logo size={28} />
          <span className="header-title">Vivier de nounous</span>
          <span className="header-count">{(nounous ?? []).length} au total</span>
        </div>
        <button className="btn-add" onClick={() => setShowAddModal(true)}><Plus size={18} /> Ajouter</button>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="filter-group">
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value as "tous" | "disponible" | "indisponible")} className="filter-select">
            <option value="tous">Toutes</option>
            <option value="disponible">Disponible</option>
            <option value="indisponible">Indisponible</option>
          </select>
        </div>
      </div>

      <div className="nounous-grid">
        {filteredNounous.length > 0 ? (
          filteredNounous.map((nounou) => (
            <NounouCard key={nounou.id} nounou={nounou} onEdit={openEditModal} onToggleDisponible={(n) => toggleDisponible.mutate(n)} />
          ))
        ) : (
          <div className="empty-state">
            <User size={48} strokeWidth={1.5} />
            <h3>Aucune nounou</h3>
            <p>Modifiez les filtres ou ajoutez une nounou.</p>
          </div>
        )}
      </div>

      {showAddModal && <FormNounou agenceId={agenceId} onClose={() => setShowAddModal(false)} />}
      {editingNounou && <FormNounou agenceId={agenceId} nounou={editingNounou} onClose={() => setEditingNounou(undefined)} />}

      <style>{`
        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .gestion-nounous { padding: 0; font-family: "Inter", sans-serif; }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .btn-back { background: transparent; border: none; color: #78716C; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .btn-back:hover { background: #F2D6D8; color: #C2614F; }
        .header-title { font-size: 18px; font-weight: 700; color: #1C1917; }
        .header-count { font-size: 13px; color: #78716C; background: #F5F0EB; padding: 2px 12px; border-radius: 50px; }
        .btn-add { display: flex; align-items: center; gap: 6px; padding: 8px 20px; background: #C2614F; color: white; border: none; border-radius: 50px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.25s ease; }
        .btn-add:hover { background: #B25545; box-shadow: 0 4px 16px rgba(194,97,79,0.3); }

        /* ============================================================ */
        /* SEARCH + FILTRES                                             */
        /* ============================================================ */
        .search-filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-bar { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 10px; background: white; border-radius: 12px; padding: 10px 16px; border: 1px solid rgba(212,184,150,0.15); transition: all 0.25s ease; }
        .search-bar:focus-within { border-color: #C2614F; box-shadow: 0 0 0 4px rgba(194,97,79,0.08); }
        .search-bar svg { color: #78716C; flex-shrink: 0; }
        .search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1C1917; outline: none; font-family: inherit; }
        .search-bar input::placeholder { color: #78716C; opacity: 0.6; }
        .filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-select { padding: 10px 14px; border: 1px solid rgba(212,184,150,0.15); border-radius: 12px; background: white; font-size: 13px; color: #1C1917; outline: none; cursor: pointer; transition: all 0.25s ease; font-family: inherit; min-width: 100px; }
        .filter-select:focus { border-color: #C2614F; box-shadow: 0 0 0 4px rgba(194,97,79,0.08); }

        /* ============================================================ */
        /* GRILLE                                                       */
        /* ============================================================ */
        .nounous-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #78716C; }
        .empty-state svg { color: #D4B896; margin-bottom: 12px; }
        .empty-state h3 { font-size: 18px; color: #1C1917; margin-bottom: 4px; }

        /* ============================================================ */
        /* CARTE NOUNOU                                                 */
        /* ============================================================ */
        .nounou-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid rgba(212,184,150,0.08); box-shadow: 0 2px 8px rgba(28,25,23,0.04); transition: all 0.3s ease; position: relative; }
        .nounou-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(28,25,23,0.08); border-color: rgba(194,97,79,0.12); }
        .nounou-card-top { display: flex; gap: 14px; cursor: pointer; }
        .nounou-avatar { position: relative; flex-shrink: 0; }
        .nounou-avatar img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #F5F0EB; }
        .avatar-initials { width: 60px; height: 60px; border-radius: 50%; background: #C2614F; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; border: 2px solid #F5F0EB; }
        .btn-edit-card { position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #78716C; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s; }
        .btn-edit-card:hover { background: #F5F0EB; color: #C2614F; }

        .nounou-info { flex: 1; min-width: 0; }
        .nounou-info h3 { font-size: 16px; font-weight: 700; color: #1C1917; margin: 0 0 4px 0; }
        .nounou-meta { display: flex; gap: 12px; font-size: 12px; color: #78716C; margin-bottom: 6px; }
        .nounou-meta span { display: flex; align-items: center; gap: 3px; }
        .nounou-badges { display: flex; gap: 4px; flex-wrap: wrap; }
        .badge-type { font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 50px; background: #C2614F18; color: #C2614F; }
        .badge-ethnie { font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 50px; background: #4A7C5918; color: #4A7C59; }

        .nounou-card-bottom { border-top: 1px solid #F5F0EB; padding-top: 12px; margin-top: 4px; }
        .nounou-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
        .stars { display: flex; gap: 1px; }
        .note { font-weight: 700; font-size: 14px; color: #1C1917; }
        .avis { font-size: 12px; color: #78716C; }
        .nounou-price { display: flex; align-items: center; gap: 2px; font-weight: 700; color: #C2614F; font-size: 15px; margin-bottom: 6px; }
        .nounou-price small { font-weight: 400; color: #78716C; font-size: 12px; }

        .nounou-statut-toggle { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .statut-label { font-size: 12px; font-weight: 600; }
        .statut-label.disponible { color: #4A7C59; }
        .statut-label.indisponible { color: #E87A7A; }

        .toggle-btn { position: relative; width: 44px; height: 24px; border-radius: 50px; border: none; cursor: pointer; transition: all 0.3s ease; background: #E5E7EB; flex-shrink: 0; }
        .toggle-btn.disponible { background: #4A7C59; }
        .toggle-btn .toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .toggle-btn.disponible .toggle-slider { left: 22px; }

        .nounou-competences { display: flex; gap: 4px; flex-wrap: wrap; }
        .competence-tag { font-size: 10px; padding: 2px 10px; border-radius: 50px; background: #F5F0EB; color: #6B5E4F; }

        /* ============================================================ */
        /* MODAL                                                        */
        /* ============================================================ */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(28,25,23,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { background: white; border-radius: 20px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px 28px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #F5F0EB; margin-bottom: 16px; }
        .modal-header h2 { font-size: 20px; font-weight: 700; color: #1C1917; }
        .modal-close { background: transparent; border: none; color: #78716C; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; }
        .modal-close:hover { background: #F5F0EB; color: #1C1917; }

        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 13px; font-weight: 600; color: #1C1917; }
        .form-group .required { color: #C2614F; }
        .form-group input, .form-group select, .form-group textarea { padding: 10px 14px; border: 1.5px solid #F2D6D8; border-radius: 10px; font-size: 14px; background: #FAF7F2; color: #1C1917; outline: none; transition: all 0.25s ease; font-family: inherit; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #C2614F; background: white; box-shadow: 0 0 0 4px rgba(194,97,79,0.06); }
        .form-group small { font-size: 11px; color: #78716C; }

        .photo-group { grid-column: 1 / -1; }
        .photo-upload { border: 2px dashed #F2D6D8; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.25s ease; position: relative; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .photo-upload:hover { border-color: #C2614F; background: #FAF7F2; }
        .photo-upload input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .photo-upload svg { color: #C2614F; margin-bottom: 6px; }
        .photo-upload span { font-size: 13px; color: #78716C; }
        .photo-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #C2614F; }

        .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #F5F0EB; margin-top: 4px; }
        .btn-cancel { padding: 10px 24px; background: transparent; border: 1.5px solid #F2D6D8; border-radius: 50px; font-size: 14px; font-weight: 600; color: #78716C; cursor: pointer; transition: all 0.25s ease; }
        .btn-cancel:hover { border-color: #C2614F; color: #C2614F; }
        .btn-submit { display: flex; align-items: center; gap: 8px; padding: 10px 28px; background: #C2614F; border: none; border-radius: 50px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: all 0.25s ease; }
        .btn-submit:hover { background: #B25545; box-shadow: 0 4px 16px rgba(194,97,79,0.3); }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 1024px) { .nounous-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) {
          .nounous-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .nounou-card { padding: 16px; }
          .nounou-avatar img, .avatar-initials { width: 48px; height: 48px; font-size: 16px; }
          .nounou-info h3 { font-size: 14px; }
          .form-row { grid-template-columns: 1fr; }
          .modal-content { padding: 20px 16px; }
          .filter-group { display: grid; grid-template-columns: 1fr 1fr; }
          .header-count { display: none; }
          .btn-add { font-size: 13px; padding: 6px 16px; }
          .photo-preview { width: 60px; height: 60px; }
        }
        @media (max-width: 480px) {
          .nounous-grid { grid-template-columns: 1fr; }
          .filter-group { grid-template-columns: 1fr; }
          .header-title { font-size: 16px; }
          .btn-add { font-size: 12px; padding: 6px 14px; }
          .search-filters { flex-direction: column; }
          .nounou-card-top { flex-direction: column; align-items: center; text-align: center; }
          .nounou-meta { justify-content: center; }
          .nounou-badges { justify-content: center; }
          .nounou-rating { justify-content: center; }
          .nounou-price { justify-content: center; }
          .nounou-competences { justify-content: center; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .nounous-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1025px) {
          .nounous-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

    </div>
  );
}
