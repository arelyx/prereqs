// Quick screenshot of a seeded plan: node scripts/shot.mjs <slug> <out.png> [dark] [width]
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const [slug, out, theme = 'light', width = '1440', planFile] = process.argv.slice(2)
const BASE = process.env.PW_BASE_URL ?? 'http://localhost:5302'
const API = process.env.API_URL ?? 'http://localhost:8302'
const progs = await (await fetch(`${API}/u/ucsc/programs`)).json()
const plan = planFile ? JSON.parse(readFileSync(planFile, 'utf8')) : { terms: [], choices: {}, attested: {} }
const ed = plan.catalog_year ?? '2026-27'
const p = progs.find((x) => x.slug === slug && x.edition === ed)
const state = {
  plans: [{ id: 'p1', planName: plan.name ?? 'Sample plan', programIds: [p.id], serverPlanId: null, rev: 1,
    content: { completed: plan.completed ?? [], terms: plan.terms.map(([t, ...c]) => ({ term_code: t, courses: c.map((x) => x.replace(' ', '')) })), catalog_year: plan.catalog_year ?? null,
      choices: plan.choices ? { [slug]: plan.choices } : {}, attested: plan.attested ? { [slug]: plan.attested } : {}, grades: plan.grades ?? {} } }],
  activeId: 'p1', deleted: [],
}
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, colorScheme: theme })
await page.addInitScript(([s, th]) => {
  localStorage.setItem('prereqs.plans.v2', s)
  localStorage.setItem('prereqs.theme', th)
}, [JSON.stringify(state), theme])
await page.goto(BASE)
await page.getByRole('region', { name: /degree progress/ }).first().waitFor({ timeout: 15000 })
await page.waitForTimeout(800)
const el = page.getByRole('region', { name: /degree progress/ }).first()
await el.scrollIntoViewIfNeeded()
if (process.env.FULL) await page.screenshot({ path: out, fullPage: true })
else await el.screenshot({ path: out })
await browser.close()
console.log('wrote', out)
