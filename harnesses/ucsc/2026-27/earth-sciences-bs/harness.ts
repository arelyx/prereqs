// Earth Sciences B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/earth-sciences-bs.md
//
// Five programs on one page: the general major (default: concentrations are
// opt-in, "Four formal concentrations ... are available") and the geology,
// planetary sciences, ocean sciences and geophysics concentrations.
//
// Unusual bits handled in code below:
//  - Letter grades for everything EXCEPT EART 195, EART 198, EART 199 and
//    OCEA 199 — a per-course exception, so slots that can hold those courses
//    use no slot policy plus a `check` that rejects P on the other courses.
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too
//    (every concentration except ocean sciences, whose page omits the note).
//  - Electives: EART 100–199 (not 196B/198) or OCEA 100–199, 5+ credits, at
//    most one quarter of EART 199/OCEA 199, a lecture counts only with its
//    lab when the catalog has one, ENVS 115A + 115L together = one elective.
//  - Comprehensive courses may not also be electives or field/lab courses
//    (exclusive slot); DC may reuse anything (overlay).
import { canon, codes, defineHarness, isPass, isSummer, policyFailure, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Conc = 'general' | 'geology' | 'planetary' | 'ocean' | 'geophysics'

const FALL_2026 = 2268

// "All courses used to satisfy requirements for the Earth sciences B.S. must
// be taken for a letter grade with the exception of EART 195, EART 198, EART
// 199 and OCEA 199. These courses may be taken pass/no pass."
const PNP_OK = new Set(['EART 195', 'EART 198', 'EART 199', 'OCEA 199'].map(canon))
const Q_LETTER =
  'All courses used to satisfy requirements for the Earth sciences B.S. must be taken for a letter grade with the exception of EART 195, EART 198, EART 199 and OCEA 199. These courses may be taken pass/no pass.'
const letterExcept = (chosen: Enrollment[]): string | null => {
  for (const e of chosen) if (isPass(e.grade) && !PNP_OK.has(e.code)) return `${e.display}: taken P/NP, but a letter grade is required`
  return null
}

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_LABS =
  'Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.'
const Q_ENVS115 =
  'ENVS 115A and ENVS 115L are open to Earth science students with permission of the instructor, and taken together are approved as one elective.'
const Q_DC_OVERLAP = 'Courses taken to satisfy the DC requirement may also satisfy upper-division elective or senior comprehensive requirements.'
const Q_COMP_TIMING =
  'Therefore, prior to completing an activity to satisfy the senior comprehensive requirement, students should have already completed EART 110A, one of EART 110B or EART 110C, and three other upper-division courses that fulfill major requirements.'
const Q_OTHER_OPTIONS = 'Other options such as external field research experiences or internships may be suitable by permission of the faculty adviser.'

const ELECTIVE_COUNT: Record<Conc, { n: number; word: string }> = {
  general: { n: 4, word: 'four' },
  geology: { n: 2, word: 'two' },
  planetary: { n: 3, word: 'three' },
  ocean: { n: 4, word: 'four' },
  geophysics: { n: 4, word: 'four' },
}

// Field/laboratory/data analysis list (general major), page order, with the
// labs that follow their lectures.
const FIELD_LAB = [
  'EART 109', 'EART 116', 'EART 119A', 'EART 120', 'EART 125', 'EART 130', 'EART 140', 'EART 142',
  'EART 146', 'EART 148', 'EART 150', 'EART 189B', 'EART 191C', 'EART 191D',
]
const FIELD_LAB_PAIRS: [string, string][] = [
  ['EART 109', 'EART 109L'], ['EART 120', 'EART 120L'], ['EART 130', 'EART 130L'],
  ['EART 140', 'EART 140L'], ['EART 146', 'EART 146L'], ['EART 150', 'EART 150L'],
]

// Geology elective (one of), "Where the lab course follows a lecture course
// the pair of courses counts as a single course."
const GEOLOGY_ELECTIVE = ['EART 100', 'EART 101', 'EART 140', 'EART 142', 'EART 146']
const GEOLOGY_ELECTIVE_PAIRS: [string, string][] = [
  ['EART 100', 'EART 100L'], ['EART 101', 'EART 101L'], ['EART 140', 'EART 140L'], ['EART 146', 'EART 146L'],
]

// Geophysics: "Choosing from the following list is recommended, but not
// mandatory". The list names three graduate courses (EART 270, 273, 278A)
// outside EART 100–199; since the page recommends them FOR this requirement
// they are accepted in the geophysics elective pool (judgement call).
const GEOPHYSICS_RECOMMENDED = [
  'EART 104', 'EART 109', 'EART 109L', 'EART 112', 'EART 114', 'EART 116', 'EART 118', 'EART 119A',
  'EART 125', 'EART 126', 'EART 140', 'EART 140L', 'EART 142', 'EART 146', 'EART 146L', 'EART 148',
  'EART 150', 'EART 150L', 'EART 152', 'EART 160', 'EART 162', 'EART 163', 'EART 164', 'EART 165',
  'EART 172', 'EART 270', 'EART 273', 'EART 278A',
]
const GEOPHYSICS_GRAD = codes('EART 270', 'EART 273', 'EART 278A')
const GEOPHYSICS_RECOMMENDED_SET = new Set(GEOPHYSICS_RECOMMENDED.map(canon))

const ELECTIVE_POOL: CourseSet = range('EART', 100, 199)
  .except(['EART 196B', 'EART 198'])
  .or(range('OCEA', 100, 199))
  .minCredits(5)
const ONE_199 = codes('EART 199', 'OCEA 199')
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
  program: 'earth-sciences-bs',
  edition: '2026-27',
  title: 'Earth Sciences B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'Four formal concentrations, all with specific course requirements and leading to an Earth and planetary sciences B.S., are available: geology, geophysics, ocean sciences, and planetary sciences.',
      options: [
        { value: 'general', label: 'General Earth Sciences (no concentration)', aliases: ['general', 'none', 'no concentration', 'general earth sciences', 'general earth sciences major'] },
        { value: 'geology', label: 'Geology', aliases: ['geology concentration'] },
        { value: 'planetary', label: 'Planetary Sciences', aliases: ['planetary', 'planetary science', 'planetary sciences concentration'] },
        { value: 'ocean', label: 'Ocean Sciences', aliases: ['ocean', 'ocean science', 'ocean sciences concentration'] },
        { value: 'geophysics', label: 'Geophysics', aliases: ['geophysics concentration'] },
      ],
      default: 'general',
    },
  ],
  coverage: {
    ignore: {
      PHYS5A: 'transfer “Recommended Courses” list only (not a completion requirement)',
      PHYS5L: 'transfer “Recommended Courses” list only (not a completion requirement)',
      PHYS5B: 'transfer “Recommended Courses” list only (not a completion requirement)',
      PHYS5M: 'transfer “Recommended Courses” list only (not a completion requirement)',
    },
  },
  notes: [
    'All courses used for the major must be taken for a letter grade, except EART 195, EART 198, EART 199 and OCEA 199 (P/NP allowed).',
    'Relevant courses taken at UC Santa Cruz or elsewhere may be substituted for requirements by approved petition — add a substitute only once the petition is approved.',
    'You may not combine this major with the Earth Sciences minor, the Environmental Sciences B.S., or the Earth Sciences/Anthropology combined major.',
    'Double majors must complete the DC and comprehensive requirements of each major separately.',
    'Major qualification (EART 5/5L, 10/10L or 20/20L with a C or better) gates declaration and is not tracked here.',
  ],
  evaluate(h) {
    h.policy = { letter: true }
    const conc = (h.choice('concentration') ?? 'general') as Conc

    const lower = h.group('lower', 'Lower-Division Courses', lowerDivision(h, conc))
    const upper = h.group('upper', 'Upper-Division Courses', upperDivision(h, conc))

    // --- electives -----------------------------------------------------------
    const { n, word } = ELECTIVE_COUNT[conc]
    const geophys = conc === 'geophysics'
    const pool = geophys ? ELECTIVE_POOL.or(GEOPHYSICS_GRAD) : ELECTIVE_POOL
    const elecQuote = `Students take ${word} upper-division Earth sciences or ocean sciences courses of 5 or more credits, chosen from EART 100-199 (excluding EART 196B and EART 198) or OCEA 100-199. No more than one quarter of EART 199 or OCEA 199 may be used as an elective. ${Q_LABS}`
    const electiveNotes = ['Courses used for the senior comprehensive requirement cannot also count as electives.']
    if (geophys)
      electiveNotes.push(
        'Relevant courses in physics or mathematics may be substituted by petition (add them once approved).',
        'The recommended list includes graduate courses EART 270, 273 and 278A; they are accepted here because the page recommends them for this requirement.',
      )
    const electives = h.take('electives', `Electives (${word})`, [elecQuote, Q_ENVS115, ...(geophys ? ['Relevant courses in physics or mathematics may be substituted by petition.', 'Choosing from the following list is recommended, but not mandatory:'] : [])], pool, {
      n,
      policy: {},
      check: letterExcept,
      labs: { pairs: labPairs(h, pool), mode: 'required' },
      atMost: [{ set: ONE_199, n: 1, label: 'at most one quarter of EART 199 or OCEA 199' }],
      composite: { eligible: ENVS115, build: envs115Unit },
      pool: `EART 100–199 (not 196B or 198) or OCEA 100–199, 5+ credits${geophys ? ' (or EART 270, 273, 278A from the recommended list)' : ''}; a lecture counts only with its lab; ENVS 115A + 115L together count as one`,
      notes: electiveNotes,
      ...(geophys ? { prefer: (c: string) => (GEOPHYSICS_RECOMMENDED_SET.has(c) ? 0 : 1) } : {}),
    })

    // --- DC (overlay) --------------------------------------------------------
    const dc = disciplinaryCommunication(h, conc)

    // --- comprehensive (exclusive: not also an elective or field/lab course) -
    const comprehensive = comprehensiveReq(h, conc)
    h.solve()
    const offSeason = h.enrollments.find((e) => e.code === 'EART189B' && e.term != null && !isSummer(e.term))
    if (conc !== 'geophysics' && offSeason && comprehensive.status !== 'met' && comprehensive.status !== 'in-progress')
      comprehensive.detail = `${offSeason.display} is planned outside a summer term; EART 189B must be completed in the summer to count as the summer field option.`

    const info = h.info('comp-timing', 'Before the senior comprehensive', Q_COMP_TIMING, 'Advice on timing; enrollment in the senior comprehensive is by petition or application.')
    return [lower, upper, electives, dc, comprehensive, info, h.info('letter-grades', 'Letter Grade Policy', Q_LETTER)]
  },
})

