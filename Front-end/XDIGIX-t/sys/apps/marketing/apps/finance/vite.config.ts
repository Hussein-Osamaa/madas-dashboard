import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/finance/',
  plugins: [react()],
  server: {
    port: 5175,
    host: '0.0.0.0'
  },
  preview: {
    port: 4175,
    host: '0.0.0.0'
  }
});

