import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import AppShell from "./components/layout/AppShell";

import ProfileSelect from "./pages/transverse/ProfileSelect";
import Login from "./pages/transverse/Login";

import MenageSignup from "./pages/menage/Signup";
import SearchForm from "./pages/menage/SearchForm";
import SearchResults from "./pages/menage/SearchResults";
import AgencyProfile from "./pages/menage/AgencyProfile";
import NannyProfile from "./pages/menage/NannyProfile";
import SearchHistory from "./pages/menage/SearchHistory";

import AgenceSignup from "./pages/agence/Signup";
import Dashboard from "./pages/agence/Dashboard";
import NannyPool from "./pages/agence/NannyPool";
import NannyForm from "./pages/agence/NannyForm";
import RequestsList from "./pages/agence/RequestsList";
import RequestDetail from "./pages/agence/RequestDetail";
import AgencySettings from "./pages/agence/Settings";

import NounouSignup from "./pages/nounou/Signup";
import ProfileEdit from "./pages/nounou/ProfileEdit";
import Reviews from "./pages/nounou/Reviews";
import AssignmentHistory from "./pages/nounou/AssignmentHistory";

function RequireProfile({ profile, children }) {
  const profileType = useAuthStore((s) => s.profileType);
  if (profileType !== profile) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Transverses */}
        <Route path="/" element={<ProfileSelect />} />
        <Route path="/connexion" element={<Login />} />

        {/* Ménage */}
        <Route path="/menage/inscription" element={<MenageSignup />} />
        <Route
          element={
            <RequireProfile profile="menage">
              <AppShell />
            </RequireProfile>
          }
        >
          <Route path="/menage/recherche" element={<SearchForm />} />
          <Route path="/menage/resultats" element={<SearchResults />} />
          <Route path="/menage/agences/:id" element={<AgencyProfile />} />
          <Route path="/menage/nounous/:id" element={<NannyProfile />} />
          <Route path="/menage/historique" element={<SearchHistory />} />
        </Route>

        {/* Agence */}
        <Route path="/agence/inscription" element={<AgenceSignup />} />
        <Route
          element={
            <RequireProfile profile="agence">
              <AppShell />
            </RequireProfile>
          }
        >
          <Route path="/agence/tableau-de-bord" element={<Dashboard />} />
          <Route path="/agence/vivier" element={<NannyPool />} />
          <Route path="/agence/vivier/nouveau" element={<NannyForm />} />
          <Route path="/agence/vivier/:id/editer" element={<NannyForm />} />
          <Route path="/agence/demandes" element={<RequestsList />} />
          <Route path="/agence/demandes/:id" element={<RequestDetail />} />
          <Route path="/agence/parametres" element={<AgencySettings />} />
        </Route>

        {/* Nounou */}
        <Route path="/nounou/inscription" element={<NounouSignup />} />
        <Route
          element={
            <RequireProfile profile="nounou">
              <AppShell />
            </RequireProfile>
          }
        >
          <Route path="/nounou/profil" element={<ProfileEdit />} />
          <Route path="/nounou/avis" element={<Reviews />} />
          <Route path="/nounou/historique" element={<AssignmentHistory />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
