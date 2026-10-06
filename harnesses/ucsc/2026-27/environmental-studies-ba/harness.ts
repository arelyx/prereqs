// Environmental Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/environmental-studies-ba.md
//
// Shape: shared lower division; ENVS 100/100L; electives that differ by
// concentration (general major, GIS, Global Environmental Justice,
// Conservation Science and Policy); DC overlay; comprehensive overlay.
//
// Judgement calls (see comments in place):
//  - No concentration declared = the general major ("available either without
//    a concentration or in conjunction with one of three").
//  - ENVS 183A / ENVS 195A are listed as electives AND as the first half of a
//    comprehensive package, so the comprehensive (and DC) are overlays that may
//    reuse elective courses.
//  - Natural/social-science lists on the page are used as given; the BIOE 151
//    supercourse courses on the natural-science list count as electives for
//    the concentrations whose elective text points at that list.
//  - "Associated labs are required only when required by the lecture": per the
//    catalog, ENVS 104A and ENVS 130A require concurrent 104L / 130L.
import { canon, codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

// Cross-listed partners named on the page ("ENVS 130B [/LGST 130B]").
const XL: Record<string, string> = {
  'ENVS 130B': 'LGST 130B',
  'ENVS 140': 'LGST 140E',
  'ENVS 144': 'POLI 179',
  'ENVS 149': 'LGST 149',
  'ENVS 150': 'LGST 150A',
  'ENVS 151': 'LGST 151A',
  'ENVS 152': 'POLI 170',
  'ENVS 165': 'LGST 165A',
}
const withXL = (list: string[]) => list.flatMap((c) => (XL[c] ? [c, XL[c]] : [c]))

const NATURAL = [
  'ENVS 104A', 'ENVS 106A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'BIOE 151A', 'BIOE 151B',
  'BIOE 151C', 'BIOE 151D', 'ENVS 120', 'ENVS 122', 'ENVS 123', 'ENVS 130A', 'ENVS 130C', 'ENVS 131',
  'ENVS 133', 'ENVS 135', 'ENVS 142', 'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163', 'ENVS 164',
  'ENVS 166', 'ENVS 167', 'ENVS 168', 'ENVS 169', 'ENVS 170',
]
const SOCIAL = [
  'ENVS 110', 'ENVS 130B', 'ENVS 140', 'ENVS 141', 'ENVS 143', 'ENVS 144', 'ENVS 145', 'ENVS 147',
  'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 152', 'ENVS 154', 'ENVS 158', 'ENVS 165', 'ENVS 172',
  'ENVS 173', 'ENVS 174', 'ENVS 176', 'ENVS 178',
]
const EJ = [
  'ENVS 130B', 'ENVS 140', 'ENVS 143', 'ENVS 144', 'ENVS 147', 'ENVS 152', 'ENVS 154', 'ENVS 158',
  'ENVS 172', 'ENVS 173', 'ENVS 174', 'ENVS 176', 'ENVS 178', 'JRLC 135', 'SOCY 185',
]
const CSP_ELECTIVES = [
  'ENVS 110', 'ENVS 115A', 'ENVS 115B', 'ENVS 120', 'ENVS 122', 'ENVS 123', 'ENVS 140', 'ENVS 141',
  'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 160', 'ENVS 165', 'ENVS 167', 'ENVS 106A', 'ENVS 108',
  'ENVS 152', 'ENVS 154',
]
const FIELD = [
  'ENVS 104A', 'ENVS 106A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'ENVS 167', 'BIOE 151A',
  'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'BIOE 112', 'BIOE 114', 'BIOE 117', 'BIOE 124', 'BIOE 128L',
  'BIOE 141L', 'BIOE 150', 'BIOE 161', 'EART 189A', 'BIOE 163',
]
// "If a lecture has a lab offered (required or optional), the lab must be taken to count for this requirement."
const FIELD_PAIRS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 167', 'ENVS 167L'],
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 150', 'BIOE 150L'], ['BIOE 161', 'BIOE 161L'], ['BIOE 163', 'BIOE 163L'],
]
// CEC field course (XENV 188; the DC note calls it NRS/ENVS 188). Not in the course catalog.
const CEC = ['XENV 188', 'ENVS 188']

