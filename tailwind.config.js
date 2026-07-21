/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Fond très clair, presque blanc-bleuté : propre, clinique, sans chaleur
        // décorative — inspiré du fond Babysits (#EDF7F8).
        ecru: "#EFF5F9",
        ink: "#12283C",
        // Bleu profond : couleur principale — confiance et rigueur.
        palm: { DEFAULT: "#1B4F82", dark: "#123A61", light: "#E4EEF6" },
        // Vert "vérifié" : réservé au sceau de confiance et aux états
        // positifs (disponibilité, succès) — sécurité.
        seal: { DEFAULT: "#1E8F6D", light: "#DEF2E9" },
        // Or, utilisé uniquement pour les notes/étoiles (convention UI),
        // jamais comme couleur de marque.
        gold: "#C9962B",
        clay: "#B3413A",
        line: "#D7E2EA",
        muted: "#6B7C89",
      },
      fontFamily: {
        // Grotesque institutionnelle pour les titres : sérieux, lisible,
        // sans fioriture éditoriale — plus proche d'un service de confiance
        // que d'un carnet artisanal.
        display: ["\"Libre Franklin\"", "sans-serif"],
        body: ["\"Work Sans\"", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 42, 34, 0.06)",
      },
    },
  },
  plugins: [],
};
