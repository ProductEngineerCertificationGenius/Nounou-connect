// src/pages/AProposPage.tsx
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Shield, Handshake } from "lucide-react";
import { Logo } from "../components/Logo";

export default function AProposPage() {
  const navigate = useNavigate();

  return (
    <div className="a-propos-page">
      {/* HEADER */}
      <header className="a-propos-header">
        <div className="a-propos-header-content">
          <button className="btn-back" onClick={() => navigate("/")}>
            <ChevronLeft size={20} />
            Retour à l'accueil
          </button>
          <div className="a-propos-logo">
            <Logo size={32} />
            <span>Nounou Connect</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="a-propos-hero">
        <div className="a-propos-hero-content">
          <h1>À propos de Nounou Connect</h1>
          <p>La plateforme de confiance pour trouver votre nounou en Côte d'Ivoire</p>
        </div>
      </section>

      {/* CONTENU */}
      <section className="a-propos-content">
        <div className="a-propos-container">
          <div className="a-propos-section">
            <h2>Notre mission</h2>
            <p>
              Nounou Connect a pour mission de simplifier la mise en relation entre les familles,
              les agences de placement et les nounous professionnelles en Côte d'Ivoire.
            </p>
            <p>
              Nous croyons que chaque famille mérite de trouver la personne idéale pour s'occuper
              de ses enfants, et que chaque nounou mérite d'être mise en valeur pour ses compétences
              et son expérience.
            </p>
          </div>

          <div className="a-propos-section">
            <h2>Nos valeurs</h2>
            <div className="valeurs-grid">
              <div className="valeur-card">
                <Shield className="valeur-icon" />
                <h4>Confiance</h4>
                <p>Chaque nounou est vérifiée par son agence partenaire.</p>
              </div>
              <div className="valeur-card">
                <Handshake className="valeur-icon" />
                <h4>Transparence</h4>
                <p>Des profils complets et des avis authentiques.</p>
              </div>
              <div className="valeur-card">
                <Heart className="valeur-icon" />
                <h4>Bienveillance</h4>
                <p>Une communauté engagée pour le bien-être des enfants.</p>
              </div>
            </div>
          </div>

          <div className="a-propos-section">
            <h2>Notre équipe</h2>
            <p>
              Nous sommes une équipe passionnée, basée à Abidjan, composée de professionnels
              du numérique et de la petite enfance. Notre objectif : créer un pont entre
              les familles et les professionnelles de la garde d'enfants.
            </p>
          </div>

          <div className="a-propos-section">
            <h2>Contact</h2>
            <div className="contact-infos">
              <p>📧 contact@nounouconnect.ci</p>
              <p>📞 +225 01 52 24 22 99</p>
              <p>📍 Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .a-propos-page {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: "Inter", sans-serif;
        }

        .a-propos-header {
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          padding: 14px 24px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .a-propos-header-content {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #78716C;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .btn-back:hover {
          color: #C2614F;
        }

        .a-propos-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .a-propos-logo span {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
        }

        .a-propos-hero {
          background: linear-gradient(145deg, #F5EDE6 0%, #FAF7F2 100%);
          padding: 60px 24px 50px;
          text-align: center;
          border-bottom: 2px solid #E8DDD0;
        }

        .a-propos-hero-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .a-propos-hero h1 {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(32px, 4vw, 44px);
          color: #1C1917;
          margin-bottom: 8px;
        }

        .a-propos-hero p {
          font-size: 18px;
          color: #78716C;
        }

        .a-propos-content {
          padding: 60px 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .a-propos-container {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .a-propos-section h2 {
          font-family: "'DM Serif Display', serif";
          font-size: 28px;
          color: #1C1917;
          margin-bottom: 12px;
        }

        .a-propos-section p {
          font-size: 16px;
          color: #78716C;
          line-height: 1.8;
          margin-bottom: 12px;
        }

        .valeurs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 16px;
        }

        .valeur-card {
          background: white;
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          transition: transform 0.3s ease;
        }

        .valeur-card:hover {
          transform: translateY(-4px);
        }

        .valeur-icon {
          color: #C2614F;
          margin: 0 auto 12px;
        }

        .valeur-card h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1C1917;
          margin-bottom: 6px;
        }

        .valeur-card p {
          font-size: 14px;
          color: #78716C;
          line-height: 1.6;
          margin: 0;
        }

        .contact-infos {
          background: white;
          border-radius: 16px;
          padding: 24px 28px;
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .contact-infos p {
          font-size: 15px;
          color: #1C1917;
          margin-bottom: 8px;
        }

        .contact-infos p:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .a-propos-header-content {
            flex-direction: column;
            gap: 8px;
          }

          .valeurs-grid {
            grid-template-columns: 1fr;
          }

          .a-propos-hero {
            padding: 40px 16px 32px;
          }

          .a-propos-hero h1 {
            font-size: 28px;
          }

          .a-propos-content {
            padding: 40px 16px;
          }

          .a-propos-section h2 {
            font-size: 24px;
          }
        }

        @media (max-width: 480px) {
          .valeur-card {
            padding: 18px 16px;
          }

          .contact-infos {
            padding: 18px 16px;
          }
        }
      `}</style>
    </div>
  );
}