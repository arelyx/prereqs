// Environmental Sciences B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/environmental-sciences-bs.md
//
//  - Letter grades except ESCI 195, EART 198, EART 199 and OCEA 199
//    (per-course exception → slot `check`).
//  - CHEM 3B/3C taken before fall 2026 need CHEM 3BL/3CL (as biology-bs).
//  - Intro geology lecture and lab are interchangeable (NOTE) → two slots.
//  - Five electives: EART 100–199 (not 196B/198), OCEA 100–199, ESCI 100–189,
//    5+ credits; at most one quarter of EART 199/OCEA 199; a lecture counts
//    only with its catalog lab (lecture code + "L"); ENVS 115A + 115L = one;
//    METX 150 and ECE 180J also allowed. METX 150L is a separate field course
//    in the catalog, not METX 150's lab, so lab pairs are built only for the
//    EART/OCEA/ESCI range.
//  - "Up to two courses from other departments may be considered for
//    upper-division elective credit by permission of a faculty advisor":
//    §1a petition path — up to two upper-division 5+-credit courses from other
//    departments in the plan may fill electives (tried last); the advisor's
//    permission is asked only when the allocator needed one.
//  - Comprehensive = ESCI 195 or ESCI 191 (exclusive: not also an elective);
//    DC = the same two courses (overlay).
import { canon, codes, defineHarness, isPass, policyFailure, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const PNP_OK = new Set(['ESCI 195', 'EART 198', 'EART 199', 'OCEA 199'].map(canon))
const letterExcept = (chosen: Enrollment[]): string | null => {
  for (const e of chosen) if (isPass(e.grade) && !PNP_OK.has(e.code)) return `${e.display}: taken P/NP, but a letter grade is required`
  return null
}
const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'

const Q_OTHER_DEPT = 'Up to two courses from other departments may be considered for upper-division elective credit by permission of a faculty advisor.'
const RANGE = range('EART', 100, 199).except(['EART 196B', 'EART 198']).or(range('OCEA', 100, 199)).or(range('ESCI', 100, 189))
const POOL = RANGE.or(codes('METX 150', 'ECE 180J')).minCredits(5)
const ENVS115 = codes('ENVS 115A', 'ENVS 115L')
const envs115Unit = (avail: Enrollment[]): Enrollment[][] => {
  const a = avail.find((e) => e.code === 'ENVS115A')
  const l = avail.find((e) => e.code === 'ENVS115L')
  return a && l ? [[a, l]] : []
}

// "If a lecture has a lab offered (required or optional), the lab must be
// passed": the catalog lab is the lecture code + "L", except EART 110B/110C,
// whose labs are EART 110M/110N.
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function labPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

export default defineHarness({
  program: 'environmental-sciences-bs',
  edition: '2026-27',
  title: 'Environmental Sciences B.S.',
  attestations: [
    {
      id: 'other-dept-electives',
      label: 'A faculty advisor approved my upper-division course(s) from other departments as electives',
      quote: Q_OTHER_DEPT,
      aliases: ['other department', 'faculty advisor', 'advisor permission'],
    },
  ],
  notes: [
    'All courses used for the major must be taken for a letter grade, except ESCI 195, EART 198, EART 199 and OCEA 199 (P/NP allowed).',
    'Up to two upper-division courses from other departments may count as electives by permission of a faculty advisor (you will be asked to confirm it when one is needed); other substitutions need an approved petition — add them only once approved.',
    'You may not combine this major with the Earth Sciences minor, the Earth Sciences B.S., or the Earth Sciences/Anthropology combined major; double majors complete DC and comprehensive requirements for each major.',
    'Major qualification (CHEM, MATH 11A/11B, PHYS 6A/6L with C or better, an approved academic plan) gates declaration and is not tracked here.',
  ],
  evaluate(h) {
    h.policy = { letter: true }
    const Q_GEO = ['Plus one of the following options:', 'NOTE: EART 5, EART 10, EART 20, and the corresponding labs are interchangeable.']

    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      h.options('calc', 'Calculus', 'Plus one of the following options:', [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']]),
      h.group(
        'intro-geology',
        'Introductory geology with lab',
        [
          h.take('intro-lecture', 'EART 5, EART 10 or EART 20', Q_GEO, codes('EART 5', 'EART 10', 'EART 20')),
          h.take('intro-lab', 'EART 5L, EART 10L or EART 20L', Q_GEO, codes('EART 5L', 'EART 10L', 'EART 20L')),
        ],
        { quote: Q_GEO },
      ),
      h.all('ld-core', 'Environmental and physical science foundations', 'Plus all of the following courses:', ['ENVS 25', 'ESCI 30', 'PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M'], {
        notes: ['ESCI 30: students formerly proposed or declared in biology, biochemistry, bioengineering or related majors may have other options — ask an adviser.'],
      }),
    ])

    const upper = h.all('ud-core', 'Upper-Division Courses', 'All of the following courses:', ['ESCI 100A', 'ESCI 100B', 'ESCI 160'])

    // Lecture/lab pairs for the EART/OCEA/ESCI range only (not METX 150).
    const pairs = labPairs(h, RANGE)
    // Other-department candidates: upper-division, 5+ credits, outside the
    // listed pool (per student, so the set stays a plain code list).
    const otherCodes = [...new Set(h.enrollments.map((e) => e.code))].filter((c) => {
      const cc = h.catalog.get(c)
      return !!cc && cc.division === 'upper' && cc.credits >= 5 && !/^(EART|OCEA|ESCI)\d/.test(c) && !POOL.has(c, h.catalog) && !ENVS115.has(c, h.catalog)
    })
    const OTHER = codes(...otherCodes)
    const electives = h.take(
      'electives',
      'Five upper-division electives',
      [
        'Students take five upper-division Earth sciences, ocean sciences, and/or environmental sciences courses of 5 credits or more, chosen from EART 100-199 (excluding EART 196B and 198), OCEA 100-199, and/or ESCI (100-189). No more than one quarter of EART 199 or OCEA 199 may be used as an elective. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.',
        'ENVS 115A and 115L, taken together, are approved as one elective. METX 150 and ECE 180J are also allowed as electives.',
        Q_OTHER_DEPT,
      ],
      POOL.or(OTHER),
      {
        n: 5,
        prefer: (c) => (OTHER.has(c, h.catalog) ? 1 : 0),
        policy: {},
        check: letterExcept,
        labs: { pairs, mode: 'required' },
        atMost: [
          { set: codes('EART 199', 'OCEA 199'), n: 1, label: 'at most one quarter of EART 199 or OCEA 199' },
          { set: OTHER, n: 2, label: 'at most two courses from other departments' },
        ],
        composite: { eligible: ENVS115, build: envs115Unit },
        pool: 'EART 100–199 (not 196B or 198), OCEA 100–199 or ESCI 100–189, 5+ credits; METX 150; ECE 180J; ENVS 115A + 115L together; a lecture counts only with its lab; up to two upper-division courses from other departments with a faculty advisor’s permission',
        notes: ['Courses used for the comprehensive requirement may not also count as electives.'],
      },
    )

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      'Students fulfill the disciplinary communication (DC) requirement through successful completion of either (1) one of the environmental sciences senior capstone seminars (ESCI 191) or (2) a senior thesis based on original research performed by the student (completion of ESCI 195: Senior Thesis is required).',
      codes('ESCI 191', 'ESCI 195'),
      { exclusive: false, policy: {}, check: letterExcept },
    )

    const comprehensive = h.take(
      'comprehensive',
      'Senior Comprehensive Requirement',
      [
        'Other comprehensive options will not be considered unless they also satisfy the DC requirement.',
        'Courses that are used to satisfy the comprehensive requirement may not also count toward fulfilling the upper-division elective requirement.',
        'Satisfactory completion of one of the following capstone course offerings:',
      ],
      codes('ESCI 195', 'ESCI 191'),
      {
        policy: {},
        check: letterExcept,
        notes: ['ESCI 195 needs a faculty sponsor’s approval before starting; ESCI 191 is limited to environmental science majors with senior standing.'],
      },
    )
    h.solve()
    const petitioned = (electives.used ?? []).filter((e) => OTHER.has(e.code, h.catalog))
    if (petitioned.length && (electives.status === 'met' || electives.status === 'in-progress') && !h.attested('other-dept-electives')) {
      electives.status = 'needs-attestation'
      electives.attest = h.attestations.find((a) => a.id === 'other-dept-electives')
      electives.detail = `${petitioned.map((e) => e.display).join(', ')} count${petitioned.length === 1 ? 's' : ''} as an elective only with a faculty advisor’s permission — confirm it.`
    }
    return [lower, upper, electives, dc, comprehensive, h.info('letter-grades', 'Letter Grade Policy', 'All courses used to satisfy requirements for the environmental sciences major must be taken for a letter grade, with the exception of the following courses, which may be taken pass/no pass: ESCI 195, EART 198 and EART 199 and OCEA 199.')]
  },
})

/** CHEM 3A–3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL (as biology-bs). */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['One of the following options:', Q_CHEM_NOTE]
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
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}
