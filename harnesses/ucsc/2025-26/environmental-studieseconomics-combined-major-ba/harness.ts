// Environmental Studies/Economics Combined Major B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/environmental-studieseconomics-combined-major-ba.md
//
// Notes on the model:
//  - No letter-grade policy except the comprehensive's ENVS exit option.
//  - Electives: three from the Economics Electives list, three ENVS 101-179
//    (>= 1 from the natural-sciences list, which also names the BIOE 151
//    supercourse courses — read as counting for the ENVS three).
//  - "Associated labs are required only when required by the lecture": per
//    the catalog ENVS 104A and ENVS 130A require concurrent 104L / 130L.
//  - Comprehensive = an ENVS exit option (exclusive, letter grade) AND the
//    economics comprehensive exam portions in ECON 100A and ECON 113 (an exam:
//    attestation, shown alongside the courses).
//  - DC is an overlay (it reuses ENVS 100/100L).
//  - 2025-26 vs 2026-27: chemistry is CHEM 3A + 3B + 3BL (no fall-2026 rule;
//    a CHEM 3B from fall 2026 on without 3BL is cannot-check); social list
//    adds BME 80G, PHIL 22/24/28; natural list adds BIOE 125, drops ENVS 142;
//    no ENVS 196G (DC or comprehensive).
import { canon, codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

// Cross-listed partners ("ECON 128 [/LGST 128]") are one course in the library.
const ECON_ELECTIVES = [
  'ECON 100B', 'ECON 100N', 'ECON 101', 'ECON 114', 'ECON 115', 'ECON 120', 'ECON 128', 'ECON 130',
  'ECON 131', 'ECON 133', 'ECON 135', 'ECON 136', 'ECON 138', 'ECON 139A', 'ECON 139B', 'ECON 140',
  'ECON 141', 'ECON 142', 'ECON 150', 'ECON 156', 'ECON 159', 'ECON 160A', 'ECON 160B', 'ECON 161A',
  'ECON 162', 'ECON 165', 'ECON 169', 'ECON 170', 'ECON 175', 'ECON 180', 'ECON 183',
]
const NATURAL = [
  'BIOE 125', 'ENVS 104A', 'ENVS 106A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'BIOE 151A',
  'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'ENVS 120', 'ENVS 122', 'ENVS 123', 'ENVS 130A', 'ENVS 130C', 'ENVS 131',
  'ENVS 133', 'ENVS 135', 'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163', 'ENVS 164',
  'ENVS 166', 'ENVS 167', 'ENVS 168', 'ENVS 169', 'ENVS 170',
]
// Lecture/lab pairs (labs on the natural-science list follow their lecture).
const ENVS_PAIRS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 115A', 'ENVS 115L'],
  ['ENVS 130A', 'ENVS 130L'], ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]
// Catalog: "Concurrent enrollment in ENVS 104L is required." / "Concurrent enrollment in ENVS 130L ..."
const LAB_REQUIRED: [string, string][] = [['ENVS104A', 'ENVS104L'], ['ENVS130A', 'ENVS130L']]
function requiredLabs(chosen: Enrollment[]): string | null {
  for (const [lec, lab] of LAB_REQUIRED)
    if (chosen.some((e) => e.code === lec) && !chosen.some((e) => e.code === lab))
      return `${lec.replace('ENVS', 'ENVS ')} counts only with its required lab ${lab.replace('ENVS', 'ENVS ')}`
  return null
}

const Q_LABS = 'Lecture/lab combinations count as one course. Associated labs are required only when required by the lecture.'

