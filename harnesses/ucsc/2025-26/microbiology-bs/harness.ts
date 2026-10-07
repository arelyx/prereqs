// Microbiology B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/microbiology-bs.md
//
// Unusual bits handled in code below:
//  - Letter grade AND C or better for every major course.
//  - 2025-26: general chemistry always includes CHEM 3BL/3CL (listed rows; no
//    fall-2026 rule and no CHEM 1 series note on this edition's page).
//  - STAT 5 may replace STAT 7 + STAT 7L.
//  - Calculus: the page lists only the three unmixed series; a mixed MATH
//    11/19 pair is not covered by this page → cannot-check, never met/unmet.
//  - 2025-26 electives: two courses totalling ≥ 9 credits ("totaling 9
//    credits" — read as a minimum, since two listed 5-credit courses already
//    exceed 9); METX 135 + METX 135L count as one course (credits together).
//    The 2025-26 list drops METX 108/112/131 and lists METX 141 (not 141L).
//  - DC and comprehensive are both METX 100L (overlays on the core list).
//  - "BIOL 20L is waived for students who have completed BIOL 20A and BIOE 20B
//    from California community colleges." The plan does not record where a
//    course was taken: a transfer with term-less BIOL 20A + BIOE 20B and no
//    BIOL 20L is cannot-check, not unmet (same as MCDB / neuroscience).
import { codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const ELECTIVES = [
  // "METX 141 — Advanced Bacteriology Laboratory (5)": the current catalog
  // knows this course as METX 141L (same title), so both codes count.
  'METX 115', 'METX 133', 'METX 135', 'METX 141', 'METX 141L',
  'BME 105', 'BME 122H', 'BME 128', 'BME 132', 'BME 160', 'BME 163', 'BIOE 149', 'CHEM 171',
  'OCEA 130', 'ENVS 163',
]
// "Note: Lecture/lab combinations count as one course." METX 135L (3 credits)
// is listed with its lecture; the catalog requires concurrent enrollment.
const PAGE_CREDITS: Record<string, number> = { METX141: 5 }
const ELECTIVE_PAIRS: [string, string][] = [['METX 135', 'METX 135L']]

const Q_20L = 'BIOL 20L is waived for students who have completed BIOL 20A and BIOE 20B from California community colleges.'

export default defineHarness({
  program: 'microbiology-bs',
  edition: '2025-26',
  title: 'Microbiology B.S.',
  notes: [
    'All courses used for any major requirement must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses must be taken at UC Santa Cruz (the plan does not record where a course was taken); BIOL 100 or METX 100 from another institution needs department permission.',
  ],
  coverage: { unknownOk: { 'METX 141': '2025-26 code for Advanced Bacteriology Laboratory; the current catalog lists it as METX 141L' } },
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken
    // for a letter grade. Additionally, letter grades of C or higher must be
    // attained to meet major and minor requirements for graduation."
    h.policy = { letter: true, min: 'C' }

    let ldCore: Node
    const lower = h.group('lower', 'Lower-Division Courses', [
      // 2025-26 lists CHEM 3BL/3CL as rows of the 3-series package.
      h.options('gen-chem', 'General chemistry', 'One of the following', [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
      ]),
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

    // METX 141 is not in the current catalog; the page lists it as 5 credits.
    const credits = (chosen: Enrollment[]) => chosen.reduce((s, e) => s + (h.catalog.get(e.code)?.credits || PAGE_CREDITS[e.code] || 0), 0)
    const electives = h.take(
      'electives',
      'Two electives (9+ credits)',
      ['Students must complete two electives totaling 9 credits from the following options:', 'Note: Lecture/lab combinations count as one course.'],
      codes(...ELECTIVES),
      {
        n: 2,
        labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' },
        check: (chosen) => (credits(chosen) >= 9 ? null : `the two electives total ${credits(chosen)} credits; at least 9 are needed`),
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
