import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/ship/',
  build: {
    sourcemap: false,
    rollupOptions: { output: { manualChunks: { 'vendor-react': ['react','react-dom','react-router-dom'] } } },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5190,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  preview: { port: 4190 },
});
