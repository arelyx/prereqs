import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: lets a dev server on a non-CORS-allowed port reach the backend
  // same-origin (run with VITE_API_URL='' so api calls are relative).
  server: {
    proxy: Object.fromEntries(
      ['/u', '/auth', '/plans'].map((p) => [
        p,
        { target: process.env.BACKEND_URL ?? 'http://localhost:8200', changeOrigin: true },
      ]),
    ),
  },
})
