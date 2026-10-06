// Economics/Mathematics Combined B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/economicsmathematics-combined-ba.md
import { codes, defineHarness } from '@harness'

// Cross-listed partners ("ECON 128 [/LGST 128]") are the same course.
const ECON_ELECTIVES = [
  'ECON 101', 'ECON 114', 'ECON 115', 'ECON 120', 'ECON 121', 'ECON 124', 'ECON 125', 'ECON 128',
  'LGST 128', 'ECON 130', 'ECON 131', 'ECON 133', 'ECON 135', 'ECON 136', 'ECON 138', 'ECON 139A',
  'ECON 139B', 'ECON 140', 'ECON 141', 'ECON 142', 'ECON 149', 'ECON 150', 'ECON 156', 'ECON 159',
  'ECON 160A', 'LGST 160A', 'ECON 160B', 'ECON 161A', 'ECON 164', 'ECON 165', 'ECON 166A', 'CSE 166A',
  'ECON 166B', 'CSE 166B', 'ECON 169', 'LGST 169', 'ECON 170', 'ECON 171', 'ECON 175', 'ECON 180',
  'ECON 182', 'ECON 183', 'LGST 183', 'ECON 188',
]
const MATH_ELECTIVES = [
  'AM 114', 'AM 147', 'MATH 105B', 'MATH 106', 'MATH 107', 'MATH 114', 'MATH 115', 'MATH 116',
  'MATH 117', 'MATH 124', 'MATH 134', 'MATH 140', 'MATH 145', 'MATH 148', 'MATH 152', 'STAT 131',
  'STAT 132',
]

const PETITION =
  'MATH 11A, MATH 11B, MATH 23A may be taken to satisfy the mathematics content only by petition via the Mathematics Department.'

export default defineHarness({
  program: 'economicsmathematics-combined-ba',
  edition: '2025-26',
  title: 'Economics/Mathematics Combined B.A.',
  coverage: {
    unknownOk: Object.fromEntries(
      ['LGST 128', 'LGST 160A', 'CSE 166A', 'CSE 166B', 'LGST 169', 'LGST 183'].map((c) => [
        c.replace(' ', ''),
        'cross-listed partner of an ECON course ([/X] in the source); the catalog files it under ECON',
      ]),
    ),
    ignore: {
      AM11A: 'transfer admission screening list only (not a completion requirement)',
      MATH11A: 'transfer admission screening list only (not a completion requirement)',
    },
  },
  notes: [
    'P/NP is allowed for major courses (the department recommends no more than two); the comprehensive core courses need C/P or better.',
    'Transfer students must take ECON 100A, 100B, 113, the DC requirement, and at least one upper-division economics elective at UC Santa Cruz — the app does not track where a course was taken.',
  ],
  evaluate(h) {
    // "The Economics Department allows classes toward major requirements taken for the Pass/No Pass (P/NP) grade notification."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('econ-intro', 'ECON 1 and ECON 2', 'Take the following courses:', ['ECON 1', 'ECON 2']),
      h.all('math-core', 'MATH 19A, 19B and 21', 'Take the following courses:', ['MATH 19A', 'MATH 19B', 'MATH 21']),
      h.options('multivar', 'MATH 22, or MATH 23A and 23B', 'Plus one of the following options:', [['MATH 22'], ['MATH 23A', 'MATH 23B']], {
        // The page lists "MATH 23A + MATH 23B" as an option AND repeats the
        // economics B.A. sentence that MATH 23A counts "only by petition". We
        // follow the explicit option list (also in the transfer guidance:
        // "equivalent to MATH 19A, MATH 19B, MATH 21 and MATH 22 or MATH 23A
        // and MATH 23B") and surface the sentence as a caveat.
        notes: [`The page also says: “${PETITION}” — it conflicts with the listed MATH 23A + 23B option; confirm with an advisor if you take that route.`],
      }),
      h.all('stats', 'STAT 17 and STAT 17L', 'Plus the following statistics courses:', ['STAT 17', 'STAT 17L']),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('micro', 'Intermediate Microeconomics', 'Choose one of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.take('macro', 'Intermediate Macroeconomics', 'Plus one of the following courses:', codes('ECON 100B', 'ECON 100N')),
      h.take('econ113', 'ECON 113 Econometrics', 'Plus the following course:', codes('ECON 113')),
      h.all('math-ud', 'MATH 100 and MATH 105A', 'Take both of these courses:', ['MATH 100', 'MATH 105A']),
    ])

    const electives = h.group(
      'electives',
      'Electives',
      [
        h.take('econ-electives', 'Two economics electives', 'Choose two from the following:', codes(...ECON_ELECTIVES), { n: 2 }),
        h.take('math-electives', 'Three mathematics electives', ['Choose three three from the following:', 'Note: Lecture/lab combinations (i.e., MATH 145 and MATH 145L, MATH 148 and MATH 148L) count as one course.'], codes(...MATH_ELECTIVES), {
          n: 3,
          labs: { pairs: [['MATH 145', 'MATH 145L'], ['MATH 148', 'MATH 148L']], mode: 'merge' },
        }),
      ],
      { quote: 'Students complete five electives. Two courses in economics and three in mathematics, as follows:' },
    )

    // DC may reuse MATH 100 (a core course): overlay.
    const dc = h.either('dc', 'Disciplinary Communication (DC)', 'The DC requirement in the economics/mathematics combined major is satisfied by completing one of the following options:', [
      h.take('dc-econ', 'Option 1: ECON 104 or ECON 197', 'Take one of the following:', codes('ECON 104', 'ECON 197'), { exclusive: false }),
      h.group('dc-math', 'Option 2: MATH 100 plus MATH 194 or 195', [
        h.take('dc-math100', 'MATH 100', 'Take this course', codes('MATH 100'), { exclusive: false }),
        h.take('dc-math-seminar', 'MATH 194 or MATH 195', 'Plus one of the following courses:', codes('MATH 194', 'MATH 195'), { exclusive: false }),
      ]),
    ])

    const C = { min: 'C', pCounts: true }
    const compQuote = 'The comprehensive requirement is satisfied by passing the following intermediate core courses with grades of C/P or better here at UC Santa Cruz:'
    const comprehensive = h.group(
      'comprehensive',
      'Comprehensive Requirement (C/P or better)',
      [
        h.take('comp-micro', 'ECON 100A or 100M, C/P or better', compQuote, codes('ECON 100A', 'ECON 100M'), { exclusive: false, policy: C }),
        h.take('comp-macro', 'ECON 100B or 100N, C/P or better', compQuote, codes('ECON 100B', 'ECON 100N'), { exclusive: false, policy: C }),
        h.take('comp-113', 'ECON 113, C/P or better', compQuote, codes('ECON 113'), { exclusive: false, policy: C }),
      ],
      { quote: compQuote, notes: ['These must be taken at UC Santa Cruz.'] },
    )
    return [lower, upper, electives, dc, comprehensive]
  },
})
