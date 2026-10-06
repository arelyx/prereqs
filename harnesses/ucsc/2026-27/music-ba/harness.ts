// Music B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/music-ba.md
//
// Three concentrations (Compositional Practices, Global Musics, Western Music).
// Each concentration's courses are one exclusive allocation (a course counts
// once); DC is an overlay.
//
// Judgement calls (see manifest notes):
// - Modules (CP, GM) come from external "list of approved courses" pages the
//   app does not have. We count candidates with deliberately WIDE pools (so a
//   shortfall is a real "unmet") and otherwise report cannot-check: module
//   membership is never "met".
// - Grades: "All upper-division courses applied toward the music majors must be
//   taken for a letter grade, except MUSC 120 (Seminar in Composition) and
//   upper-division workshops & performing ensembles". Courses on the
//   "Elective Ensembles/Performance Practice Workshops" lists (incl. lessons
//   listed there) are treated as workshops/ensembles in those slots.
// - MUSC 14 may be bypassed by the Theory Placement Exam (attestation) or an
//   "A-" in MUSC 14; MUSC 30A in the plan is taken as evidence of placement
//   (you cannot enroll in 30A otherwise).
import { NONE, anyOf, codes, defineHarness, isPass, range, series, termLabel } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Conc = 'compositional-practices' | 'global-musics' | 'western-music'

