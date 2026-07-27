import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface LegalPageShellProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Coquille commune pour les pages légales (À propos, Conditions, Confidentialité).
 * Reprend le style sombre + accent ambre de Nounou Connect.
 */
export default function LegalPageShell({ title, updatedAt, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[#161210] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#161210]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-4">
          <Link
            to="/liens"
            aria-label="Retour"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-16">
        <p className="text-xs text-gray-500 mb-6">Dernière mise à jour : {updatedAt}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-gray-300">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Bloc de section réutilisé dans chaque page (titre + contenu, style carte discrète). */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
      <h2 className="text-white font-semibold text-base mb-2">{title}</h2>
      <div className="space-y-3 text-gray-400">{children}</div>
    </section>
  );
}
