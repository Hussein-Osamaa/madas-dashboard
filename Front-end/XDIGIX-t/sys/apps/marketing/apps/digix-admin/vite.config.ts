import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

/** Ensure SPA fallback for all /admin/* routes (prevents redirect to /admin) */
function adminHistoryFallback() {
  return {
    name: 'admin-history-fallback',
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          const url = (req.url || '').split('?')[0];
          const isAdminNested = url.startsWith('/admin/') && url.length > 7;
          const isAsset = /\.(js|css|ico|svg|png|jpg|woff2?)$/.test(url) || url.includes('/@') || url.includes('/node_modules');
          if (isAdminNested && !isAsset) {
            req.url = '/index.html';
          }
          next();
        });
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), adminHistoryFallback()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../../../shared'),
      firebase: path.resolve(__dirname, 'node_modules/firebase')
    },
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 5176,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  preview: {
    port: 4176
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
  }
});

