// Chemistry B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/chemistry-bs.md
//
// Two paths: General Major and the Biochemistry Concentration.
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A/3B/3C + 3BL/3CL, or CHEM 4A/4AL/4B/4BL
//    (2025-26 lists the labs; no fall-2026 rule).
//  - Calculus: MATH 11A+11B or 19A+19B; MATH 19A then 11B is the page's own
//    example of a valid mix; any other mix (MATH 11A + 19B) defers to the
//    external Calculus Series Transition Policy → cannot-check.
//  - Physics: PHYS 5 or PHYS 6 series with labs. Mixing is allowed while
//    following the external Physics Transition policies → a complete mixed
//    set is cannot-check, not met.
//  - 2025-26 general B.S.: "One of the following laboratory courses:" (CHEM
//    146A/B/C, 160L, 161L, 186L) is its own exclusive requirement.
//  - 2025-26 biochemistry concentration: BIOC 100A–C AND one of BIOC 110L /
//    CHEM 160L / 161L / 186L (exclusive), reused by the DC/comprehensive overlays.
//  - CHEM 8M ↔ CHEM 8N, CHEM 110L ↔ CHEM 110N (honors labs, by invitation).
//  - General major: the BIOC 100A–C series fulfils CHEM 103 plus one elective.
//  - General major electives: a chemistry graduate course "with permission
//    from the instructor and department" is asked as an attestation only
//    when the allocator needed it (§1a petition).
//  - CHEM 8N / 110N accepted without an attestation: enrolling in the honors
//    lab is itself "by permission and invitation of the instructor".
//  - DC and comprehensive: CHEM 151L + one listed lab; overlays that reuse
//    courses counted elsewhere.
import { codes, defineHarness, subject } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

// The general and concentration sections word the mixing notes differently.
const Q_PHYS_MIX_GEN =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s), while following the'
const Q_PHYS_MIX_BIOC =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s) but must follow the'
const Q_CALC_MIX_GEN =
  'A student may combine the MATH 11 series with the MATH 19 series to complete this portion of the major requirement(s), (for example, a student can take and complete MATH 19A and then take and complete MATH 11B) but must follow the'
const Q_CALC_MIX_BIOC =
  'A student may combine the MATH 11 series with the MATH 19 series to complete this portion of the major requirement(s). For example, a student can take and complete MATH 19A and then take and complete MATH 11B, but they must follow the'
const Q_BIOC_SERIES = ['Completing the series will fulfill the requirement of CHEM 103 (Biochemistry) plus fulfill one elective.']

const Q_GRAD = 'Students may also satisfy the elective requirement by completing a chemistry graduate course with permission from the instructor and department.'
const GRAD = subject('CHEM', 'graduate')