function lowerDivision(h: HarnessContext, conc: Conc): Node[] {
  const out: Node[] = [
    h.options('intro-geology', 'Introductory geology with lab', 'Choose one of the following options:', [
      ['EART 5', 'EART 5L'],
      ['EART 10', 'EART 10L'],
      ['EART 20', 'EART 20L'],
    ]),
    conc === 'ocean'
      ? h.options('gen-chem', 'General chemistry', ['Plus one of the following options:', 'Where the lab course follows a lecture course the pair of courses counts as a single course.'], [
          ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'],
          ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
        ])
      : generalChem(h),
    h.options(
      'calc',
      'Calculus',
      'Plus one of the following options:',
      conc === 'planetary' || conc === 'geophysics'
        ? [['MATH 19A', 'MATH 19B'], ['MATH 11A', 'MATH 11B']]
        : [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']],
      conc === 'geophysics' ? { notes: ['MATH 19A and MATH 19B are strongly preferred.'] } : {},
    ),
  ]
  if (conc === 'geophysics')
    out.push(h.take('linear-algebra', 'Linear algebra', 'Plus one of the following courses:', codes('MATH 21', 'AM 10')))
  if (conc === 'general')
    out.push(
      h.take('math-data', 'Multivariable calculus, programming or statistics', 'Plus one of the following courses:', codes('MATH 22', 'MATH 23A', 'EART 111', 'EART 125', 'EART 119A'), {
        notes: ['Students that have completed a prior course in programming or statistics may petition for equivalency.'],
      }),
    )
  else if (conc !== 'geology')
    out.push(h.take('math-multivar', 'Multivariable calculus', 'Plus one of the following courses:', codes('MATH 22', 'MATH 23A', 'EART 111')))
  if (conc === 'ocean')
    out.push(
      h.all('bio-physics', 'Biology and introductory physics', ['Plus all of the following courses:', 'Where the lab course follows a lecture course the pair of courses counts as a single course.'], ['BIOE 20C', 'PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M']),
    )
  else
    out.push(
      h.all('physics', 'Introductory physics', conc === 'geophysics' ? 'All of the following courses:' : 'Plus all of the following courses:', conc === 'general' ? ['PHYS 6A', 'PHYS 6B', 'PHYS 6L', 'PHYS 6M'] : ['PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M']),
    )
  return out
}

function upperDivision(h: HarnessContext, conc: Conc): Node[] {
  const core = ['EART 110A', 'EART 110B', 'EART 110M', 'EART 110C', 'EART 110N']
  switch (conc) {
    case 'general':
      return [
        h.all('ud-core', 'Core courses', 'All of the following courses:', core),
        h.take('field-lab', 'Two field/laboratory/data analysis courses', ['Two field/laboratory/data analysis courses', `${Q_LABS} The following courses satisfy this requirement:`], codes(...FIELD_LAB), {
          n: 2,
          labs: { pairs: FIELD_LAB_PAIRS, mode: 'required' },
          notes: ['Courses used to satisfy the senior comprehensive requirement cannot be used to satisfy this requirement.'],
        }),
      ]
    case 'geology':
      return [
        h.all('ud-core', 'Core courses', 'All of the following courses:', [
          'EART 109', 'EART 109L', 'EART 110A', 'EART 110B', 'EART 110M', 'EART 110C', 'EART 110N',
          'EART 120', 'EART 120L', 'EART 150', 'EART 150L',
        ]),
        h.take('geology-elective', 'Geology elective', ['Geology Elective: One of the following:', 'Where the lab course follows a lecture course the pair of courses counts as a single course.'], codes(...GEOLOGY_ELECTIVE), {
          labs: { pairs: GEOLOGY_ELECTIVE_PAIRS, mode: 'required' },
        }),
      ]
    case 'planetary':
      return [
        h.all('ud-core', 'Core courses', 'All of the following courses:', [...core, 'EART 119A', 'EART 160']),
        h.take('planetary-elective', 'Planetary science elective', ['Plus one of the following:', 'One elective from the following planetary science courses:'], codes('EART 162', 'EART 163', 'EART 164', 'EART 165')),
      ]
    case 'ocean':
      return [
        h.all('ud-core', 'Core courses', 'All of the following courses:', core),
        h.take('ocean-course', 'OCEA 101 or OCEA 102', 'Plus one of the following courses:', codes('OCEA 101', 'OCEA 102')),
      ]
    case 'geophysics':
      return [
        h.all('ud-core', 'Core courses', 'All of the following courses:', core),
        h.take('geophys-computing', 'EART 112 or EART 119A', 'Plus one of these courses:', codes('EART 112', 'EART 119A')),
        h.take('geophys-course', 'Geophysics course', 'Plus one of these courses:', codes('EART 114', 'EART 118', 'EART 126', 'EART 162')),
      ]
  }
}

function disciplinaryCommunication(h: HarnessContext, conc: Conc): Node {
  const intro =
    conc === 'geology'
      ? 'Students in the Earth Sciences B.S. major with a geology concentration satisfy the DC requirement by completing the following courses:'
      : 'Students in the Earth Sciences B.S. major satisfy the DC requirement by completing one of the following options:'
  const quote = [intro, Q_DC_OVERLAP]
  const summer = () =>
    h.options('dc-summer-field', 'EART 189A and EART 189B', quote, [['EART 189A', 'EART 189B']], { exclusive: false })
  if (conc === 'geology') return h.group('dc', 'Disciplinary Communication (DC)', [summer()], { quote })
  const singles = conc === 'geophysics' ? ['EART 191C', 'EART 195'] : ['EART 191', 'EART 191C', 'EART 191D', 'EART 195']
  const single = h.take('dc-course', conc === 'geophysics' ? 'EART 191C or EART 195' : 'One of EART 191, 191C, 191D or 195', quote, codes(...singles), {
    exclusive: false,
    policy: {},
    check: letterExcept,
  })
  if (conc === 'geophysics') return h.group('dc', 'Disciplinary Communication (DC)', [single], { quote })
  return h.either('dc', 'Disciplinary Communication (DC)', quote, [summer(), single])
}

/**
 * The senior comprehensive, as ONE exclusive slot: the 189A+189B summer field
 * package, EART 195, or a capstone course (per concentration).
 */
function comprehensiveReq(h: HarnessContext, conc: Conc): Node {
  const intro =
    conc === 'geology'
      ? 'To do so, each student in the geology concentration must complete:'
      : conc === 'geophysics'
        ? 'To do so, each student in the geophysics concentration must complete one of the following options:'
        : 'To satisfy the comprehensive requirement, each student in these majors must complete one of the following options:'
  const overlap =
    conc === 'general'
      ? 'Note: Courses used to satisfy the senior comprehensive requirement cannot be used to satisfy the upper-division elective requirement or the field/laboratory/data analysis requirement.'
      : 'Note: Courses used to satisfy the senior comprehensive requirement cannot also be used to fulfill the upper-division elective requirement.'
  const thesisQuote = 'It is required that each student enroll in and pass EART 195: Senior Thesis, in the academic quarter during which they complete their thesis.'
  const singles = conc === 'geology' ? [] : conc === 'geophysics' ? ['EART 195', 'EART 191C'] : ['EART 195', 'EART 191', 'EART 191C', 'EART 191D']
  const summerOk = conc !== 'geophysics'
  const notes: string[] = []
  if (summerOk) notes.push('EART 189B must be completed in the summer; EART 109/109L, 110A and 110B/110M are prerequisites for the summer field option.')
  if (singles.length) notes.push('Capstone course offerings vary year to year; a senior thesis needs a faculty supervisor (contact the department at least three quarters before graduation).')
  // The geophysics comprehensive lists only the thesis and EART 191C; "Other
  // options" appear for the general, planetary and ocean sciences majors only.
  if (conc !== 'geology' && conc !== 'geophysics') notes.push(`${Q_OTHER_OPTIONS} If you have an approved alternative, ask an advisor to record it — the app cannot see it.`)
  const quote = [intro, overlap, ...(summerOk ? ['Satisfactory completion of Summer Field', 'EART 189B must be completed in the summer.'] : []), ...(singles.includes('EART 195') ? [thesisQuote] : [])]
  const set = singles.length ? codes(...singles) : codes()
  // "EART 189B must be completed in the summer." A dated EART 189B outside a
  // summer term does not complete the summer field option (no term = accepted).
  const summerUnit = (avail: Enrollment[]): Enrollment[][] => {
    if (!summerOk) return []
    const a = avail.find((e) => e.code === 'EART189A')
    const b = avail.find((e) => e.code === 'EART189B' && (e.term == null || isSummer(e.term)))
    return a && b ? [[a, b]] : []
  }
  return h.take('comprehensive', 'Senior Comprehensive Requirement', quote, set, {
    policy: {},
    check: letterExcept,
    composite: { eligible: summerOk ? codes('EART 189A', 'EART 189B') : codes(), build: summerUnit },
    pool: [summerOk ? 'EART 189A + 189B (summer field)' : null, ...singles.map((c) => c)].filter(Boolean).join(', or '),
    notes,
  })
}

/** CHEM 3A–3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL (as biology-bs). */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Plus one of the following options:', Q_CHEM_NOTE]
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
