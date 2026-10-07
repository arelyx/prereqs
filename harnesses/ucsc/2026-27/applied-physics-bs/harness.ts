// Applied Physics B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/applied-physics-bs.md
//
// Two paths (Standard / Computational Physics concentration) share the
// physics + calculus core; they differ in chemistry/programming, the
// upper-division list, the electives rule and the comprehensive course.
// Substitutions written into the page are encoded as alternatives:
// ECE 135/135L for PHYS 110A+110B (standard only), MATH 21+24 for PHYS 116A,
// and the PHYS 116C waiver for applied-physics + math double majors.
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const STD_ELECTIVES = [
  'PHYS 115', 'PHYS 120', 'PHYS 137', 'PHYS 139A', 'PHYS 139B', 'PHYS 157', 'PHYS 150', 'PHYS 152',
  'PHYS 156', 'PHYS 160', 'PHYS 180', 'AM 107', 'CHEM 163B', 'EART 121', 'EART 172', 'ECE 101',
  'ECE 130', 'ECE 136', 'ECE 141',
]
// Cross-listed aliases from the page: AM 107 [/PHYS 107], PHYS 150 [/CSE 109], EART 172 [/OCEA 172].
const STD_ALIASES = ['PHYS 107', 'CSE 109', 'OCEA 172']
const COMP_ELECTIVES = ['PHYS 150', 'PHYS 152', 'PHYS 110B', 'PHYS 139A', 'AM 148', 'BME 205', 'CHEM 264', 'EART 124']

const Q_SUBS =
  'Students may take ECE 135/ECE 135L instead of PHYS 110A and PHYS 110B. This is not recommended for students who wish to pursue graduate studies in physics.'
const Q_116A = 'Completing both MATH 21 and MATH 24 can substitute for PHYS 116A.'
const Q_116C = 'PHYS 116C is waived for students who are pursuing a dual major in applied physics and a mathematics B.A. or B.S., and take MATH 107 in fall 2017 or later.'

