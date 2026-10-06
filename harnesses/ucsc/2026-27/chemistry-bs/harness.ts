// Chemistry B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/chemistry-bs.md
//
// Two paths: General Major and the Biochemistry Concentration.
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A–3C (3B/3C taken before fall 2026 also need
//    CHEM 3BL/3CL) or CHEM 4A/4AL/4B/4BL.
//  - Calculus: MATH 11A+11B or 19A+19B; mixing the series is allowed by the
//    page (transition policy external) — accepted with a note, as biology-bs.
//  - Physics: PHYS 5 or PHYS 6 series with labs. Mixing is allowed "but should
//    contact a ... advisor to make sure the Physics Transition policies will be
//    satisfied" → a complete mixed set is cannot-check, not met.
//  - CHEM 8M ↔ CHEM 8N, CHEM 110L ↔ CHEM 110N (honors labs, by invitation).
//  - General major: the BIOC 100A–C series fulfils CHEM 103 plus one elective.
//  - DC and comprehensive: CHEM 151L + one listed lab; overlays that reuse
//    courses counted elsewhere.
import { codes, defineHarness, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s) but should contact a Chemistry & Biochemistry Department advisor to make sure the Physics Transition policies will be satisfied.'
// The source sentence embeds a markdown link around CHEM 103; quote the parts around it.
const Q_BIOC_SERIES = ['should take the biochemistry and molecular biology (BIOC) 100ABC series. Completing the series will fulfill the requirement of', '(Biochemistry) plus fulfill one elective.']

const ELECTIVES = [
  'BIOC 100C', 'CHEM 122', 'CHEM 124', 'CHEM 143', 'CHEM 144', 'CHEM 151B', 'CHEM 156C', 'CHEM 169',
  'CHEM 171', 'METX 101', 'OCEA 120', 'OCEA 121', 'PHYS 156', 'PHYS 161', 'PHYS 180',
]
const DC_LABS = ['CHEM 124', 'CHEM 146A', 'CHEM 146B', 'CHEM 146C', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L']

export default defineHarness({
  program: 'chemistry-bs',
  edition: '2026-27',
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
  notes: [
    'All courses used for the major must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses (CHEM 100–CHEM 199) must be taken through the department at UC Santa Cruz (the plan does not record where a course was taken).',
    'A chemistry graduate course may satisfy an elective with permission of the instructor and department (add it once approved).',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in any of the Chemistry and
    // Biochemistry Department's majors must be taken for a letter grade. Additionally,
    // letter grades of C or higher must be attained in all courses ..."
    h.policy = { letter: true, min: 'C' }
    const bioc = h.choice('concentration') === 'biochemistry'

    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      h.options(
        'calculus',
        'Calculus: MATH 11A+11B or 19A+19B',
        ['Choose one of the following options:', bioc ? 'Students may combine the MATH 11 and MATH 19 series in accordance with the' : 'A student may combine the MATH 11 and MATH 19 series in accordance with the'],
        [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B'], ['MATH 19A', 'MATH 11B'], ['MATH 11A', 'MATH 19B']],
        { notes: ['Mixed MATH 11/19 sequences follow the Mathematics Department’s Calculus Series Transition Policy (external).'] },
      ),
      h.options('multivariable', 'Multivariable Calculus', 'Multivariable Calculus:', [['MATH 22'], ['MATH 23A', 'MATH 23B'], ['AM 30']]),
      h.take('adv-math', 'Advanced Mathematics', 'Advanced Mathematics:', codes('AM 10', 'MATH 21', 'MATH 24')),
      bioc ? h.all('intro-bio', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B']) : null,
      physics(h),
      h.group('orgo', 'Organic Chemistry', [
        h.all('orgo-core', 'CHEM 8A, 8B, 8L', 'Organic Chemistry:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L']),
        h.take('chem8m', 'CHEM 8M (or honors CHEM 8N)', ['Organic Chemistry:', 'By permission and invitation of the instructor, students may substitute CHEM 8M with CHEM 8N'], codes('CHEM 8M', 'CHEM 8N')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('orgo-int', 'Intermediate Organic Chemistry', [
        h.take('chem110', 'CHEM 110', 'Intermediate Organic Chemistry:', codes('CHEM 110')),
        h.take('chem110l', 'CHEM 110L (or honors CHEM 110N)', ['Intermediate Organic Chemistry:', bioc ? 'students may substituteCHEM 110L with CHEM 110N' : 'students may substitute CHEM 110L with CHEM 110N'], codes('CHEM 110L', 'CHEM 110N')),
      ]),
      h.all('inorganic', 'Inorganic Chemistry: CHEM 151A and 151L', 'Inorganic Chemistry:', ['CHEM 151A', 'CHEM 151L']),
      bioc
        ? h.all('biochem', 'Biochemistry: BIOC 100A, 100B, 100C', 'Biochemistry:', ['BIOC 100A', 'BIOC 100B', 'BIOC 100C'])
        : h.options('biochem', 'Biochemistry: CHEM 103 (or the BIOC 100A–C series)', ['Biochemistry:', ...Q_BIOC_SERIES], [['CHEM 103'], ['BIOC 100A', 'BIOC 100B', 'BIOC 100C']]),
      bioc
        ? h.all('pchem', 'Physical Chemistry', 'Physical Chemistry:', ['CHEM 163A', 'CHEM 163B', 'CHEM 163C'])
        : h.all('pchem', 'Physical Chemistry', 'Physical Chemistry:', ['CHEM 163A', 'CHEM 163B', 'CHEM 163C', 'CHEM 164']),
    ])

    const nodes: Node[] = [lower, upper]
    if (!bioc) {
      h.solve()
      const biochem = upper.children!.find((c) => c.id === 'biochem')!
      const series = !!biochem.used?.some((e) => e.code === 'BIOC100C')
      nodes.push(
        h.take('electives', series ? 'Electives (one more; the BIOC 100A–C series counts as one)' : 'Two electives', series ? ['At least two from the following list:', ...Q_BIOC_SERIES] : 'At least two from the following list:', codes(...ELECTIVES), {
          n: series ? 1 : 2,
          notes: ['CHEM 122 is required for American Chemical Society certification.'],
        }),
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

/** CHEM 3A–3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['General Chemistry:', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General Chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General Chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}

/** PHYS 5A–5C + 5L/5M/5N or PHYS 6A–6C + 6L/6M/6N; a complete mixed set is cannot-check. */
function physics(h: HarnessContext): Node {
  const slots = ['A', 'B', 'C', 'L', 'M', 'N']
  const got = slots.map((s) => h.taken(codes(`PHYS 5${s}`, `PHYS 6${s}`))[0])
  const five = slots.every((s) => h.taken(codes(`PHYS 5${s}`)).length)
  const six = slots.every((s) => h.taken(codes(`PHYS 6${s}`)).length)
  if (!five && !six && got.every(Boolean))
    return h.cannotCheck('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Choose one of the following options:', Q_PHYS_MIX],
      'You combined the PHYS 5 and PHYS 6 series: confirm with a Chemistry & Biochemistry advisor that the Physics Transition policies are satisfied.', { used: got as Enrollment[] })
  return h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Choose one of the following options:', Q_PHYS_MIX], [
    ['PHYS 5A', 'PHYS 5B', 'PHYS 5C', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N'],
    ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L', 'PHYS 6M', 'PHYS 6N'],
  ])
}
