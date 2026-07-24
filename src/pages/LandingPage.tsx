// src/pages/LandingPage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageCircle,
  Home,
  Building2,
  UserCheck,
  ChevronDown,
  Shield,
  ArrowRight,
  User,
  Sparkles,
  ShieldCheck,
  PhoneCall,
  MapPinned,
  HandshakeIcon,
  Smile,
} from "lucide-react";
import { Logo } from "../components/Logo";

/* ================================================================ */
/* ===== HOOKS ==================================================== */
/* ================================================================ */
function useIntersection(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useIntersection(0.3);
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const total = 60;
    const timer = setInterval(() => {
      frame++;
      setCount(Math.round((frame / total) * target));
      if (frame >= total) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useIntersection(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SlideIn({ children, reverse = false, delay = 0 }: { children: React.ReactNode; reverse?: boolean; delay?: number }) {
  const { ref, visible } = useIntersection(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : `translateX(${reverse ? 60 : -60}px)`,
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ================================================================ */
/* ===== NOUNOUS AVEC UI AVATARS =================================== */
/* ================================================================ */
const nounous = [
  {
    nom: "Marie K.",
    quartier: "Koumassi",
    agence: "Nounou Services",
    avatar: "https://ui-avatars.com/api/?name=Marie+K&background=C2614F&color=fff&size=128&rounded=true&bold=true"
  },
  {
    nom: "Fatou D.",
    quartier: "Cocody",
    agence: "Confiance Garde",
    avatar: "https://ui-avatars.com/api/?name=Fatou+D&background=4A7C59&color=fff&size=128&rounded=true&bold=true"
  },
  {
    nom: "Amina S.",
    quartier: "Yopougon",
    agence: "Nounou Services",
    avatar: "https://ui-avatars.com/api/?name=Amina+S&background=C2614F&color=fff&size=128&rounded=true&bold=true"
  },
  {
    nom: "Claire A.",
    quartier: "Plateau",
    agence: "Top Nounou",
    avatar: "https://ui-avatars.com/api/?name=Claire+A&background=4A7C59&color=fff&size=128&rounded=true&bold=true"
  },
];

/* ================================================================ */
/* ===== PAGE D'ACCUEIL ============================================ */
/* ================================================================ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [floatVisible, setFloatVisible] = useState(true);
  const lastScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setFloatVisible(y < lastScroll.current || y < 100);
      lastScroll.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToInscription = () => {
    // Pas de profil pré-choisi (bouton générique du header) : on descend
    // à la section "Qui êtes-vous ?" plutôt que de deviner un profil.
    document.getElementById("qui-etes-vous")?.scrollIntoView({ behavior: "smooth" });
  };

  const goToInscriptionWithProfil = (profil: string) => {
    navigate(`/inscription?profil=${profil}`);
  };

  const onConnexion = () => navigate("/connexion");

  const steps = [
    { num: "01", titre: "Je découvre Nounou Connect", desc: "Des profils vérifiés, des agences partenaires.", card: { icon: <Sparkles size={28} />, titre: "Nounou Connect", sub: "Simple & rapide", badge: "✅ Gratuit" }, bg: "#FAF7F2" },
    { num: "02", titre: "Je trouve en 5 minutes", desc: "Je choisis mon quartier. Marie est disponible.", card: { icon: <User size={28} />, titre: "Marie K.", sub: "📍 Koumassi", badge: "✅ Disponible", stars: true }, bg: "#F5EDE6" },
    { num: "03", titre: "Son profil est vérifié", desc: "L'agence partenaire a vérifié ses références.", card: { icon: <ShieldCheck size={28} />, titre: "Confiance garantie", sub: "✅ Vérifiée par l'agence", badge: "🔒 Vérifiée" }, bg: "#FAF7F2" },
    { num: "04", titre: "Contact WhatsApp direct", desc: "Un tap et je suis en contact avec l'agence.", card: { icon: <MessageCircle size={28} />, titre: "WhatsApp", sub: "Contact direct", badge: "✅ 1 tap", green: true }, bg: "#F5EDE6" },
    { num: "05", titre: "Je suis tranquille", desc: "Mon enfant est bien gardé.", card: { icon: <Smile size={28} />, titre: "Bonheur", sub: "« Mon enfant est épanoui »", badge: "💚 Confiance", green: true }, bg: "#FAF7F2" },
  ];

  const pourquoiData = [
    { icon: <PhoneCall size={20} />, titre: "Vérification humaine", desc: "Chaque nounou est vérifiée par son agence partenaire." },
    { icon: <MessageCircle size={20} />, titre: "Contact WhatsApp direct", desc: "Un tap et vous êtes en contact avec l'agence." },
    { icon: <MapPinned size={20} />, titre: "45 quartiers couverts", desc: "Toute Abidjan et ses environs proches." },
    { icon: <HandshakeIcon size={20} />, titre: "Agences partenaires", desc: "Des professionnels du placement sélectionnés avec soin." },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", background: "#FAF7F2", color: "#1C1917" }}>

      {/* ===== HEADER ===== */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled ? "rgba(250,247,242,0.94)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(194,97,79,0.12)" : "none",
          transition: "all 0.3s ease",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "#1C1917", letterSpacing: "-0.3px" }}>Nounou Connect</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="https://wa.me/22597263298" style={{ fontSize: 14, color: "#78716C", textDecoration: "none", fontWeight: 500 }}>Aide</a>
          <button
            onClick={onConnexion}
            style={{
              background: "transparent",
              color: "#78716C",
              border: "1.5px solid #D4B896",
              padding: "8px 18px",
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#C2614F";
              e.currentTarget.style.color = "#C2614F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#D4B896";
              e.currentTarget.style.color = "#78716C";
            }}
          >
            Se connecter
          </button>
          <button
            onClick={goToInscription}
            style={{
              background: "#C2614F",
              color: "white",
              border: "none",
              padding: "8px 22px",
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#B25545")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#C2614F")}
          >
            S'inscrire
          </button>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section
        style={{
          minHeight: "88vh",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(145deg, #FAF7F2 0%, #F5EDE6 100%)",
          borderBottom: "2px solid #E8DDD0",
          paddingTop: 80,
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#4A7C59",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 16px",
                borderRadius: 50,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <Shield size={12} /> Confiance garantie
            </div>
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(36px, 6vw, 56px)",
                lineHeight: 1.1,
                color: "#1C1917",
                marginBottom: 16,
              }}
            >
              Trouvez la <span style={{ color: "#C2614F" }}>nounou</span>
              <br />
              de confiance
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 1.2vw, 18px)",
                color: "#78716C",
                maxWidth: 460,
                margin: "0 auto 32px",
                lineHeight: 1.65,
              }}
            >
              Des nounous vérifiées, près de chez vous, en contact direct WhatsApp avec nos agences partenaires.
            </p>

            {/* 3 blocs → inscription avec profil pré-sélectionné */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                maxWidth: 540,
                margin: "0 auto 32px",
              }}
            >
              {[
                { bg: "#4A7C59", icon: <Home size={20} />, titre: "Famille", sub: "Je cherche", profil: "menage" },
                { bg: "#C2614F", icon: <Building2 size={20} />, titre: "Agence", sub: "Je gère", profil: "agence" },
                { bg: "#D4B896", icon: <UserCheck size={20} />, titre: "Nounou", sub: "Je m'inscris", profil: "nounou" },
              ].map((b, i) => (
                <div
                  key={i}
                  onClick={() => goToInscriptionWithProfil(b.profil)}
                  style={{
                    background: b.bg,
                    color: "white",
                    borderRadius: 18,
                    padding: "18px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  {b.icon}
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{b.titre}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>{b.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ color: "#78716C", fontSize: 13, animation: "bounce 2s infinite" }}>
              <ChevronDown size={16} style={{ display: "inline" }} /> Découvrez comment ça marche
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUI ÊTES-VOUS ? ===== */}
      <section id="qui-etes-vous" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 36px)", color: "#1C1917", marginBottom: 8 }}>
              Qui êtes-vous ?
            </h2>
            <p style={{ color: "#78716C", fontSize: 16 }}>Choisissez votre profil pour commencer</p>
          </div>
        </FadeUp>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {[
            { bg: "#4A7C59", icon: <Home size={32} />, titre: "Famille", desc: "Je cherche une nounou ou une aide pour mon domicile", btn: "Je cherche", btnBg: "#4A7C59", profil: "menage" },
            { bg: "#C2614F", icon: <Building2 size={32} />, titre: "Agence", desc: "Je gère un vivier de nounous et je place des professionnelles", btn: "Accéder →", btnBg: "#C2614F", profil: "agence" },
            { bg: "#D4B896", icon: <UserCheck size={32} />, titre: "Nounou", desc: "Je m'inscris et les agences de mon quartier me contactent", btn: "Je m'inscris", btnBg: "#D4B896", profil: "nounou" },
          ].map((c, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div
                onClick={() => goToInscriptionWithProfil(c.profil)}
                style={{
                  background: "white",
                  borderRadius: 22,
                  padding: "32px 22px",
                  border: "1px solid rgba(212,184,150,0.2)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 16px 48px rgba(28,25,23,0.08)";
                  e.currentTarget.style.borderColor = c.bg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "rgba(212,184,150,0.2)";
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: c.bg + "18",
                    color: c.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  {c.icon}
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#1C1917", marginBottom: 8 }}>
                  {c.titre}
                </h3>
                <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.5, marginBottom: 20 }}>{c.desc}</p>
                <button
                  style={{
                    background: c.btnBg,
                    color: "white",
                    border: "none",
                    padding: "10px 28px",
                    borderRadius: 50,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {c.btn}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section style={{ background: "#1C1917", padding: "70px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            {[
              { target: 150, suffix: "+", label: "Nounous vérifiées", sub: "Appelées et validées" },
              { target: 48, suffix: "", label: "Note moyenne /5", sub: "Sur 5 étoiles" },
              { target: 45, suffix: "", label: "Quartiers couverts", sub: "Abidjan & environs" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "clamp(40px, 4vw, 52px)",
                    color: "#C2614F",
                    fontWeight: 400,
                    lineHeight: 1,
                  }}
                >
                  <AnimatedNumber target={s.target} suffix={s.suffix} />
                </div>
                <div style={{ color: "white", fontWeight: 600, fontSize: "clamp(14px, 1vw, 16px)", marginTop: 8 }}>
                  {s.label}
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 28,
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
              fontStyle: "italic",
              fontSize: 15,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 24,
            }}
          >
            💚 &ldquo;La confiance, c'est notre priorité.&rdquo;
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section id="comment" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 36px)", color: "#1C1917", marginBottom: 8 }}>
                Comment ça marche ?
              </h2>
              <p style={{ color: "#78716C", fontSize: 16 }}>5 étapes simples pour trouver votre perle rare</p>
            </div>
          </FadeUp>
          <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: step.bg, borderRadius: 24, padding: "clamp(32px, 4vw, 48px) clamp(20px, 3vw, 40px)" }}>
                <SlideIn reverse={i % 2 === 1} delay={0}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: i % 2 === 0 ? "1fr 1fr" : "1fr 1fr",
                      gap: 48,
                      alignItems: "center",
                      direction: i % 2 === 1 ? "rtl" : "ltr",
                    }}
                  >
                    <div style={{ direction: "ltr" }}>
                      <div
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          color: "#C2614F",
                          fontWeight: 700,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          marginBottom: 12,
                        }}
                      >
                        Étape {step.num}
                      </div>
                      <h3
                        style={{
                          fontFamily: "'DM Serif Display', serif",
                          fontSize: "clamp(22px, 2vw, 26px)",
                          color: "#1C1917",
                          marginBottom: 12,
                        }}
                      >
                        {step.titre}
                      </h3>
                      <p style={{ color: "#78716C", fontSize: 15, lineHeight: 1.65, maxWidth: 380 }}>{step.desc}</p>
                      <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: "#4A7C59", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                        En savoir plus <ArrowRight size={14} />
                      </a>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", direction: "ltr" }}>
                      <div
                        style={{
                          background: step.card.green ? "#4A7C59" : "white",
                          color: step.card.green ? "white" : "#1C1917",
                          borderRadius: 22,
                          padding: "clamp(24px, 2.5vw, 32px) clamp(20px, 2vw, 28px)",
                          textAlign: "center",
                          maxWidth: 240,
                          width: "100%",
                          border: !step.card.green ? "1px solid rgba(212,184,150,0.25)" : "none",
                          boxShadow: "0 12px 40px rgba(28,25,23,0.08)",
                        }}
                      >
                        <div style={{ color: step.card.green ? "white" : "#C2614F", marginBottom: 10 }}>
                          {step.card.icon}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{step.card.titre}</div>
                        {step.card.stars && <div style={{ color: "#F59E0B", marginBottom: 4 }}>★★★★★</div>}
                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>{step.card.sub}</div>
                        <span
                          style={{
                            display: "inline-block",
                            background: step.card.green ? "white" : "#4A7C59",
                            color: step.card.green ? "#4A7C59" : "white",
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "5px 16px",
                            borderRadius: 50,
                          }}
                        >
                          {step.card.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </SlideIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOS NOUNOUS AVEC UI AVATARS ===== */}
      <section id="nounous" style={{ padding: "80px 24px", background: "#F5EDE6" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 36px)", color: "#1C1917", marginBottom: 6 }}>
                Nos nounous
              </h2>
              <p style={{ color: "#78716C", fontSize: 16 }}>Via nos agences partenaires</p>
            </div>
          </FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 18,
            }}
          >
            {nounous.map((n, i) => (
              <FadeUp key={i} delay={i * 60}>
                <div
                  style={{
                    background: "white",
                    borderRadius: 20,
                    padding: "20px 14px 18px",
                    textAlign: "center",
                    border: "1px solid rgba(212,184,150,0.2)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 10px 32px rgba(28,25,23,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <img
                    src={n.avatar}
                    alt={n.nom}
                    loading="lazy"
                    width={72}
                    height={72}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      objectFit: "cover",
                      margin: "0 auto 12px",
                      display: "block",
                    }}
                  />
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1C1917", marginBottom: 2 }}>{n.nom}</div>
                  <div style={{ color: "#F59E0B", fontSize: 13, marginBottom: 2 }}>★★★★★</div>
                  <div style={{ fontSize: 13, color: "#78716C", marginBottom: 8 }}>📍 {n.quartier}</div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      padding: "3px 12px",
                      borderRadius: 50,
                      background: "#D1FAE5",
                      color: "#065F46",
                      fontWeight: 700,
                    }}
                  >
                    ✅ Disponible
                  </span>
                  <div style={{ fontSize: 11, color: "#78716C", marginTop: 6, opacity: 0.7 }}>🏢 {n.agence}</div>
                </div>
              </FadeUp>
            ))}
          </div>
          <div style={{ textAlign: "right", marginTop: 20 }}>
            <a href="#" style={{ color: "#4A7C59", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Voir toutes les nounous <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ===== TÉMOIGNAGES ===== */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 36px)", color: "#1C1917", marginBottom: 6 }}>
                Avis des familles
              </h2>
              <p style={{ color: "#78716C", fontSize: 16 }}>Des parents comme vous</p>
            </div>
          </FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { texte: "Nounou trouvée en 24h. Simple, rapide et rassurant.", auteur: "Cécile, Cocody", premier: true },
              { texte: "Les agences partenaires sont très réactives. J'ai trouvé une excellente aide à domicile en 2 jours.", auteur: "Jean, Plateau", premier: false },
            ].map((t, i) => (
              <FadeUp key={i} delay={i * 100}>
                <div
                  style={{
                    background: t.premier ? "#FEF3C7" : "white",
                    padding: "24px 26px",
                    borderRadius: 18,
                    borderLeft: `4px solid ${t.premier ? "#F59E0B" : "#4A7C59"}`,
                  }}
                >
                  {t.premier && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        background: "#F59E0B",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: 50,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      ⭐ Coup de cœur
                    </span>
                  )}
                  <div style={{ color: "#F59E0B", fontSize: 16, marginBottom: 6 }}>★★★★★</div>
                  <p style={{ fontSize: 15, color: "#1C1917", lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>
                    &ldquo;{t.texte}&rdquo;
                  </p>
                  <span style={{ fontSize: 13, color: "#78716C", fontWeight: 600 }}>— {t.auteur}</span>
                </div>
              </FadeUp>
            ))}
            <FadeUp delay={160}>
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "#FAF7F2",
                  borderLeft: "4px solid #D4B896",
                  padding: "18px 26px",
                  borderRadius: 18,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 15, color: "#78716C", fontStyle: "italic" }}>
                  ✏️ Vous avez trouvé une nounou ? <a href="#" style={{ color: "#4A7C59", fontWeight: 700 }}>Donnez votre avis</a>
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ===== POURQUOI NOUS ===== */}
      <section id="pourquoi" style={{ padding: "80px 24px", background: "#F5EDE6" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 36px)", color: "#1C1917", marginBottom: 6 }}>
                Pourquoi nous choisir ?
              </h2>
              <p style={{ color: "#78716C", fontSize: 16 }}>Ce qui fait vraiment la différence</p>
            </div>
          </FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {pourquoiData.map((p, i) => (
              <FadeUp key={i} delay={i * 60}>
                <div
                  style={{
                    background: "white",
                    padding: "22px 20px",
                    borderRadius: 16,
                    border: "1px solid rgba(212,184,150,0.2)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "#C2614F18",
                      color: "#C2614F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 15, color: "#1C1917", marginBottom: 4 }}>{p.titre}</h4>
                    <p style={{ fontSize: 13, color: "#78716C", lineHeight: 1.5 }}>{p.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div
              style={{
                background: "#1C1917",
                borderRadius: 28,
                padding: "clamp(40px, 5vw, 60px) clamp(24px, 4vw, 40px)",
                textAlign: "center",
              }}
            >
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 3vw, 38px)", color: "white", marginBottom: 12 }}>
                Prêt à trouver votre nounou ?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(15px, 1vw, 17px)", marginBottom: 32 }}>
                Des nounous vérifiées, disponibles près de chez vous.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                <button
                  onClick={goToInscription}
                  style={{
                    background: "#C2614F",
                    color: "white",
                    border: "none",
                    padding: "16px 36px",
                    borderRadius: 50,
                    fontSize: "clamp(15px, 1vw, 17px)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#B25545";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#C2614F";
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <Search size={18} /> Commencer maintenant
                </button>
                <a
                  href="https://wa.me/22597263298"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    padding: "16px 32px",
                    borderRadius: 50,
                    fontSize: "clamp(14px, 0.9vw, 16px)",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid rgba(255,255,255,0.15)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                >
                  <MessageCircle size={17} /> Contactez-nous
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        style={{
          background: "#1C1917",
          color: "rgba(255,255,255,0.55)",
          padding: "clamp(24px, 3vw, 40px) 20px 20px",
          borderRadius: "28px 28px 0 0",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 28,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
                <Logo size={32} />
                <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Nounou Connect</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
                La plateforme de mise en relation entre familles, agences de placement et nounous professionnelles à Abidjan.
              </p>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 16 }}>
                {["Instagram", "Facebook", "WhatsApp"].map((s) => (
                  <a key={s} href="#" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                  >{s}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color: "white", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Liens</h4>
              {["À propos", "FAQ", "Conditions", "Confidentialité"].map((l) => (
                <a key={l} href="#" style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", textDecoration: "none", marginBottom: 6, transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >{l}</a>
              ))}
            </div>
            <div>
              <h4 style={{ color: "white", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Contact</h4>
              <p style={{ fontSize: 12, marginBottom: 4 }}>📧 contact@nounouconnect.ci</p>
              <p style={{ fontSize: 12, marginBottom: 4 }}>📞 +225 XX XX XX XX</p>
              <p style={{ fontSize: 12 }}>📍 Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 16,
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            © 2026 Nounou Connect · Tous droits réservés
          </div>
        </div>
      </footer>

      {/* ===== BOUTON FLOTTANT ===== */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          opacity: floatVisible ? 1 : 0,
          transition: "opacity 0.3s, transform 0.3s",
        }}
      >
        <button
          onClick={goToInscription}
          style={{
            background: "#4A7C59",
            color: "white",
            padding: "14px 32px",
            borderRadius: 50,
            border: "none",
            fontSize: "clamp(13px, 1vw, 15px)",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(74,124,89,0.45)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#3A6248";
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4A7C59";
            e.currentTarget.style.transform = "";
          }}
        >
          <Search size={16} /> Je cherche une nounou
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}