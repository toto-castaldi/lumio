import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Lumio Mobile',
        short_name: 'Lumio',
        description: 'AI-Powered Flashcards - Study Mode',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.BUILD_NUMBER': JSON.stringify(process.env.BUILD_NUMBER || 'dev'),
    'process.env.COMMIT_SHA': JSON.stringify(process.env.COMMIT_SHA || 'local'),
    'process.env.BUILD_DATE': JSON.stringify(process.env.BUILD_DATE || new Date().toISOString()),
  },
});
