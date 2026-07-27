// src/pages/AidePage.tsx
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  User,
  ShieldCheck,
  MessageCircle,
  Smile,
  Search,
  Building2,
  Phone,
} from "lucide-react";
import { Logo } from "../components/Logo";

export default function AidePage() {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      icon: <Search className="w-8 h-8" />,
      title: "Je découvre Nounou Connect",
      description: "Nounou Connect est une plateforme qui met en relation les ménages, les agences de placement et les nounous en Côte d'Ivoire. Toutes les nounous sont vérifiées par leurs agences partenaires avant d'être présentées sur la plateforme.",
      details: [
        "✅ Des profils vérifiés et authentifiés",
        "✅ Des agences partenaires sélectionnées",
        "✅ Une mise en relation simple et rapide",
        "✅ Un service gratuit pour les ménages"
      ]
    },
    {
      id: 2,
      icon: <User className="w-8 h-8" />,
      title: "Je trouve en 5 minutes",
      description: "En quelques clics, vous pouvez trouver une nounou disponible près de chez vous. Il vous suffit de sélectionner votre quartier, vos besoins et de parcourir les profils disponibles.",
      details: [
        "📍 Recherche par quartier",
        "👶 Filtrage par type de garde",
        "⏰ Choix du temps de travail",
        "🏠 Sélection du logement"
      ]
    },
    {
      id: 3,
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Son profil est vérifié",
      description: "Chaque nounou présentée sur la plateforme est vérifiée par son agence partenaire. L'agence certifie l'identité, l'expérience et les compétences de la nounou avant de la mettre en avant.",
      details: [
        "🔒 Vérification d'identité",
        "📋 Validation de l'expérience",
        "⭐ Notation par les ménages",
        "🏅 Badge de confiance visible"
      ]
    },
    {
      id: 4,
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Contact WhatsApp direct",
      description: "Un simple clic vous met en contact direct avec l'agence via WhatsApp. Pas de formulaire compliqué, pas d'attente. Vous discutez directement avec un professionnel.",
      details: [
        "📱 Contact instantané",
        "💬 Discussion directe avec l'agence",
        "🤝 Mise en relation rapide",
        "✅ Pas d'intermédiaire"
      ]
    },
    {
      id: 5,
      icon: <Smile className="w-8 h-8" />,
      title: "Je suis tranquille",
      description: "Vous avez trouvé la nounou idéale pour vos enfants. Profitez de votre tranquillité d'esprit en sachant que votre enfant est entre de bonnes mains.",
      details: [
        "😊 Enfants bien gardés",
        "⭐ Nounous de confiance",
        "📞 Support disponible",
        "💚 Satisfaction garantie"
      ]
    }
  ];

  const roles = [
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Pour les Ménages",
      description: "Trouvez une nounou de confiance près de chez vous. Les profils sont vérifiés par les agences partenaires. Contact direct via WhatsApp.",
      bg: "#4A7C59"
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Pour les Agences",
      description: "Gérez votre vivier de nounous, recevez des demandes de ménages et placez vos professionnelles facilement.",
      bg: "#C2614F"
    },
    {
      icon: <User className="w-6 h-6" />,
      title: "Pour les Nounous",
      description: "Inscrivez-vous, les agences de votre quartier vous contacteront. Une fois rattachée à une agence, votre profil sera visible des ménages.",
      bg: "#D4B896"
    }
  ];

  const faqs = [
    {
      question: "Comment trouver une nounou ?",
      answer: "Sélectionnez votre quartier, vos besoins et parcourez les profils disponibles. Contactez directement l'agence via WhatsApp."
    },
    {
      question: "Les nounous sont-elles vérifiées ?",
      answer: "Oui ! Chaque nounou est vérifiée par son agence partenaire avant d'être présentée sur la plateforme."
    },
    {
      question: "Comment contacter une agence ?",
      answer: "Un simple clic sur le bouton WhatsApp vous met en contact direct avec l'agence. Pas de formulaire compliqué."
    },
    {
      question: "L'inscription est-elle gratuite ?",
      answer: "Oui, l'inscription et la mise en relation sont totalement gratuites pour les ménages."
    }
  ];

  return (
    <div className="aide-page">
      {/* HEADER */}
      <header className="aide-header">
        <div className="aide-header-content">
          <button className="btn-back" onClick={() => navigate("/")}>
            <ChevronLeft size={20} />
            Retour à l'accueil
          </button>
          <div className="aide-logo">
            <Logo size={32} />
            <span>Nounou Connect</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="aide-hero">
        <div className="aide-hero-content">
          <h1>Comment ça marche ?</h1>
          <p>Trouvez la nounou idéale en 5 étapes simples</p>
        </div>
      </section>

      {/* ÉTAPES */}
      <section className="aide-steps">
        <div className="aide-steps-container">
          {steps.map((step, index) => (
            <div key={step.id} className={`step-card ${index % 2 === 0 ? "even" : "odd"}`}>
              <div className="step-number">{step.id}</div>
              <div className="step-icon-wrapper">{step.icon}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <ul className="step-details">
                  {step.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RÔLES */}
      <section className="aide-roles">
        <h2>Qui êtes-vous ?</h2>
        <p className="roles-subtitle">Un service adapté à chaque profil</p>
        <div className="roles-grid">
          {roles.map((role, index) => (
            <div key={index} className="role-card" style={{ borderTop: `4px solid ${role.bg}` }}>
              <div className="role-icon" style={{ background: role.bg + "18", color: role.bg }}>
                {role.icon}
              </div>
              <h4>{role.title}</h4>
              <p>{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="aide-faq">
        <h2>Questions fréquentes</h2>
        <p className="faq-subtitle">Tout ce que vous devez savoir</p>
        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-card">
              <div className="faq-question">
                <span className="faq-icon">❓</span>
                <h4>{faq.question}</h4>
              </div>
              <p className="faq-answer">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="aide-contact">
        <div className="aide-contact-content">
          <h3>Vous avez encore des questions ?</h3>
          <p>Notre équipe est là pour vous aider</p>
          <button 
            className="btn-contact"
            onClick={() => window.open("https://wa.me/2250152242299", "_blank")}
          >
            <Phone size={18} />
            Contactez-nous sur WhatsApp
          </button>
        </div>
      </section>

      <style>{`
        /* ============================================================ */
        /* PAGE AIDE                                                    */
        /* ============================================================ */
        .aide-page {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: "Inter", sans-serif;
        }

        /* ============================================================ */
        /* HEADER                                                       */
        /* ============================================================ */
        .aide-header {
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          padding: 14px 24px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .aide-header-content {
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

        .aide-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .aide-logo span {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
        }

        /* ============================================================ */
        /* HERO                                                         */
        /* ============================================================ */
        .aide-hero {
          background: linear-gradient(145deg, #F5EDE6 0%, #FAF7F2 100%);
          padding: 60px 24px 50px;
          text-align: center;
          border-bottom: 2px solid #E8DDD0;
        }

        .aide-hero-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .aide-hero h1 {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(32px, 4vw, 44px);
          color: #1C1917;
          margin-bottom: 8px;
        }

        .aide-hero p {
          font-size: 18px;
          color: #78716C;
        }

        /* ============================================================ */
        /* ÉTAPES                                                       */
        /* ============================================================ */
        .aide-steps {
          padding: 60px 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .aide-steps-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .step-card {
          display: grid;
          grid-template-columns: 60px 1fr 2fr;
          gap: 20px;
          align-items: start;
          background: white;
          border-radius: 16px;
          padding: 24px 28px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .step-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(28, 25, 23, 0.08);
        }

        .step-number {
          font-family: "'DM Serif Display', serif";
          font-size: 32px;
          font-weight: 700;
          color: #C2614F;
          opacity: 0.5;
          line-height: 1;
        }

        .step-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #C2614F18;
          color: #C2614F;
        }

        .step-content h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1C1917;
          margin-bottom: 6px;
        }

        .step-content p {
          font-size: 14px;
          color: #78716C;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .step-details {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .step-details li {
          font-size: 13px;
          color: #4A7C59;
          background: #E8F5E8;
          padding: 4px 14px;
          border-radius: 50px;
        }

        /* ============================================================ */
        /* RÔLES                                                        */
        /* ============================================================ */
        .aide-roles {
          padding: 60px 24px;
          background: #F5EDE6;
          text-align: center;
        }

        .aide-roles h2 {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(28px, 3vw, 36px);
          color: #1C1917;
          margin-bottom: 4px;
        }

        .roles-subtitle {
          color: #78716C;
          font-size: 16px;
          margin-bottom: 32px;
        }

        .roles-grid {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .role-card {
          background: white;
          border-radius: 16px;
          padding: 28px 20px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .role-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(28, 25, 23, 0.08);
        }

        .role-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 24px;
        }

        .role-card h4 {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
          margin-bottom: 6px;
        }

        .role-card p {
          font-size: 14px;
          color: #78716C;
          line-height: 1.6;
          margin: 0;
        }

        /* ============================================================ */
        /* FAQ                                                          */
        /* ============================================================ */
        .aide-faq {
          padding: 60px 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .aide-faq h2 {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(28px, 3vw, 36px);
          color: #1C1917;
          text-align: center;
          margin-bottom: 4px;
        }

        .faq-subtitle {
          text-align: center;
          color: #78716C;
          font-size: 16px;
          margin-bottom: 32px;
        }

        .faq-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .faq-card {
          background: white;
          border-radius: 14px;
          padding: 20px 22px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .faq-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(28, 25, 23, 0.06);
        }

        .faq-question {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .faq-icon {
          font-size: 18px;
        }

        .faq-question h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1C1917;
          margin: 0;
        }

        .faq-answer {
          font-size: 14px;
          color: #78716C;
          line-height: 1.6;
          margin: 0 0 0 34px;
        }

        /* ============================================================ */
        /* CONTACT                                                      */
        /* ============================================================ */
        .aide-contact {
          padding: 0 24px 60px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .aide-contact-content {
          background: #1C1917;
          border-radius: 20px;
          padding: 40px 32px;
          text-align: center;
          color: white;
        }

        .aide-contact-content h3 {
          font-family: "'DM Serif Display', serif";
          font-size: 24px;
          margin-bottom: 4px;
        }

        .aide-contact-content p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 15px;
          margin-bottom: 20px;
        }

        .btn-contact {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-contact:hover {
          background: #1EBE5E;
          transform: scale(1.02);
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);
        }

        /* ============================================================ */
        /* RESPONSIVE                                                   */
        /* ============================================================ */
        @media (max-width: 768px) {
          .step-card {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 20px;
            text-align: center;
          }

          .step-number {
            font-size: 24px;
            text-align: center;
          }

          .step-icon-wrapper {
            margin: 0 auto;
          }

          .step-details {
            justify-content: center;
          }

          .roles-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .faq-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .faq-answer {
            margin-left: 0;
          }

          .aide-header-content {
            flex-direction: column;
            gap: 8px;
          }

          .aide-contact-content {
            padding: 28px 20px;
          }
        }

        @media (max-width: 480px) {
          .step-card {
            padding: 16px;
          }

          .role-card {
            padding: 20px 16px;
          }

          .faq-card {
            padding: 16px 18px;
          }

          .aide-hero {
            padding: 40px 16px 32px;
          }

          .aide-hero h1 {
            font-size: 28px;
          }

          .btn-contact {
            width: 100%;
            justify-content: center;
          }
        }

        @media (min-width: 769px) {
          .step-card.even .step-content {
            order: 1;
          }

          .step-card.odd .step-content {
            order: 1;
          }
        }
      `}</style>
    </div>
  );
}