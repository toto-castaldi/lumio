import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.BUILD_NUMBER': JSON.stringify(
      process.env.BUILD_NUMBER || 'dev'
    ),
    'process.env.COMMIT_SHA': JSON.stringify(
      process.env.COMMIT_SHA || 'local'
    ),
    'process.env.BUILD_DATE': JSON.stringify(
      process.env.BUILD_DATE || new Date().toISOString()
    ),
  },
});
