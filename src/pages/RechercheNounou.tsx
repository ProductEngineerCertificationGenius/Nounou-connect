// src/pages/RechercheNounou.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Clock,
  Users,
  Home,
  Briefcase,
  Star,
  Send,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useAuthStore } from "../store/useAuthStore";
import { getErrorMessage } from "../lib/errorHandler";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

type Step = 1 | 2 | 3 | 4 | 5;

interface AgenceResultat {
  id: string;
  nom: string;
  quartier?: string;
  note_moyenne?: number;
}

// ================================================================
// Réécriture complète du flux de recherche.
//
// Le formulaire d'origine (6 étapes : civilité/nom/téléphone,
// quartier, type de garde, tranches d'âge, précisions, résumé)
// terminait par un simple `alert()` — aucune donnée n'était
// réellement envoyée nulle part. Champs retirés (aucune colonne
// correspondante sur `demandes`, cf. 0001_schema.sql) : civilité, nom,
// téléphone (déjà connus : le ménage est authentifié), tranches d'âge,
// précisions libres.
//
// Nouveau flux, aligné sur notre schéma réel et notre fonction RPC :
//   1. Quartier          -> demandes.quartier (+ filtre RPC)
//   2. Besoin            -> demandes.besoin   (+ filtre RPC)
//   3. Temps souhaité     -> demandes.temps    (réutilise le visuel
//                            "type de garde" de l'original : temps
//                            plein / ponctuel, qui correspond bien à
//                            ce que la colonne `temps` représente)
//   4. Logement           -> demandes.logement
//   5. Résultats réels    -> agences correspondantes (RPC
//                            rechercher_agences), avec un vrai bouton
//                            "Envoyer une demande" qui insère dans
//                            `demandes` (statut 'En attente').
// ================================================================

const BESOINS = ["Garde d'enfants", "Aide ménagère", "Mixte (Garde + Ménage)"];

