// Bioelectronics and Biophotonics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/bioelectronics-and-biophotonics-minor.md
import { codes, defineHarness } from '@harness'

export default defineHarness({
  program: 'bioelectronics-and-biophotonics-minor',
  edition: '2025-26',
  title: 'Bioelectronics and Biophotonics Minor',
  notes: [
    'Courses for the minor may be taken P/NP, but your major may require letter grades for the same courses (all Baskin Engineering majors do).',
  ],
  evaluate(h) {
    // "Though courses for the minor may be taken for a letter grade or Pass/No Pass (P/NP)"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      // 2025-26: one "All of the following" list that includes ECE 13; there is no
      // PHYS 15A/15C substitution note and no CSE 13S alternative (both are 2026-27 additions).
      h.group('core-ld', 'Calculus, physics, CSE 12, ECE 13', [
        h.all('calc', 'MATH 19A, 19B', 'All of the following', ['MATH 19A', 'MATH 19B']),
        h.take('phys5a', 'PHYS 5A', 'PHYS 5A — Introduction to Physics I (5)', codes('PHYS 5A')),
        h.take('phys5l', 'PHYS 5L', 'PHYS 5L — Introduction to Physics I Laboratory (1)', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C', 'PHYS 5C — Introduction to Physics III (5)', codes('PHYS 5C')),
        h.take('phys5n', 'PHYS 5N', 'PHYS 5N — Introduction to Physics Laboratory III (1)', codes('PHYS 5N')),
        h.take('cse12', 'CSE 12', 'CSE 12 — Computer Systems and Assembly Language and Lab (7)', codes('CSE 12')),
        h.take('c-prog', 'ECE 13', 'ECE 13 — Computer Systems and C Programming (7)', codes('ECE 13')),
      ]),
      h.take('linalg', 'Linear algebra', 'Plus one of the following:', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Plus one of the following:', codes('AM 20', 'MATH 24')),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('core-ud', 'Required upper-division courses', 'All of the following courses:', [
        'CSE 100', 'CSE 100L', 'ECE 101', 'ECE 101L', 'ECE 103', 'ECE 121', 'ECE 167',
      ]),
      h.options('bio-option', 'ECE 104, ECE 130 + 130L, or BME 140', 'Plus one of the following options', [
        ['ECE 104'],
        ['ECE 130', 'ECE 130L'],
        ['BME 140'],
      ], { notes: ['ECE 130 & ECE 130L requires PHYS 5B'] }),
    ])

    return [lower, upper]
  },
})
