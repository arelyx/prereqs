// Sociology B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/sociology-ba.md
//
// General major (11 courses) and the Intensive Concentration in Digital
// Justice Studies (DJS, 15 courses). Course slots are one allocation; DC
// (SOCY 105A/105B) and the comprehensive (seminar / graduate course / thesis)
// are overlays. "One thesis individual study course may also count toward
// both the thesis requirement as well as one of the upper-division elective
// courses" — so, once the thesis is done, one SOCY 195 course may also be an
// elective.
//
// Judgement calls:
// - "All major qualification courses must be taken for letter grades." The
//   qualification courses are also the lower-division preparation courses.
//   A P grade there is shown as cannot-check (it may block declaration, which
//   the app does not decide), never silently met or unmet.
// - SOCY 3A substitutes (LALS 100A / PSYC 100) depend on the student's other
//   program: attestations, consulted only when the student uses a substitute.
// - Pre-approved outside courses (general: up to two; DJS: no limit) come
//   from external lists: a short elective requirement with unused outside
//   upper-division courses is cannot-check.
import { codes, defineHarness, display, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const PREP = codes('SOCY 1', 'SOCY 10', 'SOCY 15')
const LETTER = { letter: true }
const ADVANCED = range('SOCY', 110, 189).minCredits(5)
const THESIS = codes('SOCY 195A', 'SOCY 195B', 'SOCY 195C')
const GRAD = range('SOCY', 201, 294).minCredits(5)
// The senior seminar is the comprehensive, not a substitute elective.
const SENIOR_SEMINAR = codes('SOCY 196S')

const Q_LETTER = 'All major qualification courses must be taken for letter grades.'
const Q_DC = 'The following courses satisfy the Disciplinary Communication requirement for students in programs administered by the Sociology Department.'
const Q_THESIS_ELECTIVE = 'One thesis individual study course may also count toward both the thesis requirement as well as one of the upper-division elective courses required for the major.'
const Q_LALS = 'who are pursuing a double major or minor in Latin American and Latino Studies (LALS) may substitute SOCY 3A with LALS 100A.'
const Q_PSYC = 'who are double majoring in psychology or cognitive science, may substitute SOCY 3A with PSYC 100.'
const Q_DJS_DELIVERABLE = 'To complete the final requirements for DJS, the integrated project practicum—narrative and digital deliverable—must be mounted on the appropriate web-enabled database managed by the Everett Program.'

export default defineHarness({
  program: 'sociology-ba',
  edition: '2026-27',
  title: 'Sociology B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Major',
      quote: 'The DJS intensive concentration is an option for students wishing to major in sociology and focus in the area of Digital Justice Studies (DJS).',
      options: [
        { value: 'general', label: 'General Sociology Major', aliases: ['general', 'general sociology', 'sociology', 'none', 'no concentration'] },
        {
          value: 'djs',
          label: 'Sociology Major with Intensive Concentration in DJS',
          aliases: ['djs', 'digital justice studies', 'intensive concentration in djs', 'djs intensive concentration', 'digital justice', 'intensive'],
        },
      ],
      default: 'general',
    },
  ],
  attestations: [
    { id: 'lals-double', label: 'Pursuing a double major or minor in Latin American and Latino Studies (LALS)', quote: Q_LALS, aliases: ['lals', 'latin american'] },
    { id: 'psyc-double', label: 'Double majoring in psychology or cognitive science', quote: Q_PSYC, aliases: ['psychology', 'cognitive science', 'psyc'] },
    { id: 'djs-deliverable', label: 'DJS project practicum deliverable mounted on the Everett Program database', quote: Q_DJS_DELIVERABLE, aliases: ['deliverable', 'everett', 'capstone project', 'djs project'] },
  ],
  notes: [
    'Major qualification courses (SOCY 1/10/15, and SOCY 30A for DJS) must be taken for a letter grade; other major courses may be taken P/NP.',
    'Pre-approved outside courses come from department lists the app does not have — outside upper-division courses are shown as “check yourself”, never counted automatically.',
    'An AP Statistics score of 4 or more may substitute for SOCY 3B — if so, ask the Sociology advisor to record it.',
  ],
  evaluate(h) {
    // "All other major requirements may be taken as a letter grade or Pass/No Pass."
    h.policy = undefined
    const djs = h.choice('concentration') === 'djs'

    const prepChildren: Node[] = []
    if (djs)
      prepChildren.push(h.take('socy30a', 'SOCY 30A Introduction to Digital Justice Studies', ['Students must take the following three courses or their articulated equivalents.', Q_LETTER], codes('SOCY 30A'), { policy: LETTER }))
    const prep = h.take(
      'prep',
      'Two of SOCY 1, 10, 15',
      djs ? ['And select two from the following three options:', Q_LETTER] : ['Select two from the following three courses:', Q_LETTER],
      PREP,
      { n: 2, policy: LETTER },
    )
    prepChildren.push(prep)
    prepChildren.push(
      djs
        ? h.info(
            'qualification',
            'Qualifying for DJS (B- or better, director approval)',
            'Students are required to pass each of the courses with a B- or better, and obtain approval from the faculty director, to qualify for the DJS concentration.',
            'These gate entry to the concentration (declaration), not completion of the degree.',
          )
        : h.info(
            'qualification',
            'Qualifying for the major (C+ or better)',
            'Students must take two of the following courses, and pass each with C+ or better, to qualify:',
            'A C+ or better in two of SOCY 1/10/15 is needed to declare the major; it gates declaration, not completion.',
          ),
    )
    const prepGroup = h.group('ld-prep', 'Lower-division preparation', prepChildren, {
      quote: djs ? 'Students must take the following three courses or their articulated equivalents.' : 'All sociology majors are required to take two lower-division preparation courses, or their articulated equivalents.',
    })

    const methods = h.group(
      'ld-core',
      'Lower-division core courses',
      [
        socy3a(h, djs),
        h.take('socy3b', 'SOCY 3B Statistical Methods (or STAT 5, STAT 7, PSYC 2)', 'STAT 5, STAT 7, PSYC 2, or their articulated equivalents, as well as an AP Statistics score of 4 or more, may substitute for SOCY 3B.', codes('SOCY 3B', 'STAT 5', 'STAT 7', 'PSYC 2'), {
          prefer: (c) => (c === 'SOCY3B' ? 0 : 1),
          notes: ['An AP Statistics score of 4 or more also substitutes — if so, ask the Sociology advisor to record it.'],
        }),
      ],
      { quote: 'The following two sociology courses, or their articulated equivalents, are required as the foundation of statistical and research methods in the discipline.' },
    )
    const lower = h.group('lower', 'Lower-Division Courses', [prepGroup, methods])

    const djsCore = djs
      ? h.all('djs-core', 'Upper-division DJS core courses', 'The following two courses are required for the design and implementation of the DJS project.', ['SOCY 107A', 'SOCY 107B'])
      : null
    const theory = h.all('theory', 'SOCY 105A and 105B', 'The following two sociology courses are required as the foundation of theoretical training in the discipline.', ['SOCY 105A', 'SOCY 105B'])

    const thesisDone = new Set(h.taken(THESIS).map((e) => e.id)).size >= 2
    const advanced = h.take(
      'advanced',
      'Five upper-division electives (SOCY 110–189)',
      djs
        ? ['Five upper-division electives of 5 credits or more are required, selected from Sociology 110-189, or from the', Q_THESIS_ELECTIVE]
        : ['Five sociology electives of 5 credits or more, numbered 110-189 are required.', Q_THESIS_ELECTIVE],
      thesisDone ? ADVANCED.or(THESIS) : ADVANCED,
      {
        n: 5,
        repeatable: 'catalog',
        atMost: [{ set: THESIS, n: 1, label: 'thesis courses (one may double as an elective)' }],
        pool: 'SOCY 110–189 (5+ credits); once the senior thesis is done, one SOCY 195 course may also count',
      },
    )
    const practicum = djs
      ? h.take('practicum', 'SOCY 196G Project Practicum', 'Students must enroll in SOCY 196G, Project Practicum, and complete their DJS capstone project.', codes('SOCY 196G'))
      : null
    const upper = h.group('upper', 'Upper-Division Courses', [djsCore, theory, advanced, practicum, djs ? h.attest('djs-deliverable') : null])

    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      ['SOCY 105A', 'SOCY 105B'].map((c) => h.take(`dc/${c.replace(' ', '')}`, c, Q_DC, codes(c), { exclusive: false, minor: true })),
      { quote: Q_DC },
    )

    const compQuote = djs
      ? 'Prior to graduation, students are required to complete one of the following comprehensive requirements.'
      : 'Prior to graduation, all sociology majors are required to complete one of the following comprehensive requirements.'
    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement', compQuote, [
      h.take('comp-seminar', 'Senior Seminar (SOCY 196S)', 'Successful completion of a sociology senior seminar course.', codes('SOCY 196S'), { exclusive: false }),
      h.take(
        'comp-grad',
        'A 5-credit graduate sociology course (SOCY 201–294)',
        'Students may satisfy the comprehensive requirement by successfully completing a 5-credit graduate-level sociology course, numbered SOCY 201-SOCY 294.',
        GRAD,
        { exclusive: false, pool: 'SOCY 201–294 (5 credits)' },
      ),
      h.take(
        'comp-thesis',
        'Senior thesis (two quarters of SOCY 195A/B/C)',
        'Students must enroll in a minimum of two quarters of thesis individual study courses, though three quarters is recommended. SOCY 195C is optional.',
        THESIS,
        { n: 2, exclusive: false, repeatable: 'catalog' },
      ),
    ])

    h.solve()
    letterGradeCaveat(h, prep, PREP, 2)
    if (djs) letterGradeCaveat(h, prepChildren[0], codes('SOCY 30A'), 1)
    maybeOutside(h, advanced, djs, thesisDone)
    return [lower, upper, dc, comprehensive]
  },
})

