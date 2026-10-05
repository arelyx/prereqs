import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Harness modules live in ../harnesses (outside the Vite root); they
    // import the standard library as '@harness' and app components as '@app'.
    alias: {
      '@harness-tools': fileURLToPath(new URL('./harness-tools', import.meta.url)),
      '@harness': `${src}/harness`,
      '@app': src,
    },
    // Views in ../harnesses import react; always use this app's copy.
    dedupe: ['react', 'react-dom'],
  },
  // Dev-only: lets a dev server on a non-CORS-allowed port reach the backend
  // same-origin (run with VITE_API_URL='' so api calls are relative).
  server: {
    fs: { allow: ['..'] },
    proxy: Object.fromEntries(
      ['/u', '/auth', '/plans'].map((p) => [
        p,
        { target: process.env.BACKEND_URL ?? 'http://localhost:8200', changeOrigin: true },
      ]),
    ),
  },
  test: {
    include: ['../harnesses/**/*.test.ts', 'src/harness/**/*.test.ts'],
    root: '.',
  },
} as never)
