// Applied Mathematics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/applied-mathematics-minor.md
//
// 2025-26 difference from 2026-27: the page does not accept the mixed
// AM 10 + MATH 24 / MATH 21 + AM 20 combinations (that note first appears in
// 2026-27), so only the three listed sequences fill linear algebra + ODE.
import { codes, defineHarness, range } from '@harness'

const ELECTIVE_LIST = [
  'CSE 107', 'ECE 103', 'ECE 115', 'ECE 141', 'MATH 103A', 'MATH 117', 'MATH 121A', 'PHYS 105',
  'PHYS 139A', 'PHYS 139B', 'PHYS 171', 'STAT 131', 'STAT 132',
  // "PHYS 171 [/ASTR 171]": the current catalog no longer records this cross-listing.
  'ASTR 171',
]
const Q_ELECTIVE =
  'Any 5-credit upper-division (100-199) or graduate (200-299) AM course that is not already listed in the categories above. Independent studies (AM 198), AM 200, 211, and the 280 series and above may not be used.'
const Q_EACH = 'Complete one course from each of the following categories'

export default defineHarness({
  program: 'applied-mathematics-minor',
  edition: '2025-26',
  title: 'Applied Mathematics Minor',
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Other electives that use applied mathematical methods may be proposed, subject to department approval.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('calc', 'MATH 19A + 19B, or MATH 20A + 20B', 'Basic calculus sequence:', [['MATH 19A', 'MATH 19B'], ['MATH 20A', 'MATH 20B']]),
      h.options('multivar', 'MATH 23A + 23B, or AM 30', 'Basic calculus sequence:', [['MATH 23A', 'MATH 23B'], ['AM 30']]),
      h.options(
        'linalg-ode',
        'Linear algebra + ODE: AM 10 + AM 20, MATH 21 + MATH 24, or PHYS 116A',
        'Plus one of the following sequences',
        [['AM 10', 'AM 20'], ['MATH 21', 'MATH 24'], ['PHYS 116A']],
        {
          notes: ['The 2025-26 page lists only AM 10 + AM 20, MATH 21 + MATH 24, or PHYS 116A; a mixed AM/MATH pair needs department approval.'],
        },
      ),
    ])

    // Catalog (AM 212A): "Students cannot receive credit for this course and AM 112."
    const twin = h.taken(codes('AM 112')).length ? ['AM 212A'] : []
    const amElective = range('AM', 100, 279)
      .minCredits(5)
      .except(['AM 100', 'AM 114', 'AM 147', 'AM 112', 'AM 198', 'AM 200', 'AM 211', ...twin])
    const upper = h.group('upper', 'Upper Division Courses', [
      h.take('methods', 'Mathematical Methods: AM 100', [Q_EACH, 'Mathematical Methods'], codes('AM 100')),
      h.take('dynamical', 'Dynamical Systems: AM 114', [Q_EACH, 'Dynamical Systems'], codes('AM 114')),
      h.take('numerical', 'Introduction to Numerical Methods: AM 147, PHYS 115 or MATH 148', [Q_EACH, 'Introduction to Numerical Methods'], codes('AM 147', 'PHYS 115', 'MATH 148')),
      h.take('pde', 'Partial Differential Equations: AM 112, PHYS 116C or MATH 107', [Q_EACH, 'Partial Differential Equations'], codes('AM 112', 'PHYS 116C', 'MATH 107')),
      h.take('elective', 'One applied mathematics elective', ['Plus One Applied Mathematics Elective from the Following List', Q_ELECTIVE], amElective.or(codes(...ELECTIVE_LIST)), {
        pool: 'any 5-credit AM 100–279 course not listed above (not AM 198, 200 or 211), or CSE 107, ECE 103/115/141, MATH 103A/117/121A, PHYS 105/139A/139B/171, STAT 131/132',
        notes: ['Students may also propose other electives which use applied mathematical methods, subject to approval by the department.'],
      }),
    ])

    return [lower, upper]
  },
})
