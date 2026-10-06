// Film and Digital Media B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/film-and-digital-media-ba.md
//
// Two different structures:
//   general — FILM 120 + one course from EACH of three core groups (2025-26
//             has no Group 4 / FILM 170A-B in the general core), the
//             senior comprehensive, five electives (10 upper-division), a
//             diversity course that overlaps core/electives, DC overlay.
//   ICPC    — FILM 120 + one from EACH of five groups, FILM 199 + a senior
//             project, two critical-studies + three production electives (13
//             upper-division), DC overlay; admission is selective (attested).
import { canon, codes, defineHarness, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const G1 = ['FILM 130', 'FILM 132A', 'FILM 132B']
const G2 = ['FILM 134A', 'FILM 134B']
const G3 = ['FILM 136A', 'FILM 136B', 'FILM 136C', 'FILM 136D']
const G4 = ['FILM 170A', 'FILM 170B']
const SEMINARS = ['FILM 194A', 'FILM 194B', 'FILM 194C', 'FILM 194D', 'FILM 194E', 'FILM 194F', 'FILM 194G', 'FILM 194H', 'FILM 194S']
const SENIOR_PROJECTS = ['FILM 196A', 'FILM 196B', 'FILM 196C', 'FILM 197']
const GENERAL_COMPREHENSIVE = [...SEMINARS, ...SENIOR_PROJECTS]
const DIVERSITY = [
  'ANTH 110P', 'FILM 132A', 'FILM 132B', 'FILM 165A', 'FILM 165B', 'FILM 165C', 'FILM 165D', 'FILM 165E',
  'FILM 165G', 'FILM 168A', 'FILM 168F', 'FILM 168M', 'HAVC 141O', 'LALS 122',
]
const DC_FIRST = ['FILM 130', 'FILM 132A', 'FILM 132B', 'FILM 134A', 'FILM 134B']
// 2025-26: the ICPC critical-studies list has FILM 145 (also on the production
// list) where 2026-27 has FILM 152.
const ICPC_CRITICAL = [
  'FILM 145', 'FILM 160', 'FILM 162', 'FILM 162F', 'FILM 165A', 'FILM 165B', 'FILM 165C', 'FILM 165D',
  'FILM 165E', 'FILM 165G', 'FILM 168', 'FILM 168A', 'FILM 168M', 'FILM 180', 'FILM 185D', 'FILM 185R',
  'FILM 185S', 'FILM 185X', 'FILM 187', 'FILM 189',
]
const ICPC_PRODUCTION = [
  'FILM 145', 'FILM 150', 'FILM 151', 'FILM 170A', 'FILM 170B', 'FILM 171A', 'FILM 171C', 'FILM 171D',
  'FILM 171F', 'FILM 171S', 'FILM 172', 'FILM 173', 'FILM 175', 'FILM 176', 'FILM 177', 'FILM 178A',
  'FILM 178B', 'FILM 179A', 'FILM 179B',
]

const CORE_GROUPS: { key: string; label: string; list: string[] }[] = [
  { key: 'g1', label: 'Group 1', list: G1 },
  { key: 'g2', label: 'Group 2', list: G2 },
  { key: 'g3', label: 'Group 3', list: G3 },
  { key: 'g4', label: 'Group 4', list: G4 },
]
// Precomputed: checks run once per candidate combination, so they must be cheap.
const GROUP_OF = new Map(CORE_GROUPS.flatMap((g) => g.list.map((c) => [canon(c), g.key] as const)))
const groupOf = (code: string) => GROUP_OF.get(canon(code))

// "Letter grades of C or better, or P grades, are required in the major requirement courses"
const POLICY = { min: 'C', pCounts: true }

export default defineHarness({
  program: 'film-and-digital-media-ba',
  edition: '2025-26',
  title: 'Film and Digital Media B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Program',
      quote: 'The integrated critical practice concentration (ICPC) provides a rigorous pathway beyond the general major requirements.',
      options: [
        { value: 'general', label: 'General Film and Digital Media Major', aliases: ['general major', 'general film and digital media'] },
        {
          value: 'integrated-critical-practice',
          label: 'Integrated Critical Practice Concentration (ICPC)',
          aliases: ['icpc', 'integrated critical practice', 'integrated critical practice concentration'],
        },
      ],
    },
  ],
  attestations: [
    {
      id: 'icpc-admission',
      label: 'Admitted to the Integrated Critical Practice Concentration',
      quote: 'Admission to the integrated critical practice concentration will be granted to students who have excellent grades in film and digital media courses, an outstanding writing sample, a clear statement of purpose outlining a senior project that integrates critical studies and production work, and a strong Film and Digital Media faculty endorsement.',
      aliases: ['icpc', 'admission', 'admitted', 'integrated critical practice'],
    },
  ],
  notes: [
    'Major courses need a C or better, or a P.',
    'At most two courses from another department or institution may be substituted, with Film and Digital Media approval — the app counts only FILM courses as electives.',
  ],
  evaluate(h) {
    h.policy = POLICY
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    return h.choice('concentration') === 'integrated-critical-practice' ? icpc(h) : general(h)
  },
})

