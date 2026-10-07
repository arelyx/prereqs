// Latin American and Latino Studies/Politics Combined B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/latin-american-and-latino-studiespolitics-combined-ba.md
//
// 12 courses + 1 lab: LALS intro, POLI 1-70, LALS 100/100A/100L, POLI 140C,
// three politics core courses, two LALS 101-190 + one POLI 100-189 electives,
// and a senior seminar (LALS 194 + 194L, or POLI 190). Course slots are one
// allocation (a politics core course used as core is not also the POLI
// elective). DC and the comprehensive are overlays (no other slot can use a
// LALS 194 or POLI 190 course anyway).
import { codes, defineHarness, range, series } from '@harness'
import type { HarnessContext } from '@harness'

const POLICY = { min: 'C', pCounts: true }

// "Three politics core courses chosen from:" — the [/LGST …] cross-listings are the
// same courses (the library resolves them; a pair counts once).
/** One key per course across its cross-listed codes. */
const sameCourse = (h: HarnessContext, code: string) => [code, ...h.catalog.equivalents(code)].sort()[0]
const POLI_CORE = [
  'POLI 105A', 'POLI 105B', 'POLI 105C', 'POLI 105D', 'POLI 120A', 'POLI 120B', 'POLI 120C',
  'POLI 140A', 'POLI 140D', 'POLI 140E', 'POLI 160A', 'POLI 160B', 'POLI 160C', 'POLI 160D',
]

const Q_COMP = 'Students satisfy the Comprehensive Requirement by completing either an LALS senior seminar (LALS 194 A-Z, excluding L) and seminar lab (LALS 194L), or a politics senior seminar (POLI 190 A-Z).'
const Q_DC = 'The DC requirement for the LALS and politics combined B.A. is met by completing:'

export default defineHarness({
  program: 'latin-american-and-latino-studiespolitics-combined-ba',
  edition: '2025-26',
  title: 'Latin American and Latino Studies/Politics Combined B.A.',
  notes: ['Major courses need a C or better, or a P.'],
  evaluate(h) {
    // "Major and minor requirements will be met with grades of C or better or Pass"
    h.policy = POLICY

    const lower = h.group(
      'lower',
      'Lower-Division Requirements',
      [
        h.take('lals-intro', 'One LALS introductory course', 'One LALS introductory course', codes('LALS 1', 'LALS 5', 'LALS 10')),
        h.take('poli-ld', 'One lower-division POLI course (1–70)', 'Students take one 5-credit course chosen from POLI 1-70.', range('POLI', 1, 70).minCredits(5), { pool: 'POLI 1–70 (5 credits)' }),
      ],
      { quote: 'Students complete a lower-division politics course, chosen from politics courses numbered 1-70, and one LALS introductory course, chosen from LALS 1 or LALS 5 or LALS 10.' },
    )

    const upper = h.group('upper', 'Upper-Division Requirements', [
      h.all('core', 'LALS 100, 100A, 100L and POLI 140C', 'Take the following courses:', ['LALS 100', 'LALS 100A', 'LALS 100L', 'POLI 140C']),
      h.take('poli-core', 'Three politics core courses', 'Three politics core courses chosen from:', codes(...POLI_CORE), {
        n: 3,
        // The library counts a course once across slots, but within one slot a course entered under
        // both of its cross-listed codes (POLI 105A and LGST 105A) still forms two units: one course.
        check: (chosen) => (new Set(chosen.map((e) => sameCourse(h, e.code))).size === chosen.length ? null : 'a cross-listed POLI/LGST pair is one course'),
      }),
      h.group(
        'electives',
        'Three upper-division electives',
        [
          h.take('lals-electives', 'Two LALS electives (101–190)', 'Students choose two additional 5-credit upper-division electives from LALS courses numbered 101-190', range('LALS', 101, 190).minCredits(5), {
            n: 2,
            repeatable: 'catalog',
            pool: 'LALS 101–190 (5 credits)',
          }),
          h.take('poli-elective', 'One POLI elective (100–189)', 'one additional 5-credit upper-division elective from politics courses numbered 100-189', range('POLI', 100, 189).minCredits(5), {
            repeatable: 'catalog',
            pool: 'POLI 100–189 (5 credits), including a politics core course not used above',
          }),
        ],
        { quote: 'Students choose two additional 5-credit upper-division electives from LALS courses numbered 101-190, and one additional 5-credit upper-division elective from politics courses numbered 100-189.' },
      ),
    ])

    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      ['LALS 100A', 'LALS 100L'].map((c) => h.take(`dc/${c.replace(' ', '')}`, c, Q_DC, codes(c), { exclusive: false, minor: true })),
      { quote: Q_DC },
    )

    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement: senior seminar', Q_COMP, [
      h.group('comp-lals', 'LALS senior seminar (194A–Z) and LALS 194L', [
        h.take('comp-lals-seminar', 'LALS senior seminar (194A–Z, not L)', Q_COMP, series('LALS', 194).except(codes('LALS 194L')), { exclusive: false }),
        h.take('comp-lals-lab', 'LALS 194L seminar lab', Q_COMP, codes('LALS 194L'), { exclusive: false }),
      ]),
      h.take('comp-poli', 'Politics senior seminar (POLI 190A–Z)', Q_COMP, series('POLI', 190), { exclusive: false }),
    ])

    return [lower, upper, dc, comprehensive]
  },
})