// --- course lists (page order) ---------------------------------------------
const CP_HISTORY = [
  'MUSC 101A', 'MUSC 101B', 'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H', 'MUSC 105A', 'MUSC 105C',
  'MUSC 105E', 'MUSC 105H', 'MUSC 105I', 'MUSC 105L', 'MUSC 105M', 'MUSC 105O', 'MUSC 105P', 'MUSC 105Q',
  'MUSC 105R', 'MUSC 105S', 'MUSC 105T', 'MUSC 105V',
]
const ELECTIVE_ENSEMBLES = [
  'MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 8B', 'MUSC 8A', 'MUSC 9', 'MUSC 10',
  'MUSC 12', 'MUSC 12B', 'MUSC 20C', 'MUSC 53A', 'MUSC 55', 'MUSC 55A', 'MUSC 58', 'MUSC 61', 'MUSC 62',
  'MUSC 70', 'MUSC 71', 'MUSC 72', 'MUSC 73', 'MUSC 74', 'MUSC 77', 'MUSC 78', 'MUSC 102', 'MUSC 103',
  'MUSC 129', 'MUSC 158', 'MUSC 161', 'MUSC 161A', 'MUSC 163', 'MUSC 164', 'MUSC 165', 'MUSC 166',
  'MUSC 167', 'MUSC 167R', 'MUSC 168',
]
const GM_ELECTIVE_ENSEMBLES = [...ELECTIVE_ENSEMBLES, 'MUSC 267']
// "All courses except MUSC 20C, MUSC 71, MUSC 74, and MUSC 167R may be repeated for credit"
const NOT_REPEATABLE = new Set(['MUSC20C', 'MUSC71', 'MUSC74', 'MUSC167R'])
const DC_LIST = [
  'MUSC 101A', 'MUSC 101B', 'MUSC 101C', 'MUSC 101F', 'MUSC 101G', 'MUSC 105A', 'MUSC 105C', 'MUSC 105M',
  'MUSC 105Q', 'MUSC 105T', 'MUSC 150D',
]
const GM_ELECTIVES = [
  'MUSC 101A', 'MUSC 101B', 'MUSC 101C', 'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H', 'MUSC 105A',
  'MUSC 105C', 'MUSC 105E', 'MUSC 105H', 'MUSC 105I', 'MUSC 105L', 'MUSC 105M', 'MUSC 105O', 'MUSC 105P',
  'MUSC 105Q', 'MUSC 105R', 'MUSC 105S', 'MUSC 105T', 'MUSC 105V', 'MUSC 120', 'MUSC 121A', 'MUSC 121B',
  'MUSC 122', 'MUSC 150A', 'MUSC 150B', 'MUSC 150C', 'MUSC 150D', 'MUSC 150H', 'MUSC 150I', 'MUSC 150J',
  'MUSC 150K', 'MUSC 150N', 'MUSC 150P', 'MUSC 150S', 'MUSC 150T', 'MUSC 150X', 'MUSC 150Z', 'MUSC 203F',
  'MUSC 203H',
]
const GRAD_RESEARCH = ['MUSC 200', 'MUSC 203G', 'MUSC 253A', 'MUSC 253B', 'MUSC 253C', 'MUSC 253D', 'MUSC 253S']
const RESEARCH_PROJECT = [
  'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H', 'MUSC 105A', 'MUSC 105C', 'MUSC 105E', 'MUSC 105H',
  'MUSC 105I', 'MUSC 105L', 'MUSC 105M', 'MUSC 105O', 'MUSC 105P', 'MUSC 105Q', 'MUSC 105R', 'MUSC 105S',
  'MUSC 105T', 'MUSC 105V', 'MUSC 199', 'MUSC 200',
]
const CREATIVE_PORTFOLIO = [
  'MUSC 120', 'MUSC 150A', 'MUSC 150B', 'MUSC 150C', 'MUSC 150D', 'MUSC 150I', 'MUSC 150J', 'MUSC 150K',
  'MUSC 150N', 'MUSC 150P', 'MUSC 150R', 'MUSC 150S', 'MUSC 150T', 'MUSC 150X', 'MUSC 150Z', 'MUSC 199',
  'MUSC 203H',
]
const WM_CORE_ABC = ['MUSC 101A', 'MUSC 101B', 'MUSC 101C']
const WM_CORE_AH = ['MUSC 101A', 'MUSC 101B', 'MUSC 101C', 'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H']
const WM_105 = [
  'MUSC 105A', 'MUSC 105C', 'MUSC 105E', 'MUSC 105H', 'MUSC 105I', 'MUSC 105L', 'MUSC 105M', 'MUSC 105O',
  'MUSC 105P', 'MUSC 105Q', 'MUSC 105R', 'MUSC 105S', 'MUSC 105T', 'MUSC 105V',
]
const WM_THEORY1 = ['MUSC 150A', 'MUSC 150B', 'MUSC 150C', 'MUSC 150H', 'MUSC 150K', 'MUSC 150T', 'MUSC 150X']
const WM_THEORY2 = [
  'MUSC 150A', 'MUSC 150B', 'MUSC 150C', 'MUSC 150D', 'MUSC 150H', 'MUSC 150I', 'MUSC 150J', 'MUSC 150K',
  'MUSC 150N', 'MUSC 150P', 'MUSC 150R', 'MUSC 150S', 'MUSC 150T', 'MUSC 150X', 'MUSC 150Z',
]
const WM_FINAL_LIST = ['MUSC 121B', 'MUSC 122', 'MUSC 123B']
const WM_ENSEMBLES = [
  'MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 8A', 'MUSC 8B', 'MUSC 9', 'MUSC 10',
  'MUSC 12', 'MUSC 102', 'MUSC 103', 'MUSC 158', 'MUSC 160', 'MUSC 163', 'MUSC 164', 'MUSC 165', 'MUSC 166',
  'MUSC 168',
]
const WM_LESSONS = ['MUSC 61', 'MUSC 62', 'MUSC 161', 'MUSC 161A', 'MUSC 162', 'MUSC 196B']

// Upper-division courses exempt from the letter-grade rule everywhere:
// MUSC 120 and upper-division workshops & performing ensembles (catalog
// ensembles/workshops, including ones only a module list might name).
const LETTER_EXEMPT = new Set(
  ['MUSC 120', 'MUSC 102', 'MUSC 103', 'MUSC 129', 'MUSC 158', 'MUSC 159A', 'MUSC 160', 'MUSC 163', 'MUSC 164', 'MUSC 165', 'MUSC 166', 'MUSC 167', 'MUSC 167R', 'MUSC 168', 'MUSC 180X'].map((c) => c.replace(' ', '')),
)

