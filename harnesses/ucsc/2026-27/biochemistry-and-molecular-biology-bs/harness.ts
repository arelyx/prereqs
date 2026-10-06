// Biochemistry and Molecular Biology B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biochemistry-and-molecular-biology-bs.md
//
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A–3C (3B/3C taken before fall 2026 also need
//    CHEM 3BL/3CL) or CHEM 4A/4B/4AL/4BL.
//  - Calculus: MATH 11A+11B or 19A+19B; a mix is accepted with a note
//    (transition policy external), as in biology-bs.
//  - Physics: PHYS 5 or PHYS 6 series with labs; a complete mixed set is
//    cannot-check (advisor must confirm the Physics Transition policies).
//  - Physical chemistry: CHEM 163A+163B, or "BIOC 163A and BIOC 163B" (the
//    page does not say the two series may be mixed, unlike chemistry-ba) —
//    a mixed pair is cannot-check, not unmet.
//  - Senior Exit Lab: its own requirement; DC and comprehensive are overlays
//    on it.
import { codes, defineHarness, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s), but should contact a Chemistry & Biochemistry Department advisor to make sure the Physics Transition policies will be satisfied.'
const Q_PCHEM = 'Students may substitute BIOC 163A and BIOC 163B for this requirement, when offered.'

const INTRO_LAB = ['BIOL 20L', 'BIOL 102J', 'BIOL 107J', 'CHEM 160J', 'CHEM 161J']
const UD_LAB = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']
const ELECTIVES = [
  'BIOL 110', 'BIOL 118', 'BME 110', 'BME 128', 'BME 130', 'BME 132', 'BME 160', 'CHEM 110', 'CHEM 169',
  'CHEM 171', 'STAT 131',
]
const EXIT_LABS = [
  'BIOC 110L', 'BIOL 100L', 'BIOL 103L', 'BIOL 104B', 'BIOL 105B', 'BIOL 105L', 'BIOL 106L', 'BIOL 108L',
  'BIOL 109L', 'BIOL 115L', 'BIOL 121L', 'BIOL 122L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L',
]

export default defineHarness({
  program: 'biochemistry-and-molecular-biology-bs',
  edition: '2026-27',
  title: 'Biochemistry and Molecular Biology B.S.',
  notes: [
    'All courses used for the major must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses (100–199) must be taken through the chemistry or biology programs at UC Santa Cruz (the plan does not record where a course was taken).',
    'The DC requirement must be satisfied at UC Santa Cruz and may not be transferred from another institution.',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in any of the chemistry and biochemistry
    // majors must be taken for a letter grade. Additionally, letter grades of C or higher must
    // be attained in all courses ..."
    h.policy = { letter: true, min: 'C' }

    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      h.options(
        'calculus',
        'Calculus: MATH 11A+11B or 19A+19B',
        ['Calculus', 'Students may combine the MATH 11 and MATH 19 series in accordance with the'],
        [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B'], ['MATH 19A', 'MATH 11B'], ['MATH 11A', 'MATH 19B']],
        { notes: ['Mixed MATH 11/19 sequences follow the Mathematics Department’s Calculus Series Transition Policy (external).'] },
      ),
      h.options('statistics', 'Statistics: STAT 5, or STAT 7 and 7L', 'Statistics', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.group('intro-bio', 'Introductory Biology', [
        h.all('intro-bio-core', 'BIOL 20A and BIOE 20B', 'Introductory Biology', ['BIOL 20A', 'BIOE 20B']),
        h.take('intro-bio-lab', 'One introductory lab', 'One of these courses', codes(...INTRO_LAB)),
      ]),
      h.all('orgo', 'Organic Chemistry', 'Organic Chemistry', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L', 'CHEM 8M']),
      physics(h),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('bmb', 'Biochemistry and Molecular Biology', [
        h.all('bioc100', 'BIOC 100A, 100B, 100C', 'Biochemistry and Molecular Biology', ['BIOC 100A', 'BIOC 100B', 'BIOC 100C']),
        h.take('bmb-lab', 'One laboratory course', 'and one of these courses:', codes(...UD_LAB)),
      ]),
      h.take('genetics', 'Genetics: BIOL 105', 'Genetics', codes('BIOL 105')),
      h.take('euk', 'Eukaryotic Molecular Biology: BIOL 115', 'Eukaryotic Molecular Biology', codes('BIOL 115')),
      pchem(h),
      h.take('elective', 'One elective', 'Complete one course from the following list:', codes(...ELECTIVES)),
    ])

    const exitQ = 'One of the following laboratory courses (also satisfies the Disciplinary Communication (DC) and Senior Comprehensive Requirement for graduation):'
    const exit = h.take('exit-lab', 'Senior Exit Lab', exitQ, codes(...EXIT_LABS))
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in biochemistry and molecular biology is satisfied by completing one of the Senior Exit Lab options.', codes(...EXIT_LABS), {
      exclusive: false,
      notes: ['The DC requirement must be satisfied at UC Santa Cruz.'],
    })
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', 'Students must satisfy the senior comprehensive requirement by receiving a passing letter grade in any of the Senior Exit Lab options.', codes(...EXIT_LABS), { exclusive: false })
    return [lower, upper, exit, dc, comprehensive]
  },
})

/** CHEM 163A + 163B, or BIOC 163A + 163B; a mixed pair is cannot-check. */
function pchem(h: HarnessContext): Node {
  const quote = ['Physical Chemistry', Q_PCHEM]
  const chemA = h.taken(codes('CHEM 163A'))[0], chemB = h.taken(codes('CHEM 163B'))[0]
  const biocA = h.taken(codes('BIOC 163A'))[0], biocB = h.taken(codes('BIOC 163B'))[0]
  const fullChem = chemA && chemB, fullBioc = biocA && biocB
  if (!fullChem && !fullBioc && (chemA || biocA) && (chemB || biocB))
    return h.cannotCheck('pchem', 'Physical Chemistry', quote, 'You mixed the CHEM 163 and BIOC 163 series; the page allows substituting BIOC 163A and BIOC 163B — confirm a mixed pair with an advisor.', {
      used: [chemA ?? biocA, chemB ?? biocB],
    })
  return h.options('pchem', 'Physical Chemistry: CHEM 163A+163B (or BIOC 163A+163B)', quote, [['CHEM 163A', 'CHEM 163B'], ['BIOC 163A', 'BIOC 163B']])
}

/** CHEM 3A–3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['General Chemistry', Q_CHEM_NOTE]
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
    return h.cannotCheck('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX],
      'You combined the PHYS 5 and PHYS 6 series: confirm with a Chemistry & Biochemistry advisor that the Physics Transition policies are satisfied.', { used: got as Enrollment[] })
  return h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX], [
    ['PHYS 5A', 'PHYS 5B', 'PHYS 5C', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N'],
    ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L', 'PHYS 6M', 'PHYS 6N'],
  ])
}
