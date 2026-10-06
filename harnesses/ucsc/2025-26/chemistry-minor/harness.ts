// Chemistry Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/chemistry-minor.md
//
// Handled in code below:
//  - Letter grade in every course used (2025-26 states no C-or-better rule).
//  - General chemistry: CHEM 3A/3B/3C + 3BL/3CL, or CHEM 4A/4B/4AL/4BL.
//  - Physics: PHYS 5 or PHYS 6 series with labs; a complete mixed set is
//    cannot-check (it must follow the external Physics Transition policies).
//  - "Plus two of" CHEM 103 / 110 / 151A. CHEM 110 / 151A are preferred so
//    CHEM 103 is used only when needed (the BIOC 100A exclusion depends on
//    whether CHEM 103 is counted). 2025-26 has no BIOC 100A–C series rule.
//  - Calculus: MATH 11A+11B or 19A+19B; MATH 19A then 11B is the page's own
//    example of a valid mix; any other mix (MATH 11A + 19B) defers to the
//    external Calculus Series Transition Policy → cannot-check.
//  - A chemistry graduate course "with the permission of the instructor and
//    department" may be an elective: asked as an attestation only when the
//    allocator needed it (§1a petition).
//  - Electives: two from the list (2025-26: METX 102 listed, CHEM 122 not);
//    not both BIOC 100A and CHEM 103; not both BIOC 163B and CHEM 163B.
import { codes, defineHarness, subject } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s), while following the'
const Q_NOT_BOTH = 'Students cannot receive elective credit toward the minor for 1) both BIOC 100A and CHEM 103; 2) both BIOC 163B and CHEM 163B.'

const Q_GRAD = 'Students may also satisfy the elective requirements by completing a chemistry graduate course with the permission of the instructor and department.'
const Q_CALC_MIX = 'A student may combine the MATH 11 series with the MATH 19 series to complete this portion of the major requirement(s), (for example, a student can take and complete MATH 19A and then take and complete MATH 11B) but must follow the'
const GRAD = subject('CHEM', 'graduate')

const ELECTIVES = [
  'BIOC 100A', 'BIOC 100B', 'BIOC 163B', 'CHEM 143', 'CHEM 144', 'CHEM 151B', 'CHEM 156C',
  'CHEM 163B', 'CHEM 163C', 'CHEM 169', 'CHEM 171', 'METX 101', 'METX 102', 'OCEA 120', 'OCEA 121', 'PHYS 180',
]

export default defineHarness({
  program: 'chemistry-minor',
  edition: '2025-26',
  title: 'Chemistry Minor',
  attestations: [
    { id: 'grad-elective', label: 'Instructor and department permitted a chemistry graduate course as an elective', quote: Q_GRAD, aliases: ['graduate course', 'grad elective', 'department permission'] },
  ],
  coverage: {
    unknownOk: { METX102: 'listed as an elective on the 2025-26 page; not in the catalog' },
  },
  notes: [
    'All courses used for the minor must be taken for a letter grade.',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in the chemistry minor must be taken for a
    // letter grade." (2025-26 has no C-or-better sentence.)
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('gen-chem', 'General chemistry', 'Chemistry', [['CHEM 3A', 'CHEM 3B', 'CHEM 3C', 'CHEM 3BL', 'CHEM 3CL'], ['CHEM 4A', 'CHEM 4B', 'CHEM 4AL', 'CHEM 4BL']]),
      h.all('orgo', 'Organic chemistry', 'and these courses:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L', 'CHEM 8M']),
      calculus(h),
      h.options('multivariable', 'Multivariable calculus', 'Plus one of the following options', [['MATH 22'], ['MATH 23A', 'MATH 23B'], ['AM 30']]),
      physics(h),
    ])

    const twoOf = h.take('two-of', 'Two of CHEM 103, CHEM 110, CHEM 151A', 'Plus two of the following courses', codes('CHEM 103', 'CHEM 110', 'CHEM 151A'), {
      n: 2,
      prefer: (c) => (c === 'CHEM103' ? 1 : 0),
    })
    const upperCore = h.group('upper', 'Upper-Division Courses', [
      h.take('chem163a', 'CHEM 163A (or BIOC 163A)', ['This course', 'Students may substitute BIOC 163A for CHEM 163A.'], codes('CHEM 163A', 'BIOC 163A')),
      twoOf,
    ])
    h.solve()
    const counted103 = !!twoOf.used?.some((e) => e.code === 'CHEM103')
    const listed = codes(...ELECTIVES).except(counted103 ? ['BIOC 100A'] : [])
    const electives = h.take(
      'electives',
      'Two electives',
      ['Plus two chemistry upper-division electives from the following:', Q_NOT_BOTH],
      listed.or(GRAD),
      {
        n: 2,
        atMost: [{ set: codes('BIOC 163B', 'CHEM 163B'), n: 1, label: 'BIOC 163B / CHEM 163B' }],
        prefer: (c) => (listed.has(c, h.catalog) ? 0 : 1),
        pool: 'the listed electives; or a chemistry graduate course with permission',
        notes: counted103 ? ['BIOC 100A cannot count as an elective because CHEM 103 is counted above.'] : undefined,
      },
    )
    h.solve()
    const grad = (electives.used ?? []).filter((e) => !listed.has(e.code, h.catalog))
    const electivesNode = grad.length
      ? h.group('electives-permitted', electives.title, [electives, h.attest('grad-elective', `Permission for ${grad.map((e) => e.display).join(', ')} as an elective`)], { quote: Q_GRAD })
      : electives
    return [lower, upperCore, electivesNode]
  },
})

/** MATH 11A+11B, 19A+19B, or the page's example mix 19A + 11B; MATH 11A + 19B is cannot-check. */
function calculus(h: HarnessContext): Node {
  const quote = ['One of the following options', Q_CALC_MIX]
  const has = (c: string) => h.taken(codes(c)).length > 0
  const pure = (has('MATH 11A') && has('MATH 11B')) || (has('MATH 19A') && has('MATH 19B'))
  if (!pure && !(has('MATH 19A') && has('MATH 11B')) && has('MATH 11A') && has('MATH 19B'))
    return h.cannotCheck('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote,
      'You combined MATH 11A and MATH 19B: check the Mathematics Department’s Calculus Series Transition Policy.', { used: [...h.taken(codes('MATH 11A')), ...h.taken(codes('MATH 19B'))] })
  return h.options('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote, [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B'], ['MATH 19A', 'MATH 11B']])
}

/** PHYS 5A–5C + 5L/5M/5N or PHYS 6A–6C + 6L/6M/6N; a complete mixed set is cannot-check. */
function physics(h: HarnessContext): Node {
  const slots = ['A', 'B', 'C', 'L', 'M', 'N']
  const got = slots.map((s) => h.taken(codes(`PHYS 5${s}`, `PHYS 6${s}`))[0])
  const five = slots.every((s) => h.taken(codes(`PHYS 5${s}`)).length)
  const six = slots.every((s) => h.taken(codes(`PHYS 6${s}`)).length)
  if (!five && !six && got.every(Boolean))
    return h.cannotCheck('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX],
      'You combined the PHYS 5 and PHYS 6 series: check that the Physics Transition policies are satisfied.', { used: got as Enrollment[] })
  return h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX], [
    ['PHYS 5A', 'PHYS 5B', 'PHYS 5C', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N'],
    ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L', 'PHYS 6M', 'PHYS 6N'],
  ])
}
