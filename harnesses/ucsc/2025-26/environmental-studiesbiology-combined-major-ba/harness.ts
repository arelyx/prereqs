// Environmental Studies/Biology Combined Major B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/environmental-studiesbiology-combined-major-ba.md
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
//  - 2025-26 vs 2026-27: BIOL 105 required (no BIOE 106 alternative); social
//    list adds PHIL 22/24/28 and BME 80G; BIOE 145 (+145L) on the lab-based
//    and DC lists; no ENVS 196G; chemistry needs CHEM 3BL/3CL (or CHEM 1A,
//    1B, 1C and 1N); a CHEM 3B/3C from fall 2026 on without its lab (lab
//    included in the 2026-27 catalog) is cannot-check.
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
  'BIOE 145', 'BIOE 150', 'BIOE 151B', 'BIOE 155', 'BIOE 158L', 'BIOE 159D', 'BIOE 161', 'BIOE 163',
  'BIOL 100', 'BIOL 109L', 'BIOL 115', 'BIOL 120', 'BIOL 121L', 'BIOL 186R', 'ENVS 104A', 'ENVS 106A',
  'ENVS 107A', 'ENVS 108', 'ENVS 130A', 'ENVS 162', 'ENVS 163', 'ENVS 167',
]
const LAB_BASED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 120', 'BIOE 120L'],
  ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'], ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
  ['BIOE 131', 'BIOE 131L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'], ['BIOE 135', 'BIOE 135L'],
  ['BIOE 137', 'BIOE 137L'], ['BIOE 145', 'BIOE 145L'], ['BIOE 150', 'BIOE 150L'], ['BIOE 155', 'BIOE 155L'], ['BIOE 161', 'BIOE 161L'],
  ['BIOE 163', 'BIOE 163L'], ['BIOL 100', 'BIOL 100L'], ['BIOL 115', 'BIOL 115L'], ['BIOL 120', 'BIOL 120L'],
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 130A', 'ENVS 130L'],
  ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]

const DC_LIST = [
  'BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'BIOE 108', 'BIOE 114',
  'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 127', 'BIOE 128L', 'BIOE 129', 'BIOE 137', 'BIOE 141L',
  'BIOE 145', 'BIOE 150', 'BIOE 153C', 'BIOE 158L', 'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172',
]
// "Lecture/lab combinations count as one course." (labs listed after their lecture)
const DC_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 127', 'BIOE 127L'],
  ['BIOE 129', 'BIOE 129L'], ['BIOE 145', 'BIOE 145L'], ['BIOE 150', 'BIOE 150L'],
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

const Q_CHEM_NOTE = 'Note: This requirement may also be satisfied with prior completion of CHEM 1A, 1B, 1C, and 1N, or equivalent.'
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
  edition: '2025-26',
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
      h.take('social', 'Social science course', 'Plus one of the following courses:', codes('ANTH 2', 'ENVS 26', 'PHIL 22', 'PHIL 24', 'PHIL 28', 'BME 80G', 'SOCY 1', 'SOCY 10', 'SOCY 15')),
      math,
      h.all('stats', 'STAT 7 and STAT 7L', 'Plus both of the following:', ['STAT 7', 'STAT 7L']),
      generalChem(h),
      h.options('physics', 'Physics', 'Plus one of the following physics options:', [['PHYS 1A'], ['PHYS 1B'], ['PHYS 6A', 'PHYS 6L'], ['PHYS 7A', 'PHYS 7L']]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'ENVS 100, ENVS 100L, BIOL 105 and BIOE 109', ['Students are required to complete nine upper-division courses, plus the senior comprehensive requirement.', 'All of the following courses:'], ['ENVS 100', 'ENVS 100L', 'BIOL 105', 'BIOE 109']),
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
      [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196']],
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

/**
 * CHEM 3A/3B/3BL/3C/3CL, CHEM 4A/4AL/4B/4BL, or (note) CHEM 1A, 1B, 1C and 1N.
 * The 2025-26 page requires the labs; it predates the fall-2026 CHEM 3B/3C
 * that include their lab, so a fall-2026-or-later 3B/3C without its lab is
 * cannot-check (ask an adviser), never met or unmet on a guess.
 */
function generalChem(h: HarnessContext): Node {
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const quote = ['Plus one of the following chemistry series:', Q_CHEM_NOTE]
  const PKGS = [
    ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
    ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
    ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'],
  ]
  const options = PKGS.flat().map(canon)
  const res = PKGS.map((pkg) => ({
    pkg,
    used: pkg.map((c) => first(canon(c))).filter((x): x is Enrollment => !!x),
    missing: pkg.filter((c) => !first(canon(c))),
  }))
  const done = res.find((r) => r.missing.length === 0)
  if (done) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: done.used, options })
  const a = res[0]
  const newStyle = (lab: string) => {
    const lec = first(canon(lab.slice(0, -1)))
    return lec?.term != null && Number(lec.term) >= FALL_2026
  }
  if (a.missing.length && a.missing.every((c) => (c === 'CHEM 3BL' || c === 'CHEM 3CL') && newStyle(c)))
    return h.cannotCheck(
      'gen-chem',
      'General chemistry',
      quote,
      `${a.missing.join(', ')} not in the plan: CHEM 3B/3C taken fall 2026 or later include the lab (2026-27 catalog), which this 2025-26 page does not address — confirm with an adviser.`,
      { used: a.used, options },
    )
  const best = [...res].sort((x, y) => y.used.length / y.pkg.length - x.used.length / x.pkg.length)[0]
  return h.node('gen-chem', 'General chemistry', quote, 'unmet', {
    used: best.used,
    options,
    detail: `Still need ${best.missing.join(', ')}`,
  })
}
