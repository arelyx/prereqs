// History of Art and Visual Culture Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/history-of-art-and-visual-culture-minor.md
//
// Three lower-division HAVC courses from three different regions (regions
// are the number ranges on the page; HAVC 80 may stand for Africa, Native
// Americas or Oceania) and six upper-division HAVC courses numbered 110-191
// (2025-26; 2026-27 widens this to 100-191, so HAVC 100A-109 do not count here).
import { codes, defineHarness, parseCode, range } from '@harness'

// tens digit → region: 1x Africa, 2x Asia, 3x–4x Europe/Americas, 5x Mediterranean, 6x Native Americas, 7x Oceania
const TENS: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5 }
function ldRegions(code: string): number[] {
  const p = parseCode(code)
  if (p.subject !== 'HAVC') return []
  // "HAVC 80 may be used to fulfill a lower-division requirement for one of the following geographic regions: 10s (Africa), 60s (Native Americas), or 70s (Oceania)."
  if (p.number === 80) return [0, 4, 5]
  if (p.number < 10 || p.number > 79) return []
  return [TENS[Math.floor(p.number / 10)]]
}
function distinct(cands: number[][], taken = new Set<number>()): boolean {
  if (!cands.length) return true
  const [first, ...rest] = cands
  for (const r of first) {
    if (taken.has(r)) continue
    taken.add(r)
    const ok = distinct(rest, taken)
    taken.delete(r)
    if (ok) return true
  }
  return false
}

export default defineHarness({
  program: 'history-of-art-and-visual-culture-minor',
  edition: '2025-26',
  title: 'History of Art and Visual Culture Minor',
  notes: [
    'Courses may be taken for a letter grade or pass/no pass.',
    'Up to three lower-division art history courses may transfer from other institutions, each for a different region (add them as completed courses once articulated).',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or pass/no pass."
    h.policy = undefined
    const lower = h.take(
      'lower',
      'Three lower-division courses from three different regions',
      ['Three lower-division courses, each from a different geographic region listed below:', 'HAVC 80 may be used to fulfill a lower-division requirement for one of the following geographic regions: 10s (Africa), 60s (Native Americas), or 70s (Oceania).'],
      range('HAVC', 10, 79).or(codes('HAVC 80')),
      {
        n: 3,
        check: (chosen) => (distinct(chosen.map((e) => ldRegions(e.code))) ? null : 'each course must come from a different geographic region'),
        pool: 'HAVC 10–79 (region by tens digit) or HAVC 80',
        notes: ['Regions: 10s Africa · 20s Asia · 30s–40s Europe and the Americas · 50s Mediterranean · 60s Native Americas · 70s Oceania.'],
      },
    )
    const upper = h.take('upper', 'Six upper-division HAVC courses (110–191)', ['Six upper-division courses. These are HAVC courses numbered 110-191.'], range('HAVC', 110, 191), {
      n: 6,
      repeatable: 'catalog',
      pool: 'HAVC 110–191',
    })
    return [lower, upper]
  },
})
