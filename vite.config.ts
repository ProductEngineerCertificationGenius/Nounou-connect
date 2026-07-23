import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'inscription.svg', 'connexion.svg'],
      manifest: {
        name: 'Nounou Connect',
        short_name: 'Nounou',
        description: 'Trouvez votre nounou de confiance',
        theme_color: '#C2614F',
        background_color: '#FAF7F2',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});