const ELECTIVES = [
  'BIOC 100C', 'CHEM 122', 'CHEM 124', 'CHEM 143', 'CHEM 144', 'CHEM 151B', 'CHEM 156C', 'CHEM 169',
  'CHEM 171', 'METX 101', 'METX 102', 'OCEA 120', 'OCEA 121', 'PHYS 156', 'PHYS 180',
]
// General B.S. "One of the following laboratory courses:" (2025-26)
const ADV_LABS = ['CHEM 146A', 'CHEM 146B', 'CHEM 146C', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L']
// Concentration "Biochemistry: ... AND One of these courses" (2025-26)
const BIOC_LABS = ['BIOC 110L', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L']
const DC_LABS = ['CHEM 124', 'CHEM 146A', 'CHEM 146B', 'CHEM 146C', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L']

export default defineHarness({
  program: 'chemistry-bs',
  edition: '2025-26',
  title: 'Chemistry B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Path',
      quote: 'Biochemistry Concentration',
      default: 'general',
      options: [
        { value: 'general', label: 'General Major', aliases: ['general', 'none', 'chemistry', 'standard'] },
        { value: 'biochemistry', label: 'Biochemistry Concentration', aliases: ['biochemistry', 'biochem', 'bioc'] },
      ],
    },
  ],
  attestations: [
    { id: 'grad-elective', label: 'Instructor and department permitted a chemistry graduate course as an elective', quote: Q_GRAD, aliases: ['graduate course', 'grad elective', 'department permission'] },
  ],
  coverage: {
    unknownOk: { METX102: 'listed as an elective on the 2025-26 page; not in the catalog' },
  },
  notes: [
    'All courses used for the major must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses (CHEM 100–CHEM 199) must be taken through the department at UC Santa Cruz (the plan does not record where a course was taken).',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in any of the Chemistry and
    // Biochemistry Department's majors must be taken for a letter grade. Additionally,
    // letter grades of C or higher must be attained in all courses ..."
    h.policy = { letter: true, min: 'C' }
    const bioc = h.choice('concentration') === 'biochemistry'

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('gen-chem', 'General Chemistry', 'General Chemistry:', [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3C', 'CHEM 3BL', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4B', 'CHEM 4AL', 'CHEM 4BL'],
      ]),
      calculus(h, bioc ? Q_CALC_MIX_BIOC : Q_CALC_MIX_GEN),
      h.options('multivariable', 'Multivariable Calculus', 'Multivariable Calculus:', [['MATH 22'], ['MATH 23A', 'MATH 23B'], ['AM 30']]),
      h.take('adv-math', 'Advanced Mathematics', 'Advanced Mathematics:', codes('AM 10', 'MATH 21', 'MATH 24')),
      bioc ? h.all('intro-bio', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B']) : null,
      physics(h, bioc ? Q_PHYS_MIX_BIOC : Q_PHYS_MIX_GEN),
      h.group('orgo', 'Organic Chemistry', [
        h.all('orgo-core', 'CHEM 8A, 8B, 8L', 'Organic Chemistry:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L']),
        h.take('chem8m', 'CHEM 8M (or honors CHEM 8N)', ['Organic Chemistry:', 'By permission and invitation of the instructor, students may substitute CHEM 8M with CHEM 8N'], codes('CHEM 8M', 'CHEM 8N')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('orgo-int', 'Intermediate Organic Chemistry', [
        h.take('chem110', 'CHEM 110', 'Intermediate Organic Chemistry:', codes('CHEM 110')),
        h.take('chem110l', 'CHEM 110L (or honors CHEM 110N)', ['Intermediate Organic Chemistry:', 'students may substitute CHEM 110L with CHEM 110N'], codes('CHEM 110L', 'CHEM 110N')),
      ]),
      h.all('inorganic', 'Inorganic Chemistry: CHEM 151A and 151L', 'Inorganic Chemistry:', ['CHEM 151A', 'CHEM 151L']),
      bioc
        ? h.all('biochem', 'Biochemistry: BIOC 100A, 100B, 100C', 'Biochemistry:', ['BIOC 100A', 'BIOC 100B', 'BIOC 100C'])
        : h.options('biochem', 'Biochemistry: CHEM 103 (or the BIOC 100A–C series)', ['Biochemistry:', ...Q_BIOC_SERIES], [['CHEM 103'], ['BIOC 100A', 'BIOC 100B', 'BIOC 100C']]),
      // 2025-26: "BIOC 100A ... BIOC 100C ⟨AND⟩ ⟨One of these courses⟩ BIOC 110L / CHEM 160L / 161L / 186L"
      bioc ? h.take('biochem-lab', 'Biochemistry laboratory', ['Biochemistry:', 'One of these courses'], codes(...BIOC_LABS)) : null,
      bioc
        ? h.all('pchem', 'Physical Chemistry', 'Physical Chemistry:', ['CHEM 163A', 'CHEM 163B', 'CHEM 163C'])
        : h.all('pchem', 'Physical Chemistry', 'Physical Chemistry:', ['CHEM 163A', 'CHEM 163B', 'CHEM 163C', 'CHEM 164']),
      // 2025-26 general B.S. only: "One of the following laboratory courses:"
      bioc ? null : h.take('adv-lab', 'One laboratory course', 'One of the following laboratory courses:', codes(...ADV_LABS)),
    ])

    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'Students must complete each of the following qualification courses, or their equivalents, by their campus-established declaration deadline with a grade of C or better and with a cumulative grade point average (GPA) of 2.50 or greater:',
      'General chemistry, calculus and multivariable calculus with a 2.50 GPA gate declaration; not a graduation requirement.',
    )
    const nodes: Node[] = [qualification, lower, upper]
    if (!bioc) {
      h.solve()
      const biochem = upper.children!.find((c) => c.id === 'biochem')!
      const series = !!biochem.used?.some((e) => e.code === 'BIOC100C')
      const LISTED = codes(...ELECTIVES)
      const electives = h.take('electives', series ? 'Electives (one more; the BIOC 100A–C series counts as one)' : 'Two electives', series ? ['At least two from the following list:', ...Q_BIOC_SERIES] : 'At least two from the following list:', LISTED.or(GRAD), {
        n: series ? 1 : 2,
        prefer: (c) => (LISTED.has(c, h.catalog) ? 0 : 1),
        pool: 'the listed electives; or a chemistry graduate course with permission',
        notes: ['CHEM 122 is required for American Chemical Society certification.'],
      })
      h.solve()
      const grad = (electives.used ?? []).filter((e) => !LISTED.has(e.code, h.catalog))
      nodes.push(
        grad.length
          ? h.group('electives-permitted', electives.title, [electives, h.attest('grad-elective', `Permission for ${grad.map((e) => e.display).join(', ')} as an elective`)], { quote: Q_GRAD })
          : electives,
      )
    }

    // DC and comprehensive share the same courses; overlays.
    const labList = bioc ? ['BIOC 110L', ...DC_LABS] : DC_LABS
    const labQuote = bioc ? 'One of these courses' : 'Plus one of the following courses:'
    const pair = (id: string, title: string, quote: string) =>
      h.group(id, title, [
        h.take(`${id}-151l`, 'CHEM 151L', quote, codes('CHEM 151L'), { exclusive: false }),
        h.take(`${id}-lab`, 'One advanced laboratory', labQuote, codes(...labList), { exclusive: false }),
      ], { quote })
    nodes.push(
      pair(
        'dc',
        'Disciplinary Communication (DC)',
        bioc
          ? 'The DC Requirement in chemistry with a biochemistry concentration is satisfied by completing the following. This also satisfies the Comprehensive Requirement.'
          : 'The DC Requirement for the bachelor of science (B.S.) degree in chemistry is satisfied by completing:',
      ),
      pair(
        'comprehensive',
        'Comprehensive Requirement',
        bioc
          ? 'For the chemistry B.S with a biochemistry concentration, this requirement can be satisfied by receiving a passing grade in the upper-division labs listed below.'
          : 'For the chemistry B.S., this requirement can be satisfied by receiving a passing grade in the upper-division labs listed below.',
      ),
    )
    return nodes
  },
})

