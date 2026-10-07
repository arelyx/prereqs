// Biology Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/biology-minor.md
//
// Short page: five lower-division courses + CHEM 3A/3B/3C, four upper-division
// core courses and one upper-division elective (5+ credits, BIOE/BIOL
// 100–181). All courses for a letter grade. The page lists no CHEM 4
// alternative and no CHEM 3BL/3CL rows, so none is required here.
// 2025-26 differences from 2026-27: BIOL 20L is required, and the pre-2023
// CHEM 1A/1B/1C series satisfies general chemistry.
import { defineHarness, range } from '@harness'

const Q_CHEM1 = 'This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, and CHEM 1C or equivalent.'

export default defineHarness({
  program: 'biology-minor',
  edition: '2025-26',
  title: 'Biology Minor',
  notes: [
    'Courses must be taken for a letter grade.',
    'Exam credit (e.g. AP) for a listed course counts: add it as a completed course.',
  ],
  coverage: { unknownOk: { 'CHEM 1B': 'pre-2023 general chemistry, retired from the catalog' } },
  evaluate(h) {
    // "Complete the following requirements. Courses must be taken for a letter grade."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('ld-core', 'Biology and organic chemistry', 'All of the following courses', ['BIOL 20A', 'BIOL 20L', 'BIOE 20B', 'CHEM 8A', 'CHEM 8B']),
      // The note names the old series without its labs (CHEM 1M/1N), so none is required.
      h.options('gen-chem', 'General chemistry', ['Plus the following courses:', Q_CHEM1], [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'],
        ['CHEM 1A', 'CHEM 1B', 'CHEM 1C'],
      ], { notes: ['A transfer course equivalent to the CHEM 1 series counts — add it to your plan under the CHEM 1A/1B/1C codes.'] }),
    ])

    // The elective must be a different course from the four core courses
    // (one exclusive allocation).
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['BIOL 100', 'BIOL 105', 'BIOE 107', 'BIOE 109']),
      h.take(
        'ud-elective',
        'One upper-division elective',
        'Students complete one upper-division elective of five credits or more chosen from BIOE 100-181 or BIOL 100-181.',
        range('BIOE', 100, 181).or(range('BIOL', 100, 181)).minCredits(5),
        { pool: 'any BIOE 100–181 or BIOL 100–181 course of 5+ credits (not one of the core courses)' },
      ),
    ])
    return [lower, upper]
  },
})
