import { defineConfig } from 'vite';

const base = (process.env.VITE_BASE_PATH || '/').trim() || '/';

export default defineConfig({
  base,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
});
