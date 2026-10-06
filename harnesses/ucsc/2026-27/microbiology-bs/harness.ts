// Microbiology B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/microbiology-bs.md
//
// Unusual bits handled in code below:
//  - Letter grade AND C or better for every major course.
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too
//    (same rule and helper as biology-bs).
//  - STAT 5 may replace STAT 7 + STAT 7L.
//  - Calculus: the page lists only the three unmixed series; a mixed MATH
//    11/19 pair is not covered by this page → cannot-check, never met/unmet.
//  - Electives: three courses totalling ≥ 14 credits; METX 135 + METX 135L
//    count as one course (their credits together).
//  - DC and comprehensive are both METX 100L (overlays on the core list).
//  - "BIOL 20L is waived for students who have completed BIOL 20A and BIOE 20B
//    from California community colleges." The plan does not record where a
//    course was taken: a transfer with term-less BIOL 20A + BIOE 20B and no
//    BIOL 20L is cannot-check, not unmet (same as MCDB / neuroscience).
import { codes, defineHarness, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const ELECTIVES = [
  'METX 108', 'METX 112', 'METX 115', 'METX 131', 'METX 133', 'METX 135', 'METX 141L',
  'BME 105', 'BME 122H', 'BME 128', 'BME 132', 'BME 160', 'BME 163', 'BIOE 149', 'CHEM 171',
  'OCEA 130', 'ENVS 163',
]
// "Note: Lecture/lab combinations count as one course." METX 135L (3 credits)
// is listed with its lecture; the catalog requires concurrent enrollment.
const ELECTIVE_PAIRS: [string, string][] = [['METX 135', 'METX 135L']]

const Q_20L = 'BIOL 20L is waived for students who have completed BIOL 20A and BIOE 20B from California community colleges.'

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'

export default defineHarness({
  program: 'microbiology-bs',
  edition: '2026-27',
  title: 'Microbiology B.S.',
  notes: [
    'All courses used for any major requirement must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses must be taken at UC Santa Cruz (the plan does not record where a course was taken); BIOL 100 or METX 100 from another institution needs department permission.',
  ],
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken
    // for a letter grade. Additionally, letter grades of C or higher must be
    // attained to meet major and minor requirements for graduation."
    h.policy = { letter: true, min: 'C' }

    let ldCore: Node
    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      (ldCore = h.all('ld-core', 'Chemistry, biology and physics', 'And these courses', [
        'CHEM 8A', 'CHEM 8L', 'CHEM 8B', 'BIOL 20A', 'BIOL 20L', 'BIOE 20B', 'BIOE 20C',
        'PHYS 6A', 'PHYS 6L', 'PHYS 6B',
      ], { notes: [Q_20L] })),
      h.options(
        'stats',
        'Statistics',
        ['And these courses', 'Note: Students may take STAT 5 in place of STAT 7/STAT 7L, although STAT 7/STAT 7L is strongly encouraged.'],
        [['STAT 7', 'STAT 7L'], ['STAT 5']],
        { labels: ['STAT 7 + STAT 7L', 'STAT 5'] },
      ),
      calculus(h),
    ])

    const upper = h.all('upper', 'Upper-Division Courses', 'The following courses', [
      'BIOL 100', 'BIOL 101L', 'METX 100', 'METX 100L', 'METX 140', 'METX 150', 'BME 110',
    ])

    const credits = (chosen: Enrollment[]) => chosen.reduce((s, e) => s + (h.catalog.get(e.code)?.credits || 0), 0)
    const electives = h.take(
      'electives',
      'Three electives (14+ credits)',
      ['Students must complete three electives totaling a minimum of 14 credits from the following options:', 'Note: Lecture/lab combinations count as one course.'],
      codes(...ELECTIVES),
      {
        n: 3,
        labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' },
        check: (chosen) => (credits(chosen) >= 14 ? null : `the three electives total ${credits(chosen)} credits; at least 14 are needed`),
      },
    )

    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement for the microbiology B.S. is satisfied by completing the following course:', codes('METX 100L'), { exclusive: false })
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', 'The comprehensive requirement is satisfied by completing the following course:', codes('METX 100L'), { exclusive: false })
    h.solve()
    biol20lTransfer(h, ldCore)
    return [lower, upper, electives, dc, comprehensive]
  },
})

/** MATH 11A+11B, 16A+16B or 19A+19B; a mixed 11/19 pair is outside this page → cannot-check. */
function calculus(h: HarnessContext): Node {
  const quote = 'Plus one of the following options'
  const slot = h.options('calc-series', 'Calculus series', quote, [
    ['MATH 11A', 'MATH 11B'],
    ['MATH 16A', 'MATH 16B'],
    ['MATH 19A', 'MATH 19B'],
  ])
  h.solve()
  if (slot.status === 'met') return slot
  const has = (c: string) => h.taken(codes(c)).length > 0
  const mixed = (has('MATH 11A') && has('MATH 19B')) || (has('MATH 19A') && has('MATH 11B'))
  if (!mixed) return slot
  return h.either('calc', 'Calculus', quote, [
    slot,
    h.cannotCheck(
      'calc-mixed',
      'Mixed MATH 11/19 series',
      quote,
      'This page lists only MATH 11A+11B, 16A+16B or 19A+19B. A mixed 11/19 sequence may be accepted under the campus Calculus Series Transition Policy — confirm with the microbiology advisor.',
    ),
  ])
}

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['One of the following', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)

  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  const excluded = h.enrollments.filter((e) => options.includes(e.code) && policyFailure(e, h.policy) != null).map((e) => policyFailure(e, h.policy))
  return h.node('gen-chem', 'General chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: [`Still need ${(closerA ? missingA : missingB).join(', ')}`, ...excluded].join(' · '),
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}

/**
 * BIOL 20L waiver for community-college BIOL 20A + BIOE 20B (see header).
 * Call after h.solve().
 */
function biol20lTransfer(h: HarnessContext, group: Node): void {
  const slot = group.children?.find((c) => c.id === `${group.id}/BIOL20L`)
  if (!slot || slot.status === 'met' || h.entry !== 'transfer') return
  const transferred = (code: string) => h.taken(codes(code)).some((e) => e.term == null)
  if (!transferred('BIOL 20A') || !transferred('BIOE 20B')) return
  slot.status = 'cannot-check'
  slot.detail = 'Waived if you completed BIOL 20A and BIOE 20B at a California community college — check with the microbiology advisor.'
  slot.quote = Q_20L
}
