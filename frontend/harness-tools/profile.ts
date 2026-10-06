// Time one harness on a "kitchen sink" record (every course code the harness
// names, in one term): tsx harness-tools/profile.ts <edition>/<slug>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runHarness } from '@harness'
import type { Harness } from '@harness'
import { REPO, loadCatalog } from './catalog'

const [key] = process.argv.slice(2)
const file = join(REPO, 'harnesses/ucsc', key, 'harness.ts')
const h = ((await import(pathToFileURL(file).href)) as { default: Harness }).default
const code = readFileSync(file, 'utf8')
const sink = [...new Set([...code.matchAll(/'([A-Z]{2,5} \d{1,3}[A-Z]{0,2})'/g)].map((m) => m[1]))].slice(0, Number(process.env.N ?? 999))
const cat = loadCatalog()
for (const choices of [{}, ...(h.choices?.[0]?.options ?? []).map((o) => ({ [h.choices![0].key]: o.value }))]) {
  const t0 = performance.now()
  const r = runHarness(h, { terms: [{ term: '2268', courses: sink }], attested: 'all', choices }, cat)
  console.log(JSON.stringify(choices), `${(performance.now() - t0).toFixed(0)}ms`, r.status, `${sink.length} courses`)
}
