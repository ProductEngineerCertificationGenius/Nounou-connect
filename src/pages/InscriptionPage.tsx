// src/pages/InscriptionPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Home, Building2, UserCheck, Eye, EyeOff, Shield, Lock } from "lucide-react";
import { Logo } from "../components/Logo";
import { PIN_LENGTH } from "../lib/pin";
import { getErrorMessage } from "../lib/errorHandler";
import type { ProfileType } from "../store/useAuthStore";
import { useAuthStore } from "../store/useAuthStore";

const PROFILE_LANDING: Record<ProfileType, string> = {
  menage: "/espace-menage",
  agence: "/espace-agence",
  nounou: "/espace-nounou",
};

// ===== VALIDATION TÉLÉPHONE =====
const validatePhoneNumber = (phone: string): boolean => {
  let clean = phone.replace(/\s/g, "");
  if (clean.startsWith("+225")) clean = clean.substring(4);
  else if (clean.startsWith("225")) clean = clean.substring(3);
  if (!/^\d{10}$/.test(clean)) return false;
  const prefix = clean.substring(0, 2);
  return ["01", "05", "07", "08", "09"].includes(prefix);
};

// ===== PAGE D'INSCRIPTION =====
export default function InscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProfil = searchParams.get("profil") as ProfileType | null;

  const { setProfileType, setUser } = useAuthStore();

  const [profil, setProfil] = useState<ProfileType | null>(initialProfil);
  const [screen, setScreen] = useState<"choix" | "form">(initialProfil ? "form" : "choix");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    quartier: "",
    email: "",
    description: "",
    ethnie: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // ===== SOUMISSION - MODE MOCK UNIQUEMENT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setIsLoading(true);

    if (!profil) {
      setServerError("Veuillez sélectionner un profil.");
      setIsLoading(false);
      return;
    }

    if (!validatePhoneNumber(formData.telephone)) {
      setPhoneError("Numéro invalide. Utilisez un format 07 XX XX XX XX");
      setIsLoading(false);
      return;
    }

    // Vérifications selon le profil
    if (profil === "menage" || profil === "agence") {
      if (pin.join("").length !== PIN_LENGTH) {
        setServerError(`Veuillez entrer un code PIN à ${PIN_LENGTH} chiffres.`);
        setIsLoading(false);
        return;
      }
      if (!formData.quartier) {
        setServerError("Veuillez sélectionner votre commune.");
        setIsLoading(false);
        return;
      }
    }

    // Ménage : nom + prénom requis
    if (profil === "menage") {
      if (!formData.nom || !formData.prenom) {
        setServerError("Veuillez remplir votre nom et prénom.");
        setIsLoading(false);
        return;
      }
    }

    // Agence : nom de l'agence requis (pas de prénom)
    if (profil === "agence") {
      if (!formData.nom) {
        setServerError("Veuillez entrer le nom de votre agence.");
        setIsLoading(false);
        return;
      }
    }

    // Nounou : nom + prénom + ethnie requis
    if (profil === "nounou") {
      if (!formData.nom || !formData.prenom) {
        setServerError("Veuillez remplir votre nom et prénom.");
        setIsLoading(false);
        return;
      }
      if (!formData.quartier) {
        setServerError("Veuillez sélectionner votre commune.");
        setIsLoading(false);
        return;
      }
      if (!formData.ethnie) {
        setServerError("Veuillez renseigner votre ethnie.");
        setIsLoading(false);
        return;
      }
    }

    // 🔥 SIMULATION D'INSCRIPTION
    try {
      let fullName = "";
      if (profil === "agence") {
        fullName = formData.nom;
      } else {
        fullName = `${formData.prenom} ${formData.nom}`;
      }

      const fakeUser = {
        id: `fake-${Date.now()}`,
        user_id: `fake-user-${Date.now()}`,
        nom: fullName,
        telephone: formData.telephone,
        quartier: formData.quartier,
        ...(profil === "nounou" && { ethnie: formData.ethnie, agence_id: null, disponible: true }),
        ...(profil === "agence" && { description: formData.description || "", email: formData.email || "" }),
        created_at: new Date().toISOString(),
      };

      setUser(fakeUser);
      setProfileType(profil);
      navigate(PROFILE_LANDING[profil]);
      
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
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
            { id: "menage" as const, bg: "#4A7C59", icon: <Home size={28} />, titre: "Famille", sub: "Je cherche une nounou" },
            { id: "agence" as const, bg: "#C2614F", icon: <Building2 size={28} />, titre: "Agence", sub: "Je gère un vivier" },
            { id: "nounou" as const, bg: "#D4B896", icon: <UserCheck size={28} />, titre: "Nounou", sub: "Je cherche une agence" },
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
            {isMenage && "Créer mon compte (Famille)"}
            {isAgence && "Créer mon compte (Agence)"}
            {isNounou && "Créer mon compte (Nounou)"}
          </h2>
          <p className="form-subtitle">
            {isMenage && "Remplissez vos informations pour commencer"}
            {isAgence && "Créez l'espace professionnel de votre agence"}
            {isNounou &&
              "Inscrivez-vous pour être mise en relation avec une agence de votre commune"}
          </p>

          {serverError && (
            <p style={{ color: "#E87A7A", fontSize: 14, marginBottom: 12 }}>{serverError}</p>
          )}

          <form onSubmit={handleSubmit} className="form-container">
            {/* NOM + PRÉNOM */}
            <div className="form-row">
              {isAgence ? (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Nom de l'agence <span className="required">*</span></label>
                  <input
                    type="text"
                    name="nom"
                    placeholder="Nounou Services"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                  />
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* TÉLÉPHONE */}
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

            {/* COMMUNE */}
            <div className="form-group">
              <label>Commune <span className="required">*</span></label>
              <select name="quartier" value={formData.quartier} onChange={handleChange} required>
                <option value="">Sélectionnez votre commune</option>
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

            {/* ETHNIE - UNIQUEMENT pour Nounou */}
            {isNounou && (
              <div className="form-group">
                <label>Ethnie <span className="required">*</span></label>
                <input
                  type="text"
                  name="ethnie"
                  placeholder="Akan, Baoulé, Malinké, etc."
                  value={formData.ethnie}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {/* CHAMPS SPÉCIFIQUES AGENCE */}
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
              </>
            )}

            {/* PIN : UNIQUEMENT pour Ménage et Agence */}
            {!isNounou && (
              <div className="form-group">
                <label className="pin-label">
                  <Lock size={16} className="pin-icon" />
                  Code PIN ({PIN_LENGTH} chiffres) <span className="required">*</span>
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
                  💡 Ce PIN vous servira à vous reconnecter.
                </p>
              </div>
            )}

            <button type="submit" className="submit-button" disabled={isLoading}>
              <Shield size={18} /> {isLoading ? "Envoi..." : "S'inscrire"}
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
        .inscription-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAF7F2;
          padding: clamp(16px, 4vw, 60px);
          font-family: "Inter", sans-serif;
        }

        .inscription-container {
          max-width: 1100px;
          width: 100%;
          background: white;
          border-radius: 32px;
          padding: clamp(24px, 5vw, 56px);
          box-shadow: 0 24px 80px rgba(28,25,23,0.06);
          border: 1px solid rgba(212,184,150,0.12);
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
          box-shadow: 0 12px 32px rgba(0,0,0,0.10);
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

        .back-button:hover {
          color: #C2614F;
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
          color: #C2614F;
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

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #C2614F;
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
          color: #C2614F;
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
          border-color: #C2614F;
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
          background: #C2614F;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 50px;
          font-size: clamp(16px, 1vw, 17px);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-button:hover {
          background: #B25545;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-link {
          text-align: center;
          font-size: 14px;
          color: #78716C;
          margin-top: 4px;
        }

        .login-link a {
          color: #C2614F;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

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
      `}</style>
    </div>
  );
}