// Module ensemble/workshop pool, deliberately wide (the module lists are
// external): the elective list plus any repeatable MUSC course of ≤3 credits
// (ensembles, workshops, lessons), except musicianship/keyboard courses.
const moduleEnsemblePool = (list: string[]): CourseSet =>
  codes(...list).or(
    range('MUSC', 1, 199)
      .where((c) => c.repeatable && c.credits <= 3, 'repeatable, ≤3 credits')
      .except(['MUSC 31', 'MUSC 59', 'MUSC 60']),
  )
const LD_MODULE = anyOf(series('MUSC', 11), series('MUSC', 80), series('MUSC', 81))

const Q = {
  intro: 'All students pursuing the B.A. degree must select one of the three concentrations.',
  letter:
    'All upper-division courses applied toward the music majors must be taken for a letter grade, except MUSC 120 (Seminar in Composition) and upper-division workshops & performing ensembles, which may be taken Pass/No Pass.',
  repeatEns: 'can count toward multiple elective requirements if repeated.',
  noDoubleEns: 'These courses cannot double-count with modular ensemble/workshop requirements.',
}

export default defineHarness({
  program: 'music-ba',
  edition: '2026-27',
  title: 'Music B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: Q.intro,
      options: [
        { value: 'compositional-practices', label: 'Compositional Practices', aliases: ['compositional', 'cp', 'compositional practices concentration'] },
        { value: 'global-musics', label: 'Global Musics', aliases: ['global', 'gm', 'global music', 'global musics concentration'] },
        { value: 'western-music', label: 'Western Music', aliases: ['western', 'wm', 'western music concentration', 'western art music'] },
      ],
    },
  ],
  attestations: [
    {
      id: 'theory-placement',
      label: 'Placed into MUSC 30A (Theory Placement Exam or A- in MUSC 14)',
      quote: 'Students can bypass MUSC 14 by placing directly into MUSC 30A via the Theory Placement Exam.',
      aliases: ['placement', 'theory placement exam', 'tpe'],
    },
    {
      id: 'senior-composition-recital',
      label: 'Senior composition recital or portfolio presented',
      quote: 'For their Senior Capstone project, students in the Compositional Practices concentration must present a senior composition recital or portfolio.',
      aliases: ['recital', 'portfolio', 'senior composition'],
    },
    {
      id: 'musc60-waiver',
      label: 'MUSC 60 waived (instructor approval or UCSC piano lessons)',
      quote: 'MUSC 60 enrollment may be waived by instructor approval, or if the student is taking piano lessons from a UC Santa Cruz instructor.',
      aliases: ['musc 60 waiver', 'musc60', 'keyboard waiver', 'waived'],
    },
    {
      id: 'proficiency-audition',
      label: 'Proficiency audition (jury) passed',
      quote: 'A juried "proficiency audition" is required for students that have completed the MUSC 30 series.',
      aliases: ['proficiency', 'audition', 'jury', 'juries'],
    },
  ],
  notes: [
    'Upper-division courses need a letter grade, except MUSC 120 and upper-division workshops/performing ensembles; lower-division courses may be P/NP.',
    'Community-college theory courses with the listed C-ID descriptors articulate to MUSC 14 / 30A–C / 31 — add them as completed courses.',
    'Course substitutions (other institutions, Sussex exchange) are approved by the curriculum committee — add an approved course as the course it replaces.',
  ],
  evaluate(h) {
    h.policy = undefined
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    const conc = h.choice('concentration') as Conc

    // Upper-division codes graded P that the letter rule blocks (grades are per code).
    const pUpper = new Set(h.enrollments.filter((e) => isPass(e.grade) && h.catalog.get(e.code)?.division === 'upper').map((e) => e.code))
    /** `set` minus courses taken P/NP that need a letter grade (extraExempt: workshop-listed courses in this slot). */
    const L = (set: CourseSet, extraExempt: string[] = []): CourseSet => {
      const ex = new Set(extraExempt.map((c) => c.replace(' ', '')))
      const blocked = [...pUpper].filter((c) => !LETTER_EXEMPT.has(c) && !ex.has(c) && set.has(c, h.catalog))
      for (const e of h.enrollments)
        if (blocked.includes(e.code)) h.excluded.set(e.id, `${e.display}: taken P/NP, but upper-division courses need a letter grade`)
      return blocked.length ? set.except(blocked) : set
    }

    const qual = h.info(
      'qualification',
      'Major qualification',
      'In order to qualify for the music major, students must successfully complete MUSC 14 or MUSC 30A (depending on major track) with a grade of "C" or better.',
      'Gates declaration, not completion.',
    )
    if (conc === 'compositional-practices') return [qual, ...compositional(h, L)]
    if (conc === 'global-musics') return [qual, ...globalMusics(h, L)]
    return [qual, ...western(h, L)]
  },
})