export default defineHarness({
  program: 'applied-physics-bs',
  edition: '2026-27',
  title: 'Applied Physics B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Path',
      quote: 'Standard Applied Physics Major',
      options: [
        { value: 'standard', label: 'Standard Applied Physics Major', aliases: ['standard applied physics', 'applied physics', 'none', 'general'] },
        { value: 'computational-physics', label: 'Computational Physics Concentration', aliases: ['computational', 'computational physics'] },
      ],
    },
  ],
  attestations: [
    {
      id: 'math-double-major',
      label: 'Pursuing a dual major with a Mathematics B.A. or B.S.',
      quote: Q_116C,
      aliases: ['math double major', 'dual major', 'mathematics'],
    },
  ],
  notes: [
    'All courses used for the major must be taken for a letter grade, except the lower-division chemistry requirement.',
  ],
  coverage: {
    unknownOk: {
      PHYS107: 'cross-listing of AM 107 named on the page; not a separate catalog entry',
      CSE109: 'cross-listing of PHYS 150 named on the page; not in the catalog',
      OCEA172: 'cross-listing of EART 172 named on the page; not in the catalog',
    },
  },
  evaluate(h) {
    // "All courses used to satisfy any of the applied physics major requirements
    // must be taken for a letter grade, except the lower-division chemistry requirement."
    h.policy = { letter: true }
    const ask = h.needChoice('concentration')
    if (ask) return [ask]
    const comp = h.choice('concentration') === 'computational-physics'

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('phys-a', 'PHYS 5A or 15A', 'Plus one of the following courses:', codes('PHYS 5A', 'PHYS 15A')),
      h.take('phys-c', 'PHYS 5C or 15C', 'Plus one of the following courses:', codes('PHYS 5C', 'PHYS 15C')),
      h.all('phys-core', 'PHYS 5B, 5D and labs 5L/5M/5N', 'Plus all of the following courses:', ['PHYS 5B', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N', 'PHYS 5D']),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
      ...(comp
        ? [h.all('programming', 'CSE 20 and CSE 30', 'Plus both of the following courses:', ['CSE 20', 'CSE 30'], { notes: ['A test-out option is available for CSE 20.'] })]
        : [
            h.take('chem', 'General chemistry', 'Plus one of the following courses:', codes('CHEM 3A', 'CHEM 4A'), {
              policy: {}, // the chemistry requirement may be P/NP ({} = no grade constraint; undefined would inherit h.policy)
              notes: ['CHEM 4A has a corequisite lab (CHEM 4AL) that is not required for the major.'],
            }),
            h.take('programming', 'Programming', 'Plus one of the following courses or equivalent:', codes('ASTR 119', 'CSE 20', 'ASTR 19'), {
              notes: ['A test-out option is available for CSE 20. “Or equivalent” courses need department confirmation.'],
            }),
          ]),
    ])

    const upperQuote = 'All of the following courses:'
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('phys102', 'PHYS 102', upperQuote, codes('PHYS 102')),
      h.options('phys116a', 'PHYS 116A (or MATH 21 + MATH 24)', [upperQuote, Q_116A], [['PHYS 116A'], ['MATH 21', 'MATH 24']]),
      phys116c(h, upperQuote),
      h.take('phys105', 'PHYS 105', upperQuote, codes('PHYS 105')),
      comp
        ? h.take('phys110a', 'PHYS 110A', upperQuote, codes('PHYS 110A'))
        : h.options('phys110', 'PHYS 110A and 110B (or ECE 135/135L)', [upperQuote, Q_SUBS], [['PHYS 110A', 'PHYS 110B'], ['ECE 135', 'ECE 135L']]),
      h.take('phys112', 'PHYS 112', upperQuote, codes('PHYS 112')),
      ...(comp
        ? [
            h.take('stat131', 'STAT 131', upperQuote, codes('STAT 131')),
            // PHYS 115 is also the comprehensive course (overlay below).
            h.take('phys115', 'PHYS 115', upperQuote, codes('PHYS 115')),
          ]
        : [
            h.take('phys133', 'PHYS 133', upperQuote, codes('PHYS 133')),
            h.take('phys134', 'PHYS 134', upperQuote, codes('PHYS 134')),
          ]),
    ])

    const electives = comp
      ? h.take(
          'electives',
          'Three electives',
          [
            'Complete three courses chosen from the following, of which at least one must be PHYS 150 or PHYS 152.',
            'At most one course can be taken from PHYS 110B and PHYS 139A.',
          ],
          codes(...COMP_ELECTIVES, 'CSE 109'),
          {
            n: 3,
            atLeast: [{ set: codes('PHYS 150', 'CSE 109', 'PHYS 152'), n: 1, label: 'PHYS 150 or PHYS 152' }],
            atMost: [{ set: codes('PHYS 110B', 'PHYS 139A'), n: 1, label: 'PHYS 110B / PHYS 139A' }],
          },
        )
      : h.take(
          'electives',
          'Three electives',
          'Complete three courses chosen from the following, at least one of which has to be a Physics Department course:',
          codes(...STD_ELECTIVES, ...STD_ALIASES),
          {
            n: 3,
            // A PHYS-numbered course; AM 107 counts through its PHYS 107 cross-listing.
            atLeast: [{ set: codes(...STD_ELECTIVES.filter((c) => c.startsWith('PHYS')), 'PHYS 107', 'AM 107'), n: 1, label: 'a Physics Department course' }],
            notes: ['Other courses may count with approval of the undergraduate faculty advisor.'],
          },
        )

    const dc = h.either(
      'dc',
      'Disciplinary Communication (DC)',
      'Students in the applied physics major satisfy the DC requirement by completing one of the following options:',
      [
        h.take('dc-182', 'PHYS 182', 'Students in the applied physics major satisfy the DC requirement by completing one of the following options:', codes('PHYS 182'), { exclusive: false }),
        h.all('dc-thesis', 'PHYS 195A and 195B (senior thesis)', 'Students in the applied physics major satisfy the DC requirement by completing one of the following options:', ['PHYS 195A', 'PHYS 195B'], { exclusive: false }),
      ],
    )

    const comprehensive = comp
      ? h.take('comprehensive', 'Comprehensive Requirement: PHYS 115', 'The comprehensive requirement is satisfied by completing the following course:', codes('PHYS 115'), { exclusive: false })
      : h.take('comprehensive', 'Comprehensive Requirement: PHYS 134', 'The comprehensive requirement is satisfied by completing the following course:', codes('PHYS 134'), { exclusive: false })

    return [lower, upper, electives, dc, comprehensive]
  },
})

/** PHYS 116C, or the waiver: math dual major + MATH 107 (fall 2017 or later). */
function phys116c(h: HarnessContext, upperQuote: string): Node {
  const math107 = h.taken(codes('MATH 107')).filter((e) => e.term == null || Number(e.term) >= 2178)
  const plain = h.take('phys116c-course', 'PHYS 116C', upperQuote, codes('PHYS 116C'))
  if (!math107.length) return h.group('phys116c', 'PHYS 116C', [plain], { quote: upperQuote })
  return h.either('phys116c', 'PHYS 116C (or the math dual-major waiver)', [upperQuote, Q_116C], [
    plain,
    h.group('phys116c-waiver', 'Waiver: math dual major with MATH 107', [
      h.node('math107', 'MATH 107 (fall 2017 or later)', Q_116C, 'met', { used: math107 }),
      h.attest('math-double-major'),
    ]),
  ])
}
