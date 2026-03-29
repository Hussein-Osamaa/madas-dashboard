import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/dashboard/',
  plugins: [react()],
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../../../shared'),
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