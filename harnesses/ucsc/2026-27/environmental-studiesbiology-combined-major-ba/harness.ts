// Environmental Studies/Biology Combined Major B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/environmental-studiesbiology-combined-major-ba.md
//
// Notes on the model:
//  - Every requirement is letter-graded.
//  - Electives: three ENVS 101-179 (>=1 social-science), one lab-based
//    elective (lab must be taken), two BIOE 107-188 / BIOL 100-140. "A single
//    course may not satisfy more than one requirement" → all exclusive,
//    including the comprehensive. DC is an overlay (it shares ENVS 100/100L).
//  - "Associated labs are required only when required by the lecture": the
//    catalog makes these lectures require concurrent enrollment in their lab
//    (LAB_REQUIRED below); other labs merge into their lecture when taken.
import { canon, codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

// Cross-listed partners ("ENVS 130B [/LGST 130B]") are one course in the library.
const SOCIAL = [
  'ENVS 110', 'ENVS 130B', 'ENVS 140', 'ENVS 141', 'ENVS 143', 'ENVS 144', 'ENVS 145', 'ENVS 147',
  'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 152', 'ENVS 154', 'ENVS 158', 'ENVS 165', 'ENVS 172',
  'ENVS 173', 'ENVS 174', 'ENVS 176', 'ENVS 178',
]

// Lab-based elective list: lectures (with their lab, which must be taken) and stand-alone labs.
const LAB_BASED = [
  'BIOE 112', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 124', 'BIOE 127', 'BIOE 128L',
  'BIOE 129', 'BIOE 131', 'BIOE 133', 'BIOE 134', 'BIOE 135', 'BIOE 137', 'BIOE 141L', 'BIOE 142L',
  'BIOE 145L', 'BIOE 150', 'BIOE 151B', 'BIOE 155', 'BIOE 158L', 'BIOE 159D', 'BIOE 161', 'BIOE 163',
  'BIOL 100', 'BIOL 109L', 'BIOL 115', 'BIOL 120', 'BIOL 121L', 'BIOL 186R', 'ENVS 104A', 'ENVS 106A',
  'ENVS 107A', 'ENVS 108', 'ENVS 130A', 'ENVS 162', 'ENVS 163', 'ENVS 167',
]
const LAB_BASED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 120', 'BIOE 120L'],
  ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'], ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
  ['BIOE 131', 'BIOE 131L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'], ['BIOE 135', 'BIOE 135L'],
  ['BIOE 137', 'BIOE 137L'], ['BIOE 150', 'BIOE 150L'], ['BIOE 155', 'BIOE 155L'], ['BIOE 161', 'BIOE 161L'],
  ['BIOE 163', 'BIOE 163L'], ['BIOL 100', 'BIOL 100L'], ['BIOL 115', 'BIOL 115L'], ['BIOL 120', 'BIOL 120L'],
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 130A', 'ENVS 130L'],
  ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]

const DC_LIST = [
  'BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'ENVS 196G', 'BIOE 108', 'BIOE 114',
  'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 127', 'BIOE 128L', 'BIOE 129', 'BIOE 137', 'BIOE 141L',
  'BIOE 145L', 'BIOE 150', 'BIOE 153C', 'BIOE 158L', 'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172',
]
// "Lecture/lab combinations count as one course." (labs listed after their lecture)
const DC_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 127', 'BIOE 127L'],
  ['BIOE 129', 'BIOE 129L'], ['BIOE 150', 'BIOE 150L'],
]

// Catalog: these lectures require concurrent enrollment in their lab.
const LAB_REQUIRED: Record<string, string> = Object.fromEntries(
  [
    ['ENVS 104A', 'ENVS 104L'], ['ENVS 130A', 'ENVS 130L'], ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'],
    ['BIOE 117', 'BIOE 117L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'],
    ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'], ['BIOE 135', 'BIOE 135L'],
    ['BIOE 137', 'BIOE 137L'], ['BIOE 150', 'BIOE 150L'], ['BIOE 163', 'BIOE 163L'],
  ].map(([a, b]) => [canon(a), canon(b)]),
)
function requiredLabs(chosen: Enrollment[]): string | null {
  for (const e of chosen) {
    const lab = LAB_REQUIRED[e.code]
    if (lab && !chosen.some((x) => x.code === lab)) return `${e.display} counts only with its required lab`
  }
  return null
}

