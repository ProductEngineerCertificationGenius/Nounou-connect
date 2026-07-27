// src/pages/ConnexionPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Logo } from "../components/Logo";
import { useConnexion } from "../hooks/useAuth";
import { PIN_LENGTH } from "../lib/pin";
import { getErrorMessage } from "../lib/errorHandler";
import type { ProfileType } from "../store/useAuthStore";

const PROFILE_LANDING: Record<ProfileType, string> = {
  menage: "/espace-menage",
  agence: "/espace-agence",
  nounou: "/espace-nounou",
};

/* ================================================================ */
/* ===== PAGE DE CONNEXION (branchée sur Supabase Auth réel) ======= */
/* ================================================================ */
//
// Réécriture complète du flux d'origine : chez Noah, le PIN n'existait
// que pour l'agence, en 2ᵉ facteur après un OTP envoyé à CHAQUE
// connexion. Notre architecture réelle utilise le PIN comme mode de
// connexion principal pour les 3 profils (menage/agence/nounou), et
// l'OTP uniquement à l'activation du compte (géré par InscriptionPage)
// et pour réinitialiser un PIN oublié (géré ici).
export default function ConnexionPage() {
  const navigate = useNavigate();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [telephone, setTelephone] = useState("");
  const [selectedProfil, setSelectedProfil] = useState<ProfileType>("menage");
  // Sous-choix propre au profil nounou : purement une question de
  // messagerie/contexte affiché, la connexion elle-même (téléphone +
  // PIN, via useConnexion) est strictement identique dans les 2 cas —
  // "avec-agence" peut en plus déclencher l'activation automatique du
  // compte au tout premier essai (cf. useConnexion dans useAuth.ts).
  const [nounouLoginMode, setNounouLoginMode] = useState<"avec-agence" | "sans-agence" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const connexion = useConnexion();

  // ===== GESTIONNAIRES DE SAISIE CHIFFRE PAR CHIFFRE =====
  const makeDigitHandler = (
    values: string[],
    setValues: (v: string[]) => void,
    prefix: string,
    length: number
  ) => (index: number, value: string) => {
    if (value.length > 1 || !/^\d*$/.test(value)) return;
    const next = [...values];
    next[index] = value;
    setValues(next);
    if (value && index < length - 1) {
      document.getElementById(`${prefix}-${index + 1}`)?.focus();
    }
  };

  const makeKeyDownHandler = (values: string[], prefix: string) => (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      document.getElementById(`${prefix}-${index - 1}`)?.focus();
    }
  };

  const handlePinChange = makeDigitHandler(pin, setPin, "pin", PIN_LENGTH);
  const handlePinKeyDown = makeKeyDownHandler(pin, "pin");

  const handleSelectProfil = (p: ProfileType) => {
    setSelectedProfil(p);
    setNounouLoginMode(null);
    setErrorMessage("");
  };

  // ===== ÉTAPE 1 : CONNEXION PAR TÉLÉPHONE + PIN (sans SMS) =====
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const { profileType } = await connexion.mutateAsync({
        phone: telephone,
        pin: pin.join(""),
        profileType: selectedProfil,
      });
      navigate(PROFILE_LANDING[profileType]);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const goToInscription = () => navigate("/inscription");
  const goToResetPassword = () => navigate("/reset-password");

  return (
    <div className="connexion-page">
      <div className="connexion-container">
        <div className="connexion-header">
          <div className="connexion-logo">
            <Logo size={36} />
            <span>Nounou Connect</span>
          </div>
          <button onClick={() => navigate("/")} className="close-button">✕</button>
        </div>

        <div className="connexion-grid">
          <div className="connexion-svg">
            <img src="/connexion.svg" alt="Connexion" className="connexion-image" />
          </div>

          <div className="connexion-content">
            {errorMessage && (
              <p style={{ color: "#E87A7A", fontSize: 14, marginBottom: 16 }}>{errorMessage}</p>
            )}

            {/* ===== CONNEXION NORMALE : téléphone + PIN, 3 profils ===== */}
            <>
                <h2 className="connexion-title">Se connecter</h2>
                <p className="connexion-subtitle">Entrez votre téléphone et votre PIN</p>

                <div className="profil-selector">
                  <button
                    type="button"
                    className={`profil-option ${selectedProfil === "menage" ? "active" : ""}`}
                    onClick={() => handleSelectProfil("menage")}
                  >
                    🏠 Ménage
                  </button>
                  <button
                    type="button"
                    className={`profil-option ${selectedProfil === "agence" ? "active" : ""}`}
                    onClick={() => handleSelectProfil("agence")}
                  >
                    🏢 Agence
                  </button>
                  <button
                    type="button"
                    className={`profil-option ${selectedProfil === "nounou" ? "active" : ""}`}
                    onClick={() => handleSelectProfil("nounou")}
                  >
                    👩‍🍼 Nounou
                  </button>
                </div>

                {selectedProfil === "nounou" && !nounouLoginMode && (
                  <div className="nounou-mode-selector">
                    <button
                      type="button"
                      className="nounou-mode-option"
                      onClick={() => setNounouLoginMode("avec-agence")}
                    >
                      J'ai une agence
                      <small>Elle a déjà renseigné mon numéro</small>
                    </button>
                    <button
                      type="button"
                      className="nounou-mode-option"
                      onClick={() => setNounouLoginMode("sans-agence")}
                    >
                      Je n'ai pas encore d'agence
                      <small>Voir si des agences m'ont répondu</small>
                    </button>
                  </div>
                )}

                {(selectedProfil !== "nounou" || nounouLoginMode) && (
                  <>
                    {selectedProfil === "nounou" && (
                      <p className="field-hint" style={{ marginBottom: 12 }}>
                        {nounouLoginMode === "avec-agence"
                          ? "💡 Entrez le numéro que votre agence a renseigné et créez votre PIN : votre compte s'active automatiquement à cette première connexion."
                          : "💡 Reconnectez-vous pour voir si des agences vous ont répondu, et continuer à consulter celles disponibles dans votre zone."}
                        {" "}
                        <button
                          type="button"
                          onClick={() => setNounouLoginMode(null)}
                          style={{ background: "none", border: "none", color: "#C2614F", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 12 }}
                        >
                          Changer
                        </button>
                      </p>
                    )}

                    <form onSubmit={handleLoginSubmit} className="connexion-form">
                  <div className="form-group">
                    <label>Numéro de téléphone</label>
                    <input
                      type="tel"
                      placeholder="07 XX XX XX XX"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      required
                    />
                  </div>
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
                  </div>
                  <div className="forgot-password">
                    <a href="#" onClick={(e) => { e.preventDefault(); goToResetPassword(); }}>
                      PIN oublié ?
                    </a>
                  </div>
                  <button type="submit" className="submit-button" disabled={connexion.isPending}>
                    {connexion.isPending ? "Connexion..." : "Se connecter"}
                  </button>
                </form>
                  </>
                )}

                <p className="signup-link">
                  Vous n'avez pas encore de compte ?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); goToInscription(); }}>
                    S'inscrire
                  </a>
                </p>
            </>
          </div>
        </div>
      </div>

      <style>{`
        .connexion-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAF7F2;
          padding: clamp(16px, 4vw, 60px);
          font-family: 'Inter', sans-serif;
        }

        .connexion-container {
          max-width: 1100px;
          width: 100%;
          background: white;
          border-radius: 32px;
          padding: clamp(24px, 5vw, 56px);
          box-shadow: 0 24px 80px rgba(28,25,23,0.06);
          border: 1px solid rgba(212,184,150,0.12);
        }

        .connexion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .connexion-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .connexion-logo span {
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

        .connexion-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          min-height: 70vh;
        }

        .connexion-svg {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .connexion-image {
          width: 100%;
          max-width: 440px;
          height: auto;
        }

        .connexion-content {
          text-align: left;
        }

        .connexion-title {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(32px, 3.5vw, 44px);
          color: #1C1917;
          margin-bottom: 4px;
        }

        .connexion-subtitle {
          color: #78716C;
          font-size: clamp(14px, 1vw, 16px);
          margin-bottom: 28px;
        }

        /* ===== SÉLECTEUR DE PROFIL ===== */
        .profil-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .profil-option {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #E8DDD0;
          border-radius: 12px;
          background: transparent;
          font-size: 14px;
          font-weight: 600;
          color: #78716C;
          cursor: pointer;
          transition: all 0.2s;
        }

        .profil-option:hover {
          border-color: #D4B896;
        }

        .profil-option.active {
          border-color: #C2614F;
          background: #C2614F08;
          color: #C2614F;
        }

        .nounou-mode-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .nounou-mode-option {
          flex: 1;
          text-align: left;
          padding: 14px 16px;
          border: 2px solid #E8DDD0;
          border-radius: 14px;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 700;
          color: #1C1917;
        }

        .nounou-mode-option small {
          display: block;
          font-weight: 400;
          font-size: 12px;
          color: #78716C;
          margin-top: 4px;
        }

        .nounou-mode-option:hover {
          border-color: #D4B896;
        }

        .connexion-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-hint {
          font-size: 12px;
          color: #78716C;
          background: #FAF7F2;
          border: 1px solid rgba(212, 184, 150, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          line-height: 1.5;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #1C1917;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #D4B896;
          border-radius: 12px;
          font-size: 15px;
          background: #FAF7F2;
          outline: none;
          transition: border-color 0.2s;
          color: #1C1917;
        }

        .form-group input:focus {
          border-color: #C2614F;
        }

        .form-group input::placeholder {
          color: #B8A89A;
        }

        .otp-container {
          display: flex;
          gap: 10px;
          justify-content: flex-start;
        }

        .otp-input {
          width: 48px;
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
        }

        .otp-input:focus {
          border-color: #C2614F;
        }

        .otp-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 6px;
        }

        .resend-link {
          text-align: center;
          margin-top: -8px;
        }

        .resend-link a {
          color: #78716C;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }

        .resend-link a:hover {
          color: #C2614F;
          text-decoration: underline;
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

        .forgot-password {
          text-align: right;
          margin-top: -8px;
        }

        .forgot-password a {
          color: #78716C;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }

        .forgot-password a:hover {
          color: #C2614F;
          text-decoration: underline;
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
          transition: background 0.2s, transform 0.2s;
          margin-top: 4px;
        }

        .submit-button:hover {
          background: #B25545;
        }

        .signup-link {
          text-align: center;
          font-size: 14px;
          color: #78716C;
          margin-top: 16px;
        }

        .signup-link a {
          color: #C2614F;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        .signup-link a:hover {
          text-decoration: underline;
        }

        @media (max-width: 820px) {
          .connexion-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            min-height: auto;
          }
          .connexion-svg {
            order: -1;
          }
          .connexion-image {
            max-width: 280px;
          }
          .connexion-content {
            text-align: center;
          }
          .otp-container {
            justify-content: center;
          }
          .pin-container {
            justify-content: center;
          }
          .form-group {
            text-align: left;
          }
          .forgot-password {
            text-align: center;
          }
          .profil-selector {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .connexion-container {
            padding: 16px;
            border-radius: 20px;
          }
          .connexion-image {
            max-width: 200px;
          }
          .otp-input {
            width: 40px;
            height: 48px;
            font-size: 20px;
          }
          .pin-input {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }
          .pin-container {
            gap: 8px;
          }
          .connexion-title {
            font-size: 26px;
          }
          .profil-option {
            font-size: 12px;
            padding: 10px 12px;
          }
        }

        @media (max-width: 380px) {
          .otp-input {
            width: 34px;
            height: 42px;
            font-size: 16px;
          }
          .pin-input {
            width: 40px;
            height: 40px;
            font-size: 18px;
          }
          .connexion-header {
            flex-wrap: wrap;
          }
          .profil-selector {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
