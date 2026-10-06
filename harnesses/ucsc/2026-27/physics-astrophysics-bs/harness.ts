// Physics (Astrophysics) B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/physics-astrophysics-bs.md
//
// Handled in code below:
//  - AP Physics C score of 5 exempts PHYS 5A/5C "and the associated lab
//    courses": offered only when PHYS 5A/5C is credit without a term.
//  - ASTR 21, or ASTR 9A + 9B (one package).
//  - Advanced lab (= comprehensive requirement): PHYS 135, PHYS 135A + 135B,
//    ASTR 136, or "⟨or any three of these courses⟩" of the ASTR 136A–H
//    modules.
//  - PHYS 116A / 116C substitutions as in the other physics majors.
import { codes, combinations, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const Q_116A = 'Completing both MATH 21 and MATH 24 can substitute for PHYS 116A.'
const Q_116C = 'PHYS 116C is waived for students who are pursuing a dual major in physics (astrophysics) and mathematics B.A. or B.S., and take MATH 107 in Fall 2017 or later.'
const Q_AP =
  'Students with a score of 5 on the AP Physics C Mechanics and AP Physics C Electricity and Magnetism examinations are exempt from taking PHYS 5A and PHYS 5C respectively, and the associated lab courses.'

const ELECTIVES = [
  'ASTR 111', 'ASTR 112', 'ASTR 113', 'ASTR 117', 'ASTR 118', 'PHYS 129', 'PHYS 137', 'PHYS 171',
  'EART 160', 'EART 162', 'EART 163', 'EART 164', 'AM 107', 'PHYS 130',
]
// Cross-listed codes a student may enter: AM 107 [/PHYS 107], PHYS 130 [/ASTR 114].
const ELECTIVE_ALIASES = ['PHYS 107', 'ASTR 114']

const ASTR136_MODULES = ['ASTR 136A', 'ASTR 136B', 'ASTR 136C', 'ASTR 136D', 'ASTR 136E', 'ASTR 136G', 'ASTR 136H']
const PAIR_135 = ['PHYS 135A', 'PHYS 135B']
const PAIR_135_ALIAS = ['ASTR 135A', 'ASTR 135B']
const MODULE_SET = codes(...ASTR136_MODULES)
const A135 = codes('PHYS 135A', 'ASTR 135A')
const B135 = codes('PHYS 135B', 'ASTR 135B')

export default defineHarness({
  program: 'physics-astrophysics-bs',
  edition: '2026-27',
  title: 'Physics (Astrophysics) B.S.',
  attestations: [
    { id: 'math-double-major', label: 'Pursuing a dual major with a Mathematics B.A. or B.S.', quote: Q_116C, aliases: ['math double major', 'dual major', 'mathematics'] },
    { id: 'ap-mech', label: 'Score of 5 on the AP Physics C Mechanics exam (exempts PHYS 5L)', quote: Q_AP, aliases: ['ap physics c mechanics', 'ap mechanics'] },
    { id: 'ap-em', label: 'Score of 5 on the AP Physics C Electricity and Magnetism exam (exempts PHYS 5N)', quote: Q_AP, aliases: ['ap physics c electricity', 'ap e&m', 'ap electricity'] },
  ],
  notes: [
    'All courses used to satisfy the physics (astrophysics) major requirements must be taken for a letter grade.',
    'Students cannot complete both the physics (astrophysics) major and the astrophysics minor.',
  ],
  coverage: {
    unknownOk: {
      PHYS107: 'cross-listing of AM 107 named on the page; not a separate catalog entry',
      ASTR114: 'cross-listing of PHYS 130 named on the page; not a separate catalog entry',
      ASTR135: 'cross-listing of PHYS 135 named on the page; not a separate catalog entry',
      ASTR135A: 'cross-listing of PHYS 135A named on the page; not a separate catalog entry',
      ASTR135B: 'cross-listing of PHYS 135B named on the page; not a separate catalog entry',
    },
  },
  evaluate(h) {
    // "All courses used to satisfy the physics (astrophysics) major requirements must be taken for a letter grade."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('phys-a', 'PHYS 5A or 15A', 'Plus one of the following courses:', codes('PHYS 5A', 'PHYS 15A')),
      h.take('phys-c', 'PHYS 5C or 15C', 'Plus one of the following courses:', codes('PHYS 5C', 'PHYS 15C')),
      h.group('phys-core', 'PHYS 5B, 5D and labs 5L/5M/5N', [
        h.take('phys-5b', 'PHYS 5B', 'Plus all of the following courses:', codes('PHYS 5B'), { minor: true }),
        apLab(h, 'PHYS 5L', ['PHYS5A', 'PHYS15A'], 'ap-mech'),
        h.take('phys-5m', 'PHYS 5M', 'Plus all of the following courses:', codes('PHYS 5M'), { minor: true }),
        apLab(h, 'PHYS 5N', ['PHYS5C', 'PHYS15C'], 'ap-em'),
        h.take('phys-5d', 'PHYS 5D', 'Plus all of the following courses:', codes('PHYS 5D'), { minor: true }),
      ], { quote: 'Plus all of the following courses:' }),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
      h.take('programming', 'Programming', 'Plus one of the following courses or equivalent:', codes('ASTR 119', 'CSE 20', 'ASTR 19'), {
        notes: ['ASTR 119 is strongly recommended. A test-out option is available for CSE 20. “Or equivalent” courses need department confirmation.'],
      }),
      h.options('astr-intro', 'ASTR 21, or ASTR 9A and 9B', 'Plus one of the following options:', [['ASTR 21'], ['ASTR 9A', 'ASTR 9B']]),
    ])

    const uq = 'All of the following courses:'
    const lab = advancedLab(h, 'adv-lab', 'Advanced laboratory', 'Plus one of the following options:', true)
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('phys102', 'PHYS 102', uq, codes('PHYS 102')),
      h.options('phys116a', 'PHYS 116A (or MATH 21 + MATH 24)', [uq, Q_116A], [['PHYS 116A'], ['MATH 21', 'MATH 24']]),
      phys116c(h, uq),
      h.take('phys105', 'PHYS 105', uq, codes('PHYS 105')),
      h.take('phys110a', 'PHYS 110A', uq, codes('PHYS 110A')),
      h.take('phys110b', 'PHYS 110B', uq, codes('PHYS 110B')),
      h.take('phys112', 'PHYS 112', uq, codes('PHYS 112')),
      h.take('phys133', 'PHYS 133', uq, codes('PHYS 133')),
      h.take('phys139a', 'PHYS 139A', uq, codes('PHYS 139A')),
      lab,
    ])

    const electives = h.take('electives', 'Three electives', 'Complete three courses chosen from the following:', codes(...ELECTIVES, ...ELECTIVE_ALIASES), {
      n: 3,
      notes: ['PHYS 139B is recommended in addition for students going to graduate school in physics or astrophysics.'],
    })

    const dcQ = 'Students in the physics (astrophysics) major satisfy the DC requirement by completing one of the following options:'
    const dc = h.either('dc', 'Disciplinary Communication (DC)', dcQ, [
      h.take('dc-182', 'PHYS 182', dcQ, codes('PHYS 182'), { exclusive: false }),
      h.all('dc-thesis', 'PHYS 195A and 195B (senior thesis)', dcQ, ['PHYS 195A', 'PHYS 195B'], { exclusive: false }),
    ])

    // Same option list as the advanced lab; an overlay that reuses it.
    const comprehensive = advancedLab(h, 'comprehensive', 'Comprehensive Requirement', 'The comprehensive requirement is satisfied by completing one of the following options:', false)

    return [lower, upper, electives, dc, comprehensive]
  },
})