type LFn = (set: CourseSet, extraExempt?: string[]) => CourseSet

// --- shared pieces ------------------------------------------------------------

/** MUSC 14, or placement into MUSC 30A (exam / A- in 14; 30A in the plan is evidence). */
function musc14(h: HarnessContext, quote: string): Node {
  return h.either('musc14', 'MUSC 14 (or placement into MUSC 30A)', quote, [
    h.take('musc14/course', 'MUSC 14 Beginning Western Theory and Musicianship', 'MUSC 14 — Beginning Western Theory and Musicianship (5)', codes('MUSC 14'), { exclusive: false }),
    h.take('musc14/30a', 'MUSC 30A (placed into it)', 'Students can bypass MUSC 14 by placing directly into MUSC 30A via the Theory Placement Exam.', codes('MUSC 30A'), { exclusive: false }),
    h.attest('theory-placement'),
  ])
}

/** MUSC 31 ear training: `need` sections, with the page's failed-section exception. */
function ear31(h: HarnessContext, need: number, quote: string[]): Node {
  const passed = h.taken(codes('MUSC 31'))
  const attempts = h.enrollments.filter((e) => e.code === 'MUSC31')
  const last = attempts[attempts.length - 1]
  const failed = attempts.length - passed.length
  // NOTE: a failed section need not be repeated if the final quarter of 31 was
  // passed and at least half of the required sections were passed.
  const ok = passed.length >= need || (failed > 0 && passed.length >= Math.ceil(need / 2) && !!last && passed.includes(last))
  return h.node('musc31', `MUSC 31 Ear Training — ${need} sections`, quote, ok ? 'met' : 'unmet', {
    progress: { have: Math.min(passed.length, need), need, unit: 'sections' },
    used: passed,
    options: ['MUSC31'],
    detail: ok
      ? failed > 0 && passed.length < need
        ? 'A failed section is excused: final quarter passed and at least half the sections passed.'
        : undefined
      : `${passed.length} of ${need} sections passed`,
  })
}

/** Elective ensembles/workshops: three quarters; some courses are not repeatable. */
function electiveEnsembles(h: HarnessContext, list: string[], quote: string[]): Node {
  return h.take('elective-ensembles', 'Elective ensembles / performance practice workshops (3 quarters)', quote, codes(...list), {
    n: 3,
    repeatable: true,
    policy: {},
    check: noRepeatOfNonRepeatable,
  })
}

function noRepeatOfNonRepeatable(chosen: Enrollment[]): string | null {
  const seen = new Set<string>()
  for (const e of chosen) {
    if (NOT_REPEATABLE.has(e.code) && seen.has(e.code)) return `${e.display} may not be repeated for credit`
    seen.add(e.code)
  }
  return null
}

