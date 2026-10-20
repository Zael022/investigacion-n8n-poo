import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El navegador llama a /api/... y Vite lo reenvía a los webhooks de n8n (http://localhost:5678/webhook/...).
// Así no hay problemas de CORS. En modo simulado no se usa.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/webhook'),
        timeout: 120000,
        proxyTimeout: 120000,
      },
    },
  },
});