/** MATH 11A+11B, 19A+19B, or the page's example mix 19A + 11B; MATH 11A + 19B is cannot-check. */
function calculus(h: HarnessContext, mixQuote: string): Node {
  const quote = ['Choose one of the following options:', mixQuote]
  const has = (c: string) => h.taken(codes(c)).length > 0
  const pure = (has('MATH 11A') && has('MATH 11B')) || (has('MATH 19A') && has('MATH 19B'))
  if (!pure && !(has('MATH 19A') && has('MATH 11B')) && has('MATH 11A') && has('MATH 19B'))
    return h.cannotCheck('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote,
      'You combined MATH 11A and MATH 19B: check the Mathematics Department’s Calculus Series Transition Policy.', { used: [...h.taken(codes('MATH 11A')), ...h.taken(codes('MATH 19B'))] })
  return h.options('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote, [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B'], ['MATH 19A', 'MATH 11B']])
}

/** PHYS 5A–5C + 5L/5M/5N or PHYS 6A–6C + 6L/6M/6N; a complete mixed set is cannot-check. */
function physics(h: HarnessContext, mixQuote: string): Node {
  const slots = ['A', 'B', 'C', 'L', 'M', 'N']
  const got = slots.map((s) => h.taken(codes(`PHYS 5${s}`, `PHYS 6${s}`))[0])
  const five = slots.every((s) => h.taken(codes(`PHYS 5${s}`)).length)
  const six = slots.every((s) => h.taken(codes(`PHYS 6${s}`)).length)
  if (!five && !six && got.every(Boolean))
    return h.cannotCheck('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Choose one of the following options:', mixQuote],
      'You combined the PHYS 5 and PHYS 6 series: check that the Physics Transition policies are satisfied.', { used: got as Enrollment[] })
  return h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Choose one of the following options:', mixQuote], [
    ['PHYS 5A', 'PHYS 5B', 'PHYS 5C', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N'],
    ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L', 'PHYS 6M', 'PHYS 6N'],
  ])
}
