// Statistics Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/statistics-minor.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const ELECTIVES = [
  'STAT 108', 'STAT 204', 'STAT 206', 'STAT 207', 'STAT 208', 'BME 205', 'ECE 145', 'CSE 142',
  'ECON 104', 'ECON 113', 'ECON 114', 'ECON 120', 'ECON 161B', 'ECON 190', 'MATH 105A', 'MATH 105B',
  'MATH 114', 'PSYC 181', 'TIM 147',
]
const Q_RECOMMEND =
  'Note: Students planning graduate work in statistics are recommended to choose MATH 23A and MATH 23B, STAT 204 , STAT 205, and MATH 105A and MATH 105B.'

export default defineHarness({
  program: 'statistics-minor',
  edition: '2026-27',
  title: 'Statistics Minor',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out exam',
      quote: 'will satisfy this requirement.',
      aliases: ['cse 20 testout', 'cse 20 test-out', 'testout', 'test-out'],
    },
  ],
  notes: ['Courses may be taken for a letter grade or Pass/No Pass.'],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const fourQ = 'Plus one course from each of the following four categories'

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('calc', 'Basic calculus sequence', 'Basic calculus sequence', [
        ['AM 11A', 'AM 11B'],
        ['MATH 11A', 'MATH 11B'],
        ['MATH 19A', 'MATH 19B'],
        ['MATH 20A', 'MATH 20B'],
      ]),
      h.options('concepts', 'Statistical concepts: STAT 5, STAT 7 + 7L, or STAT 17 + 17L', [fourQ, 'Statistical concepts'], [['STAT 5'], ['STAT 7', 'STAT 7L'], ['STAT 17', 'STAT 17L']]),
      // "Passing the CSE 20 test-out exam will satisfy this requirement." — an exam, not a course.
      h.either('programming', 'Computer Programming', [fourQ, 'Computer Programming'], [
        h.take('programming-course', 'One programming course', 'Take one of the following courses:', codes('BME 160', 'CSE 20', 'CSE 30', 'ASTR 119', 'MATH 152')),
        h.attest('cse20-testout'),
      ]),
      h.take('linalg', 'Linear Algebra', [fourQ, 'One of the following courses:'], codes('AM 10', 'MATH 21', 'PHYS 116A'), {
        notes: ['It is recommended that students also take AM 20 or MATH 24.'],
      }),
      h.options('multivar', 'Multivariate Calculus: MATH 22, AM 30, or MATH 23A + 23B', [fourQ, 'Multivariate Calculus'], [['MATH 22'], ['AM 30'], ['MATH 23A', 'MATH 23B']]),
    ])

    const electives = h.take('electives', 'Two electives', ['Plus two electives from the following list of courses', Q_RECOMMEND], codes(...ELECTIVES), { n: 2 })
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('probability', 'Probability: STAT 131, STAT 203 or CSE 107', 'One of the following "probability" courses:', codes('STAT 131', 'STAT 203', 'CSE 107')),
      h.take('inference', 'Statistical Inference: STAT 132', 'Statistical Inference', codes('STAT 132')),
      h.take('computational', 'Computational Methods: AM 147 or MATH 148', ['Computational Methods', 'One of the following:'], codes('AM 147', 'MATH 148')),
      electives,
    ])
    h.solve()
    stat205(h, electives)
    return [lower, upper]
  },
})

/**
 * STAT 205 is recommended for the electives ("STAT 204 , STAT 205") but is not
 * on the elective list. If it would close the gap, don't call the record unmet.
 */
function stat205(h: HarnessContext, electives: Node) {
  if (electives.status !== 'unmet') return
  const have = electives.progress?.have ?? 0
  if (have === 1 && h.taken(codes('STAT 205')).length) {
    electives.status = 'cannot-check'
    electives.detail = 'STAT 205 is recommended in the note under the electives but is not on the elective list — ask the Statistics department whether it counts.'
  }
}
