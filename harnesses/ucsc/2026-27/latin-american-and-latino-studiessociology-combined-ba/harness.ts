// Latin American and Latino Studies/Sociology Combined B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/latin-american-and-latino-studiessociology-combined-ba.md
//
// 12 courses + 1 lab: LALS intro, two of SOCY 1/10/15, LALS 100/100A/100L,
// SOCY 105A/105B, two LALS 101-190 + two SOCY 110-189 electives, and a senior
// seminar exit requirement (LALS 194 + 194L, or SOCY 196S). Course slots are
// one allocation; DC and the comprehensive are overlays (LALS 194 / SOCY 196S
// are outside both elective ranges).
import { codes, defineHarness, range, series } from '@harness'

const POLICY = { min: 'C', pCounts: true }
const Q_COMP = 'Students satisfy the Comprehensive Requirement by completing either an LALS Senior Seminar (LALS 194 A-Z, excluding L) and LALS 194L, or complete SOCY 196S.'
const Q_DC = 'The DC requirement for the LALS and sociology combined B.A. is met by completing:'
const Q_ELECTIVES = 'Choose two 5-credit upper-division LALS electives (numbered 101-190) and two 5-credit upper-division sociology electives (numbered 110-189).'

export default defineHarness({
  program: 'latin-american-and-latino-studiessociology-combined-ba',
  edition: '2026-27',
  title: 'Latin American and Latino Studies/Sociology Combined B.A.',
  notes: [
    'Major courses need a C or better, or a P.',
    'The SOCY 196S option for the comprehensive requires applying in advance through the Sociology Department.',
  ],
  evaluate(h) {
    // "Major requirements will be met with grades of C or better or Pass"
    h.policy = POLICY

    const lower = h.group('lower', 'Lower-Division Requirements', [
      h.take('lals-intro', 'One LALS introductory course', 'One LALS Introductory course', codes('LALS 1', 'LALS 5', 'LALS 10')),
      h.take('socy-ld', 'Two of SOCY 1, 10, 15', 'Two courses chosen from:', codes('SOCY 1', 'SOCY 10', 'SOCY 15'), { n: 2 }),
    ])

    const upper = h.group(
      'upper',
      'Upper-Division Requirements',
      [
        h.all('core', 'Upper-division core courses', 'Upper-Division Core Courses', ['LALS 100', 'LALS 100A', 'LALS 100L', 'SOCY 105A', 'SOCY 105B']),
        h.group(
          'electives',
          'Four upper-division electives',
          [
            h.take('lals-electives', 'Two LALS electives (101–190)', Q_ELECTIVES, range('LALS', 101, 190).minCredits(5), { n: 2, repeatable: 'catalog', pool: 'LALS 101–190 (5 credits)' }),
            h.take('socy-electives', 'Two sociology electives (110–189)', Q_ELECTIVES, range('SOCY', 110, 189).minCredits(5), { n: 2, repeatable: 'catalog', pool: 'SOCY 110–189 (5 credits)' }),
          ],
          { quote: Q_ELECTIVES },
        ),
      ],
      {
        quote: 'LALS and sociology combined majors take four upper-division core courses and one writing lab, four 5-credit upper-division electives (two in LALS and two in sociology), and one senior seminar exit requirement in LALS or sociology.',
      },
    )

    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      ['LALS 100A', 'LALS 100L'].map((c) => h.take(`dc/${c.replace(' ', '')}`, c, Q_DC, codes(c), { exclusive: false, minor: true })),
      { quote: Q_DC },
    )

    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement: senior seminar', Q_COMP, [
      h.group('comp-lals', 'LALS senior seminar (194A–Z) and LALS 194L', [
        h.take('comp-lals-seminar', 'LALS senior seminar (194A–Z, not L)', Q_COMP, series('LALS', 194).except(codes('LALS 194L')), { exclusive: false }),
        h.take('comp-lals-lab', 'LALS 194L', Q_COMP, codes('LALS 194L'), { exclusive: false }),
      ]),
      h.take('comp-socy', 'SOCY 196S Senior Seminar', Q_COMP, codes('SOCY 196S'), { exclusive: false }),
    ])

    return [lower, upper, dc, comprehensive]
  },
})
