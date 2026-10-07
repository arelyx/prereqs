// Port a harness to another edition (the warm-path refresh step).
//
//   npx tsx --tsconfig tsconfig.harness.json harness-tools/port.ts <slug> <from-ed> <to-ed>
//
// 1. copies harnesses/ucsc/<from>/<slug>/ to <to>/ (refuses to overwrite),
//    rewriting the edition string in harness.ts and the header comment;
// 2. writes a draft manifest pinned to the target edition's hashes;
// 3. prints the work order: a unified diff of the two source texts, then the
//    lint result against the TARGET source — every quote that no longer
//    appears verbatim and every new course row the harness does not
//    reference. Those lines are exactly what must be re-read by hand.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { REPO, programIndex } from './catalog'

const [slug, from, to] = process.argv.slice(2)
if (!slug || !from || !to) {
  console.error('usage: port.ts <slug> <from-edition> <to-edition>')
  process.exit(2)
}
const src = join(REPO, 'harnesses/ucsc', from, slug)
const dst = join(REPO, 'harnesses/ucsc', to, slug)
if (!existsSync(src)) throw new Error(`no harness at ${src}`)
if (existsSync(dst)) throw new Error(`${dst} exists — port refuses to overwrite`)
if (!programIndex(to).some((p) => p.slug === slug)) throw new Error(`${slug} is not in ${to}/programs.json`)

cpSync(src, dst, { recursive: true, filter: (f) => !f.endsWith('manifest.json') })
for (const f of ['harness.ts', 'harness.test.ts', 'View.tsx']) {
  const p = join(dst, f)
  if (!existsSync(p)) continue
  const t = readFileSync(p, 'utf8')
    .replaceAll(`edition: '${from}'`, `edition: '${to}'`)
    .replaceAll(`— ${from}`, `— ${to}`)
    .replaceAll(`editions/${from}/`, `editions/${to}/`)
    .replaceAll(`${slug} ${from}`, `${slug} ${to}`)
  writeFileSync(p, t)
}
execFileSync('npx', ['tsx', '--tsconfig', 'tsconfig.harness.json', 'harness-tools/manifest.ts', to, slug, '--draft', '--notes', `ported from ${from}`], { stdio: 'inherit' })

const a = join(REPO, 'data-committed/ucsc/editions', from, 'sources', `${slug}.md`)
const b = join(REPO, 'data-committed/ucsc/editions', to, 'sources', `${slug}.md`)
console.log(`\n=== source diff ${from} → ${to} (${slug})`)
const d = spawnSync('diff', ['-u', a, b], { encoding: 'utf8' })
console.log(d.stdout || '(identical)')
console.log(`\n=== lint of the ported harness against the ${to} source`)
const l = spawnSync('npx', ['tsx', '--tsconfig', 'tsconfig.harness.json', 'harness-tools/lint.ts', `${to}/${slug}`], { encoding: 'utf8' })
console.log(l.stdout)
console.log(`Next: edit ${dst}/harness.ts for each changed rule, update harness.test.ts, rerun tests + lint, then manifest --verified.`)