/** Three modules from an external list: count candidates, never "met". */
function modules(h: HarnessContext, L: LFn, ud: { set: CourseSet; quote: string; pool: string }, ens: { list: string[]; quote: string }, listQuote: string, lowerQuote: string): Node {
  const lower = h.take('modules/lower', 'Three lower-division module courses (MUSC 11/80/81 series)', lowerQuote, LD_MODULE, { n: 3, policy: {} })
  const upper = h.take('modules/upper', 'Three upper-division module courses', ud.quote, L(ud.set), { n: 3, pool: ud.pool, policy: {} })
  const ensembles = h.take('modules/ensembles', 'Six quarters of module ensembles/workshops', ens.quote, moduleEnsemblePool(ens.list), {
    n: 6,
    repeatable: true,
    policy: {},
    pool: 'ensembles/workshops (the module lists are external; counted from all repeatable ≤3-credit MUSC courses)',
    check: noRepeatOfNonRepeatable,
  })
  const confirm = h.cannotCheck(
    'modules/confirm',
    'Confirm each course belongs to one of your three modules',
    listQuote,
    'The module course lists are on a separate catalog page the app does not have: check that each module has its lower-division course, upper-division course and two ensemble/workshop quarters.',
  )
  return h.group('modules', 'Modular Requirements (three modules)', [lower, upper, ensembles, confirm], { quote: 'Each module consists of:' })
}

// --- Compositional Practices --------------------------------------------------

function compositional(h: HarnessContext, L: LFn): Node[] {
  const lower = h.group('lower', 'Lower-Division Theory', [
    musc14(h, 'MUSC 14 is meant for students with some experience with Western music theory. Students can bypass MUSC 14 by placing directly into MUSC 30A via the Theory Placement Exam.'),
    h.all('theory-ld', 'MUSC 20B, 30A, 30B', 'Lower-Division Theory', ['MUSC 20B', 'MUSC 30A', 'MUSC 30B'], { policy: {} }),
    ear31(h, 2, [
      'The following course should be taken alongside MUSC 30-series classes',
      'have passed at least half of their total required sections of 31 (i.e. at least one section for the BA-CP track)',
    ]),
  ])

  const upper = h.group('upper', 'Upper-Division Requirements', [
    h.take('musc120', 'MUSC 120 Seminar in Music Composition (twice)', 'Students must take MUSC 120 at least twice, with different instructors when possible.', codes('MUSC 120'), {
      n: 2,
      repeatable: true,
      policy: {},
      notes: ['Take it with different instructors when possible.'],
    }),
    h.take('comp-analysis', 'Composition/Analysis', 'Choose one of the courses below to take. If choosing MUSC 120, it must be taken with a different instructor as your previous two times, if possible.', L(codes('MUSC 120', 'MUSC 121A', 'MUSC 121B')), {
      repeatable: true,
      policy: {},
    }),
    h.take('musc101c', 'MUSC 101C Western Music History (1910-present)', 'MUSC 101C — Western Music History (1910-present) (5)', L(codes('MUSC 101C')), { policy: {} }),
  ])

  const mods = modules(
    h,
    L,
    {
      // "MUSC 150 or equivalent (theory/composition-based)": equivalents are on
      // the external list, so any upper-division/graduate MUSC lecture is a candidate.
      set: range('MUSC', 100, 299).except(moduleEnsemblePool(ELECTIVE_ENSEMBLES)),
      quote: 'an upper-division MUSC 150 or equivalent (theory/composition-based) course specific to each module (three total)',
      pool: 'MUSC 150 or an equivalent theory/composition course on the module list (counted from any upper-division MUSC lecture)',
    },
    { list: ELECTIVE_ENSEMBLES, quote: 'two quarters of performing ensembles or performance practice workshops specific to each module (six total)' },
    'See the [list of approved courses](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/arts-division/music/compositional-practices-concentration-module-course-list) relevant to each module.',
    'a lower-division MUSC 11, MUSC 80, or MUSC 81-series course specific to each module (three total)',
  )

  // "Students may also elect to take a graduate-level seminar in place of their final elective."
  const gradSeminar = range('MUSC', 200, 299).minCredits(5).except(['MUSC 295', 'MUSC 297', 'MUSC 298', 'MUSC 299'])
  const electives = h.group('electives', 'Electives', [
    h.take(
      'history-elective',
      'History/Culture Elective',
      ['Students must take one course from the MUSC 101, Foundational History/Culture, or MUSC 105, Topical History, series to fulfill their upper-division elective.', 'Students may also elect to take a graduate-level seminar in place of their final elective.'],
      L(codes(...CP_HISTORY).or(gradSeminar)),
      { policy: {}, pool: `${CP_HISTORY.join(', ')}; or a graduate-level MUSC seminar (instructor/department permission)` },
    ),
    electiveEnsembles(h, ELECTIVE_ENSEMBLES, [
      'Take three quarters of any of the following courses. All courses except MUSC 20C, MUSC 71, MUSC 74, and MUSC 167R may be repeated for credit, and can count toward multiple elective requirements if repeated.',
      Q.noDoubleEns,
    ]),
  ])

  const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement for the Compositional Practices concentration of the music B.A. degree is satisfied by completing one of the following courses.', L(codes(...DC_LIST)), {
    exclusive: false,
    policy: {},
  })
  const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [
    h.take('musc196a', 'MUSC 196A Senior Recital Preparation', 'MUSC 196A — Senior Recital Preparation (without individual lessons) (5)', L(codes('MUSC 196A')), { policy: {} }),
    h.attest('senior-composition-recital'),
  ])
  return [lower, upper, mods, electives, dc, comprehensive]
}

