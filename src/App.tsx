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

function RequireProfile({
  profile,
  children,
}: {
  profile: ProfileType;
  children: React.ReactNode;
}) {
  const { user, profileType } = useAuthStore();
  
  // ✅ Si non connecté → rediriger vers la Landing Page
  if (!user || profileType !== profile) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/connexion" element={<ConnexionPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/aide" element={<AidePage />} />
      <Route path="/a-propos" element={<AProposPage />} />

      {/* Pages protégées - Ménage */}
      <Route
        path="/espace-menage"
        element={
          <RequireProfile profile="menage">
            <EspaceMenage />
          </RequireProfile>
        }
      />

      {/* Pages protégées - Agence */}
      <Route
        path="/espace-agence"
        element={
          <RequireProfile profile="agence">
            <EspaceAgence />
          </RequireProfile>
        }
      />

      {/* Pages protégées - Nounou */}
      <Route
        path="/espace-nounou"
        element={
          <RequireProfile profile="nounou">
            <EspaceNounou />
          </RequireProfile>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}