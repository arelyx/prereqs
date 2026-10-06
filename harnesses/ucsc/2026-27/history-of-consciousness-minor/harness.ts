// History of Consciousness Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/history-of-consciousness-minor.md
//
// HISC 1 plus five 5-credit HISC 100–199 courses, all with P or C or better.
// Petitioned substitutes (an alternative lower-division course, a graduate
// seminar, an affiliated-faculty course) are course credit approved by the
// department, not attestations: the dashboard says so in notes, and the
// student adds an approved substitute only once it is approved.
import { codes, defineHarness, range } from '@harness'

export default defineHarness({
  program: 'history-of-consciousness-minor',
  edition: '2026-27',
  title: 'History of Consciousness Minor',
  notes: [
    'Every course for the minor needs a P, or a C (2.0) or better.',
    'Petitioned substitutions (an alternative to HISC 1, a graduate seminar, or an upper-division course by affiliated faculty in another department) are not counted automatically — ask the department.',
  ],
  evaluate(h) {
    // "Students must complete all requirements for the minor with a grade of P, C (2.0), or better."
    h.policy = { min: 'C', pCounts: true }
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('hisc1', 'HISC 1 Introduction to History of Consciousness', 'Students are required to take HISC 1, Introduction to History of Consciousness.', codes('HISC 1'), {
        notes: ['Students may petition for approval of an alternative lower-division course.'],
      }),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('upper-five', 'Five upper-division HISC courses (HISC 100–199)', 'Students are required to take five 5-credit, upper-division history of consciousness courses numbered HISC 100-199.', range('HISC', 100, 199).minCredits(5), {
        n: 5,
        pool: 'HISC 100–199, 5 credits',
        notes: ['A 5-credit graduate seminar (with instructor permission) or an affiliated-faculty course may substitute by petition.'],
      }),
    ])
    return [lower, upper]
  },
})
