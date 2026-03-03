import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/finance/',
  plugins: [react()],
  server: { port: 5182, host: true },
});
