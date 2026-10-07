// Biology Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biology-minor.md
//
// Short page: four lower-division courses + CHEM 3A/3B/3C, four upper-division
// core courses and one upper-division elective (5+ credits, BIOE/BIOL
// 100–181). All courses for a letter grade. The page lists no CHEM 4
// alternative and no CHEM 3BL/3CL rule, so none is applied here.
import { defineHarness, range } from '@harness'

export default defineHarness({
  program: 'biology-minor',
  edition: '2026-27',
  title: 'Biology Minor',
  notes: [
    'Courses must be taken for a letter grade.',
    'Exam credit (e.g. AP) for a listed course counts: add it as a completed course.',
  ],
  evaluate(h) {
    // "Complete the following requirements. Courses must be taken for a letter grade."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('ld-core', 'Biology and organic chemistry', 'All of the following courses', ['BIOL 20A', 'BIOE 20B', 'CHEM 8A', 'CHEM 8B']),
      h.all('gen-chem', 'General chemistry', 'Plus the following courses:', ['CHEM 3A', 'CHEM 3B', 'CHEM 3C']),
    ])

    // The elective must be a different course from the four core courses
    // (one exclusive allocation).
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['BIOL 100', 'BIOL 105', 'BIOE 107', 'BIOE 109']),
      h.take(
        'ud-elective',
        'One upper-division elective',
        'Students complete one upper-division elective of five credits or more chosen from BIOE 100-BIOE 181 or BIOL 100-BIOL 181.',
        range('BIOE', 100, 181).or(range('BIOL', 100, 181)).minCredits(5),
        { pool: 'any BIOE 100–181 or BIOL 100–181 course of 5+ credits (not one of the core courses)' },
      ),
    ])
    return [lower, upper]
  },
})
