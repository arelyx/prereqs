// Eval adapter for approach C (harness as code).
//
//   frontend/node_modules/.bin/tsx --tsconfig frontend/tsconfig.harness.json eval/adapters/c-code.ts
//
// (or `eval/adapters/c-code.sh`). Reads one {"case", "program"} JSON per line
// on stdin, runs harnesses/ucsc/<edition>/<slug>/harness.ts under node
// against the committed catalog, writes one verdict per line.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'
import { runHarness, verdict } from '@harness'
import type { Harness, StudentRecord } from '@harness'
import { REPO, loadCatalog } from '@harness-tools/catalog'

interface GoldenStudent {
  entry?: string
  choices?: Record<string, unknown>
  terms?: { term: string; courses: string[] }[]
  grades?: Record<string, string>
  attested?: 'all' | string[]
}

const cache = new Map<string, Harness | null>()

async function load(edition: string, slug: string): Promise<Harness | null> {
  const key = `${edition}/${slug}`
  if (cache.has(key)) return cache.get(key)!
  const f = join(REPO, 'harnesses/ucsc', edition, slug, 'harness.ts')
  const mod = existsSync(f) ? ((await import(pathToFileURL(f).href)) as { default: Harness }).default : null
  cache.set(key, mod)
  return mod
}

function toStudent(s: GoldenStudent): StudentRecord {
  const choices: Record<string, string> = {}
  for (const [k, v] of Object.entries(s.choices ?? {})) choices[k] = String(v)
  return {
    terms: (s.terms ?? []).map((t) => ({ term: t.term, courses: t.courses })),
    grades: s.grades ?? {},
    choices,
    attested: s.attested ?? 'all',
    entry: s.entry,
    currentTerm: null, // every listed course is completed
  }
}

async function main() {
  const catalog = loadCatalog()
  const rl = createInterface({ input: process.stdin })
  for await (const line of rl) {
    if (!line.trim()) continue
    const { case: c, program } = JSON.parse(line)
    let out: unknown
    try {
      const h = await load(program.edition, program.slug)
      if (!h) out = { complete: null, unmet: [], note: 'no harness' }
      else out = verdict(runHarness(h, toStudent(c.student), catalog))
    } catch (e) {
      out = { complete: null, unmet: [], note: `harness error: ${(e as Error).message}` }
    }
    process.stdout.write(JSON.stringify(out) + '\n')
  }
}

main()
