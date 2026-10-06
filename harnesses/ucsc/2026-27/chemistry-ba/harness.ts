// Chemistry B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/chemistry-ba.md
//
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A–3C (3B/3C taken before fall 2026 also need
//    CHEM 3BL/3CL) or CHEM 4A/4AL/4B/4BL.
//  - Calculus: MATH 11A+11B or 19A+19B; a complete mixed pair is
//    cannot-check (the page defers to the Mathematics Department's external
//    Calculus Series Transition Policy; rule 3: never met on a guess).
//  - Physics: PHYS 5 or PHYS 6 series with labs; a complete mixed set is
//    cannot-check ("should contact a ... advisor to make sure the Physics
//    Transition policies will be satisfied").
//  - CHEM 8M ↔ 8N and CHEM 110L ↔ 110N (honors labs, by invitation).
//  - Physical chemistry: CHEM or BIOC 163A, CHEM or BIOC 163B (mixing
//    explicitly allowed), CHEM 164.
//  - Advanced lab: its own requirement (exclusive), so CHEM 124 cannot be both
//    the advanced lab and an elective. DC/comprehensive (CHEM 151L + one
//    listed lab) are overlays reusing courses counted elsewhere.
//  - Electives: two; not both BIOC 100A and CHEM 103. A chemistry graduate
//    course "with the permission of the instructor and department" is asked
//    as an attestation only when the allocator needed it (§1a petition).
//  - CHEM 8N / 110N are accepted without an attestation: enrolling in the
//    honors lab is itself "by permission and invitation of the instructor".
import { codes, defineHarness, policyFailure, subject } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s), but should contact a Chemistry & Biochemistry Department advisor to make sure the Physics Transition policies will be satisfied.'

const Q_CALC_MIX = 'Students may combine the MATH 11 and MATH 19 series in accordance with the'
const Q_GRAD = 'Students may also satisfy the elective requirement by completing a chemistry graduate course with the permission of the instructor and department.'
const GRAD = subject('CHEM', 'graduate')

const ADV_LABS = ['CHEM 124', 'CHEM 146A', 'CHEM 146B', 'CHEM 146C', 'CHEM 160L', 'CHEM 161L', 'CHEM 186L']
const ELECTIVES = [
  'BIOC 100A', 'CHEM 103', 'CHEM 122', 'CHEM 124', 'CHEM 143', 'CHEM 144', 'CHEM 151B', 'CHEM 156C',
  'CHEM 163C', 'CHEM 169', 'CHEM 171', 'METX 101', 'OCEA 120', 'OCEA 121', 'PHYS 156', 'PHYS 161', 'PHYS 180',
]

