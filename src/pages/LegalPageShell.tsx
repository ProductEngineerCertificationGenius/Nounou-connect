// src/pages/LegalPageShell.tsx
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Logo } from "../components/Logo";

interface LegalPageShellProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Coquille commune pour les pages légales (À propos, Conditions, Confidentialité).
 *
 * NB : la version d'origine (branche Emma) utilisait des classes Tailwind
 * (bg-[#161210], text-white...) pour un thème sombre. Tailwind n'étant pas
 * câblé dans le pipeline CSS de ce projet (pas de config, pas d'import dans
 * src/styles/index.css), ces classes ne produisaient aucun style réel — la
 * page se serait affichée sans mise en forme. Cette version reprend le
 * thème clair utilisé partout ailleurs dans l'app (cf. AProposPage,
 * ProfilPage), en CSS classique via un bloc <style>, comme le reste du
 * projet. Le lien retour, qui pointait vers "/liens" (route inexistante),
 * revient maintenant à l'accueil.
 */
export default function LegalPageShell({ title, updatedAt, children }: LegalPageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-content">
          <button className="btn-back" onClick={() => navigate("/")}>
            <ChevronLeft size={20} />
            Retour à l'accueil
          </button>
          <div className="legal-logo">
            <Logo size={28} />
            <span>Nounou Connect</span>
          </div>
        </div>
      </header>

      <main className="legal-content">
        <h1>{title}</h1>
        <p className="legal-updated">Dernière mise à jour : {updatedAt}</p>
        <div className="legal-sections">{children}</div>
      </main>

      <style>{`
        .legal-page {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .legal-header {
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          padding: 14px 24px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .legal-header-content {
          max-width: 720px;
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

        .legal-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legal-logo span {
          font-size: 16px;
          font-weight: 700;
          color: #1C1917;
        }

        .legal-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 24px 64px;
        }

        .legal-content h1 {
          font-family: "'DM Serif Display', serif";
          font-size: clamp(28px, 4vw, 36px);
          color: #1C1917;
          margin-bottom: 6px;
        }

        .legal-updated {
          font-size: 13px;
          color: #78716C;
          margin-bottom: 32px;
        }

        .legal-sections {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .legal-header-content {
            flex-direction: column;
            gap: 8px;
          }

          .legal-content {
            padding: 28px 16px 48px;
          }
        }
      `}</style>
    </div>
  );
}

/** Bloc de section réutilisé dans chaque page (titre + contenu, style carte). */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      <div className="legal-section-body">{children}</div>

      <style>{`
        .legal-section {
          background: white;
          border-radius: 16px;
          padding: 20px 22px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        }

        .legal-section h2 {
          font-size: 16px;
          font-weight: 700;
          color: #1C1917;
          margin-bottom: 8px;
        }

        .legal-section-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          line-height: 1.7;
          color: #57534E;
        }
      `}</style>
    </section>
  );
}
