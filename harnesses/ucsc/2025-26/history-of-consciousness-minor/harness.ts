// History of Consciousness Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/history-of-consciousness-minor.md
//
// HISC 1 or HISC 12 (2025-26 lists both) plus five 5-credit HISC 100–199 courses, all with P or C or better.
// Petitioned substitutes: a 5-credit HISC graduate seminar may stand in for
// one upper-division course, and the petition is asked only when the
// allocator actually used one. The alternative lower-division course and
// affiliated-faculty courses in other departments cannot be identified from
// the plan, so they stay notes.
import { codes, defineHarness, range } from '@harness'

const UD = range('HISC', 100, 199).minCredits(5)
// "a 5-credit graduate seminar": HISC 200-level seminars (the 290s are
// independent study, thesis and teaching courses).
const GRAD_SEMINAR = range('HISC', 200, 289).minCredits(5)
const Q_GRAD = 'Students may, with permission of the instructor, petition the department to substitute a 5-credit graduate seminar for one of the required upper-division courses.'

export default defineHarness({
  program: 'history-of-consciousness-minor',
  edition: '2025-26',
  title: 'History of Consciousness Minor',
  attestations: [
    {
      id: 'grad-seminar-petition',
      label: 'Petition approved (with instructor permission): graduate seminar substitutes for an upper-division course',
      quote: Q_GRAD,
      aliases: ['graduate seminar petition', 'grad seminar', 'graduate seminar'],
    },
  ],
  notes: [
    'Every course for the minor needs a P, or a C (2.0) or better.',
    'Petitioned substitutions for the lower-division course (an alternative departmental lower-division course) or an upper-division course by affiliated faculty in another department are not counted automatically — add an approved substitute once the department approves it.',
  ],
  evaluate(h) {
    // "Students must complete all requirements for the minor with a grade of P, C (2.0), or better."
    h.policy = { min: 'C', pCounts: true }
    // 2025-26: "one of the following" — HISC 1 or HISC 12 (2026-27 requires HISC 1 only).
    const hisc1 = h.take('hisc1', 'HISC 1 or HISC 12', 'Students take one of the following courses.', codes('HISC 1', 'HISC 12'), {
      notes: ['Students may petition for approval of an alternative departmental lower-division course.'],
    })
    const five = h.take('upper-five', 'Five upper-division HISC courses (HISC 100–199)', ['Students are required to take five 5-credit, upper-division history of consciousness courses numbered HISC 100-199.', Q_GRAD], UD.or(GRAD_SEMINAR), {
      n: 5,
      atMost: [{ set: GRAD_SEMINAR, n: 1, label: 'graduate seminar by petition (one)' }],
      prefer: (c) => (UD.has(c, h.catalog) ? 0 : 1),
      // HISC 160 and HISC 199 are catalog-repeatable.
      repeatable: 'catalog',
      pool: 'HISC 100–199, 5 credits (or one HISC graduate seminar by petition)',
      notes: ['An upper-division course by affiliated faculty in another department may substitute by petition.'],
    })
    h.solve()
    const grad = (five.used ?? []).filter((e) => GRAD_SEMINAR.has(e.code, h.catalog))
    const petition = grad.length
      ? h.attest('grad-seminar-petition', undefined, { detail: `${grad.map((e) => e.display).join(', ')} is counted in place of an upper-division course.` })
      : null
    return [
      h.group('lower', 'Lower-Division Courses', [hisc1]),
      h.group('upper', 'Upper-Division Courses', [five, petition]),
    ]
  },
})
