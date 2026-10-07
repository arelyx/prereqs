# frontend

React 19 + Vite + TypeScript + Tailwind v4. One page, no router; state lives
in a single context store (`src/store.tsx`).

- `src/api.ts` — typed API client (`VITE_API_URL`, default `http://localhost:8200`).
- `src/store.tsx` — plans in localStorage (`prereqs.plans.v2`), cross-tab
  merge, per-plan server sync when signed in, debounced validation.
- `src/components/` — planner grid, course search + drawer, prereq graph
  (React Flow), GE panel, program picker (catalog year aware) and
  requirement dashboards, plan switcher, export, transcript import.

```bash
npm ci
npm run dev -- --port 5273          # needs the backend on :8200
npx tsc -b && npx oxlint src        # typecheck + lint
npx playwright test                 # e2e against the running, loaded stack
```