/** SOCY 3A, or LALS 100A / PSYC 100 for students in the right double major/minor. */
function socy3a(h: HarnessContext, djs: boolean): Node {
  const title = 'SOCY 3A The Evaluation of Evidence'
  const quote = 'The following two sociology courses, or their articulated equivalents, are required as the foundation of statistical and research methods in the discipline.'
  if (h.taken(codes('SOCY 3A')).length) return h.take('socy3a', title, quote, codes('SOCY 3A'))
  const sub = (code: string, att: string, q: string, label: string): Node =>
    h.group(
      'socy3a',
      `${title} — substituted by ${code}`,
      [h.take(`socy3a/${code.replace(' ', '')}`, code, `${djs ? 'Sociology students' : 'Sociology majors'} ${q}`, codes(code)), h.attest(att, label)],
      { quote: `${djs ? 'Sociology students' : 'Sociology majors'} ${q}` },
    )
  if (h.taken(codes('LALS 100A')).length) return sub('LALS 100A', 'lals-double', Q_LALS, 'Pursuing a LALS double major or minor')
  if (h.taken(codes('PSYC 100')).length) return sub('PSYC 100', 'psyc-double', Q_PSYC, 'Double majoring in psychology or cognitive science')
  return h.take('socy3a', title, quote, codes('SOCY 3A'), {
    notes: ['LALS 100A (with a LALS double major or minor) or PSYC 100 (with a psychology or cognitive science double major) may substitute.'],
  })
}

