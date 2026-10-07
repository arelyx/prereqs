// Assistive Technology Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/assistive-technology-minor.md
import { codes, defineHarness } from '@harness'

export default defineHarness({
  program: 'assistive-technology-minor',
  edition: '2025-26',
  title: 'Assistive Technology Minor',
  notes: [
    'Courses for the minor may be taken P/NP, but your major may require letter grades for the same courses (all Baskin Engineering majors do).',
  ],
  evaluate(h) {
    // "Though courses for the minor may be taken for a letter grade or Pass/No Pass (P/NP)"
    h.policy = undefined

    const overlap = h.info(
      'overlap',
      'Combining with other programs',
      // 2025-26 also excludes the Robotics Engineering B.S. and bars ECE 121/141/167 from EE B.S. electives.
      'The minor cannot be combined with the Assistive Technology: Motor concentration of the former bioengineering major or the Robotics Engineering B.S. major.',
      'Courses may also count toward other majors or minors under the campus policy. ECE 121, ECE 141 and ECE 167 cannot also be used to satisfy electrical engineering B.S. electives.',
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('linalg', 'Linear algebra', 'One of the following', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
      // "This requirement may also be satisfied with prior completion of CHEM 1A or equivalent."
      h.take('chem', 'General chemistry', ['Plus one of the following', 'This requirement may also be satisfied with prior completion of CHEM 1A or equivalent.'], codes('CHEM 3A', 'CHEM 4A', 'CHEM 1A'), {
        notes: ['A transfer course equivalent to CHEM 1A also counts — add it to your plan as CHEM 1A.'],
      }),
      // 2025-26: one "All of the following" list that includes ECE 13; no PHYS 15A/15C
      // substitution note and no CSE 13S alternative (both are 2026-27 additions).
      h.group('core-ld', 'Calculus, physics, biology, CSE 12, ECE 13', [
        h.all('calc', 'MATH 19A, 19B', 'All of the following', ['MATH 19A', 'MATH 19B']),
        h.take('phys5a', 'PHYS 5A', 'PHYS 5A — Introduction to Physics I (5)', codes('PHYS 5A')),
        h.take('phys5l', 'PHYS 5L', 'PHYS 5L — Introduction to Physics I Laboratory (1)', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C', 'PHYS 5C — Introduction to Physics III (5)', codes('PHYS 5C')),
        h.take('phys5n', 'PHYS 5N', 'PHYS 5N — Introduction to Physics Laboratory III (1)', codes('PHYS 5N')),
        h.all('bio-cse', 'BIOL 20A, BIOE 20B, CSE 12', 'All of the following', ['BIOL 20A', 'BIOE 20B', 'CSE 12']),
        h.take('c-prog', 'ECE 13', 'ECE 13 — Computer Systems and C Programming (7)', codes('ECE 13')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('core-ud', 'Required upper-division courses', 'All of the following courses:', [
        'ECE 101', 'ECE 101L', 'ECE 103', 'CSE 100', 'CSE 100L', 'ECE 118', 'METX 135', 'METX 135L', 'ECE 167',
      ]),
      h.take('ud-choice', 'ECE 121 or ECE 141', 'Plus one of the following courses:', codes('ECE 121', 'ECE 141')),
    ])

    return [overlap, lower, upper]
  },
})
