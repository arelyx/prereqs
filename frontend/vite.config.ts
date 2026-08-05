import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: lets a dev server on a non-CORS-allowed port reach the backend
  // same-origin (run with VITE_API_URL='' so api calls are relative).
  server: {
    // Dev-only: reachable by hostname from other machines on the LAN. Vite
    // otherwise rejects any Host header it doesn't recognize.
    allowedHosts: true,
    proxy: Object.fromEntries(
      ['/u', '/auth', '/plans', '/transcript'].map((p) => [
        p,
        { target: process.env.BACKEND_URL ?? 'http://localhost:8200', changeOrigin: true },
      ]),
    ),
  },
})