function lowerDivision(h: HarnessContext, icpcNote: boolean): Node {
  return h.group('lower', 'Lower-Division Courses', [
    h.take('film20a', 'FILM 20A Introduction to Film Studies', 'Take the following course:', codes('FILM 20A')),
    h.take('film20', 'Two more FILM 20-level courses', icpcNote ? 'Plus two additional 20-level courses' : 'Plus two additional 20-level courses:', codes('FILM 20B', 'FILM 20C', 'FILM 20P'), {
      n: 2,
      notes: icpcNote ? ['FILM 20P cannot be used toward declaring the major.'] : undefined,
    }),
  ])
}

function dcNodes(h: HarnessContext, first: string, second: string): Node {
  return h.group('dc', 'Disciplinary Communication (DC)', [
    h.take('dc-first', 'DC first category', ['The DC requirement is met by passing one course from each of the two following categories:', first], codes(...DC_FIRST), { exclusive: false }),
    h.take('dc-second', 'DC second category', ['The DC requirement is met by passing one course from each of the two following categories:', second], codes(...GENERAL_COMPREHENSIVE), { exclusive: false }),
  ])
}

function general(h: HarnessContext): Node[] {
  const lower = lowerDivision(h, false)
  // 2025-26: "one course from each of the three groups below" (Groups 1-3 only).
  const core = h.group('core', 'Core Curriculum', [
    h.take('film120', 'FILM 120 Introduction to Media Theory', 'FILM 120 — Introduction to Media Theory (5)', codes('FILM 120')),
    h.group(
      'core-groups',
      'One course from each of the three groups',
      CORE_GROUPS.filter((g) => g.key !== 'g4').map((g) =>
        h.take(`core-${g.key}`, g.label, 'One course from each of the following three groups:', codes(...g.list)),
      ),
      { quote: 'One course from each of the following three groups:' },
    ),
  ], { quote: 'The core curriculum consists of the following course, plus one course from each of the three groups below.' })

  const comprehensive = h.take(
    'comprehensive',
    'Senior comprehensive course',
    [
      'Plus one course from the following to satisfy the senior comprehensive requirement:',
      'Seniors in the general film and digital media major satisfy the comprehensive requirement with one of the following senior-level classes.',
    ],
    codes(...GENERAL_COMPREHENSIVE),
  )

  // Electives: critical studies (FILM 145, 160 and 180 series), production
  // (FILM 150 and 170 series), or an additional core course (FILM 130/132/134/136)
  // taken after its group's core course. FILM 185F (2 credits) excluded.
  const series: CourseSet = codes('FILM 145')
    .or(range('FILM', 150, 189))
    .except(['FILM 185F'])
    .minCredits(5)
  const extraCore = codes(...G1, ...G2, ...G3)
  const electives = h.take(
    'electives',
    'Five upper-division electives',
    [
      'Five courses total, in any combination of 5-credit critical studies (FILM 145, FILM 160 and the 180 series), production (FILM 150 and 170 series), and/or additional Core Curriculum courses (FILM 130/FILM 132/FILM 134/FILM 136 course, taken after its respective Core Curriculum requirement has been satisfied). FILM 185F (a two-credit course) is excluded from this list.',
    ],
    series.or(extraCore),
    {
      n: 5,
      check: (chosen) => extraCoreAfter(h, chosen, extraCore),
      pool: 'FILM 145; FILM 150–159, 160–169, 170–179, 180–189 series (5 credits, not FILM 185F); or an extra FILM 130/132/134/136 course taken after that group’s core course',
      notes: ['A maximum of two electives may come from another department or institution with pre-approval — those are not counted here.'],
    },
  )

  const diversity = h.take(
    'diversity',
    'Diversity requirement',
    [
      'Students take at least one course from the following list focusing on non-Western perspectives, races, ethnicities, genders, classes, sexualities, or abilities.',
      'The course chosen will satisfy the Diversity Requirement along with its respective category of the Core Curriculum or upper-division elective requirement.',
    ],
    codes(...DIVERSITY),
    {
      exclusive: false,
      notes: ['Non-FILM courses on this list count toward the two-course outside-department maximum; other courses need a petition.'],
    },
  )

  const upper = h.group('upper', 'Upper-Division Courses', [core, comprehensive, electives, diversity])
  return [lower, upper, dcNodes(h, 'First Category', 'Second category:')]
}