// --- Global Musics --------------------------------------------------------------

function globalMusics(h: HarnessContext, L: LFn): Node[] {
  const lower = h.group('lower', 'Lower-Division Theory', [
    musc14(h, 'MUSC 14 is meant for students with some Western music theory experience. Students can bypass this requirement by placing directly into MUSC 30A via the Theory Placement Exam.'),
    h.all('theory-ld', 'MUSC 20A and 20B', 'Lower-Division Theory', ['MUSC 20A', 'MUSC 20B'], { policy: {} }),
  ])
  const mods = modules(
    h,
    L,
    {
      set: anyOf(series('MUSC', 101), series('MUSC', 105), series('MUSC', 120), series('MUSC', 150)),
      quote: 'an upper-division MUSC 101, MUSC 105, MUSC 120, or MUSC 150 course specific to each module (three total)',
      pool: 'MUSC 101, 105, 120 or 150 series (module list is external)',
    },
    { list: GM_ELECTIVE_ENSEMBLES, quote: 'two quarters of performing ensemble or performance practice workshop specific to each module (six total)' },
    'See the [list of approved courses](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/arts-division/music/global-musics-concentration-module-course-list) relevant to each module.',
    'a lower-division MUSC 11, MUSC 80, or MUSC 81-series course specific to each module (three total)',
  )
  const electives = h.group('electives', 'Electives', [
    h.take(
      'ud-electives',
      'Three upper-division lectures/seminars',
      ['Take three (3) lectures or seminars from the upper-division music catalog.', 'These elective courses cannot double count with modular courses, unless the course is repeatable for credit and is taken more than once with a different instructor.'],
      L(codes(...GM_ELECTIVES)),
      { n: 3, repeatable: 'catalog', policy: {} },
    ),
    electiveEnsembles(h, GM_ELECTIVE_ENSEMBLES, [
      'Take three quarters of any of the following courses. All courses except MUSC 74, MUSC 20C, MUSC 71, and MUSC 167R may be repeated for credit, and can count toward multiple elective requirements if repeated.',
      Q.noDoubleEns,
    ]),
  ])
  const grad = h.take(
    'grad-research',
    'Graduate-Level Research Requirement',
    ['Students in the Global Musics concentration are also required to take one graduate-level course.', 'MUSC 200 cannot be double counted if taken to satisfy the Research Project option within the Comprehensive Requirement.'],
    codes(...GRAD_RESEARCH),
    { policy: {} },
  )
  const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement for the global musics concentration of the music B.A. degree is satisfied by completing one of the following courses.', L(codes(...DC_LIST)), {
    exclusive: false,
    policy: {},
  })

  // Comprehensive: a listed course taken CONCURRENTLY with MUSC 195A (research)
  // or MUSC 196A (creative portfolio). One exclusive unit of two courses.
  const research = L(codes(...RESEARCH_PROJECT))
  const creative = L(codes(...CREATIVE_PORTFOLIO))
  const thesis = L(codes('MUSC 195A'))
  const capstone = L(codes('MUSC 196A'))
  const concurrent = (a: Enrollment, b: Enrollment) => a.id !== b.id && (a.term == null || b.term == null || a.term === b.term)
  const comprehensive = h.take(
    'comprehensive',
    'Comprehensive: research project or creative portfolio',
    [
      'The senior comprehensive requirement (capstone) is a two-part requirement that is satisfied by 1) enrollment in one of the course listed below, and 2) an independent study course with your faculty advisor.',
      'A) The research project option requires a 15-25 page research paper, which is accomplished by taking the independent study course MUSC 195A (Senior Thesis) with their faculty advisor, concurrently with one of the listed research courses.',
      'If a student chooses to do the creative portfolio options, they must concurrently enroll in the independent study course MUSC 196A (Global Musics Capstone) with their faculty advisor.',
    ],
    NONE,
    {
      policy: {},
      pool: `Research: one of ${RESEARCH_PROJECT.join(', ')} with MUSC 195A in the same quarter; or Creative portfolio: one of ${CREATIVE_PORTFOLIO.join(', ')} with MUSC 196A in the same quarter`,
      composite: {
        eligible: research.or(creative).or(thesis).or(capstone),
        build: (avail) => {
          const out: Enrollment[][] = []
          for (const c of avail) {
            if (research.has(c.code, h.catalog)) {
              const t = avail.find((x) => x.code === 'MUSC195A' && concurrent(c, x))
              if (t) out.push([c, t])
            }
            if (creative.has(c.code, h.catalog)) {
              const t = avail.find((x) => x.code === 'MUSC196A' && concurrent(c, x))
              if (t) out.push([c, t])
            }
          }
          return out
        },
      },
      notes: ['The listed course and MUSC 195A/196A must be taken in the same quarter, and the listed course cannot also count as a module course, elective or the graduate-level requirement.'],
    },
  )
  return [lower, mods, electives, grad, dc, comprehensive]
}

