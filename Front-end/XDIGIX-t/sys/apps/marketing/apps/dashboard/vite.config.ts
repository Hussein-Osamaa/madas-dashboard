import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/dashboard/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../../../shared'),
      firebase: path.resolve(__dirname, 'node_modules/firebase')
    }
  },
  server: {
    port: 5174,
    host: true
  },
  preview: {
    port: 4174
  }
});