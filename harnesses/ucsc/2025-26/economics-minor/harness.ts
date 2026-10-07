// Economics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/economics-minor.md
import { codes, defineHarness, range } from '@harness'

export default defineHarness({
  program: 'economics-minor',
  edition: '2025-26',
  title: 'Economics Minor',
  notes: [
    'Courses may be taken P/NP for the minor, but P/NP courses cannot later be used toward an economics major.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or pass/no pass"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('econ-intro', 'ECON 1 and ECON 2', 'Take these courses', ['ECON 1', 'ECON 2']),
      // The minor page has no petition note for MATH 11A/11B/23A (the majors do).
      h.options('math', 'Mathematics', 'Plus one of the following options', [
        ['AM 11A', 'AM 11B'],
        ['MATH 19A', 'MATH 19B', 'AM 30'],
        ['MATH 19A', 'AM 11B'],
        ['MATH 11A', 'MATH 11B', 'MATH 22'],
        ['MATH 19A', 'MATH 19B', 'MATH 23A'],
        ['MATH 11A', 'AM 11B'],
      ]),
      h.all('stats', 'STAT 17 and STAT 17L', 'Plus the following statistics courses:', ['STAT 17', 'STAT 17L']),
    ])

    // ECON 100A/100M and 100B/100N are "cannot receive credit for both" pairs
    // (catalog), so the unused partner of a core course is never an elective.
    // Cross-listed partner codes (LGST 128 for ECON 128) match through the library.
    const electivePool = range('ECON', 100, 189)
      .except(['ECON 104', 'ECON 100A', 'ECON 100M', 'ECON 100B', 'ECON 100N'])
      .minCredits(5)
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('micro', 'Intermediate Microeconomics', 'Choose one of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.take('macro', 'Intermediate Macroeconomics', 'Plus one of the following courses:', codes('ECON 100B', 'ECON 100N')),
      h.take('econ113', 'ECON 113 Econometrics', 'Plus the following course:', codes('ECON 113')),
      h.take(
        'electives',
        'Three economics electives',
        'Students complete three additional 5-credit electives chosen from ECON 100-189, excluding ECON 104. No course may satisfy more than one requirement of the minor.',
        electivePool,
        { n: 3, pool: 'ECON 100–189, 5 credits, excluding ECON 104 (and the core courses)' },
      ),
    ])
    return [lower, upper]
  },
})