export default defineHarness({
  program: 'environmental-studieseconomics-combined-major-ba',
  edition: '2025-26',
  title: 'Environmental Studies/Economics Combined Major B.A.',
  attestations: [
    {
      id: 'econ-comp-exam',
      label: 'Passed the economics comprehensive examination portions in ECON 100A and ECON 113',
      quote: 'Pass those portions of the economics comprehensive examination administered in ECON 100A and ECON 113.',
      aliases: ['comprehensive exam', 'economics comprehensive', 'comp exam'],
    },
  ],
  notes: [
    'No letter-grade policy except the senior comprehensive (ENVS exit option), which must be taken for a letter grade.',
    'Upper-division electives cannot be substituted (including courses taken abroad).',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy, except that the comprehensive (senior exit) requirement must be taken for a letter grade."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('ld-core', 'ECON 1, ECON 2, ENVS 25, STAT 17/17L', 'All of the following courses:', ['ECON 1', 'ECON 2', 'ENVS 25', 'STAT 17', 'STAT 17L']),
      chemistry(h),
      h.take('ecology', 'ENVS 24 or BIOE 20C', 'Plus one of the following courses:', codes('ENVS 24', 'BIOE 20C')),
      h.options(
        'calc',
        'Calculus series',
        'Plus one of the following calculus series:',
        [['AM 11A', 'AM 11B'], ['MATH 11A', 'AM 11B'], ['MATH 19A', 'MATH 19B', 'MATH 23A'], ['MATH 11A', 'MATH 11B', 'MATH 22']],
        { notes: ['AM 11A and AM 11B are encouraged for this program; the other options also suffice.'] },
      ),
      h.take('social', 'Social science course', 'Plus one of the following courses:', codes('ANTH 2', 'BME 80G', 'ENVS 26', 'PHIL 22', 'PHIL 24', 'PHIL 28', 'SOCY 1', 'SOCY 10', 'SOCY 15')),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('micro', 'ECON 100A or ECON 100M', 'One of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.all('ud-core', 'ECON 113, ENVS 100 and ENVS 100L', 'Plus all of the following courses:', ['ECON 113', 'ENVS 100', 'ENVS 100L']),
    ])

    const electives = h.group('electives', 'Electives (six)', [
      h.take('econ-electives', 'Three economics electives', 'Three courses from the Economics Electives list below', codes(...ECON_ELECTIVES), { n: 3 }),
      h.take(
        'envs-electives',
        'Three ENVS electives (ENVS 101-179)',
        [
          'Three courses from ENVS 101-179. At least one course must be from the list of environmental studies electives in the natural sciences list below.',
          Q_LABS,
          'None of the three environmental studies upper-division courses can be an environmental studies internship, individual study or substitution course.',
        ],
        range('ENVS', 101, 179).minCredits(5).or(codes(...NATURAL)),
        {
          n: 3,
          labs: { pairs: ENVS_PAIRS, mode: 'merge' },
          atLeast: [{ set: codes(...NATURAL), n: 1, label: 'at least one natural-science ENVS elective' }],
          check: requiredLabs,
          pool: 'ENVS 101–179 (5+ credits; ENVS 104A with 104L), or a course on the natural-sciences list',
        },
      ),
    ], { quote: 'Six upper-division elective courses as follows:' })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.all('dc-envs100', 'ENVS 100 and ENVS 100L', 'The DC requirement for the environmental studies/economics combined major is satisfied by completing:', ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
      h.take('dc-course', 'One DC course', 'Plus one of the following:', codes('BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196'), { exclusive: false }),
    ], { quote: 'The DC requirement for the environmental studies/economics combined major is satisfied by completing:' })

    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [
      h.options(
        'comp-envs',
        'Environmental studies senior exit option (letter grade)',
        'One of the senior exit options for environmental studies B.A. (see options below). All courses used to satisfy the senior comprehensive requirement must be taken for a letter grade.',
        [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196']],
        {
          policy: { letter: true },
          notes: ['The senior thesis and senior internship options require applying to a faculty mentor early and at least a two-quarter commitment.'],
        },
      ),
      h.attest('econ-comp-exam'),
    ], { quote: 'Students in ENVS/ECON satisfy the senior comprehensive requirement by completing both of the following:' })

    return [lower, upper, electives, dc, comprehensive]
  },
})

/** ENVS 23, or CHEM 3A + 3B + 3BL, or CHEM 4A/4AL/4B/4BL. */
function chemistry(h: HarnessContext): Node {
  const quote = 'Plus one of the following courses:'
  const title = 'Physical science / chemistry'
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const options = [canon('ENVS 23'), 'CHEM3A', 'CHEM3B', 'CHEM3BL', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  const envs23 = first(canon('ENVS 23'))
  if (envs23) return h.node('chem', title, quote, 'met', { used: [envs23], options })
  const a = [first('CHEM3A'), first('CHEM3B'), first('CHEM3BL')]
  const missingA = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL'].filter((_, i) => !a[i])
  const usedA = a.filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  if (missingA.length === 0) return h.node('chem', title, quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('chem', title, quote, 'met', { used: usedB, options })
  // The 2025-26 page requires CHEM 3BL; a CHEM 3B from fall 2026 on includes
  // the lab (2026-27 catalog), a case this page does not address.
  const b3 = a[1]
  if (missingA.length === 1 && missingA[0] === 'CHEM 3BL' && b3?.term != null && Number(b3.term) >= FALL_2026)
    return h.cannotCheck('chem', title, quote, 'CHEM 3BL not in the plan: CHEM 3B taken fall 2026 or later includes the lab (2026-27 catalog), which this 2025-26 page does not address — confirm with an adviser.', { used: usedA, options })
  const closerA = usedA.length / 3 >= usedB.length / 4
  return h.node('chem', title, quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Take ENVS 23, or still need ${(closerA ? missingA : missingB).join(', ')}`,
  })
}
