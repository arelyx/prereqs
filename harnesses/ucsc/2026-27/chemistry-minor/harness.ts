// Chemistry Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/chemistry-minor.md
//
// Handled in code below:
//  - Letter grade AND C or better in every course used.
//  - General chemistry: CHEM 3A–3C or CHEM 4A/4B/4AL/4BL (this page states no
//    CHEM 3BL/3CL rule, unlike the majors).
//  - Physics: PHYS 5 or PHYS 6 series with labs; a complete mixed set is
//    cannot-check (advisor must confirm the Physics Transition policies).
//  - "Plus two of" CHEM 103 / 110 / 151A: the BIOC 100A–C series fulfils
//    CHEM 103 plus one elective (composite unit, then one elective fewer).
//    CHEM 110 / 151A are preferred so CHEM 103 is used only when needed (the
//    BIOC 100A exclusion depends on whether CHEM 103 is counted).
//  - Electives: two from the list; BIOC 100C also counts once CHEM 103 is
//    finished; not both BIOC 100A and CHEM 103; not both BIOC 163B and CHEM 163B.
import { codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const Q_PHYS_MIX =
  'A student may combine the PHYS 5 series with the PHYS 6 series to complete this portion of the major requirement(s) but should contact a Chemistry and Biochemistry Department advisor to make sure the Physics Transition policies will be satisfied.'
const Q_SERIES = 'Completing the series will fulfill the requirement of CHEM 103 (Biochemistry) plus fulfill one elective.'
const Q_100C = 'Students who have finished CHEM 103 can, with instructor permission, enroll in BIOC 100C without taking BIOC 100A and BIOC 100B. In this case, BIOC 100C may be used as an elective.'
const Q_NOT_BOTH = 'Students cannot receive elective credit toward the minor for 1) both BIOC 100A and CHEM 103; 2) both BIOC 163B and CHEM 163B.'

const ELECTIVES = [
  'BIOC 100A', 'BIOC 100B', 'BIOC 163B', 'CHEM 122', 'CHEM 143', 'CHEM 144', 'CHEM 151B', 'CHEM 156C',
  'CHEM 163B', 'CHEM 163C', 'CHEM 169', 'CHEM 171', 'METX 101', 'OCEA 120', 'OCEA 121', 'PHYS 180',
]
const SERIES = codes('BIOC 100A', 'BIOC 100B', 'BIOC 100C')

export default defineHarness({
  program: 'chemistry-minor',
  edition: '2026-27',
  title: 'Chemistry Minor',
  notes: [
    'All courses used for the minor must be taken for a letter grade, with a grade of C or higher.',
    'A student cannot double major/minor in chemistry and any other major/minor offered by the Chemistry and Biochemistry Department.',
    'A chemistry graduate course may satisfy an elective with permission of the instructor and department (add it once approved).',
  ],
  evaluate(h) {
    // "All courses used to satisfy degree requirements in the chemistry minor must be taken for a
    // letter grade. Additionally, letter grades of C or higher must be attained in all courses ..."
    h.policy = { letter: true, min: 'C' }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('gen-chem', 'General chemistry', 'Chemistry', [['CHEM 3A', 'CHEM 3B', 'CHEM 3C'], ['CHEM 4A', 'CHEM 4B', 'CHEM 4AL', 'CHEM 4BL']]),
      h.all('orgo', 'Organic chemistry', 'and these courses:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L', 'CHEM 8M']),
      h.options(
        'calculus',
        'Calculus: MATH 11A+11B or 19A+19B',
        ['One of the following options', 'A student may combine the MATH 11 series with the MATH 19 series to complete this portion of the major requirement(s)'],
        [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B'], ['MATH 19A', 'MATH 11B'], ['MATH 11A', 'MATH 19B']],
        { notes: ['Mixed MATH 11/19 sequences must follow the Mathematics Department’s Calculus Series Transition Policy (external).'] },
      ),
      h.options('multivariable', 'Multivariable calculus', 'Plus one of the following options', [['MATH 22'], ['MATH 23A', 'MATH 23B'], ['AM 30']]),
      physics(h),
    ])

    const chem103 = h.taken(codes('CHEM 103')).length > 0
    const twoOf = h.take('two-of', 'Two of CHEM 103, CHEM 110, CHEM 151A', ['Plus two of the following courses', Q_SERIES], codes('CHEM 103', 'CHEM 110', 'CHEM 151A'), {
      n: 2,
      prefer: (c) => (c === 'CHEM103' ? 1 : c === 'BIOC100A' ? 2 : 0),
      composite: {
        eligible: SERIES,
        build: (avail: Enrollment[]) => {
          const unit = ['BIOC100A', 'BIOC100B', 'BIOC100C'].map((c) => avail.find((e) => e.code === c))
          return unit.every(Boolean) ? [unit as Enrollment[]] : []
        },
      },
    })
    const upperCore = h.group('upper', 'Upper-Division Courses', [
      h.take('chem163a', 'CHEM 163A (or BIOC 163A)', ['This course', 'Students may substitute BIOC 163A for CHEM 163A.'], codes('CHEM 163A', 'BIOC 163A')),
      twoOf,
    ])
    h.solve()
    const series = !!twoOf.used?.some((e) => e.code === 'BIOC100C')
    const counted103 = !!twoOf.used?.some((e) => e.code === 'CHEM103')
    const set = codes(...ELECTIVES, ...(chem103 ? ['BIOC 100C'] : [])).except(counted103 ? ['BIOC 100A'] : [])
    const electives = h.take(
      'electives',
      series ? 'Electives (one more; the BIOC 100A–C series counts as one)' : 'Two electives',
      ['Plus two chemistry upper-division electives from the following:', Q_NOT_BOTH, ...(series ? [Q_SERIES] : []), ...(chem103 ? [Q_100C] : [])],
      set,
      {
        n: series ? 1 : 2,
        atMost: [{ set: codes('BIOC 163B', 'CHEM 163B'), n: 1, label: 'BIOC 163B / CHEM 163B' }],
        notes: counted103 ? ['BIOC 100A cannot count as an elective because CHEM 103 is counted above.'] : undefined,
      },
    )
    return [lower, upperCore, electives]
  },
})

/** PHYS 5A–5C + 5L/5M/5N or PHYS 6A–6C + 6L/6M/6N; a complete mixed set is cannot-check. */
function physics(h: HarnessContext): Node {
  const slots = ['A', 'B', 'C', 'L', 'M', 'N']
  const got = slots.map((s) => h.taken(codes(`PHYS 5${s}`, `PHYS 6${s}`))[0])
  const five = slots.every((s) => h.taken(codes(`PHYS 5${s}`)).length)
  const six = slots.every((s) => h.taken(codes(`PHYS 6${s}`)).length)
  if (!five && !six && got.every(Boolean))
    return h.cannotCheck('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX],
      'You combined the PHYS 5 and PHYS 6 series: confirm with a Chemistry and Biochemistry advisor that the Physics Transition policies are satisfied.', { used: got as Enrollment[] })
  return h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs', ['Physics', Q_PHYS_MIX], [
    ['PHYS 5A', 'PHYS 5B', 'PHYS 5C', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N'],
    ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L', 'PHYS 6M', 'PHYS 6N'],
  ])
}
