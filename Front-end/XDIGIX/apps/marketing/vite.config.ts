import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  base: '/',
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
});