// Elective lecture/lab pairs: a lab is absorbed into its lecture's unit.
const ELECTIVE_PAIRS: [string, string][] = [
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

const NATURAL_SET = codes(...NATURAL)
const SOCIAL_SET = codes(...withXL(SOCIAL))
const NOT_BOTH = codes('ENVS 183A', 'ENVS 195A')
// "ENVS 101-179, ENVS 183A, and ENVS 195A" (5 credits or more; ENVS 104A is
// 2 credits but counts with its 5-credit lab).
const ENVS_POOL = range('ENVS', 101, 179).minCredits(5).or(codes('ENVS 104A', 'ENVS 183A', 'ENVS 195A', ...withXL(SOCIAL)))
const LISTED_POOL = ENVS_POOL.or(NATURAL_SET)

const Q_CHEM_NOTE =
  'CHEM 3B taken fall 2026 or later will satisfy this requirement as it is inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL.'
const Q_NOT_BOTH = 'Students cannot take both ENVS 183A and ENVS 195A.'
const Q_LABS = 'Associated labs are required only when required by the lecture.'
const Q_COMP_LETTER = 'All courses used to satisfy the senior comprehensive requirement must be taken for a letter grade.'
const Q_DC = 'The DC requirement in environmental studies is satisfied by completing'

type Conc = 'general' | 'gis' | 'gej' | 'csp'

export default defineHarness({
  program: 'environmental-studies-ba',
  edition: '2026-27',
  title: 'Environmental Studies B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'The major is available either without a concentration or in conjunction with one of three more specialized concentrations that provide depth in particular areas of expertise.',
      options: [
        { value: 'general', label: 'General major (no concentration)', aliases: ['general', 'none', 'no concentration', 'general major'] },
        { value: 'gis', label: 'Geographic Information Systems', aliases: ['gis', 'geographic information systems concentration'] },
        { value: 'gej', label: 'Global Environmental Justice', aliases: ['gej', 'environmental justice', 'global environmental justice concentration'] },
        { value: 'csp', label: 'Conservation Science and Policy', aliases: ['csp', 'conservation', 'conservation science and policy concentration'] },
      ],
      // A student who has not declared a concentration is in the general major.
      default: 'general',
    },
  ],
  attestations: [
    {
      id: 'math-placement',
      label: 'AP Calculus score of 3+ or ALEKS Math Placement score of 300+ (in place of the math course)',
      quote: 'May also be satisfied with a score of 3 or higher on the AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement Exam.',
      aliases: ['aleks', 'ap calculus', 'math placement'],
    },
  ],
  coverage: {
    unknownOk: {
      ...Object.fromEntries(Object.values(XL).map((c) => [c.replace(' ', ''), 'cross-listed partner of an ENVS course ([/X] on the page); the catalog files it under ENVS'])),
      XENV188: 'California Ecology and Conservation (CEC) field course named on the page; not in the course catalog',
      ENVS188: 'NRS/ENVS 188 (CEC course) named in the DC note; not in the course catalog',
    },
  },
  notes: [
    'No letter-grade policy except the senior comprehensive, which must be taken for a letter grade.',
    'Courses from outside ENVS or UC Santa Cruz (other institutions, EAP, Wildlands Studies, Sierra Institute) count only by approved petition — add them once approved.',
    'NRS/ENVS 188 or NRS/BIOL 188 (California Ecology and Conservation), taken spring 2023 or later, gives 1/2 DC credit — confirm with an ENVS advisor how to complete the other half.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy, except that the course(s) taken to fulfill the senior comprehensive requirement must be taken for a letter grade."
    h.policy = undefined
    const conc = (h.choice('concentration') ?? 'general') as Conc

    const lower = h.group('lower', 'Lower-Division Courses', [
      chemistry(h),
      h.take('ecology', 'ENVS 24 or BIOE 20C', 'Plus one of the following courses:', codes('ENVS 24', 'BIOE 20C')),
      h.take('envs25', 'ENVS 25', 'Plus the following course:', codes('ENVS 25')),
      h.either('math', 'Mathematics', 'Plus one of the following courses:', [
        h.take('math-course', 'One mathematics course', 'Plus one of the following courses:', codes('AM 3', 'AM 11A', 'AM 11B', 'MATH 3', 'MATH 11A', 'MATH 16A', 'MATH 19A')),
        h.attest('math-placement'),
      ]),
      h.options('stats', 'Statistics series', 'Plus one of these statistics series:', [['STAT 7', 'STAT 7L'], ['STAT 17', 'STAT 17L']]),
      h.take('social', 'Social science course', 'Plus one of the following:', codes('ANTH 2', 'ENVS 26', 'SOCY 1', 'SOCY 10', 'SOCY 15')),
    ], { notes: ['Continuing students must complete all lower-division requirements before taking ENVS 100 and ENVS 100L.'] })

    const core = h.all('envs100', 'ENVS 100 and ENVS 100L', 'Students are required to complete the following upper-division courses:', ['ENVS 100', 'ENVS 100L'], {
      notes: ['ENVS 100 and ENVS 100L are offered in winter and spring.'],
    })

    const upperExtra: Node[] = []
    let electives: Node
    if (conc === 'general') {
      electives = h.take(
        'electives',
        'Seven upper-division electives',
        [
          'Students take seven, 5-credit or more upper-division electives from ENVS 101-179, ENVS 183A, and ENVS 195A.',
          Q_NOT_BOTH,
          Q_LABS,
          'At least one course must be from the list below of courses based in the natural sciences',
          'At least one course must be from the list below of courses based in the social sciences',
        ],
        LISTED_POOL,
        electiveOpts(7, true),
      )
    } else if (conc === 'gis') {
      upperExtra.push(h.all('gis-core', 'GIS courses', 'Plus all of the following:', ['ENVS 115A', 'ENVS 115L', 'ENVS 115B', 'ENVS 115C']))
      electives = h.take(
        'electives',
        'Four upper-division electives',
        [
          'Students take four, 5-credit or more upper-division electives from ENVS 101-179, ENVS 183A, and ENVS 195A.',
          Q_NOT_BOTH,
          Q_LABS,
          'At least one course must be from the list below of courses based in the natural sciences',
          'At least one course must be from the list below of courses based in the social sciences',
        ],
        LISTED_POOL,
        { ...electiveOpts(4, true), notes: ['The department strongly recommends at least one internship related to GIS applications.'] },
      )
    } else if (conc === 'gej') {
      upperExtra.push(h.take('ej-electives', 'Four environmental justice electives', 'Plus four of the following environmental justice electives:', codes(...withXL(EJ)), { n: 4 }))
      // "Among those four courses, at least one course must be from the list
      // below of courses based in the natural sciences." The EJ list has no
      // natural-science course, so this constrains the three additional electives.
      electives = h.take(
        'electives',
        'Three additional upper-division electives',
        [
          'Students take three, 5-credit or more upper-division electives from ENVS 101-179, ENVS 183A, ENVS 195A.',
          Q_NOT_BOTH,
          Q_LABS,
          'Among those four courses, at least one course must be from the list below of courses based in the natural sciences.',
        ],
        LISTED_POOL,
        electiveOpts(3, false),
      )
    } else {
      upperExtra.push(
        h.take('csp-conservation', 'ENVS 120, ENVS 160, or BIOE 165', 'Plus one of the following:', codes('ENVS 120', 'ENVS 160', 'BIOE 165')),
        h.take('csp-policy', 'ENVS 140 or ENVS 150', 'Plus one of the following:', codes(...withXL(['ENVS 140', 'ENVS 150']))),
        h.take('csp-electives', 'Two CSP electives', ['Plus two of the following CSP electives:', 'No duplicate courses from lists above.', 'Lecture/lab combinations count as a single course.'], codes(...withXL(CSP_ELECTIVES)), {
          n: 2,
          labs: { pairs: [['ENVS 115A', 'ENVS 115L']], mode: 'merge' },
        }),
        h.take(
          'csp-field',
          'Field course',
          ['One of the following options:', 'Lecture/Lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be taken to count for this requirement.', 'Or the California Ecology and Conservation (CEC) field course through the University of California Natural Reserve System (XENV 188).'],
          codes(...FIELD, ...CEC),
          { labs: { pairs: FIELD_PAIRS, mode: 'required' } },
        ),
      )
      // Electives here point only at ENVS 101-179, 183A, 195A (no natural/social lists).
      electives = h.take(
        'electives',
        'Two upper-division electives',
        ['Students take two, 5-credit or more upper-division electives from ENVS 101-179, ENVS 183A, and ENVS 195A.', Q_NOT_BOTH, Q_LABS],
        ENVS_POOL,
        { n: 2, labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' }, atMost: [{ set: NOT_BOTH, n: 1, label: 'not both ENVS 183A and ENVS 195A' }], check: requiredLabs },
      )
    }
    const upper = h.group('upper', 'Upper-Division Courses', [core, ...upperExtra])

    // DC: ENVS 100/100L (already required) plus one course; overlay.
    const dcList: Record<Conc, string[]> = {
      general: ['BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'ENVS 196G'],
      gis: ['ENVS 183B', 'ENVS 195B', 'ENVS 196G'],
      gej: ['ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'ENVS 196G'],
      csp: ['BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'ENVS 196G'],
    }
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.all('dc-envs100', 'ENVS 100 and ENVS 100L', Q_DC, ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
      h.take('dc-course', 'One DC course', 'Plus one of the following:', codes(...dcList[conc]), { exclusive: false }),
    ], { quote: Q_DC })

    // Comprehensive: overlay (ENVS 183A / 195A are also listed as electives).
    const compPackages: Record<Conc, string[][]> = {
      general: [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196'], ['ENVS 196G']],
      gis: [['ENVS 183A', 'ENVS 183B'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196G']],
      gej: [['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196'], ['ENVS 196G']],
      csp: [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196'], ['ENVS 196G']],
    }
    const compQuote = ['The senior comprehensive may be satisfied by completing one of the options listed below.', Q_COMP_LETTER]
    const topic: Record<Conc, string | null> = {
      general: null,
      gis: 'The topic engaged in the senior comprehensive courses must be relevant to the field of Geographic Information Systems.',
      gej: 'The topic engaged in the senior comprehensive courses must be relevant to the field of global environmental justice.',
      csp: 'The topic engaged in senior comprehensive courses must be relevant to the field of conservation science and policy.',
    }
    const compNotes = [
      'The senior thesis and senior internship options require applying to a faculty mentor early and at least a two-quarter commitment.',
      ...(topic[conc] ? [`${topic[conc]} (reviewed by the course instructor)`] : []),
      ...(conc === 'general' ? ['Students with advanced skills may take a graduate seminar by invitation from the instructor (confirm with an advisor).'] : []),
    ]
    const comprehensive = h.options('comprehensive', 'Comprehensive Requirement (letter grade)', compQuote, compPackages[conc], {
      exclusive: false,
      policy: { letter: true },
      notes: compNotes,
    })

    return [lower, upper, electives, dc, comprehensive]

    function electiveOpts(n: number, social: boolean) {
      const atLeast = [{ set: NATURAL_SET, n: 1, label: 'at least one natural-science course' }]
      if (social) atLeast.push({ set: SOCIAL_SET, n: 1, label: 'at least one social-science course' })
      return {
        n,
        labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' as const },
        atLeast,
        atMost: [{ set: NOT_BOTH, n: 1, label: 'not both ENVS 183A and ENVS 195A' }],
        check: requiredLabs,
        pool: 'ENVS 101–179 (5+ credits), ENVS 183A or ENVS 195A (not both), or a course on the natural-/social-science lists',
        notes: ['Up to two courses taken abroad may count by approved petition (single majors).'],
      }
    }
  },
})

/** ENVS 23, or CHEM 3A + 3B (+ 3BL when 3B was taken before fall 2026), or CHEM 4A/4AL/4B/4BL. */
function chemistry(h: HarnessContext): Node {
  const quote = ['One of the following options:', Q_CHEM_NOTE]
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const options = [canon('ENVS 23'), 'CHEM3A', 'CHEM3B', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  const envs23 = first(canon('ENVS 23'))
  if (envs23) return h.node('chem', 'Physical science / chemistry', quote, 'met', { used: [envs23], options })
  const a = [first('CHEM3A'), first('CHEM3B')]
  const lab = first('CHEM3BL')
  const missingA = ['CHEM 3A', 'CHEM 3B'].filter((_, i) => !a[i])
  let undated = false
  const b3 = a[1]
  if (b3 && !lab) {
    if (b3.term == null) undated = true
    else if (Number(b3.term) < FALL_2026) missingA.push('CHEM 3BL')
  }
  const usedA = [...a, lab].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  if (missingA.length === 0 && !undated) return h.node('chem', 'Physical science / chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('chem', 'Physical science / chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('chem', 'Physical science / chemistry', quote, 'CHEM 3B has no term: if taken before fall 2026 you also need CHEM 3BL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('chem', 'Physical science / chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Take ENVS 23, or still need ${(closerA ? missingA : missingB).join(', ')}`,
  })
}