/** Each extra core-group course used as an elective must follow (by term) another course of the same group. */
function extraCoreAfter(h: HarnessContext, chosen: Enrollment[], extraCore: CourseSet): string | null {
  const rank = (e: Enrollment) => (e.term == null ? -1 : Number(e.term))
  for (const e of chosen) {
    if (!extraCore.has(e.code)) continue
    const g = groupOf(e.code)
    const earlier = h.passed.some(
      (x) => x.id !== e.id && !chosen.includes(x) && groupOf(x.code) === g && rank(x) < rank(e) && x.grade !== 'NP',
    )
    if (!earlier) return `${e.display} counts as an elective only if taken after its group's core course`
  }
  return null
}

function icpc(h: HarnessContext): Node[] {
  const lower = lowerDivision(h, true)
  const groups = h.group(
    'groups',
    'One course from each of the five groups',
    [
      ...CORE_GROUPS.map((g) => h.take(`icpc-${g.key}`, g.label, 'One course from each of the following five groups', codes(...g.list))),
      h.take('icpc-g5', 'Group 5', 'One course from each of the following five groups', codes(...SEMINARS)),
    ],
    { quote: 'One course from each of the following five groups' },
  )
  const core = h.group('core', 'Core Curriculum', [
    h.take('film120', 'FILM 120 Introduction to Media Theory', 'Students in the integrated critical practice concentration complete the following required upper-division core curriculum:', codes('FILM 120')),
    groups,
  ])
  const comprehensive = h.group(
    'comprehensive',
    'Senior comprehensive (two courses)',
    [
      h.take('film199', 'FILM 199 Tutorial', 'The following course:', codes('FILM 199')),
      h.take('senior-project', 'Senior project', 'Seniors in the integrated critical practice concentration must complete one of the following courses:', codes('FILM 195', ...SENIOR_PROJECTS)),
    ],
    { quote: 'Two courses to satisfy the senior comprehensive requirement:' },
  )
  const electives = h.group(
    'electives',
    'Electives',
    [
      h.take('critical', 'Two critical studies courses', 'Two upper-division critical studies courses', codes(...ICPC_CRITICAL), { n: 2 }),
      h.take('production', 'Three production courses', 'Three upper-division production courses', codes(...ICPC_PRODUCTION), { n: 3 }),
    ],
    {
      quote: 'Five upper-division elective courses to be chosen from the following:',
      notes: ['Graduate seminars, taken with the permission of the faculty advisor, may substitute for one of the electives.'],
    },
  )
  const upper = h.group('upper', 'Upper-Division Courses', [core, comprehensive, electives])
  const admission = h.attest('icpc-admission')
  return [admission, lower, upper, dcNodes(h, 'First category', 'Second category')]
}
