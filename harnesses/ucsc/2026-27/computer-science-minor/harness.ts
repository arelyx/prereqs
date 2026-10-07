// Computer Science Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-science-minor.md
import { codes, defineHarness, range } from '@harness'

const LIST = [
  'CSE 101M', 'CSE 102', 'CSE 103', 'CSE 110A', 'CSE 114A', 'CSE 115A', 'CSE 118', 'CSE 120',
  'CSE 130', 'CSE 132', 'CSE 134', 'CSE 138', 'CSE 140', 'CSE 142', 'CSE 143', 'CSE 144',
  'CSE 150', 'CSE 160', 'CSE 180', 'CSE 183', 'CSE 184', 'CSE 186',
]

export default defineHarness({
  program: 'computer-science-minor',
  edition: '2026-27',
  title: 'Computer Science Minor',
  notes: [
    'Courses for the minor may be taken P/NP, but your major may require letter grades for the same courses.',
  ],
  evaluate(h) {
    // "Though courses for the minor may be taken for a letter grade or Pass/No Pass"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('calc', 'Calculus', 'One of the following options:', [
        ['MATH 11A', 'MATH 11B'],
        ['MATH 19A', 'MATH 19B'],
        ['MATH 20A', 'MATH 20B'],
      ]),
      h.take('linalg', 'Linear algebra', 'Plus one of the following:', codes('AM 10', 'MATH 21')),
      h.all('core-ld', 'CSE 12, 16, 20, 30', 'Plus all of the following', ['CSE 12', 'CSE 16', 'CSE 20', 'CSE 30']),
      h.take('c-prog', 'C programming', 'Plus one of the following', codes('ECE 13', 'CSE 13S')),
    ])

    // "Any 5-credit or more upper-division CSE course with a number between
    // 100 and 189 or CSE 195." / "Any 5-credit or more CSE course with a number
    // between 201 and 279." / AM 148, AM 160. Lecture/lab combinations count as
    // one, and an offered lab must be passed.
    const additionalPool = range('CSE', 100, 189)
      .or(codes('CSE 195'))
      .minCredits(5)
      .or(range('CSE', 201, 279).minCredits(5))
      .or(codes('AM 148', 'AM 160'))

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('cse101', 'CSE 101', 'The following course', codes('CSE 101')),
      h.take('list', 'Two from the list', 'Plus two upper-division computer science and engineering courses from the following list', codes(...LIST), { n: 2 }),
      h.take(
        'additional',
        'Two additional upper-division courses',
        [
          'Two additional courses satisfying one of the following conditions. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.',
          'Any 5-credit or more upper-division CSE course with a number between 100 and 189 or CSE 195.',
          'Any 5-credit or more CSE course with a number between 201 and 279.',
        ],
        additionalPool,
        {
          n: 2,
          labs: 'catalog-required',
          pool: 'any 5+ credit CSE 100–189 or CSE 195; CSE 201–279 (5+ credits); AM 148; AM 160',
          notes: ['CSE 290+ may count only by approved course-substitution petition; CSE 280–289 never count.'],
        },
      ),
    ])
    return [lower, upper]
  },
})