const ENVS_PAIRS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 115A', 'ENVS 115L'],
  ['ENVS 130A', 'ENVS 130L'], ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_ELECTIVES = 'Students take six 5-credit or more upper-division electives as follows. A single course may not satisfy more than one requirement.'
const Q_MATH_NOTE = 'May also be satisfied with a score of 3 or higher on the AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement Exam.'
const MATH = codes('AM 3', 'AM 6', 'AM 11A', 'AM 11B', 'MATH 3', 'MATH 11A', 'MATH 16A', 'MATH 19A')
// "Students with advanced skills in one of the graduate focal areas may also
// take a graduate seminar by invitation from the instructor." — an ENVS
// graduate seminar, asked about only when no listed comprehensive option is met.
const Q_GRAD = 'Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor.'
const GRAD_SEMINAR = range('ENVS', 200, 296).where((c) => !/Laborator/i.test(c.title), 'not a laboratory')
const Q_LABS = 'Associated labs are required only when required by the lecture for the three ENVS and two EEB/MCD requirements.'

export default defineHarness({
  program: 'environmental-studiesbiology-combined-major-ba',
  edition: '2026-27',
  title: 'Environmental Studies/Biology Combined Major B.A.',
  attestations: [
    {
      id: 'math-placement',
      label: 'Scored 300 or higher on the ALEKS Math Placement Exam (in place of the math course)',
      quote: Q_MATH_NOTE,
      aliases: ['aleks', 'math placement', 'placement exam'],
    },
    {
      id: 'grad-seminar-invitation',
      label: 'Invited by the instructor to take a graduate seminar for the senior comprehensive',
      quote: Q_GRAD,
      aliases: ['graduate seminar', 'grad seminar'],
    },
  ],
  notes: [
    'All requirements for the combined major must be taken for a letter grade.',
    'ENVS upper-division electives cannot be substituted (including courses taken abroad); BIOE upper-division substitutions need approval from the Ecology and Evolutionary Biology Department.',
    'NRS/ENVS 188 or NRS/BIOL 188 (California Ecology and Conservation), taken spring 2023 or later, gives 1/2 DC credit — confirm with an ENVS advisor how to complete the other half.',
  ],
  evaluate(h) {
    // "All requirements for the environmental studies/biology combined major must be taken for a letter grade."
    h.policy = { letter: true }

    // §1a test-out: AP credit is a course in the plan; the ALEKS score is an
    // attestation offered only when no listed math course is in the plan.
    const math = h.take('math', 'Mathematics', ['Plus one of the following courses:', Q_MATH_NOTE], MATH, {
      notes: ['AP Calculus (score 3+): add the exam credit to your plan as the course it grants.'],
    })
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('ld-core', 'Biology and ENVS 25', 'All of the following courses:', ['BIOL 20A', 'BIOE 20B', 'BIOE 20C', 'ENVS 25']),
      h.take('social', 'Social science course', 'Plus one of the following courses:', codes('ANTH 2', 'ENVS 26', 'SOCY 1', 'SOCY 10', 'SOCY 15')),
      math,
      h.all('stats', 'STAT 7 and STAT 7L', 'Plus both of the following:', ['STAT 7', 'STAT 7L']),
      generalChem(h),
      h.options('physics', 'Physics', 'Plus one of the following physics options:', [['PHYS 1A'], ['PHYS 1B'], ['PHYS 6A', 'PHYS 6L'], ['PHYS 7A', 'PHYS 7L']]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'ENVS 100, ENVS 100L and BIOE 109', 'Students are required to complete the following upper-division courses:', ['ENVS 100', 'ENVS 100L', 'BIOE 109']),
      h.take('genetics', 'Genetics: BIOL 105 or BIOE 106', 'Students are required to complete the following upper-division courses:', codes('BIOL 105', 'BIOE 106')),
    ])

    const electives = h.group('electives', 'Electives (six)', [
      h.take(
        'envs-electives',
        'Three ENVS electives (ENVS 101-179)',
        [
          'Three electives from environmental studies (ENVS 101-179). At least one of these courses must be from the ENVS electives based in the social sciences list below.',
          Q_LABS,
          'None of the three environmental studies upper-division courses can be an environmental studies internship, individual study, or substitution course.',
        ],
        range('ENVS', 101, 179).minCredits(5).or(codes('ENVS 104A')),
        {
          n: 3,
          labs: { pairs: ENVS_PAIRS, mode: 'merge' },
          atLeast: [{ set: codes(...SOCIAL), n: 1, label: 'at least one social-science ENVS elective' }],
          check: requiredLabs,
          pool: 'ENVS 101–179 (5+ credits; ENVS 104A with 104L)',
        },
      ),
      h.take(
        'lab-elective',
        'One lab-based elective',
        ['One course from the lab-based elective list below', 'Labs must be taken for the one lab-based elective.', 'If course has a lab offered, the lab must be taken to count for this requirement. Combined lecture/lab classes count as one course.'],
        codes(...LAB_BASED),
        { labs: { pairs: LAB_BASED_PAIRS, mode: 'required' } },
      ),
      h.take(
        'bio-electives',
        'Two BIOE 107-188 / BIOL 100-140 electives',
        ['Two courses from BIOE 107-188 and/or BIOL 100-140', Q_LABS],
        range('BIOE', 107, 188).or(range('BIOL', 100, 140)).minCredits(5),
        { n: 2, labs: 'catalog-merge', check: requiredLabs, pool: 'BIOE 107–188 or BIOL 100–140 (5+ credits)' },
      ),
    ], { quote: [Q_ELECTIVES, 'Lecture/lab combinations count as one course.'] })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.all('dc-envs100', 'ENVS 100 and ENVS 100L', 'The DC requirement for the environmental studies/biology combined major is satisfied by completing:', ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
      h.take('dc-course', 'One DC course', ['Plus one of the following:', 'Lecture/lab combinations count as one course.'], codes(...DC_LIST), {
        exclusive: false,
        labs: { pairs: DC_PAIRS, mode: 'merge' },
      }),
    ], { quote: 'The DC requirement for the environmental studies/biology combined major is satisfied by completing:' })

    const comprehensive = h.options(
      'comprehensive',
      'Comprehensive Requirement',
      ['The senior comprehensive may be satisfied by completing one of the options listed below.', 'All courses used to satisfy the senior comprehensive requirement, as well as all other major requirements for ENVS/BIO, must be taken for a letter grade.', Q_GRAD],
      [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196'], ['ENVS 196G']],
      {
        notes: [
          'The senior thesis and senior internship options require applying to a faculty mentor early and at least a two-quarter commitment.',
          'An ENVS graduate seminar counts only by invitation from the instructor (you will be asked to confirm it).',
        ],
      },
    )
    h.solve()
    if (math.status === 'unmet' && !h.enrollments.some((e) => MATH.has(e.code, h.catalog))) {
      if (h.attested('math-placement')) {
        math.status = 'met'
        math.detail = 'Met by placement (ALEKS score of 300 or higher).'
      } else {
        math.status = 'needs-attestation'
        math.attest = h.attestations.find((a) => a.id === 'math-placement')
        math.detail = 'Take one of the listed courses (AP Calculus credit: add it as the course it grants), or confirm an ALEKS score of 300 or higher.'
      }
    }
    if (comprehensive.status === 'unmet') {
      const grad = h.passed.find((e) => GRAD_SEMINAR.has(e.code, h.catalog) && policyFailure(e, h.policy) == null)
      if (grad) {
        comprehensive.used = [grad]
        if (h.attested('grad-seminar-invitation')) {
          comprehensive.status = 'met'
          comprehensive.detail = `${grad.display}: graduate seminar taken by invitation from the instructor.`
        } else {
          comprehensive.status = 'needs-attestation'
          comprehensive.attest = h.attestations.find((a) => a.id === 'grad-seminar-invitation')
          comprehensive.detail = `${grad.display} counts for the comprehensive only if the instructor invited you — confirm it.`
        }
      }
    }
    return [lower, upper, electives, dc, comprehensive]
  },
})

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const quote = ['Plus one of the following chemistry series:', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e || first(lab)) continue
    if (e.term == null) undated = true
    else if (Number(e.term) < FALL_2026) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
  })
}
