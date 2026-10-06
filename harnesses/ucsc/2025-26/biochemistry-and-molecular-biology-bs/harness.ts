// Biochemistry and Molecular Biology B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/biochemistry-and-molecular-biology-bs.md
//
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A/3B/3C + 3BL/3CL, or CHEM 4A/4B/4AL/4BL
//    (2025-26 lists the labs; no fall-2026 rule).
//  - Calculus: MATH 11A+11B or 19A+19B. The 2025-26 page has no note on
//    mixing the series (2026-27 defers to the Mathematics Department's
//    policy); a complete mixed pair is cannot-check (rule 3), not unmet.
//  - Physics: PHYS 5 or PHYS 6 series with labs; a complete mixed set is
//    cannot-check (it must follow the external Physics Transition policies).
//  - Physical chemistry: BIOC 163A+163B, or "CHEM 163A and CHEM 163B" (the
//    page does not say the two series may be mixed, unlike chemistry-ba) —
//    a mixed pair is cannot-check, not unmet.
//  - Senior Exit Lab: its own requirement; DC and comprehensive are overlays
//    on it.
import { codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s), while following the'
const Q_PCHEM = 'Students may substitute CHEM 163A and CHEM 163B for this requirement.'

const INTRO_LAB = ['BIOL 20L', 'BIOL 102J', 'BIOL 107J', 'CHEM 160J', 'CHEM 161J']
const UD_LAB = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']
const ELECTIVES = [
  'BIOL 110', 'BIOL 118', 'BME 110', 'BME 128', 'BME 130', 'BME 132', 'BME 160', 'CHEM 110', 'CHEM 169',
  'CHEM 171', 'STAT 131',
]
const EXIT_LABS = [
  // 2025-26: no BIOL 104B / BIOL 105B on this list
  'BIOC 110L', 'BIOL 100L', 'BIOL 103L', 'BIOL 105L', 'BIOL 106L', 'BIOL 108L',
  'BIOL 109L', 'BIOL 115L', 'BIOL 121L', 'BIOL 122L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L',
]

export default defineHarness({
  program: 'biochemistry-and-molecular-biology-bs',
  edition: '2025-26',
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
      h.options('gen-chem', 'General Chemistry', 'General Chemistry', [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3C', 'CHEM 3BL', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4B', 'CHEM 4AL', 'CHEM 4BL'],
      ]),
      calculus(h),
      h.options('statistics', 'Statistics: STAT 5, or STAT 7 and 7L', 'Statistics', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.group('intro-bio', 'Introductory Biology', [
        h.all('intro-bio-core', 'BIOL 20A and BIOE 20B', 'Intro Biology', ['BIOL 20A', 'BIOE 20B']),
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
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in biochemistry and molecular biology is satisfied by completing one of the Senior Exit Lab options listed in the previous section.', codes(...EXIT_LABS), {
      exclusive: false,
      notes: ['The DC requirement must be satisfied at UC Santa Cruz.'],
    })
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', 'Students must satisfy the senior comprehensive requirement by receiving a passing letter grade in any of the Senior Exit Lab options listed in the previous section.', codes(...EXIT_LABS), { exclusive: false })
    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'Students must complete each of the following qualification courses, or their equivalents, by their campus-established declaration deadline with a grade of C (2.0) or better and with a cumulative grade point average (GPA) of 2.50 or greater:',
      'General chemistry, BIOL 20A, CHEM 8A/8B and MATH 11A or 19A with a 2.50 GPA gate declaration; not a graduation requirement.',
    )
    return [qualification, lower, upper, exit, dc, comprehensive]
  },
})

/** MATH 11A+11B or 19A+19B; a complete mixed pair is cannot-check (the 2025-26 page is silent on mixing). */
function calculus(h: HarnessContext): Node {
  const quote = 'Calculus'
  const a = h.taken(codes('MATH 11A', 'MATH 19A'))[0]
  const b = h.taken(codes('MATH 11B', 'MATH 19B'))[0]
  const pure = (n: string) => h.taken(codes(`MATH ${n}A`)).length && h.taken(codes(`MATH ${n}B`)).length
  if (a && b && !pure('11') && !pure('19'))
    return h.cannotCheck('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote,
      `You combined ${a.display} and ${b.display}: the 2025-26 page lists only MATH 11A+11B or MATH 19A+19B — confirm the mix with an advisor (Mathematics Department’s Calculus Series Transition Policy).`, { used: [a, b] })
  return h.options('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote, [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']])
}

/** BIOC 163A + 163B, or CHEM 163A + 163B; a mixed pair is cannot-check. */
function pchem(h: HarnessContext): Node {
  const quote = ['Physical Chemistry', Q_PCHEM]
  const chemA = h.taken(codes('CHEM 163A'))[0], chemB = h.taken(codes('CHEM 163B'))[0]
  const biocA = h.taken(codes('BIOC 163A'))[0], biocB = h.taken(codes('BIOC 163B'))[0]
  const fullChem = chemA && chemB, fullBioc = biocA && biocB
  if (!fullChem && !fullBioc && (chemA || biocA) && (chemB || biocB))
    return h.cannotCheck('pchem', 'Physical Chemistry', quote, 'You mixed the CHEM 163 and BIOC 163 series; the page allows substituting CHEM 163A and CHEM 163B — confirm a mixed pair with an advisor.', {
      used: [chemA ?? biocA, chemB ?? biocB],
    })
  return h.options('pchem', 'Physical Chemistry: BIOC 163A+163B (or CHEM 163A+163B)', quote, [['BIOC 163A', 'BIOC 163B'], ['CHEM 163A', 'CHEM 163B']])
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
