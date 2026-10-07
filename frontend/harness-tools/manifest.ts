// Write/refresh a harness manifest from the committed program index.
//
//   npx tsx --tsconfig tsconfig.harness.json harness-tools/manifest.ts <edition> <slug> [--verified] [--draft] [--notes "..."] [--depends a,b]
//
// Hashes always come from data-committed/ucsc/editions/<ed>/programs.json.
// --depends records OTHER programs' source hashes this harness relies on
// (e.g. a minor that uses lists printed on its major's page); refresh status
// reports the harness when any of them changes. Existing dependencies are
// re-pinned to current hashes on every write — only after re-verifying.
// authored_at is kept if present; verified_at is set when --verified.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO, programIndex } from './catalog'

const [edition, slug, ...rest] = process.argv.slice(2)
if (!edition || !slug) {
  console.error('usage: manifest.ts <edition> <slug> [--verified|--draft] [--notes "..."]')
  process.exit(2)
}
const idx = programIndex(edition).find((p) => p.slug === slug)
if (!idx) {
  console.error(`no ${slug} in ${edition}/programs.json`)
  process.exit(2)
}
const file = join(REPO, 'harnesses/ucsc', edition, slug, 'manifest.json')
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const verified = rest.includes('--verified')
const draft = rest.includes('--draft')
const ni = rest.indexOf('--notes')
const di = rest.indexOf('--depends')
const depSlugs: string[] = di >= 0 ? rest[di + 1].split(',').filter(Boolean) : Object.keys(old.depends_on ?? {})
const depends_on: Record<string, string> = {}
for (const d of depSlugs) {
  const dep = programIndex(edition).find((p) => p.slug === d)
  if (!dep) {
    console.error(`--depends: no ${d} in ${edition}/programs.json`)
    process.exit(2)
  }
  depends_on[d] = dep.source_sha256
}
const m = {
  program: slug,
  edition,
  approach: 'c-code',
  source_sha256: idx.source_sha256,
  skeleton_sha256: idx.skeleton_sha256,
  status: verified ? 'verified' : draft ? 'draft' : (old.status ?? 'draft'),
  authored_at: old.authored_at ?? now,
  verified_at: verified ? now : draft ? null : (old.verified_at ?? null),
  notes: ni >= 0 ? rest[ni + 1] : (old.notes ?? ''),
  ...(depSlugs.length ? { depends_on } : {}),
}
writeFileSync(file, JSON.stringify(m, null, 1) + '\n')
console.log(`${file}: ${m.status}`)
