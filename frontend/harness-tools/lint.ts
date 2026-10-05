// Harness lint — the reviewer's mechanical checks.
//
//   npm run harness:lint [-- <edition>[/<slug>]]
//
// For every harness (or the ones named):
//   1. QUOTES   every quote on every report node (over all choice combinations,
//               for an empty and a "kitchen sink" record) must appear verbatim
//               in the committed source text (whitespace-normalized).
//   2. CODES    every course code written in harness.ts must exist in the
//               catalog (or be listed in harness.coverage.unknownOk with a reason).
//   3. COVERAGE every course row in the source ("- SUBJ 123 — Title") must be
//               referenced by harness.ts (literally, via lettered(), or be in
//               harness.coverage.ignore with a reason).
//   4. MANIFEST manifest.json hashes must match programs.json (else: stale).
// Exit code 1 on any error.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { canon, runHarness } from '@harness'
import type { Harness, ReqNode, StudentRecord } from '@harness'
import { REPO, loadCatalog, programIndex, sourceText } from './catalog'

const norm = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

function* choiceCombos(h: Harness): Generator<Record<string, string>> {
  const defs = (h.choices ?? []).filter((c) => !c.free && c.options.length)
  const rec = function* (i: number, acc: Record<string, string>): Generator<Record<string, string>> {
    if (i === defs.length) {
      yield { ...acc }
      return
    }
    for (const o of defs[i].options) yield* rec(i + 1, { ...acc, [defs[i].key]: o.value })
  }
  yield {}
  yield* rec(0, {})
}

function nodes(list: ReqNode[], out: ReqNode[] = []): ReqNode[] {
  for (const n of list) {
    out.push(n)
    if (n.children) nodes(n.children, out)
  }
  return out
}

async function lintOne(edition: string, slug: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []
  const dir = join(REPO, 'harnesses/ucsc', edition, slug)
  const file = join(dir, 'harness.ts')
  const code = readFileSync(file, 'utf8')
  const h = ((await import(pathToFileURL(file).href)) as { default: Harness }).default
  const src = norm(sourceText(edition, slug))
  const catalog = loadCatalog()

  // 1. quotes
  const sink = [...code.matchAll(/'([A-Z]{2,5} \d{1,3}[A-Z]{0,2})'/g)].map((m) => m[1])
  const records: StudentRecord[] = [
    { terms: [], attested: [] },
    { terms: [{ term: '2268', courses: sink }], attested: 'all' },
  ]
  const badQuotes = new Set<string>()
  for (const choices of choiceCombos(h)) {
    for (const r of records) {
      const rep = runHarness(h, { ...r, choices }, catalog)
      const all = nodes(rep.nodes)
      for (const n of all) {
        const qs = Array.isArray(n.quote) ? n.quote : [n.quote]
        if (!qs.length && !n.children?.length) warnings.push(`node ${n.id} has no source quote`)
        for (const q of qs) if (q && !src.includes(norm(q))) badQuotes.add(`${n.id}: "${q.slice(0, 90)}"`)
      }
      for (const c of rep.choices) if (c.quote && !src.includes(norm(c.quote))) badQuotes.add(`choice ${c.key}: "${c.quote}"`)
      for (const a of rep.attestations) if (!src.includes(norm(a.quote))) badQuotes.add(`attestation ${a.id}: "${a.quote}"`)
    }
  }
  for (const q of badQuotes) errors.push(`quote not in source — ${q}`)

  // 2. codes
  const coverage = (h as Harness & { coverage?: { ignore?: Record<string, string>; unknownOk?: Record<string, string> } }).coverage ?? {}
  const literal = new Set<string>()
  for (const m of code.matchAll(/(lettered\()?'([A-Z]{2,5} \d{1,3}[A-Z]{0,2})'/g)) if (!m[1]) literal.add(canon(m[2]))
  for (const m of code.matchAll(/lettered\('([A-Z]{2,5} \d{1,3})', '([A-Z]+)'\)/g))
    for (const l of m[2]) literal.add(canon(m[1]) + l)
  for (const c of literal) {
    if (!catalog.has(c) && !(coverage.unknownOk && (c in coverage.unknownOk || canon(c) in coverage.unknownOk)))
      warnings.push(`course ${c} is not in the current catalog`)
  }

  // 3. coverage of source course rows
  const rows = new Set<string>()
  for (const m of sourceText(edition, slug).matchAll(/^- ([A-Z]{2,5} \d{1,3}[A-Z]{0,2})(?: \[[^\]]*\])? —/gm)) rows.add(canon(m[1]))
  const ignore = coverage.ignore ?? {}
  for (const r of rows) {
    if (literal.has(r)) continue
    if (r in ignore) continue
    errors.push(`source course row ${r} is not referenced by the harness (reference it, or add coverage.ignore with a reason)`)
  }

  // 4. manifest
  const mf = join(dir, 'manifest.json')
  if (!existsSync(mf)) errors.push('manifest.json missing')
  else {
    const m = JSON.parse(readFileSync(mf, 'utf8'))
    const idx = programIndex(edition).find((p) => p.slug === slug)
    if (!idx) errors.push(`program ${slug} not in ${edition}/programs.json`)
    else {
      if (m.source_sha256 !== idx.source_sha256) errors.push('manifest source_sha256 is stale (source text changed)')
      if (m.skeleton_sha256 !== idx.skeleton_sha256) errors.push('manifest skeleton_sha256 is stale (structure changed)')
    }
    if (m.program !== slug || m.edition !== edition) errors.push('manifest program/edition mismatch')
    if (h.program !== slug || h.edition !== edition) errors.push(`harness says ${h.program}/${h.edition}`)
    if (!existsSync(join(dir, 'harness.test.ts'))) errors.push('harness.test.ts missing')
  }
  return { errors, warnings }
}

async function main() {
  const arg = process.argv[2]
  const root = join(REPO, 'harnesses/ucsc')
  const targets: [string, string][] = []
  for (const ed of readdirSync(root).sort()) {
    if (arg && !arg.startsWith(ed) && arg.split('/')[0] !== ed) continue
    for (const slug of readdirSync(join(root, ed)).sort()) {
      if (arg?.includes('/') && arg.split('/')[1] !== slug) continue
      if (existsSync(join(root, ed, slug, 'harness.ts'))) targets.push([ed, slug])
    }
  }
  let bad = 0
  for (const [ed, slug] of targets) {
    const { errors, warnings } = await lintOne(ed, slug)
    const tag = errors.length ? 'FAIL' : 'ok  '
    console.log(`${tag} ${ed}/${slug}${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`)
    for (const e of errors) console.log(`     error: ${e}`)
    for (const w of warnings) console.log(`     warn:  ${w}`)
    if (errors.length) bad++
  }
  console.log(`${targets.length} harnesses, ${bad} failing`)
  process.exit(bad ? 1 : 0)
}

main()