// --- Western Music ----------------------------------------------------------------

/** Count quarters: distinct terms (each completed-without-term enrollment counts once). */
function quarters(list: Enrollment[]): number {
  const terms = new Set<string>()
  let noTerm = 0
  for (const e of list) {
    if (e.term == null) noTerm++
    else terms.add(e.term)
  }
  return terms.size + noTerm
}

function western(h: HarnessContext, L: LFn): Node[] {
  const lower = h.group('lower', 'Lower-Division Courses', [
    h.all('theory-ld', 'MUSC 30A, 30B, 30C', 'Take all of the following courses.', ['MUSC 30A', 'MUSC 30B', 'MUSC 30C'], { policy: {} }),
    h.group('keyboard', 'Keyboard and Musicianship', [
      ear31(h, 3, [
        'The following courses should be taken alongside MUSC 30-series classes.',
        'have passed at least half of their total required sections of MUSC 31 (i.e. at least two sections for the BA-WM track)',
      ]),
      h.either('musc60', 'MUSC 60 Fundamental Keyboard Skills (or waiver)', 'MUSC 60 — Fundamental Keyboard Skills (2)', [
        h.take('musc60/course', 'MUSC 60', 'MUSC 60 — Fundamental Keyboard Skills (2)', codes('MUSC 60'), { exclusive: false, policy: {} }),
        h.attest('musc60-waiver'),
      ]),
    ]),
  ])

  const ABC = codes(...WM_CORE_ABC)
  const history = h.group('history', 'Core Upper-Division History/Culture', [
    h.take(
      'core-history',
      'Two of MUSC 101A–C plus two more of MUSC 101A–H',
      ['Take two of these courses', 'Students may not double count courses between the MUSC 101A-C list and MUSC 101A-H list.'],
      L(codes(...WM_CORE_AH)),
      { n: 4, atLeast: [{ set: ABC, n: 2, label: 'MUSC 101A/B/C' }], policy: {} },
    ),
    h.take('elective-history', 'Elective Upper-Division History', 'Take one of these courses', L(codes(...WM_105)), { policy: {} }),
  ])
  const theory = h.group('theory', 'Upper-Division Theory', [
    h.take('theory1', 'Elective Theory 1', 'Take one of the following courses (cannot double count with other electives):', L(codes(...WM_THEORY1)), { policy: {} }),
    h.take('theory2', 'Elective Theory 2', 'Take one of the following courses (cannot double count with other electives):', L(codes(...WM_THEORY2)), { policy: {} }),
  ])
  const final = h.take(
    'final-elective',
    'Final Upper-Division Elective',
    ['Students can fulfill their final upper-division elective by taking:', 'One additional class from the MUSC 150 series, not already taken;', 'One additional class from the MUSC 101 series, not already taken; OR'],
    L(series('MUSC', 150).or(series('MUSC', 101)).or(codes(...WM_FINAL_LIST))),
    { policy: {}, pool: 'another MUSC 150- or 101-series course, or MUSC 121B, 122, 123B' },
  )

  // Performing ensembles + applied lessons: quarters.
  const ens = h.taken(codes(...WM_ENSEMBLES), {})
  const ensQ = quarters(ens)
  const ensembles = h.node(
    'ensembles',
    'Performing ensembles (6 quarters, one per quarter)',
    [
      'Music B.A. (Western Music) students are expected to complete six quarters of performing ensembles on their primary instrument or voice.',
      'A maximum of one ensemble per quarter can be counted toward fulfillment of the total six quarter requirement.',
    ],
    ensQ >= 6 ? 'met' : 'unmet',
    {
      used: ens,
      progress: { have: Math.min(ensQ, 6), need: 6, unit: 'quarters' },
      options: WM_ENSEMBLES.map((c) => c.replace(' ', '')),
      detail: ensQ >= 6 ? undefined : `${ensQ} of 6 quarters`,
      notes: ['Two ensembles in one quarter count once unless the Curriculum Committee approves otherwise.', 'Ensembles and lessons must be on your primary instrument or voice — the app cannot see that.'],
    },
  )
  // Lessons: upper-division lessons need a letter grade; each lesson quarter needs a concurrent ensemble.
  const lessonsAll = h.taken(L(codes(...WM_LESSONS)), {})
  const ensTerms = new Set(ens.map((e) => e.term).filter((t): t is string => t != null))
  const lessons = lessonsAll.filter((e) => e.term == null || ensTerms.has(e.term))
  const lonely = lessonsAll.filter((e) => !lessons.includes(e))
  const lesQ = quarters(lessons)
  const lessonNode = h.node(
    'lessons',
    'Individual applied lessons (6 quarters)',
    [
      'Music B.A. (Western Music) students are expected to complete six quarters of applied lessons on their primary instrument or voice.',
      'Concurrent enrollment in an appropriate ensemble is required.',
    ],
    lesQ >= 6 ? 'met' : 'unmet',
    {
      used: lessons,
      progress: { have: Math.min(lesQ, 6), need: 6, unit: 'quarters' },
      options: WM_LESSONS.map((c) => c.replace(' ', '')),
      detail:
        lesQ >= 6
          ? undefined
          : [`${lesQ} of 6 quarters`, lonely.length ? `no concurrent ensemble in ${[...new Set(lonely.map((e) => termLabel(e.term!)))].join(', ')}` : ''].filter(Boolean).join(' · '),
    },
  )
  const upper = h.group('upper', 'Upper-Division Courses', [history, theory, final, ensembles, lessonNode, h.attest('proficiency-audition')])

  const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement for the western art music concentration of the music B.A. degree is satisfied by completing one of the following courses.', L(codes(...DC_LIST)), {
    exclusive: false,
    policy: {},
  })
  const comprehensive = h.take(
    'comprehensive',
    'Comprehensive: another MUSC 105-series course or MUSC 120',
    'To fulfill the the comprehensive requirement, students may either take an additional MUSC 105-series course, not already taken, or the following course:',
    L(series('MUSC', 105).or(codes('MUSC 120'))),
    { policy: {}, pool: 'a MUSC 105-series course not used elsewhere, or MUSC 120' },
  )
  return [lower, upper, dc, comprehensive]
}

