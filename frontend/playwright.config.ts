import { defineConfig } from '@playwright/test'

// Runs against the dockerized stack (frontend 5273 / backend 8200) with real
// loaded data — see docs/ARCHITECTURE.md. Start it first:
//   docker compose up -d && (load data via backend/app/loaders)
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    // PW_BASE_URL lets a spec run against a side-instance (e.g. vite on a
    // spare port) without touching the shared stack's ports.
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:5273',
    screenshot: 'only-on-failure',
  },
})
