import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import TrustSeal from "../ui/TrustSeal";

const NAV_BY_PROFILE = {
  menage: [
    { to: "/menage/recherche", label: "Rechercher", icon: SearchIcon },
    { to: "/menage/historique", label: "Historique", icon: ClockIcon },
  ],
  agence: [
    { to: "/agence/tableau-de-bord", label: "Tableau de bord", icon: GridIcon },
    { to: "/agence/vivier", label: "Vivier", icon: UsersIcon },
    { to: "/agence/demandes", label: "Demandes", icon: InboxIcon },
    { to: "/agence/parametres", label: "Paramètres", icon: GearIcon },
  ],
  nounou: [
    { to: "/nounou/profil", label: "Mon profil", icon: UserIcon },
    { to: "/nounou/avis", label: "Avis", icon: StarIcon },
    { to: "/nounou/historique", label: "Missions", icon: ClockIcon },
  ],
};

export default function AppShell() {
  const { profileType, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const items = NAV_BY_PROFILE[profileType] || [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-ecru lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <TrustSeal size={32} />
          <span className="font-display text-lg font-semibold">Nounou Connect</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-palm-light text-palm-dark" : "text-ink/70 hover:bg-ecru"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-line p-4">
            <p className="truncate text-sm font-medium">{user.name || user.nom}</p>
            <p className="truncate text-xs text-ink/50">{user.quartier}</p>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs font-medium text-clay hover:underline"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </aside>

      {/* Colonne principale */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header mobile */}
        <header className="flex items-center gap-2 border-b border-line bg-white px-4 py-3 lg:hidden">
          <TrustSeal size={26} />
          <span className="font-display text-base font-semibold">Nounou Connect</span>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 lg:px-10 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-3xl lg:max-w-5xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav mobile */}
        {items.length > 0 && (
          <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white lg:hidden">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                    isActive ? "text-palm-dark" : "text-ink/50"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

// Icônes minimalistes en SVG inline (pas de dépendance supplémentaire)
function iconProps(props) {
  return { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...props };
}
function SearchIcon(props) { return <svg {...iconProps(props)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function ClockIcon(props) { return <svg {...iconProps(props)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>; }
function GridIcon(props) { return <svg {...iconProps(props)}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>; }
function UsersIcon(props) { return <svg {...iconProps(props)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="18" cy="9" r="3" /><path d="M15 20c.3-2.8 2.2-5 4.8-5.6" /></svg>; }
function InboxIcon(props) { return <svg {...iconProps(props)}><path d="M3 12h4.5l1.5 3h6l1.5-3H21" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg>; }
function GearIcon(props) { return <svg {...iconProps(props)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>; }
function UserIcon(props) { return <svg {...iconProps(props)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>; }
function StarIcon(props) { return <svg {...iconProps(props)}><polygon points="12 2.5 15 9 22 10 17 15 18.5 22 12 18.5 5.5 22 7 15 2 10 9 9" /></svg>; }
