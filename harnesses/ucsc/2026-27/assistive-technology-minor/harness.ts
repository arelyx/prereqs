// Assistive Technology Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/assistive-technology-minor.md
import { codes, defineHarness } from '@harness'

export default defineHarness({
  program: 'assistive-technology-minor',
  edition: '2026-27',
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
      'The minor cannot be combined with the Assistive Technology: Motor concentration of the former bioengineering major.',
      'Courses may also count toward other majors or minors under the campus policy.',
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('linalg', 'Linear algebra', 'One of the following', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
      // "This requirement may also be satisfied with prior completion of CHEM 1A or equivalent."
      h.take('chem', 'General chemistry', ['Plus one of the following', 'This requirement may also be satisfied with prior completion of CHEM 1A or equivalent.'], codes('CHEM 3A', 'CHEM 4A', 'CHEM 1A'), {
        notes: ['A transfer course equivalent to CHEM 1A also counts — add it to your plan as CHEM 1A.'],
      }),
      h.group('core-ld', 'Calculus, physics, biology, CSE 12', [
        h.all('calc', 'MATH 19A, 19B', 'All of the following', ['MATH 19A', 'MATH 19B']),
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        h.take('phys5a', 'PHYS 5A (or 15A)', 'PHYS 15A can be used as a substitute for PHYS 5A', codes('PHYS 5A', 'PHYS 15A')),
        h.take('phys5l', 'PHYS 5L', 'PHYS 5L — Introduction to Physics I Laboratory (1)', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C (or 15C)', 'PHYS 15C as a substitute for PHYS 5C', codes('PHYS 5C', 'PHYS 15C')),
        h.take('phys5n', 'PHYS 5N', 'PHYS 5N — Introduction to Physics Laboratory III (1)', codes('PHYS 5N')),
        h.all('bio-cse', 'BIOL 20A, BIOE 20B, CSE 12', 'All of the following', ['BIOL 20A', 'BIOE 20B', 'CSE 12']),
      ]),
      h.take('c-prog', 'C programming', 'Plus one of the following', codes('ECE 13', 'CSE 13S')),
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
