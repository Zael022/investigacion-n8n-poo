import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Versión con backend simulado: no necesita proxy ni variables de entorno.
// Cuando exista el backend real en n8n, aquí se agrega el proxy hacia sus webhooks.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
