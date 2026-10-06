// Agroecology B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/agroecology-ba.md
//
// Unusual bits handled in code below:
//  - Physical science: ENVS 23, or CHEM 3A + 3B (+ CHEM 3BL when 3B was taken
//    before fall 2026), or the CHEM 4A/4AL/4B/4BL series.
//  - Math: one course, or an AP Calculus / ALEKS score (attestation).
//  - Practicum + four electives are ONE allocation so that "ENVS 133 and ENVS
//    133B may not both be counted toward the major" holds across both lists
//    (every practicum option is also on the elective list).
//  - DC (ENVS 100/100L + one senior course) overlays the courses used for the
//    upper-division core and the comprehensive.
import { canon, codes, defineHarness, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const MATH = ['AM 3', 'AM 11A', 'MATH 3', 'MATH 11A', 'MATH 16A', 'MATH 19A']
const SOC = ['ANTH 2', 'SOCY 1', 'SOCY 10', 'SOCY 15', 'ENVS 26']
const PRACTICUM = ['ENVS 130C', 'ENVS 133', 'ENVS 133B', 'ENVS 135']
// Elective list in page order (cross-listed partners in [/X] added after their ENVS code).
const ELECTIVES = [
  'ENVS 108', 'ENVS 130C', 'ENVS 131', 'ENVS 133', 'ENVS 133B', 'ENVS 135', 'ENVS 142', 'ENVS 143',
  'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163', 'ENVS 164', 'ENVS 165', 'LGST 165A', 'ENVS 166',
  'ENVS 168', 'ENVS 169', 'ENVS 170', 'ENVS 183A', 'ENVS 195A', 'BIOE 118', 'BIOE 145', 'CMMU 149',
  'CMMU 186',
]
// "Associated labs are required only when required by the lecture." In the
// catalog these labs require their lecture, not the reverse: a lab taken is
// absorbed into its lecture's unit and never counts alone.
const ELECTIVE_LABS: [string, string][] = [
  ['ENVS 108', 'ENVS 108L'],
  ['ENVS 162', 'ENVS 162L'],
  ['ENVS 163', 'ENVS 163L'],
]
const SENIOR = ['ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'ENVS 196G']

const Q_CHEM_NOTE =
  'CHEM 3B taken fall 2026 or later will satisfy this requirement as it is inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL.'
const Q_MATH_NOTE =
  'May also be satisfied with a score of 3 or higher on the AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement Exam.'

export default defineHarness({
  program: 'agroecology-ba',
  edition: '2026-27',
  title: 'Agroecology B.A.',
  attestations: [
    {
      id: 'math-exam',
      label: 'AP Calculus exam score of 3+ or ALEKS Math Placement score of 300+',
      quote: Q_MATH_NOTE,
      aliases: ['aleks', 'ap calculus', 'math placement'],
    },
  ],
  coverage: {
    unknownOk: {
      LGST130B: 'cross-listed partner of ENVS 130B ([/LGST 130B] in the source); the catalog files it under ENVS',
      LGST165A: 'cross-listed partner of ENVS 165 ([/LGST 165A] in the source); the catalog files it under ENVS',
    },
  },
  notes: [
    'No letter-grade policy for the major, except that the senior comprehensive course must be taken for a letter grade.',
    'Continuing students must complete all lower-division requirements before taking ENVS 100 and ENVS 100L.',
    'One of the four upper-division electives may be substituted by petition (another ENVS 104–179 course, a relevant SOCY/LALS/ANTH course, or a study abroad / field study course). Add an approved substitute as a planned course only once the petition is approved; the app counts only the listed electives.',
    'The internship/independent study must be on a topic related to agroecology, aquaculture, or sustainable food systems, and the comprehensive topic must be relevant to agroecology — the app cannot see topics.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy, except that the course(s) taken to fulfill the senior comprehensive requirement must be taken for a letter Grade."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      physicalScience(h),
      h.take('ecology', 'Ecology', 'Plus one of the following courses:', codes('ENVS 24', 'BIOE 20C')),
      h.all('envs-core', 'ENVS 25 and ENVS 80F', 'Plus both of the following:', ['ENVS 25', 'ENVS 80F']),
      math(h),
      h.options('stats', 'Statistics series', 'Plus one of these statistics series:', [
        ['STAT 7', 'STAT 7L'],
        ['STAT 17', 'STAT 17L'],
      ]),
      h.take('social', 'Social science', 'Plus one of the following courses:', codes(...SOC)),
    ], { notes: ['Continuing students must complete all lower-division course requirements before taking ENVS 100 and ENVS 100L.'] })

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['ENVS 100', 'ENVS 100L', 'ENVS 130A', 'ENVS 130L']),
      // ENVS 130B [/LGST 130B]: either code is the same course.
      h.take('envs130b', 'ENVS 130B (or LGST 130B)', 'All of the following courses:', codes('ENVS 130B', 'LGST 130B')),
      h.take(
        'practicum-electives',
        'One practicum course plus four agroecology electives',
        [
          'Plus one of the following courses:',
          'Students take four courses from the following list. These may not include any courses used to fulfill the requirements listed above.',
          'Lecture/lab combinations count as one course. Associated labs are required only when required by the lecture.',
          'Students may take ENVS 183A or ENVS 195A, but not both. ENVS 133 and ENVS 133B may not both be counted toward the major.',
        ],
        codes(...ELECTIVES),
        {
          n: 5,
          labs: { pairs: ELECTIVE_LABS, mode: 'merge' },
          atLeast: [{ set: codes(...PRACTICUM), n: 1, label: 'one of ENVS 130C, 133, 133B, 135 (practicum requirement)' }],
          atMost: [
            { set: codes('ENVS 183A', 'ENVS 195A'), n: 1, label: 'ENVS 183A or ENVS 195A, but not both' },
            { set: codes('ENVS 133', 'ENVS 133B'), n: 1, label: 'ENVS 133 and ENVS 133B may not both count' },
          ],
          notes: [
            'Five courses in all: one of ENVS 130C, 133, 133B or 135, plus four more from the elective list (the practicum options are on that list too).',
            'Each course counts once (repeating ENVS 133 is not counted twice); ask an advisor if you plan to repeat a practicum.',
            'If students wish to petition to substitute a course not on the agroecology elective list, contact envsadvi@ucsc.edu.',
          ],
        },
      ),
    ])

    const internship = h.take(
      'internship',
      'Required internship or independent study',
      'Complete one of the following in a topic related to agroecology, aquaculture, or sustainable food systems:',
      codes('ENVS 83', 'ENVS 84', 'ENVS 99F', 'ENVS 183', 'ENVS 199F'),
      { notes: ['The topic must relate to agroecology, aquaculture, or sustainable food systems.'] },
    )

    // DC: overlay on ENVS 100/100L (core) and the senior course (comprehensive).
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.all('dc-100', 'ENVS 100 and ENVS 100L', 'The DC requirement in agroecology is satisfied by completing:', ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
      h.take('dc-senior', 'One senior course', 'Plus one of the following:', codes(...SENIOR), { exclusive: false }),
    ], { quote: 'The DC requirement in agroecology is satisfied by completing:' })

    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive Requirement (letter grade)',
      [
        'The senior comprehensive may be satisfied by completing one of the options listed below. All courses used to satisfy the senior comprehensive requirement must be taken for a letter grade. The topic engaged in the senior comprehensive courses must be relevant to the field of agroecology.',
        'Plus one of the following:',
      ],
      codes(...SENIOR),
      {
        policy: { letter: true },
        notes: [
          'Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor (by arrangement; not tracked here).',
          'ENVS 183B and ENVS 195B are usually taken after successfully completing ENVS 183A and ENVS 195A respectively.',
        ],
      },
    )
    return [lower, upper, internship, dc, comprehensive]
  },
})

