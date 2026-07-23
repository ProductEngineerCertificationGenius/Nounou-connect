import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'inscription.svg', 'connexion.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Nounou Connect',
        short_name: 'Nounou',
        description: 'Trouvez votre nounou de confiance',
        lang: 'fr',
        theme_color: '#C2614F',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        // Un seul icône SVG "any" ne suffit pas partout : la plupart des
        // navigateurs Android/Chrome exigent au moins un PNG 192 et 512
        // pour proposer l'installation ("Ajouter à l'écran d'accueil").
        // L'icône "maskable" évite que le logo soit rogné par les formes
        // d'icônes Android (cercle, squircle...).
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});