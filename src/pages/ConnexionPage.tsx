// src/pages/ConnexionPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, MessageCircle, Building2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { useConnexion } from "../hooks/useAuth";
import { PIN_LENGTH } from "../lib/pin";
import { getErrorMessage } from "../lib/errorHandler";
import { useAuthStore, type ProfileType } from "../store/useAuthStore";

export default function ConnexionPage() {
  const navigate = useNavigate();
  const { setNounouMode, setNounouIdentifiant, setProfileType } = useAuthStore();

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [telephone, setTelephone] = useState("");
  const [selectedProfil, setSelectedProfil] = useState<ProfileType>("menage");
  const [errorMessage, setErrorMessage] = useState("");
  const [nounouMode, setNounouModeLocal] = useState<"avec-agence" | "sans-agence" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isNounou = selectedProfil === "nounou";
  const isMenageOrAgence = selectedProfil === "menage" || selectedProfil === "agence";
  const isMenage = selectedProfil === "menage";
  const isAgence = selectedProfil === "agence";

  const connexion = useConnexion();

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      // ---- CAS NOUNOU ----
      if (isNounou) {
        // ✅ Nounou : téléphone + PIN (pas d'identifiant)
        if (!telephone || telephone.length < 8) {
          setErrorMessage("Veuillez entrer votre numéro de téléphone.");
          setIsLoading(false);
          return;
        }

        const pinCode = pin.join("");
        if (pinCode.length !== PIN_LENGTH) {
          setErrorMessage(`Veuillez entrer les ${PIN_LENGTH} chiffres du PIN.`);
          setIsLoading(false);
          return;
        }

        const result = await connexion.mutateAsync({
          phone: telephone,
          pin: pinCode,
          profileType: "nounou",
        });

        if (result.row) {
          // ✅ On stocke le mode (avec ou sans agence) selon ce que l'utilisateur a choisi
          setNounouMode(nounouMode); // "avec-agence" ou "sans-agence"
          setNounouIdentifiant(null); // ❌ Pas d'identifiant
          setProfileType("nounou");
          navigate("/");
        }
        setIsLoading(false);
        return;
      }

      // ---- CAS MÉNAGE / AGENCE ----
      const pinCode = pin.join("");
      if (pinCode.length !== PIN_LENGTH) {
        setErrorMessage(`Veuillez entrer les ${PIN_LENGTH} chiffres du PIN.`);
        setIsLoading(false);
        return;
      }

      if (!telephone || telephone.length < 8) {
        setErrorMessage("Veuillez entrer votre numéro de téléphone.");
        setIsLoading(false);
        return;
      }

      const result = await connexion.mutateAsync({
        phone: telephone,
        pin: pinCode,
        profileType: selectedProfil,
      });

      if (result.row) {
        setProfileType(selectedProfil);
        navigate("/");
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProfil = () => {
    setSelectedProfil("menage");
    setNounouModeLocal(null);
    setErrorMessage("");
  };

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/2250152242299", "_blank");
  };

  const goToInscription = () => navigate("/inscription");

  // ===== RENDU SÉLECTEUR NOUNOU =====
  const renderNounouChoice = () => (
    <div className="nounou-choice">
      <p className="nounou-choice-title">👩‍🍼 Vous êtes nounou ?</p>
      <p className="nounou-choice-subtitle">Choisissez votre situation</p>
      <div className="nounou-choice-buttons">
        <button
          type="button"
          className="nounou-choice-btn with-agence"
          onClick={() => {
            setNounouModeLocal("avec-agence");
            setErrorMessage("");
          }}
        >
          <Building2 size={24} />
          <span>J'ai une agence</span>
          <small>Je me connecte avec mon téléphone et mon PIN</small>
        </button>
        <button
          type="button"
          className="nounou-choice-btn without-agence"
          onClick={() => {
            setNounouModeLocal("sans-agence");
            setErrorMessage("");
          }}
        >
          <User size={24} />
          <span>Je n'ai pas encore d'agence</span>
          <small>Je me connecte avec mon téléphone et mon PIN</small>
        </button>
      </div>
      <button
        type="button"
        className="nounou-choice-back"
        onClick={handleResetProfil}
      >
        ← Retour
      </button>
    </div>
  );

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

            {isNounou && nounouMode === null && renderNounouChoice()}

            {isNounou && nounouMode !== null && (
              <>
                <button
                  type="button"
                  className="back-to-choice"
                  onClick={() => setNounouModeLocal(null)}
                >
                  ← Retour
                </button>
                <h2 className="connexion-title">🔑 Connexion nounou</h2>
                <p className="connexion-subtitle">
                  Entrez votre téléphone et votre PIN pour accéder à votre espace
                </p>

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

                  <button type="submit" className="submit-button" disabled={isLoading || connexion.isPending}>
                    {isLoading || connexion.isPending ? "Connexion..." : "Se connecter"}
                  </button>
                </form>

                <div className="nounou-help">
                  <p>
                    Vous rencontrez des difficultés ?{" "}
                    <button
                      type="button"
                      onClick={handleWhatsAppContact}
                      className="nounou-help-link"
                    >
                      <MessageCircle size={14} />
                      Contacter le support
                    </button>
                  </p>
                </div>
              </>
            )}

            {isMenageOrAgence && (
              <>
                <h2 className="connexion-title">Se connecter</h2>
                <p className="connexion-subtitle">Entrez votre téléphone et votre PIN</p>

                <div className="profil-selector">
                  <button
                    type="button"
                    className={`profil-option ${isMenage ? "active" : ""}`}
                    onClick={() => {
                      setSelectedProfil("menage");
                      setErrorMessage("");
                    }}
                  >
                    🏠 Famille
                  </button>
                  <button
                    type="button"
                    className={`profil-option ${isAgence ? "active" : ""}`}
                    onClick={() => {
                      setSelectedProfil("agence");
                      setErrorMessage("");
                    }}
                  >
                    🏢 Agence
                  </button>
                  <button
                    type="button"
                    className={`profil-option ${isNounou ? "active" : ""}`}
                    onClick={() => {
                      setSelectedProfil("nounou");
                      setNounouModeLocal(null);
                      setErrorMessage("");
                    }}
                  >
                    👩‍🍼 Nounou
                  </button>
                </div>

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
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate("/reset-password"); }}>
                      PIN oublié ?
                    </a>
                  </div>

                  <button type="submit" className="submit-button" disabled={isLoading || connexion.isPending}>
                    {isLoading || connexion.isPending ? "Connexion..." : "Se connecter"}
                  </button>
                </form>

                <p className="signup-link">
                  Vous n'avez pas encore de compte ?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); goToInscription(); }}>
                    S'inscrire
                  </a>
                </p>
              </>
            )}
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

        .back-to-choice {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          margin-bottom: 12px;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .back-to-choice:hover {
          color: #F9940E;
        }

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
          border-color: #F9940E;
          background: #F9940E08;
          color: #F9940E;
        }

        .nounou-choice {
          text-align: center;
          padding: 8px 0;
        }

        .nounou-choice-title {
          font-size: 22px;
          font-weight: 700;
          color: #1C1917;
          margin: 0 0 4px;
        }

        .nounou-choice-subtitle {
          font-size: 14px;
          color: #78716C;
          margin: 0 0 20px;
        }

        .nounou-choice-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nounou-choice-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 20px;
          border: 2px solid #E8DDD0;
          border-radius: 16px;
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .nounou-choice-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(28,25,23,0.08);
        }

        .nounou-choice-btn.with-agence:hover {
          border-color: #4A7C59;
          background: #E8F5E8;
        }

        .nounou-choice-btn.without-agence:hover {
          border-color: #F9940E;
          background: #F8EDEE;
        }

        .nounou-choice-btn svg {
          color: #705334;
        }

        .nounou-choice-btn span {
          font-size: 16px;
          font-weight: 700;
          color: #1C1917;
        }

        .nounou-choice-btn small {
          font-size: 12px;
          color: #78716C;
        }

        .nounou-choice-back {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          font-size: 14px;
          margin-top: 16px;
          transition: color 0.2s;
        }

        .nounou-choice-back:hover {
          color: #F9940E;
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
          border-color: #F9940E;
        }

        .form-group input::placeholder {
          color: #B8A89A;
        }

        .field-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 4px;
          font-style: italic;
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
          color: #F9940E;
          text-decoration: underline;
        }

        .nounou-help {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F8EDEE;
          border-radius: 12px;
          border: 1px solid rgba(249,148,14,0.12);
          text-align: center;
        }

        .nounou-help p {
          font-size: 13px;
          color: #78716C;
          margin: 0;
        }

        .nounou-help-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #25D366;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
        }

        .nounou-help-link:hover {
          text-decoration: underline;
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
        }

        .submit-button:hover {
          opacity: 0.9;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .signup-link {
          text-align: center;
          font-size: 14px;
          color: #78716C;
          margin-top: 16px;
        }

        .signup-link a {
          color: #F9940E;
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
          .nounou-help {
            text-align: center;
          }
          .nounou-choice-buttons {
            align-items: center;
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
          .nounou-choice-btn {
            padding: 16px;
          }
          .nounou-choice-btn span {
            font-size: 14px;
          }
        }

        @media (max-width: 380px) {
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