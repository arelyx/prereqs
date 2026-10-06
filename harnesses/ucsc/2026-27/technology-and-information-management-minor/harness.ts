// Technology and Information Management Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/technology-and-information-management-minor.md
import { codes, defineHarness } from '@harness'

const ELECTIVES = [
  'CSE 150', 'CSE 180', 'CSE 182', 'ECON 100A', 'ECON 100M', 'ECON 100B', 'ECON 100N', 'TIM 172A',
  'TIM 172B', 'TIM 175',
]
const Q_ELECTIVE_NOTE =
  'Strongly recommend TIM 172A or TIM 175 as one of the four electives.Either CSE 180 or CSE 182Either ECON 100A or ECON 100MEither ECON 100B or ECON 100N'

export default defineHarness({
  program: 'technology-and-information-management-minor',
  edition: '2026-27',
  title: 'Technology and Information Management Minor',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Cleared the CSE 20 “Test Out” bar',
      quote: 'will also satisfy this requirement.',
      aliases: ['cse 20 testout', 'cse 20 test-out', 'testout', 'test-out', 'test out'],
    },
  ],
  notes: ['Courses may be taken for a letter grade or pass/no pass.'],
  evaluate(h) {
    // "Courses may be taken for a letter grade or pass/no pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.group('math', 'Mathematics (2 Courses)', [
        h.take('calc-a', 'AM 11A, MATH 11A, MATH 20A or MATH 19A', 'One of the following', codes('AM 11A', 'MATH 11A', 'MATH 20A', 'MATH 19A')),
        h.take('calc-b', 'AM 11B, MATH 11B, MATH 19B or MATH 20B', 'Plus one of the following', codes('AM 11B', 'MATH 11B', 'MATH 19B', 'MATH 20B')),
      ]),
      h.group('cse', 'Computer Science and Engineering (3 Courses)', [
        // "Clearing the CSE 20 “Test Out” bar will also satisfy this requirement." — not a course.
        h.either('programming', 'CSE 20 or CSE 30', 'One of the following', [
          h.take('programming-course', 'CSE 20 or CSE 30', 'One of the following', codes('CSE 20', 'CSE 30')),
          h.attest('cse20-testout'),
        ]),
        h.take('tim50', 'TIM 50', 'Plus the following course', codes('TIM 50')),
        h.take('tim58-80c', 'TIM 58 or TIM 80C', 'Plus one of the following options', codes('TIM 58', 'TIM 80C')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('ud-math', 'Mathematics: CSE 107, ECON 113 or STAT 131', ['Mathematics (1 Course)', 'One of the following courses:'], codes('CSE 107', 'ECON 113', 'STAT 131')),
      h.take('electives', 'Electives (4 Courses)', ['Four courses from the following list:', Q_ELECTIVE_NOTE], codes(...ELECTIVES), {
        n: 4,
        // "Either CSE 180 or CSE 182 / Either ECON 100A or ECON 100M / Either ECON 100B or ECON 100N"
        atMost: [
          { set: codes('CSE 180', 'CSE 182'), n: 1, label: 'either CSE 180 or CSE 182' },
          { set: codes('ECON 100A', 'ECON 100M'), n: 1, label: 'either ECON 100A or ECON 100M' },
          { set: codes('ECON 100B', 'ECON 100N'), n: 1, label: 'either ECON 100B or ECON 100N' },
        ],
        notes: ['TIM 172A or TIM 175 is strongly recommended as one of the four.'],
      }),
    ])

    return [lower, upper]
  },
})