/** ENVS 23, or CHEM 3A + 3B (+ 3BL when 3B was taken before fall 2026), or CHEM 4A/4AL/4B/4BL. */
function physicalScience(h: HarnessContext): Node {
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const quote = ['One of the following options:', Q_CHEM_NOTE]
  const options = ['ENVS 23', 'CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].map(canon)
  const title = 'Physical science (ENVS 23 or general chemistry)'
  const envs23 = first('ENVS23')
  if (envs23) return h.node('phys-sci', title, quote, 'met', { used: [envs23], options })

  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const usedB = b.filter((x): x is Enrollment => !!x)
  if (usedB.length === 4) return h.node('phys-sci', title, quote, 'met', { used: usedB, options })

  const a3 = first('CHEM3A')
  const b3 = first('CHEM3B')
  const lab = first('CHEM3BL')
  const missingA = [a3 ? null : 'CHEM 3A', b3 ? null : 'CHEM 3B'].filter((x): x is string => !!x)
  let undated = false
  if (b3 && !lab) {
    if (b3.term == null) undated = true
    else if (Number(b3.term) < FALL_2026) missingA.push('CHEM 3BL')
  }
  const usedA = [a3, b3, lab].filter((x): x is Enrollment => !!x)
  if (!missingA.length && !undated) return h.node('phys-sci', title, quote, 'met', { used: usedA, options })
  if (!missingA.length && undated)
    return h.cannotCheck('phys-sci', title, quote, 'CHEM 3B has no term: if taken before fall 2026 you also need CHEM 3BL.', { used: usedA, options })
  const closerA = usedA.length / 2 >= usedB.length / 4
  return h.node('phys-sci', title, quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: closerA && usedA.length
      ? `Still need ${missingA.join(', ')} (or take ENVS 23)`
      : usedB.length
        ? `Still need ${['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i]).join(', ')} (or take ENVS 23)`
        : 'Take ENVS 23, or CHEM 3A + 3B, or CHEM 4A/4AL/4B/4BL',
  })
}

/** One math course, or an AP Calculus / ALEKS score. */
function math(h: HarnessContext): Node {
  const course = h.take('math-course', 'One math course', 'Plus one of the following courses:', codes(...MATH))
  return h.either('math', 'Mathematics', ['Plus one of the following courses:', Q_MATH_NOTE], [course, h.attest('math-exam')])
}
