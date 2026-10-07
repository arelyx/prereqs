// Mathematics B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/mathematics-bs.md
//
// Core: calculus, linear algebra, multivariable, ODE; MATH 100, 103A, 105A,
// 117 + one algebra (111A/111T) + one geometry course + senior seminar/thesis;
// three electives (MATH 101–190, or at most two from the approved
// other-department list). "Extra" geometry courses may count as electives —
// they are all MATH 101–190, so the shared allocation already lets a second
// geometry course fall through to the elective pool.
import { codes, defineHarness, range } from '@harness'
import type { HarnessContext } from '@harness'

// "AM 107 [/PHYS 107]": the library treats the cross-listed PHYS 107 code as AM 107.
const OTHER_DEPT = ['AM 107', 'AM 114', 'AM 147', 'BME 118', 'STAT 108', 'STAT 131', 'STAT 132']
// Recommended electives (all inside MATH 101–190; listed so the dashboard can suggest them).
const RECOMMENDED = [
  'MATH 101', 'MATH 105B', 'MATH 106', 'MATH 107', 'MATH 110', 'MATH 111B', 'MATH 114', 'MATH 115',
  'MATH 116', 'MATH 118', 'MATH 120', 'MATH 130', 'MATH 134', 'MATH 139', 'MATH 140', 'MATH 145',
  'MATH 148', 'MATH 152', 'MATH 160', 'MATH 162', 'MATH 181',
]

const Q_ELECTIVES =
  'Three Electives are Required. Elective courses are chosen from MATH courses numbered 101-190 or the approved list from other departments. Courses must be 5 credits or more, and only two of the three courses can be from the approved list of courses from other departments. Lecture and lab combinations count as a single course. For courses with a required concurrently enrolled lab, only successful completion of the lecture is required for the major.'

export default defineHarness({
  program: 'mathematics-bs',
  edition: '2026-27',
  title: 'Mathematics B.S.',
  notes: [
    'There are no grading-option restrictions for Mathematics Department courses (P/NP counts).',
    'Course substitutions and courses taken abroad need approval from the Mathematics Department (exception to policy request).',
  ],
  evaluate(h) {
    // "There are no restrictions on grading options for Mathematics Department courses."
    h.policy = undefined
    const noDouble = creditOnce(h, 'MATH 111A', 'MATH 111T')

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('linalg', 'Linear algebra (MATH 21 or AM 10)', 'Plus one of the following courses:', codes('MATH 21', 'AM 10'), { notes: ['MATH 21 is preferred.'] }),
      h.options('multivar', 'MATH 23A + 23B, or AM 30 + AM 100', 'Plus one of the following options:', [['MATH 23A', 'MATH 23B'], ['AM 30', 'AM 100']], {
        notes: ['MATH 23A and MATH 23B are preferred.'],
      }),
      h.take('ode', 'Differential equations (MATH 24 or AM 20)', 'Plus one of the following courses:', codes('MATH 24', 'AM 20'), { notes: ['MATH 24 is preferred.'] }),
    ])

    const allQ = 'All of the following courses:'
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'MATH 100, 103A, 105A and 117', allQ, ['MATH 100', 'MATH 103A', 'MATH 105A', 'MATH 117']),
      h.take('algebra', 'Algebra (MATH 111A or 111T)', 'Plus one of the following courses:', codes('MATH 111A', 'MATH 111T').except(noDouble)),
      h.take('geometry', 'Geometry (MATH 121A, 124, 125, 128A or 129)', ['Plus one of the following courses:', 'Students who take more than one course from the Geometry Requirement may use the extra courses toward the three major electives requirement.'], codes('MATH 121A', 'MATH 124', 'MATH 125', 'MATH 128A', 'MATH 129')),
      h.take('senior', 'Senior seminar or thesis (MATH 194 or 195)', 'Plus one of the following courses:', codes('MATH 194', 'MATH 195')),
    ])

    const other = codes(...OTHER_DEPT)
    const electives = h.take('electives', 'Three electives', [Q_ELECTIVES, 'Recommended electives from the Mathematics Department are below.', 'Approved Elective Courses from Other Departments:'], range('MATH', 101, 190).minCredits(5).except(noDouble).or(other), {
      n: 3,
      atMost: [{ set: other, n: 2, label: 'at most two from the approved other-department list' }],
      // Only the lecture is required; a lab taken with it is absorbed into the same unit.
      labs: 'catalog-merge',
      pool: 'MATH 101–190 (5+ credits), or AM 107, AM 114, AM 147, BME 118, STAT 108, STAT 131, STAT 132 (at most two of these)',
      notes: [`Recommended MATH electives: ${RECOMMENDED.join(', ')}.`],
    })

    // DC: MATH 100 plus MATH 194/195 — the same courses that fill the upper-division core (overlay).
    const dcQuote = 'The DC requirement in the mathematics B.S. is satisfied by'
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-math100', 'MATH 100', dcQuote, codes('MATH 100'), { exclusive: false }),
      h.take('dc-senior', 'MATH 194 or MATH 195', [dcQuote, 'Plus one of the following courses:'], codes('MATH 194', 'MATH 195'), { exclusive: false }),
    ], { quote: dcQuote })

    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement (MATH 194 or 195)', 'The comprehensive exit requirement in mathematics is satisfied by one of the following courses:', codes('MATH 194', 'MATH 195'), { exclusive: false })

    return [lower, upper, electives, dc, comprehensive]
  },
})

/**
 * Catalog: "Students cannot receive credit for this course and MATH 111T" (and
 * vice versa). If both are on the record, only the earlier one counts.
 */
function creditOnce(h: HarnessContext, a: string, b: string): string[] {
  const first = (c: string) => Math.min(...h.taken(codes(c)).map((e) => Number(e.term ?? 0)))
  const ta = first(a)
  const tb = first(b)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return []
  return [tb >= ta ? b : a]
}