export default function RechercheNounou({ onClose }: { onClose: () => void }) {
  const currentUser = useAuthStore((s) => s.user);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ quartier: "", besoin: "", temps: "", logement: "" });
  const [resultats, setResultats] = useState<AgenceResultat[]>([]);
  const [demandeEnvoyeeA, setDemandeEnvoyeeA] = useState<string | null>(null);
  const totalSteps = 5;

  const rechercher = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data: matches, error } = await supabase.rpc("rechercher_agences", {
        p_quartier: formData.quartier,
        p_besoin: formData.besoin || null,
      });
      if (error) throw error;
      if (currentUser?.id) {
        await supabase.from("recherches").insert({
          menage_id: currentUser.id,
          quartier: formData.quartier,
          besoin: formData.besoin,
          temps: formData.temps,
          logement: formData.logement,
        });
      }
      if (!matches?.length) return [];
      // La vue `agences_public` (0007_calibrage_affichage.sql) expose la
      // colonne sous le nom `note` (alias de agences.note_moyenne), pas
      // `note_moyenne` directement. Sélectionner `note_moyenne` ici
      // provoquait un 400 côté PostgREST (colonne inexistante), qui
      // faisait échouer toute la recherche silencieusement (pas de
      // onError sur cette mutation à l'époque).
      const { data, error: publicError } = await supabase
        .from("agences_public")
        .select("id, nom, quartier, note_moyenne:note")
        .in("id", matches.map((a: { id: string }) => a.id));
      if (publicError) throw publicError;
      return data as AgenceResultat[];
    },
    onSuccess: (data) => {
      setResultats(data);
      setCurrentStep(5);
    },
    onError: (err) => {
      console.error("[RechercheNounou] Erreur recherche:", err);
      alert(getErrorMessage(err));
    },
  });

  const envoyerDemande = useMutation({
    mutationFn: async (agenceId: string) => {
      if (!currentUser?.id) throw new Error("Vous devez être connecté.");
      const { error } = await supabase.from("demandes").insert({
        agence_id: agenceId,
        menage_id: currentUser.id,
        quartier: formData.quartier,
        besoin: formData.besoin,
        temps: formData.temps,
        logement: formData.logement,
        statut: "En attente",
      });
      if (error) throw error;
      return agenceId;
    },
    onSuccess: (agenceId) => setDemandeEnvoyeeA(agenceId),
    onError: (err) => alert(getErrorMessage(err)),
  });

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1 && !formData.quartier) newErrors.quartier = "Sélectionnez un secteur";
    if (step === 2 && !formData.besoin) newErrors.besoin = "Choisissez un besoin";
    if (step === 3 && !formData.temps) newErrors.temps = "Choisissez une option";
    if (step === 4 && !formData.logement) newErrors.logement = "Choisissez une option";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 4) {
      rechercher.mutate();
      return;
    }
    if (currentStep < totalSteps) setCurrentStep((currentStep + 1) as Step);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
    setErrors({});
  };

  const goToStep = (step: Step) => {
    if (step < currentStep) { setCurrentStep(step); setErrors({}); }
  };

  const renderEtape1 = () => (
    <div className="step-content">
      <div className="step-icon"><MapPin size={32} strokeWidth={1.5} /></div>
      <h2 className="step-title">Secteur de recherche</h2>
      <p className="step-subtitle">Où cherchez-vous une nounou ?</p>
      <div className="form-group">
        <label>Quartier / Secteur <span className="required">*</span></label>
        <select
          value={formData.quartier}
          onChange={(e) => { setFormData({ ...formData, quartier: e.target.value }); setErrors({}); }}
          className={errors.quartier ? "error" : ""}
        >
          <option value="">Sélectionnez votre secteur</option>
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
        {errors.quartier && <span className="error-text">{errors.quartier}</span>}
      </div>
      <div className="sector-hint"><MapPin size={14} /><span>Les agences disponibles près de ce secteur vous seront proposées.</span></div>
    </div>
  );

  const renderEtape2 = () => (
    <div className="step-content">
      <div className="step-icon"><Users size={32} strokeWidth={1.5} /></div>
      <h2 className="step-title">Votre besoin</h2>
      <p className="step-subtitle">Quel type de service recherchez-vous ?</p>
      <div className="choice-grid-large">
        {BESOINS.map((b) => (
          <button
            key={b}
            className={`choice-card-large ${formData.besoin === b ? "selected" : ""}`}
            onClick={() => { setFormData({ ...formData, besoin: b }); setErrors({}); }}
          >
            <Briefcase size={28} />
            <span className="label">{b}</span>
          </button>
        ))}
      </div>
      {errors.besoin && <span className="error-text">{errors.besoin}</span>}
    </div>
  );

  const renderEtape3 = () => (
    <div className="step-content">
      <div className="step-icon"><Clock size={32} strokeWidth={1.5} /></div>
      <h2 className="step-title">Temps souhaité</h2>
      <p className="step-subtitle">Quel rythme recherchez-vous ?</p>
      <div className="choice-grid-large">
        {[
          { id: "Temps plein", icon: <Briefcase size={28} />, desc: "Garde régulière, suivi au quotidien" },
          { id: "Ponctuel", icon: <Clock size={28} />, desc: "Garde occasionnelle, soirées, week-ends" },
        ].map((option) => (
          <button
            key={option.id}
            className={`choice-card-large ${formData.temps === option.id ? "selected" : ""}`}
            onClick={() => { setFormData({ ...formData, temps: option.id }); setErrors({}); }}
          >
            {option.icon}
            <span className="label">{option.id}</span>
            <span className="desc">{option.desc}</span>
          </button>
        ))}
      </div>
      {errors.temps && <span className="error-text">{errors.temps}</span>}
    </div>
  );

  const renderEtape4 = () => (
    <div className="step-content">
      <div className="step-icon"><Home size={32} strokeWidth={1.5} /></div>
      <h2 className="step-title">Logement</h2>
      <p className="step-subtitle">Où la garde se déroulera-t-elle ?</p>
      <div className="choice-grid-large">
        {["Chez vous", "Chez la nounou"].map((l) => (
          <button
            key={l}
            className={`choice-card-large ${formData.logement === l ? "selected" : ""}`}
            onClick={() => { setFormData({ ...formData, logement: l }); setErrors({}); }}
          >
            <Home size={28} />
            <span className="label">{l}</span>
          </button>
        ))}
      </div>
      {errors.logement && <span className="error-text">{errors.logement}</span>}
    </div>
  );

  const renderEtape5 = () => (
    <div className="step-content">
      <div className="step-icon"><Star size={32} strokeWidth={1.5} /></div>
      <h2 className="step-title">Agences correspondantes</h2>
      <p className="step-subtitle">
        {resultats.length} agence{resultats.length !== 1 ? "s" : ""} avec des nounous disponibles à {formData.quartier}
      </p>
      <div className="resultats-list">
        {resultats.map((agence) => (
          <div key={agence.id} className="resultat-card">
            <div>
              <h3>{agence.nom}</h3>
              <div className="resultat-meta">
                <span><MapPin size={12} /> {agence.quartier}</span>
                {agence.note_moyenne != null && (
                  <span><Star size={12} color="#F59E0B" fill="#F59E0B" /> {agence.note_moyenne}</span>
                )}
              </div>
            </div>
            {demandeEnvoyeeA === agence.id ? (
              <span className="demande-envoyee">✅ Demande envoyée</span>
            ) : (
              <button
                className="btn-envoyer"
                onClick={() => envoyerDemande.mutate(agence.id)}
                disabled={envoyerDemande.isPending}
              >
                <Send size={14} /> Envoyer une demande
              </button>
            )}
          </div>
        ))}
        {resultats.length === 0 && (
          <p style={{ color: "#78716C", fontSize: 14 }}>
            Aucune agence avec une nounou disponible ne correspond à ces critères pour le moment.
          </p>
        )}
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderEtape1();
      case 2: return renderEtape2();
      case 3: return renderEtape3();
      case 4: return renderEtape4();
      case 5: return renderEtape5();
      default: return null;
    }
  };

  return (
    <div className="search-wizard">
      <div className="wizard-header">
        <div className="wizard-logo"><Logo size={28} /><span>Nounou Connect</span></div>
        <button className="close-btn" onClick={onClose}><X size={22} /></button>
      </div>

      <div className="progress-wrapper">
        <div className="progress-bar">
          {[...Array(totalSteps)].map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i + 1 === currentStep ? "active" : ""} ${i + 1 < currentStep ? "done" : ""}`}
              onClick={() => goToStep((i + 1) as Step)}
            />
          ))}
        </div>
        <div className="progress-label">Étape <span>{currentStep}</span> / {totalSteps}</div>
      </div>

      <div className="wizard-body">{renderStep()}</div>

      <div className="wizard-footer">
        {currentStep > 1 && currentStep < 5 && (
          <button className="btn-prev" onClick={prevStep}><ChevronLeft size={18} /> Retour</button>
        )}
        {currentStep < 4 && (
          <button className="btn-next" onClick={nextStep}>Continuer <ChevronRight size={18} /></button>
        )}
        {currentStep === 4 && (
          <button className="btn-next" onClick={nextStep} disabled={rechercher.isPending}>
            {rechercher.isPending ? "Recherche..." : "Rechercher"} <ChevronRight size={18} />
          </button>
        )}
      </div>

      <style>{`
        /* ============================================================ */
        /* VARIABLES - THEME NOUNOU CONNECT                             */
        /* ============================================================ */
        :root {
          --terracotta: #C2614F;
          --terracotta-light: #D4818A;
          --terracotta-lighter: #F2D6D8;
          --terracotta-pale: #F8EDEE;
          --sauge: #4A7C59;
          --sauge-light: #6BBF6B;
          --beige: #D4B896;
          --beige-light: #F8F6F5;
          --gris-fonce: #1C1917;
          --gris-moyen: #78716C;
          --blanc: #FFFFFF;
          --shadow: 0 4px 20px rgba(28, 25, 23, 0.06);
          --radius: 20px;
          --radius-sm: 14px;
        }

        /* ============================================================ */
        /* CONTAINER                                                    */
        /* ============================================================ */
        .search-wizard {
          max-width: 560px;
          margin: 0 auto;
          background: var(--blanc);
          border-radius: var(--radius);
          padding: 24px 22px 20px;
          box-shadow: var(--shadow);
          border: 1px solid rgba(212, 184, 150, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .wizard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .wizard-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 17px;
          font-weight: 700;
          color: var(--gris-fonce);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--gris-moyen);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: var(--beige-light);
          color: var(--terracotta);
        }

        /* ============================================================ */
        /* PROGRESS BAR                                                 */
        /* ============================================================ */
        .progress-wrapper {
          margin-bottom: 20px;
        }

        .progress-bar {
          display: flex;
          gap: 6px;
          margin-bottom: 6px;
        }

        .step-dot {
          flex: 1;
          height: 4px;
          border-radius: 50px;
          background: var(--terracotta-lighter);
          transition: background 0.3s ease;
          cursor: pointer;
        }

        .step-dot.active {
          background: var(--terracotta);
        }

        .step-dot.done {
          background: var(--sauge);
        }

        .progress-label {
          font-size: 12px;
          color: var(--gris-moyen);
          text-align: center;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        .progress-label span {
          color: var(--terracotta);
          font-weight: 700;
        }

        /* ============================================================ */
        /* STEP CONTENT                                                 */
        /* ============================================================ */
        .step-content {
          animation: fadeUp 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-icon {
          color: var(--terracotta);
          margin-bottom: 4px;
        }

        .step-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin-bottom: 2px;
          letter-spacing: -0.3px;
        }

        .step-subtitle {
          font-size: 14px;
          color: var(--gris-moyen);
          margin-bottom: 18px;
        }

        /* ============================================================ */
        /* FORM ELEMENTS                                                */
        /* ============================================================ */
        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--gris-fonce);
          margin-bottom: 6px;
        }

        .form-group .required {
          color: var(--terracotta);
          font-weight: 700;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 14px 16px;
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

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--terracotta);
          background: var(--blanc);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #E87A7A;
        }

        .form-group input::placeholder {
          color: var(--gris-moyen);
          opacity: 0.5;
        }

        .error-text {
          color: #E87A7A;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        /* ============================================================ */
        /* CHOIX CARTES (civilité)                                      */
        /* ============================================================ */
        .choice-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .choice-card {
          padding: 14px 12px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease;
          background: var(--blanc);
          user-select: none;
        }

        .choice-card:hover {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
        }

        .choice-card.selected {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.08);
        }

        .choice-card .emoji {
          font-size: 26px;
          display: block;
          margin-bottom: 2px;
        }

        .choice-card .label {
          font-size: 14px;
          font-weight: 600;
          color: var(--gris-fonce);
        }

        /* ============================================================ */
        /* CHOIX CARTES GRANDES (type garde)                            */
        /* ============================================================ */
        .choice-grid-large {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .choice-card-large {
          position: relative;
          padding: 18px 20px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.25s ease;
          background: var(--blanc);
          user-select: none;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .choice-card-large:hover {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
        }

        .choice-card-large.selected {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .choice-card-large .icon-large {
          color: var(--terracotta);
          flex-shrink: 0;
        }

        .choice-card-large .content {
          flex: 1;
        }

        .choice-card-large .title {
          font-size: 16px;
          font-weight: 700;
          color: var(--gris-fonce);
          display: block;
        }

        .choice-card-large .desc {
          font-size: 13px;
          color: var(--gris-moyen);
          display: block;
        }

        .choice-card-large .badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--sauge);
          background: #E8F5E8;
          padding: 2px 12px;
          border-radius: 50px;
          display: inline-block;
          margin-top: 4px;
        }

        .choice-card-large .check-badge {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--terracotta);
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ============================================================ */
        /* ÂGE DES ENFANTS                                              */
        /* ============================================================ */
        .age-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .age-card {
          padding: 18px 12px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease;
          background: var(--blanc);
          user-select: none;
        }

        .age-card:hover {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
        }

        .age-card.selected {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
          box-shadow: 0 0 0 4px rgba(194, 97, 79, 0.06);
        }

        .age-card .age-icon {
          color: var(--terracotta);
          display: block;
          margin-bottom: 4px;
        }

        .age-card .age-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--gris-fonce);
          display: block;
        }

        .age-card .age-desc {
          font-size: 11px;
          color: var(--gris-moyen);
          display: block;
        }

        /* ============================================================ */
        /* PRÉCISIONS                                                   */
        /* ============================================================ */
        .precision-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .precision-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          background: var(--blanc);
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .precision-card:hover {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
        }

        .precision-card.selected {
          border-color: var(--terracotta);
          background: var(--terracotta-pale);
        }

        .precision-card .precision-icon {
          color: var(--terracotta);
          flex-shrink: 0;
        }

        .precision-card .precision-content {
          flex: 1;
        }

        .precision-card .precision-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--gris-fonce);
        }

        .precision-card .precision-desc {
          font-size: 11px;
          color: var(--gris-moyen);
          display: block;
        }

        .precision-card-other {
          padding: 12px 16px;
          border: 2px dashed var(--terracotta-lighter);
          border-radius: var(--radius-sm);
          background: var(--blanc);
        }

        .precision-card-other input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--gris-fonce);
          outline: none;
          padding: 4px 0;
        }

        .precision-card-other input::placeholder {
          color: var(--gris-moyen);
          font-style: italic;
        }

        /* ============================================================ */
        /* SECTOR HINT                                                  */
        /* ============================================================ */
        .sector-hint {
          font-size: 13px;
          color: var(--gris-moyen);
          padding: 10px 14px;
          background: var(--beige-light);
          border-radius: var(--radius-sm);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 3px solid var(--terracotta);
        }

        /* ============================================================ */
        /* RÉCAPITULATIF                                                */
        /* ============================================================ */
        .recap-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .recap-item {
          background: var(--beige-light);
          border-radius: var(--radius-sm);
          padding: 12px 10px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.15);
        }

        .recap-item .recap-label {
          font-size: 10px;
          color: var(--gris-moyen);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          display: block;
        }

        .recap-item .recap-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--gris-fonce);
          margin-top: 2px;
        }

        .recap-item.full {
          grid-column: 1 / -1;
        }

        /* ============================================================ */
        /* RESULT BOX                                                   */
        /* ============================================================ */
        .result-box {
          background: #EFF9EF;
          border-radius: var(--radius-sm);
          padding: 16px;
          margin-top: 14px;
          text-align: center;
          border: 1px solid #C8E6C8;
        }

        .result-box .big-number {
          font-size: 34px;
          font-weight: 800;
          color: var(--sauge);
        }

        .result-box .result-text {
          font-size: 14px;
          color: var(--gris-fonce);
          font-weight: 500;
        }

        .result-box .result-sub {
          font-size: 12px;
          color: var(--gris-moyen);
          margin-top: 4px;
          opacity: 0.7;
        }

        /* ============================================================ */
        /* BOUTONS                                                      */
        /* ============================================================ */
        .wizard-footer {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-prev {
          flex: 1;
          padding: 14px 12px;
          border: 2px solid var(--terracotta-lighter);
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: var(--gris-moyen);
          background: transparent;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-prev:hover {
          background: var(--beige-light);
          border-color: var(--gris-moyen);
        }

        .btn-next {
          flex: 2;
          padding: 14px 16px;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 700;
          color: white;
          background: var(--terracotta);
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-next:hover {
          background: #B25545;
          box-shadow: 0 4px 16px rgba(194, 97, 79, 0.3);
        }

        .btn-publish {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 700;
          color: white;
          background: var(--sauge);
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }

        .btn-publish:hover {
          background: #3A6248;
          box-shadow: 0 4px 16px rgba(74, 124, 89, 0.3);
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 480px) {
          .search-wizard {
            padding: 16px 14px 16px;
            border-radius: 16px;
            min-height: 100vh;
          }
          .step-title {
            font-size: 20px;
          }
          .age-grid {
            grid-template-columns: 1fr 1fr;
          }
          .choice-grid {
            grid-template-columns: 1fr 1fr;
          }
          .recap-grid {
            grid-template-columns: 1fr;
          }
          .recap-item.full {
            grid-column: 1;
          }
          .wizard-footer {
            flex-direction: column;
            gap: 8px;
          }
          .btn-prev,
          .btn-next {
            flex: 1 1 100%;
            padding: 13px;
          }
          .choice-card-large {
            padding: 14px 16px;
            flex-wrap: wrap;
          }
          .choice-card-large .check-badge {
            position: static;
            transform: none;
          }
        }

        @media (min-width: 769px) {
          .search-wizard {
            max-width: 620px;
            padding: 32px 34px 28px;
            border-radius: 28px;
          }
          .step-title {
            font-size: 28px;
          }
          .age-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .precision-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .precision-card-other {
            grid-column: 1 / -1;
          }
          .recap-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .recap-item.full {
            grid-column: 1 / -1;
          }
          .result-box .big-number {
            font-size: 40px;
          }
        }
      `}</style>

      <style>{`
        .resultats-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .resultat-card {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px; border: 1px solid rgba(28,25,23,0.1); border-radius: 14px; background: #FAF7F2;
        }
        .resultat-card h3 { font-size: 15px; font-weight: 600; color: #1C1917; margin: 0 0 4px; }
        .resultat-meta { display: flex; gap: 12px; font-size: 12px; color: #78716C; align-items: center; }
        .resultat-meta span { display: flex; align-items: center; gap: 4px; }
        .btn-envoyer {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
          background: #4A7C59; color: white; border: none; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .btn-envoyer:disabled { opacity: 0.6; cursor: not-allowed; }
        .demande-envoyee { font-size: 13px; color: #4A7C59; font-weight: 600; }
      `}</style>
    </div>
  );
}
