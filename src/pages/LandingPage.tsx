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
  ShieldCheck,
  MapPinned,
  Clock,
  Smile,
  Sparkles,
  User,
  LogOut,
  Heart,
} from "lucide-react";
import { Logo } from "../components/Logo";

// ================================================================
// ===== PALETTE ==================================================
// ================================================================
const COLOR = {
  bg: "#F1F0EC",
  white: "#FFFFFF",
  orange: "#F3811E",
  orangeDark: "#C1631B",
  orangeLight: "#FFF3D6",
  gradFrom: "#F58F1F",
  gradTo: "#FFCB3D",
  ink: "#211B14",
  inkSoft: "#8A867A",
  inkLight: "#5C574C",
  chip: "#1A1A1A",
  border: "rgba(33,27,20,0.08)",
  borderStrong: "rgba(33,27,20,0.12)",
};

// ================================================================
// ===== HOOKS ====================================================
// ================================================================
function useIntersection(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
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

function AnimatedNumber({ target, suffix = "", divide = false }: { target: number; suffix?: string; divide?: boolean }) {
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
  return <span ref={ref}>{count}{suffix}{divide && "/5"}</span>;
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

// ================================================================
// ===== HANDCRAFTS ===============================================
// ================================================================
function DoodleUnderline({ color = "#F3811E" }: { color?: string }) {
  return (
    <svg
      style={{ position: "absolute", left: 0, bottom: -6, width: "100%", height: 8 }}
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 5 Q25 0 50 5 T100 4" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ================================================================
// ===== DONNÉES ==================================================
// ================================================================
const nounous = [
  { 
    nom: "Fatou D.", 
    quartier: "Cocody", 
    agence: "Confiance Garde", 
    avatar: "https://ui-avatars.com/api/?name=Fatou+D&background=F3811E&color=fff&size=128&rounded=true&bold=true" 
  },
  { 
    nom: "Amina S.", 
    quartier: "Yopougon", 
    agence: "Nounou Services", 
    avatar: "https://ui-avatars.com/api/?name=Amina+S&background=F3811E&color=fff&size=128&rounded=true&bold=true" 
  },
  { 
    nom: "Mariam T.", 
    quartier: "Koumassi", 
    agence: "Nounou Services", 
    avatar: "https://ui-avatars.com/api/?name=Mariam+T&background=F3811E&color=fff&size=128&rounded=true&bold=true" 
  },
];

const quartiersTabs = ["Cocody", "Yopougon", "Koumassi"];

const confianceData = [
  { icon: <ShieldCheck size={22} />, titre: "Vérifiée", desc: "Chaque nounou est vérifiée par son agence partenaire." },
  { icon: <MessageCircle size={22} />, titre: "Direct", desc: "Un tap et vous êtes en contact avec l'agence." },
  { icon: <MapPinned size={22} />, titre: "45 quartiers", desc: "Toute Abidjan et ses environs proches." },
  { icon: <Clock size={22} />, titre: "Rapide", desc: "Trouvez une nounou en 5 minutes en moyenne." },
];

// ================================================================
// ===== PAGE =====================================================
// ================================================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [floatVisible, setFloatVisible] = useState(true);
  const [activeQuartier, setActiveQuartier] = useState("Cocody");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const lastScroll = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("");
  const [profileType, setProfileType] = useState("");

  const [avis, setAvis] = useState<{ auteur: string; quartier: string; texte: string; note: number }[]>([]);
  const [showAvisForm, setShowAvisForm] = useState(false);
  const [newAvis, setNewAvis] = useState({ texte: "", note: 5 });

  useEffect(() => {
    const checkAuth = () => {
      const stored = localStorage.getItem("nounou-connect-auth");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const user = parsed.state?.user;
          const type = parsed.state?.profileType;
          if (user) {
            setIsConnected(true);
            setUserName(user.nom || "Utilisateur");
            setProfileType(type || "");
          } else {
            setIsConnected(false);
          }
        } catch (e) {
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    };
    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("nounou_avis");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvis(parsed);
        }
      } catch (e) {}
    }
  }, []);

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

  // Gestion des clics sur les liens internes
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href) return;
      
      // Ignorer les liens externes
      if (href.startsWith('http') || href.startsWith('https') || href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      
      e.preventDefault();
      navigate(href);
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [navigate]);

  const goToInscriptionWithProfil = (profil: string) => {
    navigate(`/inscription?profil=${profil}`);
  };

  const onConnexion = () => navigate("/connexion");
  const onLogout = () => {
    localStorage.removeItem("nounou-connect-auth");
    setIsConnected(false);
    setShowProfileMenu(false);
    navigate("/");
  };

  const goToDashboard = () => {
    if (profileType === "menage") navigate("/espace-menage");
    else if (profileType === "agence") navigate("/espace-agence");
    else if (profileType === "nounou") navigate("/espace-nounou");
    else navigate("/connexion");
  };

  const nounousFiltrees = nounous.filter((n) => n.quartier === activeQuartier);
  const nounouAffiche = nounousFiltrees.length > 0 ? nounousFiltrees[0] : null;

  const handleAvisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvis.texte.trim()) return;

    const newEntry = {
      auteur: userName || "Famille Anonyme",
      quartier: "Abidjan",
      texte: newAvis.texte,
      note: newAvis.note,
    };

    const updated = [newEntry, ...avis].slice(0, 2);
    setAvis(updated);
    localStorage.setItem("nounou_avis", JSON.stringify(updated));
    setNewAvis({ texte: "", note: 5 });
    setShowAvisForm(false);
  };

  const defaultAvis = [
    { auteur: "Cécile K.", quartier: "Cocody", texte: "Nounou trouvée en 24h. Simple, rapide et rassurant.", note: 5 },
    { auteur: "Jean M.", quartier: "Plateau", texte: "Les agences partenaires sont très réactives. J'ai trouvé une excellente aide à domicile en 2 jours.", note: 4 },
  ];

  const avisAffiches = avis.length > 0 ? avis : defaultAvis;

  const getInitiales = (nom: string) => {
    return nom
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const steps = [
    { 
      num: "01", 
      icon: <Sparkles size={28} />, 
      titre: "Je découvre", 
      desc: "Des profils vérifiés, des agences partenaires.",
      bg: COLOR.white
    },
    { 
      num: "02", 
      icon: <Search size={28} />, 
      titre: "Je trouve", 
      desc: "En 5 minutes, je trouve une nounou près de chez moi.",
      bg: COLOR.bg,
      reverse: true
    },
    { 
      num: "03", 
      icon: <ShieldCheck size={28} />, 
      titre: "Je vérifie", 
      desc: "Son profil est vérifié par son agence partenaire.",
      bg: COLOR.white
    },
    { 
      num: "04", 
      icon: <MessageCircle size={28} />, 
      titre: "Je contacte", 
      desc: "Contact WhatsApp direct avec l'agence.",
      bg: COLOR.bg,
      reverse: true
    },
    { 
      num: "05", 
      icon: <Smile size={28} />, 
      titre: "Je suis tranquille", 
      desc: "Mon enfant est bien gardé, je suis serein.",
      bg: COLOR.white
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: COLOR.bg, color: COLOR.ink, minHeight: "100vh" }}>

      {/* ===== HEADER FIXÉ CORRIGÉ ===== */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled ? "rgba(241,240,236,0.95)" : "rgba(241,240,236,0.85)",
          backdropFilter: scrolled ? "blur(16px)" : "blur(8px)",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "blur(8px)",
          borderBottom: scrolled ? `1px solid ${COLOR.border}` : "1px solid transparent",
          transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
          padding: "8px 24px",
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "nowrap",
          gap: 16,
          boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.06)" : "none",
          willChange: "transform, background, box-shadow",
        }}
      >
        <a 
          href="/" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            textDecoration: "none",
            flexShrink: 0,
          }}
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <Logo size={32} />
          <span 
            style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              color: COLOR.ink, 
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            Nounou Connect
          </span>
        </a>

        <nav style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12, 
          flexWrap: "nowrap",
          flexShrink: 1,
        }}>
          <a 
            href="/aide" 
            style={{ 
              fontSize: 13, 
              color: COLOR.inkSoft, 
              textDecoration: "none", 
              fontWeight: 500,
              padding: "6px 8px",
              borderRadius: 8,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(33,27,20,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Aide
          </a>

          {isConnected ? (
            <>
              <button
                onClick={goToDashboard}
                style={{
                  background: "transparent",
                  color: COLOR.ink,
                  border: `1.5px solid ${COLOR.orange}`,
                  padding: "7px 18px",
                  borderRadius: 50,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minWidth: "140px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLOR.orange;
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = COLOR.ink;
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Tableau de bord
              </button>

              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 50,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = "rgba(33,27,20,0.05)"; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = "transparent"; 
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: COLOR.orange,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                      userSelect: "none",
                    }}
                  >
                    {getInitiales(userName)}
                  </div>
                  <ChevronDown size={14} color={COLOR.inkSoft} />
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: 44,
                      right: 0,
                      background: COLOR.white,
                      borderRadius: 14,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                      border: `1px solid ${COLOR.border}`,
                      minWidth: 170,
                      overflow: "hidden",
                      animation: "slideDown 0.2s ease",
                    }}
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${COLOR.border}`,
                        background: COLOR.orangeLight,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: COLOR.ink, fontSize: 13 }}>{userName}</div>
                      <div style={{ fontSize: 10, color: COLOR.inkSoft, textTransform: "capitalize" }}>
                        {profileType === "menage" ? "👨‍👩‍👧‍👦 Famille" :
                         profileType === "agence" ? "🏢 Agence" :
                         profileType === "nounou" ? "👩‍🍼 Nounou" : "Utilisateur"}
                      </div>
                    </div>

                    <button
                      onClick={onLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#DC2626",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.background = "#FEE2E2"; 
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.background = "transparent"; 
                      }}
                    >
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onConnexion}
                style={{
                  background: "transparent",
                  color: COLOR.inkSoft,
                  border: `1.5px solid ${COLOR.border}`,
                  padding: "7px 16px",
                  borderRadius: 50,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minWidth: "110px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLOR.orange;
                  e.currentTarget.style.color = COLOR.orange;
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = COLOR.border;
                  e.currentTarget.style.color = COLOR.inkSoft;
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Se connecter
              </button>
              <button
                onClick={() => navigate("/inscription")}
                style={{
                  background: COLOR.orange,
                  color: "white",
                  border: "none",
                  padding: "7px 16px",
                  borderRadius: 50,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minWidth: "110px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLOR.orangeDark;
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = COLOR.orange;
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                S'inscrire
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Espace pour compenser la navbar fixe */}
      <div style={{ height: "72px" }} />

      {/* ================================================================ */}
      {/* ===== HERO - Option 1 (Image à droite) ===== */}
      {/* ================================================================ */}
      <section
        style={{
          position: "relative",
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          paddingTop: 0,
        }}
      >
        {/* Forme décorative */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLOR.gradFrom}, ${COLOR.gradTo})`,
          }}
        />

        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "40px 24px", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 50,
              alignItems: "center",
            }}
            className="hero-grid"
          >
            {/* ===== TEXTE À GAUCHE ===== */}
            <div style={{ maxWidth: 560, textAlign: "left" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: COLOR.white,
                  color: COLOR.ink,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px 18px",
                  borderRadius: 50,
                  marginBottom: 24,
                }}
              >
                <Shield size={14} /> Confiance garantie
              </div>

              <h1
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(38px, 5.5vw, 56px)",
                  lineHeight: 1.1,
                  color: COLOR.ink,
                  marginBottom: 18,
                }}
              >
                Trouvez la{" "}
                <span style={{ position: "relative", display: "inline-block" }}>
                  nounou
                  <DoodleUnderline color={COLOR.orange} />
                </span>{" "}
                de confiance
              </h1>

              <p
                style={{
                  fontSize: "clamp(17px, 1.3vw, 20px)",
                  color: COLOR.inkSoft,
                  maxWidth: 460,
                  marginBottom: 32,
                  lineHeight: 1.7,
                }}
              >
                Des nounous vérifiées, près de chez vous, en contact direct WhatsApp avec nos agences partenaires.
              </p>

              {/* Boutons */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
                <button
                  onClick={() => navigate("/inscription")}
                  style={{
                    background: COLOR.orange,
                    color: "white",
                    border: "none",
                    padding: "16px 34px",
                    borderRadius: 50,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s",
                    boxShadow: "0 4px 16px rgba(243,129,30,0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLOR.orangeDark;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(243,129,30,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLOR.orange;
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(243,129,30,0.25)";
                  }}
                >
                  <Search size={18} /> Commencer maintenant
                </button>
                <a
                  href="https://wa.me/2250152242299"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: COLOR.white,
                    color: COLOR.ink,
                    padding: "16px 30px",
                    borderRadius: 50,
                    fontSize: 16,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    border: `1.5px solid ${COLOR.border}`,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLOR.orange;
                    e.currentTarget.style.color = COLOR.orange;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLOR.border;
                    e.currentTarget.style.color = COLOR.ink;
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <MessageCircle size={18} /> Contactez-nous
                </a>
              </div>

              {/* Badge confiance */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  background: COLOR.white,
                  borderRadius: 14,
                  padding: "14px 22px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", gap: 2, color: COLOR.orange, fontSize: 16 }}>
                  <Heart size={18} color={COLOR.orange} fill={COLOR.orange} />
                  <Heart size={18} color={COLOR.orange} fill={COLOR.orange} />
                  <Heart size={18} color={COLOR.orange} fill={COLOR.orange} />
                  <Heart size={18} color={COLOR.orange} fill={COLOR.orange} />
                  <Heart size={18} color={COLOR.orange} />
                </div>
                <span style={{ fontSize: 14, color: COLOR.ink }}>
                  <strong>50+</strong> nounous vérifiées
                </span>
              </div>

              {/* Scroll indicator */}
              <div style={{ color: COLOR.inkSoft, fontSize: 14, marginTop: 36, animation: "bounce 2s infinite" }}>
                <ChevronDown size={18} style={{ display: "inline" }} /> Découvrez comment ça marche
              </div>
            </div>

            {/* ===== IMAGE SVG À DROITE ===== */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
              className="hero-image"
            >
              <img
                src="/icons/hero-nounou.svg"
                alt="Nounou Connect illustration"
                loading="lazy"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  maxHeight: 420,
                  width: "auto",
                }}
              />
              {/* Élément décoratif */}
              <div
                style={{
                  position: "absolute",
                  bottom: -10,
                  right: -10,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLOR.gradFrom}, ${COLOR.gradTo})`,
                  opacity: 0.12,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  left: -20,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: COLOR.orange,
                  opacity: 0.06,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* ===== RESTE DE LA PAGE ========================================== */}
      {/* ================================================================ */}

      {/* ===== QUI ÊTES-VOUS ? ===== */}
      <section id="qui-etes-vous" style={{ padding: "72px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 3vw, 36px)",
                color: COLOR.ink,
                marginBottom: 8,
              }}
            >
              Qui êtes-vous ?
            </h2>
            <p style={{ color: COLOR.inkSoft, fontSize: 17 }}>Choisissez votre profil pour commencer</p>
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
            { icon: <Home size={32} />, titre: "Famille", desc: "Je cherche une nounou ou une aide pour mon domicile", btn: "Je cherche", profil: "menage" },
            { icon: <Building2 size={32} />, titre: "Agence", desc: "Je gère un vivier de nounous et je place des professionnelles", btn: "Accéder", profil: "agence" },
            { icon: <UserCheck size={32} />, titre: "Nounou", desc: "Je m'inscris et les agences de mon quartier me contactent", btn: "Je m'inscris", profil: "nounou" },
          ].map((c, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div
                onClick={() => goToInscriptionWithProfil(c.profil)}
                style={{
                  background: COLOR.white,
                  borderRadius: 22,
                  padding: "32px 22px",
                  border: `1px solid ${COLOR.border}`,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.borderColor = COLOR.orange;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.borderColor = COLOR.border;
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: COLOR.orangeLight,
                    color: COLOR.orangeDark,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  {c.icon}
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: COLOR.ink, marginBottom: 8 }}>
                  {c.titre}
                </h3>
                <p style={{ fontSize: 14, color: COLOR.inkSoft, lineHeight: 1.5, marginBottom: 20 }}>{c.desc}</p>
                <button
                  style={{
                    background: COLOR.orange,
                    color: "white",
                    border: "none",
                    padding: "10px 28px",
                    borderRadius: 50,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {c.btn}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section id="comment" style={{ padding: "72px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 3vw, 36px)",
                color: COLOR.ink,
                marginBottom: 8,
              }}
            >
              Comment ça marche ?
            </h2>
            <p style={{ color: COLOR.inkSoft, fontSize: 17 }}>5 étapes simples pour trouver votre perle rare</p>
          </div>
        </FadeUp>

        <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                background: step.bg,
                borderRadius: 24,
                padding: "clamp(28px, 4vw, 44px) clamp(20px, 3vw, 40px)",
              }}
            >
              <SlideIn reverse={step.reverse || false} delay={0}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 40,
                    alignItems: "center",
                    direction: step.reverse ? "rtl" : "ltr",
                  }}
                >
                  <div style={{ direction: "ltr" }}>
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: COLOR.orange,
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
                        color: COLOR.ink,
                        marginBottom: 12,
                      }}
                    >
                      {step.titre}
                    </h3>
                    <p
                      style={{
                        color: COLOR.inkSoft,
                        fontSize: 16,
                        lineHeight: 1.65,
                        maxWidth: 380,
                      }}
                    >
                      {step.desc}
                    </p>
                    <a
                      href="/aide"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 16,
                        color: COLOR.orangeDark,
                        fontWeight: 700,
                        fontSize: 14,
                        textDecoration: "none",
                      }}
                    >
                      En savoir plus <ArrowRight size={14} />
                    </a>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", direction: "ltr" }}>
                    <div
                      style={{
                        background: COLOR.white,
                        borderRadius: 22,
                        padding: "clamp(22px, 2.5vw, 30px) clamp(20px, 2vw, 26px)",
                        textAlign: "center",
                        maxWidth: 240,
                        width: "100%",
                        border: `1px solid ${COLOR.border}`,
                        boxShadow: "0 12px 32px rgba(33,27,20,0.06)",
                      }}
                    >
                      <div style={{ color: COLOR.orange, marginBottom: 10 }}>{step.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{step.titre}</div>
                      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>Étape {step.num}</div>
                      <span
                        style={{
                          display: "inline-block",
                          background: COLOR.orange,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "5px 16px",
                          borderRadius: 50,
                        }}
                      >
                        {step.num === "05" ? "✅ Confiance" : "→ Continuer"}
                      </span>
                    </div>
                  </div>
                </div>
              </SlideIn>
            </div>
          ))}
        </div>
      </section>

      {/* ===== POURQUOI NOUS FAIRE CONFIANCE ===== */}
      <section id="pourquoi" style={{ padding: "72px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 3vw, 36px)",
                color: COLOR.ink,
                marginBottom: 8,
              }}
            >
              Pourquoi nous faire confiance
            </h2>
            <p style={{ color: COLOR.inkSoft, fontSize: 17 }}>Ce qui fait vraiment la différence</p>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
          className="pourquoi-grid"
        >
          {confianceData.map((p, i) => (
            <FadeUp key={i} delay={i * 60}>
              <div
                style={{
                  background: COLOR.white,
                  borderRadius: 16,
                  padding: "20px 14px",
                  textAlign: "center",
                  border: `1px solid ${COLOR.border}`,
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = COLOR.orange;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.borderColor = COLOR.border;
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: COLOR.orangeLight,
                    color: COLOR.orangeDark,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                  }}
                >
                  {p.icon}
                </div>
                <span
                  style={{
                    display: "inline-block",
                    background: COLOR.orange,
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 12px",
                    borderRadius: 20,
                    marginBottom: 6,
                  }}
                >
                  {p.titre}
                </span>
                <p style={{ fontSize: 12, color: COLOR.inkSoft, lineHeight: 1.4, margin: 0 }}>{p.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ===== STATISTIQUES ===== */}
      <section style={{ padding: "56px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
          className="stats-grid"
        >
          {[
            { target: 50, suffix: "+", label: "Nounous vérifiées", sub: "Appelées et validées" },
            { target: 48, suffix: "", label: "Note moyenne /5", sub: "Sur 5 étoiles", divide: true },
            { target: 45, suffix: "", label: "Quartiers couverts", sub: "Abidjan & environs" },
          ].map((s, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div
                style={{
                  background: COLOR.white,
                  borderRadius: 18,
                  padding: "32px 20px",
                  textAlign: "center",
                  border: `1px solid ${COLOR.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "clamp(34px, 4vw, 48px)",
                    color: COLOR.orange,
                    lineHeight: 1,
                  }}
                >
                  <AnimatedNumber target={s.target} suffix={s.suffix} divide={s.divide} />
                </div>
                <div
                  style={{
                    color: COLOR.ink,
                    fontWeight: 600,
                    fontSize: "clamp(14px, 1vw, 16px)",
                    marginTop: 8,
                  }}
                >
                  {s.label}
                </div>
                <div style={{ color: COLOR.inkSoft, fontSize: 13, marginTop: 4 }}>{s.sub}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ===== NOS NOUNOUS ===== */}
      <section id="nounous" style={{ padding: "24px 24px 72px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div
              style={{
                position: "relative",
                borderRadius: 28,
                padding: "clamp(28px, 4vw, 44px) clamp(20px, 3vw, 40px) clamp(36px, 5vw, 52px)",
                background: `linear-gradient(135deg, ${COLOR.gradFrom}, ${COLOR.gradTo})`,
                overflow: "hidden",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "clamp(26px, 3vw, 34px)",
                    color: "#3B2306",
                    marginBottom: 6,
                  }}
                >
                  Nos nounous
                </h2>
                <p style={{ color: "#5C3D0A", fontSize: 15 }}>Vérifiées par leur agence partenaire</p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 32,
                  flexWrap: "wrap",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    background: COLOR.white,
                    borderRadius: 24,
                    padding: 4,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  {quartiersTabs.map((q) => (
                    <button
                      key={q}
                      onClick={() => setActiveQuartier(q)}
                      style={{
                        border: "none",
                        cursor: "pointer",
                        background: activeQuartier === q ? COLOR.orange : "transparent",
                        color: activeQuartier === q ? "white" : COLOR.inkSoft,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: "8px 18px",
                        borderRadius: 20,
                        transition: "all 0.2s",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {nounouAffiche ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      background: COLOR.white,
                      borderRadius: 24,
                      padding: "32px 28px",
                      textAlign: "center",
                      boxShadow: "0 10px 40px rgba(59,35,6,0.15)",
                      maxWidth: 280,
                      width: "100%",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.boxShadow = "0 16px 48px rgba(59,35,6,0.20)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 10px 40px rgba(59,35,6,0.15)";
                    }}
                  >
                    <img
                      src={nounouAffiche.avatar}
                      alt={nounouAffiche.nom}
                      loading="lazy"
                      width={96}
                      height={96}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        objectFit: "cover",
                        margin: "0 auto 14px",
                        display: "block",
                        border: `4px solid ${COLOR.orange}`,
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: 20, color: COLOR.ink, marginBottom: 4 }}>
                      {nounouAffiche.nom}
                    </div>
                    <div style={{ fontSize: 14, color: COLOR.inkSoft, marginBottom: 6 }}>
                      📍 {nounouAffiche.quartier}
                    </div>
                    <div style={{ fontSize: 13, color: COLOR.orange, fontWeight: 600, marginBottom: 10 }}>
                      ⭐ 4.8 / 5
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        padding: "5px 18px",
                        borderRadius: 50,
                        background: COLOR.chip,
                        color: "white",
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      ✅ Disponible
                    </span>
                    <div style={{ fontSize: 12, color: COLOR.inkSoft, opacity: 0.6 }}>
                      🏢 {nounouAffiche.agence}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: COLOR.inkSoft, fontSize: 14 }}>
                  Aucune nounou disponible dans ce quartier.
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 32 }}>
                <a
                  href="/inscription?profil=menage"
                  style={{
                    background: COLOR.white,
                    color: COLOR.ink,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    padding: "12px 26px",
                    borderRadius: 50,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Voir toutes les nounous <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ===== AVIS DES FAMILLES ===== */}
      <section style={{ padding: "24px 24px 72px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 3vw, 36px)",
                color: COLOR.ink,
                marginBottom: 6,
              }}
            >
              Avis des familles
            </h2>
            <p style={{ color: COLOR.inkSoft, fontSize: 17 }}>Des parents comme vous</p>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {avisAffiches.map((t, i) => (
            <FadeUp key={i} delay={i * 100}>
              <div
                style={{
                  background: i === 0 ? "#FFE9C2" : COLOR.white,
                  padding: "24px 26px",
                  borderRadius: 18,
                  borderLeft: `4px solid ${COLOR.orange}`,
                }}
              >
                {i === 0 && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      background: COLOR.orange,
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
                <div style={{ color: COLOR.orange, fontSize: 16, marginBottom: 6 }}>
                  {"★".repeat(t.note)}{"☆".repeat(5 - t.note)}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: COLOR.ink,
                    lineHeight: 1.6,
                    marginBottom: 8,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{t.texte}&rdquo;
                </p>
                <span style={{ fontSize: 13, color: COLOR.inkSoft, fontWeight: 600 }}>
                  — {t.auteur}, {t.quartier}
                </span>
              </div>
            </FadeUp>
          ))}

          <FadeUp delay={160}>
            <div
              style={{
                gridColumn: "1 / -1",
                background: COLOR.white,
                borderLeft: `4px solid ${COLOR.border}`,
                padding: "18px 26px",
                borderRadius: 18,
                textAlign: "center",
                border: `1px solid ${COLOR.borderStrong}`,
              }}
            >
              <p style={{ fontSize: 15, color: COLOR.inkSoft, fontStyle: "italic" }}>
                Vous avez trouvé une nounou ?{" "}
                <button
                  onClick={() => {
                    if (isConnected) {
                      setShowAvisForm(true);
                      setTimeout(() => {
                        document.getElementById("avis-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 100);
                    } else {
                      navigate("/connexion");
                    }
                  }}
                  style={{
                    color: COLOR.orange,
                    fontWeight: 700,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "inherit",
                    fontStyle: "italic",
                  }}
                >
                  Donnez votre avis
                </button>
              </p>
            </div>
          </FadeUp>
        </div>

        {showAvisForm && isConnected && (
          <div
            id="avis-form"
            style={{
              marginTop: 24,
              padding: 24,
              background: COLOR.white,
              borderRadius: 18,
              border: `2px solid ${COLOR.orange}`,
              maxWidth: 500,
              marginLeft: "auto",
              marginRight: "auto",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
              Laissez votre avis
            </h3>
            <form onSubmit={handleAvisSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Note
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewAvis({ ...newAvis, note: s })}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 24,
                        cursor: "pointer",
                        color: s <= newAvis.note ? COLOR.orange : "#DDD",
                        padding: 0,
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Votre témoignage
                </label>
                <textarea
                  value={newAvis.texte}
                  onChange={(e) => setNewAvis({ ...newAvis, texte: e.target.value })}
                  placeholder="Partagez votre expérience..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1px solid ${COLOR.border}`,
                    fontFamily: "inherit",
                    fontSize: 14,
                    resize: "vertical",
                    minHeight: 80,
                    outline: "none",
                  }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAvisForm(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 50,
                    border: `1px solid ${COLOR.border}`,
                    background: "transparent",
                    color: COLOR.inkSoft,
                    fontWeight: 600,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: 50,
                    border: "none",
                    background: COLOR.orange,
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{ padding: "24px 24px 72px", maxWidth: 720, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              background: "#E7E4DC",
              borderRadius: 40,
              padding: "8px 8px 8px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "nowrap",
              gap: 8,
            }}
          >
            <span
              style={{
                color: "#5C574C",
                fontSize: "clamp(13px, 1.2vw, 15px)",
                fontWeight: 500,
                padding: "10px 0",
                whiteSpace: "nowrap",
              }}
            >
              Prêt à trouver votre nounou ?
            </span>
            <button
              onClick={() => navigate("/inscription")}
              style={{
                background: COLOR.gradTo,
                color: "#3B2306",
                border: "none",
                padding: "14px 30px",
                borderRadius: 32,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              S'inscrire
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a
              href="https://wa.me/2250152242299"
              target="_blank"
              rel="noreferrer"
              style={{
                color: COLOR.orangeDark,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MessageCircle size={15} /> Ou contactez-nous directement sur WhatsApp
            </a>
          </div>
        </FadeUp>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        style={{
          background: COLOR.white,
          color: COLOR.inkSoft,
          padding: "48px 24px 24px",
          borderTop: `2px solid ${COLOR.border}`,
          borderRadius: "28px 28px 0 0",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              gap: 32,
              marginBottom: 32,
              textAlign: "left",
            }}
            className="footer-grid"
          >
            <div>
              <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, textDecoration: "none" }}>
                <Logo size={32} />
                <span style={{ color: COLOR.ink, fontWeight: 700, fontSize: 16 }}>
                  Nounou Connect
                </span>
              </a>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280, color: COLOR.inkSoft }}>
                La plateforme de mise en relation entre familles, agences de placement et nounous
                professionnelles à Abidjan.
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
                <a 
                  href="https://tiktok.com/@nounouconnect" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: COLOR.inkSoft, textDecoration: "none", fontSize: 13 }}
                >
                  TikTok
                </a>
                <a 
                  href="https://facebook.com/nounouconnect" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: COLOR.inkSoft, textDecoration: "none", fontSize: 13 }}
                >
                  Facebook
                </a>
                <a 
                  href="https://wa.me/2250152242299" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: COLOR.inkSoft, textDecoration: "none", fontSize: 13 }}
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <div>
              <h4 style={{ color: COLOR.ink, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Liens
              </h4>
              <a
                href="/a-propos"
                style={{ display: "block", color: COLOR.inkSoft, textDecoration: "none", fontSize: 13, marginBottom: 8 }}
              >
                À propos
              </a>
              <a
                href="/conditions"
                style={{ display: "block", color: COLOR.inkSoft, textDecoration: "none", fontSize: 13, marginBottom: 8 }}
              >
                Conditions
              </a>
              <a
                href="/confidentialite"
                style={{ display: "block", color: COLOR.inkSoft, textDecoration: "none", fontSize: 13, marginBottom: 8 }}
              >
                Confidentialité
              </a>
              <a
                href="/aide"
                style={{ display: "block", color: COLOR.inkSoft, textDecoration: "none", fontSize: 13, marginBottom: 8 }}
              >
                Aide
              </a>
            </div>

            <div>
              <h4 style={{ color: COLOR.ink, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Contact
              </h4>
              <a href="mailto:contact@nounouconnect.ci" style={{ fontSize: 13, marginBottom: 6, display: "block", color: COLOR.inkSoft, textDecoration: "none" }}>
                📧 contact@nounouconnect.ci
              </a>
              <a href="tel:+2250152242299" style={{ fontSize: 13, marginBottom: 6, display: "block", color: COLOR.inkSoft, textDecoration: "none" }}>
                📞 +225 01 52 24 22 99
              </a>
              <p style={{ fontSize: 13 }}>📍 Abidjan, Côte d'Ivoire</p>
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${COLOR.border}`,
              paddingTop: 16,
              textAlign: "center",
              fontSize: 12,
              color: COLOR.inkSoft,
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
          transition: "opacity 0.3s",
        }}
      >
        <button
          onClick={isConnected ? goToDashboard : () => navigate("/inscription")}
          style={{
            background: isConnected ? COLOR.white : COLOR.orange,
            color: isConnected ? COLOR.ink : "white",
            border: isConnected ? `1.5px solid ${COLOR.orange}` : "none",
            padding: "14px 32px",
            borderRadius: 50,
            fontSize: "clamp(14px, 1vw, 16px)",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: isConnected 
              ? "0 8px 32px rgba(33,27,20,0.10)" 
              : "0 8px 32px rgba(243,129,30,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (isConnected) {
              e.currentTarget.style.background = COLOR.orange;
              e.currentTarget.style.color = "white";
            } else {
              e.currentTarget.style.background = COLOR.orangeDark;
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            }
          }}
          onMouseLeave={(e) => {
            if (isConnected) {
              e.currentTarget.style.background = COLOR.white;
              e.currentTarget.style.color = COLOR.ink;
            } else {
              e.currentTarget.style.background = COLOR.orange;
              e.currentTarget.style.transform = "";
            }
          }}
        >
          {isConnected ? (
            <>
              <User size={16} /> Aller à mon espace
            </>
          ) : (
            <>
              <Search size={16} /> Je cherche une nounou
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== NAVBAR RESPONSIVE ===== */
        @media (max-width: 768px) {
          header {
            padding: 6px 12px !important;
            height: 60px !important;
          }
          header nav {
            gap: 6px !important;
          }
          header nav button {
            padding: 5px 10px !important;
            font-size: 11px !important;
            min-width: 70px !important;
          }
          header nav a {
            font-size: 11px !important;
          }
          header .header-logo span {
            font-size: 13px !important;
          }
          header .header-logo svg {
            width: 28px !important;
            height: 28px !important;
          }
          div[style*="height: 72px"] {
            height: 60px !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
          .hero-grid > div:first-child {
            text-align: center !important;
            margin: 0 auto !important;
          }
          .hero-grid .hero-image {
            order: -1 !important;
            max-width: 300px !important;
            margin: 0 auto !important;
          }
          .hero-grid .hero-image img {
            max-height: 250px !important;
          }
          .hero-grid .hero-actions {
            justify-content: center !important;
          }
          .hero-grid .hero-badge {
            justify-content: center !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
          .footer-grid > div {
            text-align: center !important;
          }
          .footer-grid > div > div {
            justify-content: center !important;
          }
          .footer-grid p {
            margin: 0 auto !important;
          }
        }

        @media (max-width: 640px) {
          .pourquoi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .pourquoi-grid > div {
            padding: 14px 10px !important;
          }
          .hero-grid .hero-image img {
            max-height: 200px !important;
          }
        }

        @media (max-width: 480px) {
          header {
            padding: 4px 8px !important;
            height: 54px !important;
          }
          header nav button {
            padding: 4px 8px !important;
            font-size: 10px !important;
            min-width: 60px !important;
          }
          header nav a {
            font-size: 10px !important;
          }
          header .header-logo span {
            font-size: 11px !important;
          }
          header .header-logo svg {
            width: 24px !important;
            height: 24px !important;
          }
          div[style*="height: 72px"] {
            height: 54px !important;
          }
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .hero h1 {
            font-size: 28px !important;
          }
          .hero-actions {
            flex-direction: column !important;
          }
          .hero-actions button,
          .hero-actions a {
            width: 100% !important;
            justify-content: center !important;
          }
          .cta-container {
            flex-wrap: wrap !important;
            justify-content: center !important;
            padding: 12px !important;
          }
          .cta-container span {
            font-size: 12px !important;
            text-align: center !important;
            padding: 6px 0 !important;
          }
          .cta-container button {
            font-size: 12px !important;
            padding: 8px 16px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .nounou-profile-card {
            max-width: 240px !important;
            padding: 24px 20px !important;
          }
          .nounou-profile-card img {
            width: 72px !important;
            height: 72px !important;
          }
          .nounou-profile-card .nom {
            font-size: 17px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
        }

        @media (max-width: 380px) {
          header {
            height: 48px !important;
            padding: 2px 6px !important;
          }
          header nav button {
            min-width: 50px !important;
            font-size: 9px !important;
            padding: 3px 6px !important;
          }
          header nav {
            gap: 3px !important;
          }
          header .header-logo span {
            font-size: 10px !important;
          }
          header .header-logo svg {
            width: 20px !important;
            height: 20px !important;
          }
          div[style*="height: 72px"] {
            height: 48px !important;
          }
          .hero h1 {
            font-size: 22px !important;
          }
          .avatar-circle {
            width: 30px !important;
            height: 30px !important;
            font-size: 11px !important;
          }
          .nounou-profile-card {
            max-width: 200px !important;
            padding: 18px 14px !important;
          }
          .nounou-profile-card img {
            width: 60px !important;
            height: 60px !important;
          }
          .hero-grid .hero-image img {
            max-height: 150px !important;
          }
        }
      `}</style>
    </div>
  );
}