export default defineHarness({
  program: 'chemistry-ba',
  edition: '2026-27',
  title: 'Chemistry B.A.',
  attestations: [
    { id: 'grad-elective', label: 'Instructor and department permitted a chemistry graduate course as an elective', quote: Q_GRAD, aliases: ['graduate course', 'grad elective', 'department permission'] },
  ],
  notes: [
    'All courses used for the major must be taken for a letter grade, with a grade of C or higher.',
    'At least half of the upper-division courses (CHEM 100–CHEM 199) must be taken through the chemistry program at UC Santa Cruz (the plan does not record where a course was taken).',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in any of the Chemistry & Biochemistry
    // Department's majors must be taken for a letter grade. Additionally, letter grades of C
    // or higher must be attained in all courses ..."
    h.policy = { letter: true, min: 'C' }

    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      calculus(h),
      h.options('multivariable', 'Multivariable Calculus', 'Multivariable Calculus:', [['MATH 22'], ['MATH 23A', 'MATH 23B'], ['AM 30']]),
      physics(h),
      h.group('orgo', 'Organic Chemistry', [
        h.all('orgo-core', 'CHEM 8A, 8B, 8L', 'Organic Chemistry:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L']),
        h.take('chem8m', 'CHEM 8M (or honors CHEM 8N)', ['Organic Chemistry:', 'By permission and invitation of the instructor, students may substituteCHEM 8M with CHEM 8N'], codes('CHEM 8M', 'CHEM 8N')),
      ]),
    ])

    const pq = ['Physical Chemistry:', 'Students may substitute CHEM 163A and CHEM 163B with BIOC 163A and BIOC 163B, respectively (if offered).']
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('orgo-int', 'Intermediate Organic Chemistry', [
        h.take('chem110', 'CHEM 110', 'Intermediate Organic Chemistry:', codes('CHEM 110')),
        h.take('chem110l', 'CHEM 110L (or honors CHEM 110N)', ['Intermediate Organic Chemistry:', 'students may substituteCHEM 110L with CHEM 110N'], codes('CHEM 110L', 'CHEM 110N')),
      ]),
      h.all('inorganic', 'Inorganic Chemistry: CHEM 151A and 151L', 'Inorganic Chemistry:', ['CHEM 151A', 'CHEM 151L']),
      h.group('pchem', 'Physical Chemistry', [
        h.take('pchem-a', 'CHEM 163A (or BIOC 163A)', pq, codes('CHEM 163A', 'BIOC 163A')),
        h.take('pchem-b', 'CHEM 163B (or BIOC 163B)', [...pq, 'A student may combine the CHEM 163 series with the BIOC 163 series to complete this portion of the major requirement(s).'], codes('CHEM 163B', 'BIOC 163B')),
        h.take('chem164', 'CHEM 164', pq[0], codes('CHEM 164')),
      ]),
      h.take('adv-lab', 'One advanced laboratory course', 'One of the following advanced laboratory courses:', codes(...ADV_LABS)),
    ])

    const LISTED = codes(...ELECTIVES)
    const electives = h.take('electives', 'Two electives', ['At least two from the following:', 'Students cannot receive elective credit toward the major for both BIOC 100A and CHEM 103.'], LISTED.or(GRAD), {
      n: 2,
      atMost: [{ set: codes('BIOC 100A', 'CHEM 103'), n: 1, label: 'BIOC 100A / CHEM 103' }],
      prefer: (c) => (LISTED.has(c, h.catalog) ? 0 : 1),
      pool: 'the listed electives; or a chemistry graduate course with permission',
    })
    // Every exclusive slot exists: allocate, then ask for permission only if a graduate course was needed.
    h.solve()
    const grad = (electives.used ?? []).filter((e) => !LISTED.has(e.code, h.catalog))
    const electivesNode = grad.length
      ? h.group('electives-permitted', 'Two electives', [electives, h.attest('grad-elective', `Permission for ${grad.map((e) => e.display).join(', ')} as an elective`)], { quote: Q_GRAD })
      : electives

    const pair = (id: string, title: string, quote: string) =>
      h.group(id, title, [
        h.take(`${id}-151l`, 'CHEM 151L', quote, codes('CHEM 151L'), { exclusive: false }),
        h.take(`${id}-lab`, 'One advanced laboratory', 'Plus one of the following courses:', codes(...ADV_LABS), { exclusive: false }),
      ], { quote })
    const dc = pair('dc', 'Disciplinary Communication (DC)', 'The DC Requirement for the bachelor of arts degree in chemistry is satisfied by completing the following.')
    const comprehensive = pair('comprehensive', 'Comprehensive Requirement', 'For the chemistry B.A., this requirement can be satisfied by receiving a passing grade in the upper-division labs listed below.')
    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'Students must complete each of the following qualification courses, or their equivalents, by their campus-established declaration deadline with a grade of C or better and with a cumulative grade point average (GPA) of 2.50 or greater:',
      'General chemistry, calculus and multivariable calculus with a 2.50 GPA gate declaration; not a graduation requirement.',
    )
    return [qualification, lower, upper, electivesNode, dc, comprehensive]
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

/** MATH 11A+11B or 19A+19B; a complete mixed pair is cannot-check (external transition policy). */
function calculus(h: HarnessContext): Node {
  const quote = ['Choose one of the following options:', Q_CALC_MIX]
  const a = h.taken(codes('MATH 11A', 'MATH 19A'))[0]
  const b = h.taken(codes('MATH 11B', 'MATH 19B'))[0]
  const pure = (n: string) => h.taken(codes(`MATH ${n}A`)).length && h.taken(codes(`MATH ${n}B`)).length
  if (a && b && !pure('11') && !pure('19'))
    return h.cannotCheck('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote,
      `You combined ${a.display} and ${b.display}: check the Mathematics Department’s Calculus Series Transition Policy.`, { used: [a, b] })
  return h.options('calculus', 'Calculus: MATH 11A+11B or 19A+19B', quote, [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']])
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
