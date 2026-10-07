// Bioinformatics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/bioinformatics-minor.md
//
// Ported from the reviewed 2026-27 harness. The 2025-26 page is simpler:
//  - Programming is BME 160 and BME 163 with no CSE 20 substitution or
//    test-out (both added in 2026-27).
//  - Statistics is STAT 131 only (2026-27 adds STAT 7 + STAT 7L).
//  - Electives: "Choose one of the following:" BME 118, 122H, 130, 132 — no
//    25-upper-division-credit rule (added in 2026-27).
import { codes, defineHarness } from '@harness'

const ELECTIVES = ['BME 118', 'BME 122H', 'BME 130', 'BME 132']

export default defineHarness({
  program: 'bioinformatics-minor',
  edition: '2025-26',
  title: 'Bioinformatics Minor',
  notes: [
    'The bioinformatics minor cannot be combined with the Biomolecular Engineering and Bioinformatics B.S. or the Biotechnology B.A.',
    'The page states no letter-grade rule for the minor; campus P/NP limits apply.',
  ],
  evaluate(h) {
    h.policy = undefined // the page states no grade rule for the minor

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('biol20a', 'Biology: BIOL 20A', 'BIOL 20A — Cell and Molecular Biology (5)', codes('BIOL 20A')),
      h.options('chem', 'Chemistry', ['Either this course', 'or these courses'], [['CHEM 3A'], ['CHEM 4A', 'CHEM 4AL']]),
      h.options('calc', 'Single-Variable Calculus', ['Either these courses', 'or these courses'], [
        ['MATH 19A', 'MATH 19B'],
        ['MATH 11A', 'MATH 11B'],
        ['MATH 20A', 'MATH 20B'],
      ], { notes: ['MATH 19A, MATH 19B: preferred'] }),
      h.take('bioethics', 'Bioethics: BME 80G', 'BME 80G [/PHIL 80G] — Bioethics in the 21st Century: Science, Business, and Society (5)', codes('BME 80G'), {
        notes: ['PHIL 80G is the same course (cross-listed).'],
      }),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('genetics', 'Genetics', 'Choose one of the following:', codes('BME 105', 'BIOL 105', 'METX 140'), {
        notes: ['BME 105: strongly recommended'],
      }),
      h.group('programming', 'Programming', [
        h.take('bme160', 'BME 160', 'BME 160 — Research Programming in the Life Sciences (6)', codes('BME 160')),
        h.take('bme163', 'BME 163', 'BME 163 — Applied Visualization and Analysis of Scientific Data (5)', codes('BME 163')),
      ]),
      h.take('stats', 'Statistics: STAT 131', 'STAT 131 — Introduction to Probability Theory (5)', codes('STAT 131')),
      h.take('bme110', 'Bioinformatics: BME 110', 'BME 110 — Computational Biology Tools (5)', codes('BME 110')),
    ])

    const electives = h.group('elective-group', 'Electives', [
      h.take('electives', 'One elective', 'Choose one of the following:', codes(...ELECTIVES)),
    ])
    return [lower, upper, electives]
  },
})
