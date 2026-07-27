// src/pages/ResetPasswordPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, MessageCircle, ArrowLeft } from "lucide-react";
import { Logo } from "../components/Logo";
import { useDemanderResetPin, useDefinirNouveauPin } from "../hooks/useAuth";
import { PIN_LENGTH } from "../lib/pin";
import { getErrorMessage } from "../lib/errorHandler";
import type { ProfileType } from "../store/useAuthStore";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "whatsapp" | "newpin">("phone");
  const [showPin, setShowPin] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [selectedProfil, setSelectedProfil] = useState<ProfileType>("menage");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [whatsappNumber] = useState("0152242299");

  const demanderReset = useDemanderResetPin();
  const definirNouveauPin = useDefinirNouveauPin();

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1 || !/^\d*$/.test(value)) return;
    const newPins = [...newPin];
    newPins[index] = value;
    setNewPin(newPins);
    setErrorMessage("");
    if (value && index < PIN_LENGTH - 1) {
      document.getElementById(`newpin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !newPin[index] && index > 0) {
      document.getElementById(`newpin-${index - 1}`)?.focus();
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!telephone || telephone.length < 8) {
      setErrorMessage("Veuillez entrer un numéro de téléphone valide.");
      return;
    }

    try {
      await demanderReset.mutateAsync(telephone);
      setStep("whatsapp");
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `🔐 Réinitialisation de mon PIN Nounou Connect\n\n` +
      `Bonjour, je souhaite réinitialiser mon code PIN.\n` +
      `📱 Mon numéro : ${telephone}\n` +
      `👤 Mon profil : ${selectedProfil}\n\n` +
      `Merci de me contacter pour procéder à la réinitialisation.`
    );

    window.open(`https://wa.me/225${whatsappNumber.replace(/[^0-9]/g, "")}?text=${message}`, "_blank");
    setStep("newpin");
    setSuccessMessage("✅ Un message a été envoyé à notre support. Veuillez attendre la confirmation.");
  };

  const handleNewPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const pinCode = newPin.join("");
    if (pinCode.length !== PIN_LENGTH) {
      setErrorMessage(`Veuillez entrer un code PIN à ${PIN_LENGTH} chiffres.`);
      return;
    }

    try {
      const { data: { session } } = await import("../lib/supabase").then(m => m.supabase.auth.getSession());

      if (!session?.user) {
        setErrorMessage("Veuillez vous reconnecter pour modifier votre PIN.");
        setTimeout(() => navigate("/connexion"), 2000);
        return;
      }

      await definirNouveauPin.mutateAsync({
        pin: pinCode,
        profileType: selectedProfil,
        userId: session.user.id,
      });

      setSuccessMessage("✅ Votre PIN a été réinitialisé avec succès !");
      setTimeout(() => navigate("/connexion"), 2000);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const goToConnexion = () => navigate("/connexion");
  const goBack = () => {
    if (step === "phone") goToConnexion();
    else setStep("phone");
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <div className="reset-password-logo">
            <Logo size={36} />
            <span>Nounou Connect</span>
          </div>
          <button onClick={goToConnexion} className="close-button">✕</button>
        </div>

        <div className="reset-password-grid">
          <div className="reset-password-svg">
            <img src="/connexion.svg" alt="Réinitialisation" className="reset-password-image" />
          </div>

          <div className="reset-password-content">
            {errorMessage && (
              <p style={{ color: "#E87A7A", fontSize: 14, marginBottom: 16 }}>{errorMessage}</p>
            )}
            {successMessage && (
              <p style={{ color: "#4A7C59", fontSize: 14, marginBottom: 16 }}>{successMessage}</p>
            )}

            {step === "phone" && (
              <>
                <button onClick={goBack} className="back-button">
                  <ArrowLeft size={16} /> Retour
                </button>
                <div className="step-indicator">Étape 1 / 3</div>
                <h2 className="reset-title">🔐 PIN oublié</h2>
                <p className="reset-subtitle">
                  Entrez votre numéro pour être contacté par notre support WhatsApp
                </p>

                <form onSubmit={handlePhoneSubmit} className="reset-form">
                  <div className="form-group">
                    <label>Sélectionnez votre profil</label>
                    <div className="profil-selector">
                      {[
                        { id: "menage" as const, label: "🏠 Ménage" },
                        { id: "agence" as const, label: "🏢 Agence" },
                        { id: "nounou" as const, label: "👩‍🍼 Nounou" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`profil-option ${selectedProfil === p.id ? "active" : ""}`}
                          onClick={() => setSelectedProfil(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Numéro de téléphone</label>
                    <input
                      type="tel"
                      placeholder="07 XX XX XX XX"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      required
                    />
                    <p className="field-hint">
                      💡 Le numéro associé à votre compte Nounou Connect
                    </p>
                  </div>

                  <button type="submit" className="submit-button" disabled={demanderReset.isPending}>
                    {demanderReset.isPending ? "Vérification..." : "Continuer"}
                  </button>
                </form>
              </>
            )}

            {step === "whatsapp" && (
              <>
                <button onClick={goBack} className="back-button">
                  <ArrowLeft size={16} /> Retour
                </button>
                <div className="step-indicator">Étape 2 / 3</div>
                <h2 className="reset-title">📱 Contactez-nous sur WhatsApp</h2>
                <p className="reset-subtitle">
                  Cliquez sur le bouton ci-dessous pour nous contacter et confirmer votre identité
                </p>

                <div className="whatsapp-info">
                  <div className="whatsapp-icon-wrapper">
                    <MessageCircle size={48} color="#25D366" />
                  </div>
                  <p style={{ fontSize: 14, color: "#78716C", textAlign: "center", marginBottom: 8 }}>
                    Notre équipe vous répondra sous <strong>quelques minutes</strong> pour confirmer votre identité.
                  </p>
                  <p style={{ fontSize: 13, color: "#78716C", textAlign: "center", marginBottom: 16 }}>
                    📱 Une fois confirmé, vous pourrez définir un nouveau PIN.
                  </p>
                </div>

                <button onClick={handleWhatsAppContact} className="whatsapp-button">
                  <MessageCircle size={20} />
                  Contacter le support WhatsApp
                </button>

                <div className="whatsapp-note">
                  <p style={{ fontSize: 12, color: "#78716C", textAlign: "center", marginTop: 16 }}>
                    💡 Après avoir contacté le support, revenez ici pour définir votre nouveau PIN.
                  </p>
                </div>
              </>
            )}

            {step === "newpin" && (
              <>
                <button onClick={goBack} className="back-button">
                  <ArrowLeft size={16} /> Retour
                </button>
                <div className="step-indicator">Étape 3 / 3</div>
                <h2 className="reset-title">🔐 Nouveau code PIN</h2>
                <p className="reset-subtitle">
                  Choisissez un nouveau code PIN à {PIN_LENGTH} chiffres
                </p>

                <form onSubmit={handleNewPinSubmit} className="reset-form">
                  <div className="form-group">
                    <label className="pin-label">
                      <Lock size={16} className="pin-icon" />
                      Nouveau code PIN ({PIN_LENGTH} chiffres)
                    </label>
                    <div className="pin-container">
                      {[0, 1, 2, 3].map((index) => (
                        <input
                          key={index}
                          id={`newpin-${index}`}
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={1}
                          value={newPin[index]}
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
                      🔐 Choisissez un code PIN que vous pourrez retenir facilement.
                    </p>
                  </div>

                  <button type="submit" className="submit-button" disabled={definirNouveauPin.isPending}>
                    {definirNouveauPin.isPending ? "Réinitialisation..." : "Réinitialiser mon PIN"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .reset-password-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAF7F2;
          padding: clamp(16px, 4vw, 60px);
          font-family: 'Inter', sans-serif;
        }

        .reset-password-container {
          max-width: 1100px;
          width: 100%;
          background: white;
          border-radius: 32px;
          padding: clamp(24px, 5vw, 56px);
          box-shadow: 0 24px 80px rgba(28,25,23,0.06);
          border: 1px solid rgba(212,184,150,0.12);
        }

        .reset-password-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .reset-password-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .reset-password-logo span {
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

        .back-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          margin-bottom: 12px;
          transition: color 0.2s;
        }

        .back-button:hover {
          color: #C2614F;
        }

        .reset-password-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          min-height: 70vh;
        }

        .reset-password-svg {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .reset-password-image {
          width: 100%;
          max-width: 440px;
          height: auto;
        }

        .reset-password-content {
          text-align: left;
        }

        .step-indicator {
          font-size: 12px;
          font-weight: 600;
          color: #C2614F;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .reset-title {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(32px, 3.5vw, 44px);
          color: #1C1917;
          margin-bottom: 4px;
        }

        .reset-subtitle {
          color: #78716C;
          font-size: clamp(14px, 1vw, 16px);
          margin-bottom: 28px;
        }

        .profil-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .profil-option {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #E8DDD0;
          border-radius: 12px;
          background: transparent;
          font-size: 13px;
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

        .reset-form {
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
          border-color: #C2614F;
        }

        .form-group input::placeholder {
          color: #B8A89A;
        }

        .field-hint {
          font-size: 12px;
          color: #78716C;
          margin-top: 4px;
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

        .whatsapp-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
        }

        .whatsapp-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #E8F5E8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .whatsapp-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .whatsapp-button:hover {
          background: #1EBE5E;
          transform: scale(1.02);
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);
        }

        .whatsapp-note {
          margin-top: 12px;
        }

        @media (max-width: 820px) {
          .reset-password-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            min-height: auto;
          }
          .reset-password-svg {
            order: -1;
          }
          .reset-password-image {
            max-width: 280px;
          }
          .reset-password-content {
            text-align: center;
          }
          .pin-container {
            justify-content: center;
          }
          .form-group {
            text-align: left;
          }
          .profil-selector {
            justify-content: center;
          }
          .back-button {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .reset-password-container {
            padding: 16px;
            border-radius: 20px;
          }
          .reset-password-image {
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
          .reset-title {
            font-size: 26px;
          }
          .profil-option {
            font-size: 12px;
            padding: 8px 10px;
          }
          .whatsapp-button {
            font-size: 14px;
            padding: 14px;
          }
        }

        @media (max-width: 380px) {
          .pin-input {
            width: 40px;
            height: 40px;
            font-size: 18px;
          }
          .reset-password-header {
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