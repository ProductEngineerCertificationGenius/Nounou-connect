# Nounou Connect — Frontend

Stack : React + Vite, Tailwind CSS, React Hook Form, Zustand, React Query,
vite-plugin-pwa. Backend : Supabase (BaaS). Contact via lien WhatsApp
(wa.me), pas de messagerie interne. Cf. les ADR fournis pour le détail
des choix techniques.

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase du projet
npm run dev
```

Sans clés Supabase renseignées, l'application démarre quand même et
fonctionne avec des données de démonstration (src/data/mockData.js),
ce qui permet de travailler sur le front indépendamment du backend.

## Build de production (PWA)

```bash
npm run build
npm run preview   # pour vérifier le build localement
```

## Structure

```
src/
  components/
    ui/        composants réutilisables (cartes, champs, sceau de confiance...)
    layout/    AppShell : navigation responsive (bottom nav mobile / sidebar desktop)
  pages/
    transverse/  sélection de profil, connexion
    menage/      7 écrans du parcours Ménage
    agence/      7 écrans du parcours Agence
    nounou/      4 écrans du parcours Nounou
  hooks/useData.js   hooks React Query, bascule auto Supabase réel / mock
  data/mockData.js   données de démonstration
  store/useAuthStore.js   utilisateur connecté + profil actif (Zustand)
  lib/supabaseClient.js   client Supabase (lit .env.local)
```

## Brancher Supabase

Chaque hook de `src/hooks/useData.js` contient déjà l'appel Supabase
correspondant (commenté / prêt), activé automatiquement dès que
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont renseignées.
Tables attendues côté Supabase (cf. ADR 0002) : `menages`, `agences`,
`nounous`, `demandes`, `avis`, `recherches` — à créer avec les règles
Row Level Security appropriées avant de brancher l'app en production.

## Icônes PWA manquantes

Le manifest référence `pwa-192x192.png`, `pwa-512x512.png` et
`apple-touch-icon.png` dans `public/` — à fournir avant déploiement
(ils ne sont pas inclus dans ce livrable front-end).
