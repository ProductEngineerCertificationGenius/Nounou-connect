// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'inscription.svg',
        'connexion.svg',
        'robots.txt',
        'apple-touch-icon.png',
        'offline.html',
      ],
      manifest: {
        id: '/',
        name: 'Nounou Connect - Trouvez votre nounou de confiance',
        short_name: 'Nounou Connect',
        description: "Plateforme de mise en relation entre familles, agences et nounous en Côte d'Ivoire",
        theme_color: '#C2614F',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'family', 'childcare'],
        lang: 'fr',
        dir: 'ltr',
        // Un seul icône SVG "any" ne suffit pas partout : la plupart des
        // navigateurs Android/Chrome exigent au moins un PNG 192 et 512
        // pour proposer l'installation ("Ajouter à l'écran d'accueil").
        // L'icône "maskable" évite que le logo soit rogné par les formes
        // d'icônes Android (cercle, squircle...).
        // NB : on pointe vers pwa-192.png / pwa-512.png / pwa-maskable-512.png
        // (fichiers réellement présents dans /public), et non vers
        // icons/icon-*.png comme dans la version de Noah — ce dossier n'est
        // jamais généré (generate-icons.js ne produit que les icônes de
        // raccourcis ci-dessous), ce qui aurait cassé le manifest (404).
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
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Rechercher une nounou',
            short_name: 'Rechercher',
            description: 'Lancez une recherche immédiate',
            url: '/?action=search',
            icons: [{ src: 'icons/shortcut-search.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mes demandes',
            short_name: 'Demandes',
            description: 'Consultez vos demandes',
            url: '/?action=demandes',
            icons: [{ src: 'icons/shortcut-requests.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mon profil',
            short_name: 'Profil',
            description: 'Modifier mon profil',
            url: '/?action=profil',
            icons: [{ src: 'icons/shortcut-profile.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot,json}'],
        globIgnores: ['**/node_modules/**/*', '**/dist/**/*'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/ui-avatars\.com\/api\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatars-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
        navigateFallback: 'offline.html',
        navigateFallbackAllowlist: [/^\/$/, /^\/inscription/, /^\/connexion/, /^\/espace-.*/],
      },
      devOptions: {
        enabled: false, // ✅ DÉSACTIVÉ EN DÉVELOPPEMENT - Plus de page "hors ligne"
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('clsx')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('react-hook-form') || id.includes('zustand')) {
              return 'vendor-forms';
            }
            if (id.includes('axios') || id.includes('@supabase')) {
              return 'vendor-http';
            }
            return 'vendor-other';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
