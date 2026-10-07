// Mathematics Education B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/mathematics-education-ba.md
//
// No electives: a fixed list plus one-of choices, two Cal Teach (EDUC) courses,
// and the shared MATH 100 + MATH 194/195 DC / comprehensive structure.
import { codes, defineHarness } from '@harness'

export default defineHarness({
  program: 'mathematics-education-ba',
  edition: '2025-26',
  title: 'Mathematics Education B.A.',
  notes: [
    'There are no grading-option restrictions for Mathematics Department courses (P/NP counts).',
    'EDUC 50B and EDUC 100B are Cal Teach courses that require an application before the priority deadlines (early May for fall, early November for winter).',
    'Course substitutions and courses taken abroad need approval from the Mathematics Department (exception to policy request).',
  ],
  evaluate(h) {
    // "There are no restrictions on grading options for Mathematics Department courses."
    h.policy = undefined
    // Catalog (STAT 5): "Students cannot receive credit for this course if they
    // have already received credit for STAT 7 or STAT 17." A STAT 5 taken
    // after either one earns no credit, so it cannot be the STAT 5 requirement.
    const firstTerm = (c: string) => Math.min(...h.taken(codes(c)).map((e) => Number(e.term ?? 0)))
    const stat5Void = firstTerm('STAT 5') > Math.min(firstTerm('STAT 7'), firstTerm('STAT 17')) && Number.isFinite(firstTerm('STAT 5')) ? ['STAT 5'] : []

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'One of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('linalg', 'Linear algebra (MATH 21 or AM 10)', 'Plus one of the following courses:', codes('MATH 21', 'AM 10'), { notes: ['MATH 21 is preferred.'] }),
      h.options('multivar', 'MATH 23A + 23B, or AM 30 + AM 100', 'Plus one of the following options:', [['MATH 23A', 'MATH 23B'], ['AM 30', 'AM 100']], {
        notes: ['MATH 23A and MATH 23B are preferred.'],
      }),
      h.take('calteach1', 'Cal Teach 1 (EDUC 50A or 50B)', ['Plus one of the following courses:', 'EDUC 50B preferred.'], codes('EDUC 50A', 'EDUC 50B')),
      h.take('stat5', 'STAT 5', 'Plus the following course:', codes('STAT 5').except(stat5Void), {
        notes: stat5Void.length ? ['STAT 5 taken after STAT 7 or STAT 17 earns no credit (catalog), so it cannot fill this requirement; ask the undergraduate vice chair about a course substitution.'] : undefined,
      }),
    ])

    const allQ = 'All of the following courses:'
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'MATH 100, 110, 128A, 181 and STAT 131', allQ, ['MATH 100', 'MATH 110', 'MATH 128A', 'MATH 181', 'STAT 131']),
      h.take('analysis', 'Analysis (MATH 103A or 105A)', 'Plus one of the following courses:', codes('MATH 103A', 'MATH 105A')),
      h.take('algebra', 'Algebra (MATH 111A or 111T)', 'Plus one of the following courses:', codes('MATH 111A', 'MATH 111T')),
      h.take('calteach2', 'Cal Teach 2 (EDUC 100A or 100B)', ['Plus one the following courses:', 'EDUC 100B preferred.'], codes('EDUC 100A', 'EDUC 100B')),
      h.take('senior', 'Senior seminar or thesis (MATH 194 or 195)', 'Plus one of the following courses:', codes('MATH 194', 'MATH 195')),
    ])

    // DC: MATH 100 plus MATH 194/195 — courses already counted above (overlay).
    const dcQuote = 'The DC requirement in the Mathematics Education B.A. is satisfied by:'
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-math100', 'MATH 100', dcQuote, codes('MATH 100'), { exclusive: false }),
      h.take('dc-senior', 'MATH 194 or MATH 195', [dcQuote, 'Plus one of the following courses:'], codes('MATH 194', 'MATH 195'), { exclusive: false }),
    ], { quote: dcQuote })

    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement (MATH 194 or 195)', 'The comprehensive exit requirement in mathematics is satisfied by one of the following courses:', codes('MATH 194', 'MATH 195'), { exclusive: false })

    return [lower, upper, dc, comprehensive]
  },
})
