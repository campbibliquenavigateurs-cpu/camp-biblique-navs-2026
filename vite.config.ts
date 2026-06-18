import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png'],
      manifest: {
        name: 'Camp Biblique-Navs 2026',
        short_name: 'Camp Navs 2026',
        description:
          "Application de gestion du Camp Biblique-Navs 2026 — Mission Évangélique des Navigateurs CI",
        theme_color: '#1B3B1A',
        background_color: '#F4F9F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Le "app shell" (JS/CSS/HTML buildés par Vite) est pré-mis en cache
        // automatiquement par Workbox au moment du build : c'est ce qui
        // permet l'ouverture instantanée de l'app, même hors-ligne.
        runtimeCaching: [
          {
            // Images et polices : Stale-While-Revalidate, comme demandé —
            // affichage instantané depuis le cache, mise à jour en arrière-plan.
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets-cache' },
          },
          {
            // Données Supabase : NetworkFirst plutôt que SWR — choix volontaire.
            // La trésorerie et le suivi médical doivent toujours refléter l'état
            // le plus récent dès qu'une connexion existe ; le cache ne sert
            // qu'en tout dernier recours si le réseau est indisponible.
            urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
})
