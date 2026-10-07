// Environmental Sciences B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/environmental-sciences-bs.md
//
//  - Letter grades except ESCI 195, EART 198, EART 199 and OCEA 199
//    (per-course exception → slot `check`).
//  - Chemistry: CHEM 3A/3B/3BL/3C/3CL, CHEM 4A/4AL/4B/4BL, or (note) CHEM 1A,
//    1C and 1N. 2025-26 has no fall-2026 rule; a CHEM 3B/3C from fall 2026 on
//    (lab included in the 2026-27 catalog) without its lab is cannot-check.
//  - Intro geology: one lecture with its own lab (2025-26 has no
//    "interchangeable" note).
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
const Q_CHEM_NOTE = 'Note: This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1C, and CHEM 1N or equivalent.'

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
// whose labs are EART 110M/110N. EART 146L is newer than this edition (the
// 2025-26 Earth Sciences B.S. page lists EART 146 alone; the current catalog
// adds EART 146L as a corequisite), so EART 146 needs no lab here.
const NO_LAB_2025 = new Set(['EART146'])
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function labPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || NO_LAB_2025.has(code) || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

export default defineHarness({
  program: 'environmental-sciences-bs',
  edition: '2025-26',
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

    const lower = h.group('lower', 'Lower-Division Courses', [
      generalChem(h),
      h.options('calc', 'Calculus', 'Plus one of the following options:', [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']]),
      h.options('intro-geology', 'Introductory geology with lab', 'Plus one of the following options:', [
        ['EART 5', 'EART 5L'],
        ['EART 10', 'EART 10L'],
        ['EART 20', 'EART 20L'],
      ]),
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
        'Other capstones will not be considered unless they also satisfy the DC requirement.',
        'Courses that are used to satisfy the capstone may not also count toward fulfilling the upper-division elective requirement.',
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

/**
 * CHEM 3A/3B/3BL/3C/3CL, CHEM 4A/4AL/4B/4BL, or (note) CHEM 1A, 1C and 1N.
 * The 2025-26 page requires the labs; it predates the fall-2026 CHEM 3B/3C
 * that include their lab, so a fall-2026-or-later 3B/3C without its lab is
 * cannot-check (ask an adviser), never met or unmet on a guess.
 */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['One of the following options:', Q_CHEM_NOTE]
  const PKGS = [
    ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
    ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
    ['CHEM 1A', 'CHEM 1C', 'CHEM 1N'],
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
    progress: { have: best.used.length, need: best.pkg.length },
  })
}