/** Unmet only because a qualification course was taken P/NP: cannot-check, not unmet. */
function letterGradeCaveat(h: HarnessContext, node: Node, set: ReturnType<typeof codes>, n: number) {
  if (node.status !== 'unmet') return
  const anyGrade = new Set(h.taken(set).map((e) => e.code))
  if (anyGrade.size >= n) {
    node.status = 'cannot-check'
    node.detail = `Taken Pass/No Pass — “${Q_LETTER}” Ask the Sociology advisor whether this still counts (it may have blocked declaring the major).`
  }
}

/**
 * A short elective requirement may be filled by pre-approved outside courses
 * or individual study (lists / petitions not in the app). Once the thesis is
 * done its courses are not substitutes ("One thesis individual study course"
 * may double as an elective, and the allocation already offers it).
 */
function maybeOutside(h: HarnessContext, node: Node, djs: boolean, thesisDone: boolean) {
  if (node.status !== 'unmet' || !node.progress) return
  const gap = node.progress.need - node.progress.have
  const usedCodes = new Set(h.enrollments.filter((e) => h.used.has(e.id)).map((e) => e.code))
  const free = h.passed.filter((e: Enrollment) => {
    const c = h.catalog.get(e.code)
    return !h.used.has(e.id) && !usedCodes.has(e.code) && !!c && c.division === 'upper' && c.credits >= 5 && !SENIOR_SEMINAR.has(e.code) && !(thesisDone && THESIS.has(e.code)) && policyFailure(e, h.policy) == null
  })
  const distinct = [...new Set(free.map((e) => e.code))]
  // General: "Up to two pre-approved outside courses can count"; DJS: "no course substitution limits".
  const usable = djs ? distinct.length : Math.min(distinct.length, 2)
  if (usable < gap) return
  node.status = 'cannot-check'
  node.detail = `${gap} more needed: ${distinct.map(display).join(', ')} may count if pre-approved (${djs ? 'DJS course list or director approval' : 'Sociology course list or petition; at most two'}) — the lists are not in the app.`
}
