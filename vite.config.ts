import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@client': '/client/src',
      '@shared': '/shared',
    },
  },
  build: {
    outDir: 'dist',
  },
});
