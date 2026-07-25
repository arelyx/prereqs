import { defineConfig } from '@playwright/test'

// Runs against the dockerized stack (frontend 5273 / backend 8200) with real
// loaded data — see docs/ARCHITECTURE.md. Start it first:
//   docker compose up -d && (load data via backend/app/loaders)
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5273',
    screenshot: 'only-on-failure',
  },
})
