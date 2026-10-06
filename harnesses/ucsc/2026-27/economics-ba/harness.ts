// Economics B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/economics-ba.md
import { codes, defineHarness } from '@harness'

// Cross-listed partners ("ECON 128 [/LGST 128]") are the same course.
const GENERAL = [
  'ECON 105', 'ECON 114', 'ECON 120', 'ECON 121', 'ECON 124', 'ECON 125', 'ECON 128', 'LGST 128',
  'ECON 130', 'ECON 140', 'ECON 141', 'ECON 142', 'ECON 143', 'ECON 149', 'ECON 150', 'ECON 156',
  'ECON 159', 'ECON 160A', 'LGST 160A', 'ECON 160B', 'ECON 165', 'ECON 166A', 'CSE 166A',
  'ECON 166B', 'CSE 166B', 'ECON 169', 'LGST 169', 'ECON 170', 'ECON 171', 'ECON 175', 'ECON 180',
  'ECON 182', 'ECON 183', 'LGST 183', 'ECON 190',
]
const FINANCE = ['ECON 131', 'ECON 133', 'ECON 135']
const BUSINESS = [
  'ECON 101', 'ECON 110', 'ECON 111A', 'ECON 111B', 'ECON 111C', 'ECON 112', 'ECON 115', 'ECON 117A',
  'ECON 117B', 'ECON 119', 'ECON 136', 'ECON 138', 'ECON 139A', 'ECON 139B', 'ECON 161A', 'ECON 161B',
  'ECON 164', 'ECON 188', 'ECON 194', 'CRWN 152',
]
// "Either ECON 195 or ECON 199 may be used to fill one of the five upper-division elective major requirements."
const INDEPENDENT = ['ECON 195', 'ECON 199']

const PETITION_QUOTE =
  'MATH 11A, MATH 11B, MATH 23A may be taken to satisfy the mathematics content only by petition via the Mathematics Department.'

export default defineHarness({
  program: 'economics-ba',
  edition: '2026-27',
  title: 'Economics B.A.',
  attestations: [
    {
      id: 'math-petition',
      label: 'Mathematics Department petition approved for MATH 11A / 11B / 23A',
      quote: PETITION_QUOTE,
      aliases: ['petition', 'math petition'],
    },
  ],
  coverage: {
    unknownOk: Object.fromEntries(
      ['LGST 128', 'LGST 160A', 'CSE 166A', 'CSE 166B', 'LGST 169', 'LGST 183'].map((c) => [
        c.replace(' ', ''),
        'cross-listed partner of an ECON course ([/X] in the source); the catalog files it under ECON',
      ]),
    ),
  },
  notes: [
    'P/NP is allowed for major courses (the department recommends no more than two); the comprehensive core courses need C/P or better.',
    'Transfer students must take ECON 100A, 100B, 113, the DC course, and at least three upper-division electives at UC Santa Cruz — the app does not track where a course was taken.',
  ],
  evaluate(h) {
    // "The Economics Department allows classes toward major requirements taken for the pass/no pass (P/NP) grade notification."
    h.policy = undefined

    const math = h.either(
      'math',
      'Mathematics content',
      'Plus one of the following mathematics content options:',
      [
        h.options('math-direct', 'AM 11A–11B, MATH 19A–19B–AM 30, or MATH 19A–AM 11B', 'Plus one of the following mathematics content options:', [
          ['AM 11A', 'AM 11B'],
          ['MATH 19A', 'MATH 19B', 'AM 30'],
          ['MATH 19A', 'AM 11B'],
        ]),
        h.group(
          'math-petition-path',
          'An option using MATH 11A, 11B or 23A (by petition)',
          [
            h.options('math-petitioned', 'MATH 11A–11B–22, MATH 19A–19B–23A, or MATH 11A–AM 11B', PETITION_QUOTE, [
              ['MATH 11A', 'MATH 11B', 'MATH 22'],
              ['MATH 19A', 'MATH 19B', 'MATH 23A'],
              ['MATH 11A', 'AM 11B'],
            ]),
            h.attest('math-petition'),
          ],
          { quote: PETITION_QUOTE },
        ),
      ],
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('econ-intro', 'ECON 1 and ECON 2', 'All of the following courses:', ['ECON 1', 'ECON 2']),
      math,
      h.all('stats', 'STAT 17 and STAT 17L', 'Plus the following statistics courses:', ['STAT 17', 'STAT 17L']),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('micro', 'Intermediate Microeconomics', 'Choose one of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.take('macro', 'Intermediate Macroeconomics', 'Plus one of the following courses:', codes('ECON 100B', 'ECON 100N')),
      h.take('econ113', 'ECON 113 Econometrics', 'Plus the following course:', codes('ECON 113')),
      h.take('dc', 'Disciplinary Communication (DC)', [
        'Plus one of the following disciplinary communication (DC) courses:',
        'The DC requirement in economics is satisfied by completing one of the following courses:',
      ], codes('ECON 104', 'ECON 197')),
      h.take(
        'electives',
        'Five economics electives',
        [
          'Students take five additional economics electives from the following three lists. At least three courses must come from the General Economics Electives list. No more than two courses may come from the Finance Electives list. No more than one course may come from the Business Management Electives.',
          'ECON 191, ECON 192, ECON 193, and ECON 193F may not be used to meet major requirements. Either ECON 195 or ECON 199 may be used to fill one of the five upper-division elective major requirements.',
        ],
        codes(...GENERAL, ...FINANCE, ...BUSINESS, ...INDEPENDENT),
        {
          n: 5,
          atLeast: [{ set: codes(...GENERAL), n: 3, label: 'General Economics Electives' }],
          atMost: [
            { set: codes(...FINANCE), n: 2, label: 'Finance Electives' },
            { set: codes(...BUSINESS), n: 1, label: 'Business Management Electives' },
            { set: codes(...INDEPENDENT), n: 1, label: 'ECON 195 / ECON 199' },
          ],
          notes: ['ECON 191, 192, 193 and 193F never count. Economics field-study courses do not satisfy upper-division requirements.'],
        },
      ),
    ])

    // "passing the following intermediate core courses with grades of C/P or better at UC Santa Cruz"
    const C = { min: 'C', pCounts: true }
    const compQuote = 'The comprehensive requirement is satisfied by passing the following intermediate core courses with grades of C/P or better at UC Santa Cruz:'
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
    return [lower, upper, comprehensive]
  },
})