/**
 * PHYS 135 [/ASTR 135], or PHYS 135A + 135B, or ASTR 136, or any three of
 * the ASTR 136A–H modules — one unit. Composite units carry the packages.
 */
function advancedLab(h: HarnessContext, id: string, title: string, quote: string, exclusive: boolean): Node {
  return h.take(id, title, quote, codes('PHYS 135', 'ASTR 135', 'ASTR 136'), {
    exclusive,
    composite: {
      eligible: codes(...PAIR_135, ...PAIR_135_ALIAS, ...ASTR136_MODULES),
      build: (avail: Enrollment[]) => {
        const out: Enrollment[][] = []
        const a = avail.find((e) => A135.has(e.code))
        const b = avail.find((e) => B135.has(e.code))
        if (a && b) out.push([a, b])
        // one enrollment per module code
        const seen = new Set<string>()
        const mods = avail.filter((e) => MODULE_SET.has(e.code) && !seen.has(e.code) && seen.add(e.code))
        for (const c of combinations(mods, 3)) out.push(c)
        return out
      },
    },
    notes: [
      'Options: PHYS 135 [/ASTR 135]; PHYS 135A and 135B; ASTR 136; or any three of ASTR 136A–H.',
      'PHYS 135A and PHYS 135B are not scheduled to be offered in the next few years.',
    ],
  })
}

/**
 * A required lab that a score of 5 on the matching AP Physics C exam exempts.
 * Offered only when the lecture is credit without a term and the lab is missing.
 */
function apLab(h: HarnessContext, lab: string, lectures: string[], att: string): Node {
  const quote = 'Plus all of the following courses:'
  const slot = h.take(`phys-${lab.slice(-2).toLowerCase()}`, lab, quote, codes(lab), { minor: true })
  const hasLab = h.taken(codes(lab)).length > 0
  const examCredit = h.taken(codes(...lectures)).some((e) => e.term == null)
  if (hasLab || !examCredit) return slot
  return h.either(`${lab.replace(' ', '').toLowerCase()}-or-ap`, `${lab} (or AP exemption)`, [quote, Q_AP], [slot, h.attest(att)])
}

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
