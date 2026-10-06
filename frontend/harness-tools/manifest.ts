// Write/refresh a harness manifest from the committed program index.
//
//   npx tsx --tsconfig tsconfig.harness.json harness-tools/manifest.ts <edition> <slug> [--verified] [--draft] [--notes "..."]
//
// Hashes always come from data-committed/ucsc/editions/<ed>/programs.json.
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
}
writeFileSync(file, JSON.stringify(m, null, 1) + '\n')
console.log(`${file}: ${m.status}`)
