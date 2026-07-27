// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import InscriptionPage from "./pages/InscriptionPage";
import ConnexionPage from "./pages/ConnexionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AidePage from "./pages/AidePage";
import AProposPage from "./pages/AProposPage";
import EspaceMenage from "./pages/EspaceMenage";
import EspaceAgence from "./pages/EspaceAgence";
import EspaceNounou from "./pages/EspaceNounou";
import { useAuthStore, type ProfileType } from "./store/useAuthStore";
import AProposPage from "./pages/AProposPage";
import ConditionsPage from "./pages/ConditionsPage";
import ConfidentialitePage from "./pages/ConfidentialitePage";

// ================================================================
// Réécriture complète : l'original gérait la navigation avec un simple
// useState("home" | "inscription" | ...) dans App.tsx — pas d'URL
// réelle, pas de bouton "retour" navigateur, rien de partageable/
// bookmarkable. react-router-dom était déjà en dépendance
// (package.json) mais jamais utilisé. Chaque "onBack"/"onLoginSuccess"
// simulé devient une vraie route.
//
// Ajout : `RequireProfile`, garde d'accès simple — un espace agence ne
// doit pas être atteignable en tapant l'URL sans être connecté en tant
// qu'agence (la vraie sécurité reste le RLS côté Supabase, ceci n'est
// qu'un confort de navigation côté client).
// ================================================================

function RequireProfile({
  profile,
  children,
}: {
  profile: ProfileType;
  children: React.ReactNode;
}) {
  const { user, profileType } = useAuthStore();
  if (!user || profileType !== profile) {
    return <Navigate to="/connexion" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/connexion" element={<ConnexionPage />} />


      <Route
        path="/espace-menage"
        element={
          <RequireProfile profile="menage">
            <EspaceMenage />
          </RequireProfile>
        }
      />
      <Route
        path="/espace-agence"
        element={
          <RequireProfile profile="agence">
            <EspaceAgence />
          </RequireProfile>
        }
      />
      <Route
        path="/espace-nounou"
        element={
          <RequireProfile profile="nounou">
            <EspaceNounou />
          </RequireProfile>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
