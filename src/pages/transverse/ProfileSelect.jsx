import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import TrustSeal from "../../components/ui/TrustSeal";

const PROFILES = [
  {
    id: "menage",
    title: "Je cherche une nounou",
    subtitle: "Ménage / Famille",
    to: "/menage/inscription",
  },
  {
    id: "agence",
    title: "Je gère une agence de placement",
    subtitle: "Agence",
    to: "/agence/inscription",
  },
  {
    id: "nounou",
    title: "Je propose mes services",
    subtitle: "Nounou",
    to: "/nounou/inscription",
  },
];

export default function ProfileSelect() {
  const navigate = useNavigate();
  const setProfileType = useAuthStore((s) => s.setProfileType);

  const choose = (profile) => {
    setProfileType(profile.id);
    navigate(profile.to);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ecru px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <TrustSeal size={56} />
          <h1 className="font-display text-2xl font-semibold">Nounou Connect</h1>
          <p className="text-sm text-ink/60">
            Trouvez une nounou de confiance, présentée et garantie par une agence
            partenaire.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => choose(p)}
              className="card flex items-center justify-between text-left transition-shadow hover:shadow-md"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-palm">
                  {p.subtitle}
                </p>
                <p className="mt-0.5 font-display text-base">{p.title}</p>
              </div>
              <span className="text-ink/30">&rarr;</span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink/50">
          Déjà un compte ?{" "}
          <button
            onClick={() => navigate("/connexion")}
            className="font-medium text-palm-dark underline underline-offset-2"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
