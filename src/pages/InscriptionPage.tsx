// src/pages/InscriptionPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Home, Building2, UserCheck, Eye, EyeOff, Shield, Lock, Upload, FileWarning, FileCheck2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { useInscription } from "../hooks/useAuth";
import { useUploaderDocumentAgence, validerFichierDocument } from "../hooks/useAgence";
import { PIN_LENGTH } from "../lib/pin";
import { getErrorMessage } from "../lib/errorHandler";
import type { ProfileType } from "../store/useAuthStore";

const PROFILE_LANDING: Record<ProfileType, string> = {
  menage: "/espace-menage",
  agence: "/espace-agence",
  nounou: "/espace-nounou",
};

/* ================================================================ */
/* ===== VALIDATION TÉLÉPHONE ====================================== */
/* ================================================================ */
const validatePhoneNumber = (phone: string): boolean => {
  let clean = phone.replace(/\s/g, "");
  if (clean.startsWith("+225")) clean = clean.substring(4);
  else if (clean.startsWith("225")) clean = clean.substring(3);
  if (!/^\d{10}$/.test(clean)) return false;
  const prefix = clean.substring(0, 2);
  return ["01", "05", "07", "08", "09"].includes(prefix);
};

/* ================================================================ */
/* ===== PAGE D'INSCRIPTION / ACTIVATION (branchée sur Supabase) ==== */
/* ================================================================ */
//
// Deux corrections importantes par rapport au design d'origine :
//
// 1. Le PIN n'était prévu QUE pour l'agence. Notre architecture réelle
//    utilise le PIN comme mode de connexion pour les 3 profils : ajouté
//    aussi pour menage, et transformé pour nounou (voir point 2).
//
// 2. Seules les nounous sans agence s'inscrivent sur la plateforme :
//    le formulaire ne propose plus que l'auto-inscription libre (nom,
//    prénom, secteur, PIN), via la RPC `nounou_self_register`
//    (cf. migration 0012_nounou_self_insert.sql). L'ancien parcours
//    d'« activation » réservé aux nounous déjà ajoutées par une
//    agence (via `claim_nounou_profile`) a été retiré.
//
// Ajout par rapport à l'original : l'étape de confirmation par SMS
// (OTP), absente du fichier de départ (le "console.log" simulé
// redirigeait directement sans jamais vérifier de code).
export default function InscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProfil = searchParams.get("profil") as ProfileType | null;

  const [profil, setProfil] = useState<ProfileType | null>(initialProfil);
  const [screen, setScreen] = useState<"choix" | "form">(initialProfil ? "form" : "choix");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [formData, setFormData] = useState({
    nom: "",
    // Séparé du nom pour la nounou en auto-inscription (repris du
    // formulaire de cprincess) ; concaténés avant l'appel à l'API pour
    // ne pas toucher au hook useInscription / à la RPC nounou_self_register
    // qui n'attendent toujours qu'un seul champ "nom".
    prenom: "",
    telephone: "",
    secteur: "",
    ethnie: "",
    email: "",
    description: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [serverError, setServerError] = useState("");
  // Document justificatif agence : obligatoire, envoyé dans la foulée
  // de la création du compte (cf. useUploaderDocumentAgence).
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");

  const inscription = useInscription();
  const uploadDocument = useUploaderDocumentAgence();

  useEffect(() => {
    if (initialProfil) {
      setProfil(initialProfil);
      setScreen("form");
    }
  }, [initialProfil]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "telephone") setPhoneError("");
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1 || !/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < PIN_LENGTH - 1) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  // ===== ÉTAPE 1 : créer le compte (signUp + PIN), déclenche l'envoi du SMS =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!profil) {
      setServerError("Veuillez sélectionner un profil.");
      return;
    }
    const isSelfRegisterNounou = profil === "nounou";
    if (!validatePhoneNumber(formData.telephone)) {
      setPhoneError("Numéro invalide. Utilisez un format 07 XX XX XX XX");
      return;
    }
    if (pin.join("").length !== PIN_LENGTH) {
      setServerError(`Veuillez entrer un code PIN à ${PIN_LENGTH} chiffres.`);
      return;
    }
    if ((profil !== "nounou" || isSelfRegisterNounou) && !formData.secteur) {
      setServerError("Veuillez sélectionner votre secteur.");
      return;
    }
    if (isSelfRegisterNounou && (!formData.prenom || !formData.nom)) {
      setServerError("Veuillez remplir votre prénom et nom.");
      return;
    }
    if (profil === "agence") {
      if (!documentFile) {
        setServerError("Veuillez joindre un document justifiant l'existence de votre agence.");
        return;
      }
      const errFichier = validerFichierDocument(documentFile);
      if (errFichier) {
        setServerError(errFichier);
        return;
      }
    }

    try {
      const result = await inscription.mutateAsync({
        phone: formData.telephone,
        pin: pin.join(""),
        profileType: profil,
        pendingProfile:
          profil === "nounou"
            ? undefined
            : { nom: formData.nom, telephone: formData.telephone, quartier: formData.secteur },
        nounouSelfRegister: isSelfRegisterNounou
          ? {
              nom: `${formData.prenom} ${formData.nom}`.trim(),
              quartier: formData.secteur,
              ethnie: formData.ethnie || undefined,
            }
          : undefined,
      });
      if (result.row) {
        // Le compte agence existe désormais en base (result.row.id) : on
        // envoie le document justificatif avant de rediriger. Le compte
        // est déjà créé à ce stade même si l'upload échoue ci-dessous
        // (impossible de "annuler" une inscription déjà faite côté
        // Supabase Auth) — on affiche alors l'erreur et l'agence pourra
        // réessayer depuis l'écran de statut (EspaceAgence) qui gère
        // aussi l'envoi du document si celui-ci est manquant.
        if (profil === "agence" && documentFile) {
          try {
            await uploadDocument.mutateAsync({ agenceId: result.row.id, file: documentFile });
          } catch (uploadErr) {
            setServerError(
              `Votre compte a été créé, mais l'envoi du document a échoué (${getErrorMessage(
                uploadErr
              )}). Vous pourrez le renvoyer depuis votre espace agence.`
            );
          }
        }
        navigate(PROFILE_LANDING[profil]);
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const resetProfil = () => {
    setProfil(null);
    setScreen("choix");
  };

  const goToConnexion = () => navigate("/connexion");

  // ===== RENDU DES CARTES DE CHOIX =====
  const renderProfilChoix = () => (
    <div className="inscription-grid">
      <div className="inscription-svg">
        <img src="/inscription.svg" alt="Choix du profil" className="inscription-image" />
      </div>
      <div className="inscription-content">
        <h2 className="inscription-title">Qui êtes-vous ?</h2>
        <p className="inscription-subtitle">Choisissez votre profil pour commencer</p>
        <div className="profil-grid">
          {[
            { id: "menage" as const, bg: "linear-gradient(90deg, #FFC408 0%, #F9940E 100%)", icon: <Home size={28} />, titre: "Ménage", sub: "Je cherche" },
            { id: "agence" as const, bg: "#d4d3d1", icon: <Building2 size={28} />, titre: "Agence", sub: "Je gère" },
            { id: "nounou" as const, bg: "#F3811E", icon: <UserCheck size={28} />, titre: "Nounou", sub: "Rejoindre" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setProfil(c.id);
                setScreen("form");
              }}
              className="profil-card"
              style={{ background: c.bg }}
            >
              {c.icon}
              <div className="profil-card-title">{c.titre}</div>
              <div className="profil-card-sub">{c.sub}</div>
            </button>
          ))}
        </div>
        <p className="login-link" style={{ marginTop: 24 }}>
          Vous avez déjà un compte ?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); goToConnexion(); }}>
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );

  // ===== RENDU DU FORMULAIRE =====
  const renderFormulaire = () => {
    const isAgence = profil === "agence";
    const isMenage = profil === "menage";
    const isNounou = profil === "nounou";
    const isSelfRegisterNounou = isNounou;
    const showNomSecteur = !isNounou || isSelfRegisterNounou;

    return (
      <div className="inscription-grid">
        <div className="inscription-svg">
          <img src="/inscription.svg" alt="Illustration" className="inscription-image" />
        </div>
        <div className="inscription-content">
          <button onClick={resetProfil} className="back-button">
            <span>←</span> Retour
          </button>

          <h2 className="form-title">
            {isMenage && "Créer mon compte (Ménage)"}
            {isAgence && "Créer mon compte (Agence)"}
            {isNounou && "Créer mon compte (Nounou)"}
          </h2>
          <p className="form-subtitle">
            {isMenage && "Remplissez vos informations pour commencer"}
            {isAgence && "Créez l'espace professionnel de votre agence"}
            {isNounou && "Inscrivez-vous pour être visible auprès des agences de votre secteur"}
          </p>

          {serverError && (
            <p style={{ color: "#E87A7A", fontSize: 14, marginBottom: 12 }}>{serverError}</p>
          )}

          <form onSubmit={handleSubmit} className="form-container">
            {/* Nom : demandé sauf activation nounou avec agence (déjà renseigné par l'agence) */}
            {/* Nounou en auto-inscription : prénom + nom séparés (repris du formulaire cprincess) */}
            {isSelfRegisterNounou && (
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom <span className="required">*</span></label>
                  <input
                    type="text"
                    name="prenom"
                    placeholder="Amenan"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom <span className="required">*</span></label>
                  <input
                    type="text"
                    name="nom"
                    placeholder="Koffi"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}
            {showNomSecteur && !isSelfRegisterNounou && (
              <div className="form-group">
                <label>
                  {isAgence ? "Nom de l'agence" : "Prénom et Nom"} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  placeholder={isAgence ? "Nounou Services" : "Koffi Amenan"}
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Numéro de téléphone <span className="required">*</span></label>
              <input
                type="tel"
                name="telephone"
                placeholder="07 XX XX XX XX"
                value={formData.telephone}
                onChange={handleChange}
                onBlur={(e) => {
                  if (e.target.value && !validatePhoneNumber(e.target.value)) {
                    setPhoneError("Format invalide. Exemple: 07 01 23 45 67");
                  }
                }}
                className={phoneError ? "input-error" : ""}
                required
              />
              {phoneError && <span className="error-message">{phoneError}</span>}
            </div>

            {/* Secteur : pas demandé à la nounou en activation (déjà renseigné par l'agence) */}
            {/* Nounou en auto-inscription : liste de communes élargie (reprise de cprincess) */}
            {isSelfRegisterNounou && (
              <div className="form-group">
                <label>Secteur <span className="required">*</span></label>
                <select name="secteur" value={formData.secteur} onChange={handleChange} required>
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
              </div>
            )}
            {showNomSecteur && !isSelfRegisterNounou && (
              <div className="form-group">
                <label>Secteur <span className="required">*</span></label>
                <select name="secteur" value={formData.secteur} onChange={handleChange} required>
                  <option value="">Sélectionnez votre secteur</option>
                  <option value="Abobo">Abobo</option>
                  <option value="Cocody">Cocody</option>
                  <option value="Koumassi">Koumassi</option>
                  <option value="Plateau">Plateau</option>
                  <option value="Yopougon">Yopougon</option>
                  <option value="Bingerville">Bingerville</option>
                  <option value="Bassam">Bassam</option>
                  <option value="Macory">Macory</option>
                  <option value="N'dotré">N'dotré</option>
                </select>
              </div>
            )}

            {isSelfRegisterNounou && (
              <div className="form-group">
                <label>Ethnie <span className="optional">(optionnel)</span></label>
                <input
                  type="text"
                  name="ethnie"
                  placeholder="Akan, Baoulé, Malinké, etc."
                  value={formData.ethnie}
                  onChange={handleChange}
                />
              </div>
            )}

            {isAgence && (
              <>
                <div className="form-group">
                  <label>Email professionnel <span className="optional">(optionnel)</span></label>
                  <input
                    type="email"
                    name="email"
                    placeholder="contact@agence.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Description de l'agence <span className="optional">(optionnel)</span></label>
                  <textarea
                    name="description"
                    placeholder="Présentez votre agence..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Document justifiant l'existence de l'agence <span className="required">*</span>
                  </label>
                  <label className="document-upload-zone">
                    {documentFile ? <FileCheck2 size={20} /> : <Upload size={20} />}
                    <span>{documentFile ? documentFile.name : "RCCM, registre de commerce, ou équivalent (PDF, JPG, PNG)"}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const err = validerFichierDocument(f);
                        if (err) {
                          setDocumentError(err);
                          setDocumentFile(null);
                          return;
                        }
                        setDocumentError("");
                        setDocumentFile(f);
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {documentError && (
                    <span className="error-message"><FileWarning size={14} /> {documentError}</span>
                  )}
                  <p className="field-hint">
                    💡 Ce document nous permet de vérifier que votre agence existe réellement.
                    Il ne sera visible que par notre équipe, jamais publié sur votre profil.
                  </p>
                </div>
              </>
            )}

            {/* PIN : demandé aux 3 profils (remplace l'OTP au quotidien) */}
            <div className="form-group">
              <label className="pin-label">
                <Lock size={16} className="pin-icon" />
                Code PIN ({PIN_LENGTH} chiffres)
              </label>
              <div className="pin-container">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    id={`pin-${index}`}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[index]}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="pin-input"
                    autoFocus={index === 0}
                  />
                ))}
                <button type="button" onClick={() => setShowPin(!showPin)} className="pin-toggle">
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="pin-hint">
                💡 Ce PIN vous servira à vous reconnecter directement, sans recevoir de SMS à chaque fois.
              </p>
            </div>

            <button type="submit" className="submit-button" disabled={inscription.isPending || uploadDocument.isPending}>
              <Shield size={18} /> {inscription.isPending || uploadDocument.isPending ? "Envoi..." : "S'inscrire"}
            </button>

            <p className="login-link">
              Vous avez déjà un compte ?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); goToConnexion(); }}>
                Se connecter
              </a>
            </p>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="inscription-page">
      <div className="inscription-container">
        <div className="inscription-header">
          <div className="inscription-logo">
            <Logo size={36} />
            <span>Nounou Connect</span>
          </div>
          <button onClick={() => navigate("/")} className="close-button">✕</button>
        </div>
        {screen === "choix" && renderProfilChoix()}
        {screen === "form" && profil && renderFormulaire()}
      </div>

      <style>{`
        /* ============================================================ */
        /* PAGE                                                         */
        /* ============================================================ */
        .inscription-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #F7F7F7;
          padding: clamp(16px, 4vw, 60px);
          font-family: "Inter", sans-serif;
        }

        .inscription-container {
          max-width: 1100px;
          width: 100%;
          background: white;
          border-radius: 32px;
          padding: clamp(24px, 5vw, 56px);
          box-shadow:0 24px 80px rgba(28, 25, 23, 0.06);
          border: 1px solid rgba(212, 184, 150, 0.12);
        }

        .inscription-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .inscription-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .inscription-logo span {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
        }

        .close-button {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
        }

        .inscription-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          min-height: 70vh;
        }

        .inscription-svg {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .inscription-image {
          width: 100%;
          max-width: 480px;
          height: auto;
        }

        .inscription-content {
          text-align: left;
        }

        .inscription-title {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(32px, 3.5vw, 44px);
          color: #1C1917;
          margin-bottom: 8px;
        }

        .inscription-subtitle {
          color: #78716C;
          font-size: clamp(16px, 1.2vw, 18px);
          margin-bottom: 36px;
        }

        .profil-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          max-width: 540px;
        }

        .profil-card {
          color: white;
          border-radius: 16px;
          padding: 28px 16px;
          border: none;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .profil-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.10);
        }

        .profil-card-title {
          font-weight: 700;
          font-size: 16px;
        }

        .profil-card-sub {
          font-size: 13px;
          opacity: 0.85;
        }

        .back-button {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .form-title {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(28px, 2.8vw, 36px);
          color: #1C1917;
          margin-bottom: 4px;
        }

        .form-subtitle {
          color: #78716C;
          font-size: clamp(14px, 1vw, 16px);
          margin-bottom: 28px;
        }

        .form-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
        }

        .form-group .required {
          color: #F9940E;
        }

        .form-group .optional {
          font-weight: 400;
          color: #78716C;
          font-size: 13px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #D4B896;
          border-radius: 12px;
          font-size: 15px;
          background: #FAF7F2;
          outline: none;
          transition: border-color 0.2s;
          color: #1C1917;
          font-family: inherit;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .document-upload-zone {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border: 1.5px dashed #D4B896;
          border-radius: 12px;
          background: #FAF7F2;
          color: #78716C;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .document-upload-zone:hover {
          border-color: #C2614F;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #F9940E;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #B8A89A;
        }

        .field-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 4px;
        }

        .input-error {
          border-color: #E87A7A !important;
        }

        .error-message {
          color: #E87A7A;
          font-size: 12px;
          margin-top: 2px;
        }

        .pin-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pin-icon {
          color: #F9940E;
        }

        .pin-container {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .pin-input {
          width: 56px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          border: 1.5px solid #D4B896;
          border-radius: 12px;
          background: #FAF7F2;
          outline: none;
          transition: border-color 0.2s;
          color: #1C1917;
          letter-spacing: 4px;
        }

        .pin-input:focus {
          border-color: #F9940E;
        }

        .pin-toggle {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 8px;
        }

        .pin-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 6px;
        }

        .submit-button {
          background: linear-gradient(90deg, #FFC408 0%, #F9940E 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 50px;
          font-size: clamp(16px, 1vw, 17px);
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-button:hover {
          opacity: 0.9;
        }

        .login-link {
          text-align: center;
          font-size: 14px;
          color: #78716C;
          margin-top: 4px;
        }

        .login-link a {
          color: #F9940E;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 820px) {
          .inscription-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            min-height: auto;
          }
          .inscription-svg {
            order: -1;
          }
          .inscription-image {
            max-width: 300px;
          }
          .inscription-content {
            text-align: center;
          }
          .profil-grid {
            grid-template-columns: repeat(3, 1fr);
            max-width: 100%;
            margin: 0 auto;
          }
          .pin-container {
            justify-content: center;
          }
          .form-group {
            text-align: left;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .inscription-container {
            padding: 16px;
            border-radius: 20px;
          }
          .profil-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .profil-card {
            padding: 20px 12px;
          }
          .inscription-image {
            max-width: 200px;
          }
          .pin-input {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }
          .pin-container {
            gap: 8px;
          }
          .form-title {
            font-size: 22px;
          }
        }

        @media (max-width: 380px) {
          .profil-grid {
            grid-template-columns: 1fr;
          }
          .pin-input {
            width: 40px;
            height: 40px;
            font-size: 18px;
          }
          .inscription-header {
            flex-wrap: wrap;
          }
        }
        .otp-container {
          display: flex;
          gap: 10px;
        }

        .otp-input {
          width: 44px;
          height: 52px;
          text-align: center;
          font-size: 20px;
          font-weight: 600;
          border: 2px solid rgba(28, 25, 23, 0.12);
          border-radius: 12px;
          background: #FAF7F2;
        }

        .otp-input:focus {
          outline: none;
          border-color: #4A7C59;
        }

      `}</style>

    </div>
  );
}