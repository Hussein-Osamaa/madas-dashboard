import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

function warehouseHistoryFallback() {
  return {
    name: 'warehouse-history-fallback',
    apply: 'serve',
    enforce: 'pre' as const,
    configureServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          const url = (req.url || '').split('?')[0];
          const isNested = url.startsWith('/warehouse/') && url.length > 10;
          const isAsset = /\.(js|css|ico|svg|png|jpg|woff2?)$/.test(url) || url.includes('/@') || url.includes('/node_modules');
          if (isNested && !isAsset) {
            req.url = '/index.html';
          }
          next();
        });
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), warehouseHistoryFallback()],
  base: '/warehouse/',
  build: { sourcemap: true, chunkSizeWarningLimit: 1000 },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5180,
    host: true,
  },
  preview: {
    port: 4180,
  },
});
