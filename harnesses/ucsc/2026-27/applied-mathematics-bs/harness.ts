// Applied Mathematics B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/applied-mathematics-bs.md
//
// Lower-division core + two lower-division electives; six upper-division core
// courses; three upper-division electives (any 5-credit AM 100–279 course that
// is not core, minus AM 200/211, or the listed courses of other departments);
// capstone AM 170A + (AM 170B or AM 195). Baskin letter-grade rule.
// Physics double majors may replace AM 100 / AM 112 with PHYS 116A / PHYS 116C
// with special approval → attestation, asked only when the PHYS course is used.
import { codes, defineHarness, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const LD_ELECTIVES = [
  'PHYS 5A', 'PHYS 15A', 'PHYS 5B', 'PHYS 5C', 'PHYS 15C', 'ASTR 21', 'CSE 30', 'CSE 40', 'ECE 9',
  'ECON 1', 'ECON 2', 'STAT 7', 'STAT 17', 'BIOL 20A', 'BIOE 20C',
]
const CORE = ['AM 100', 'AM 112', 'AM 114', 'AM 129', 'AM 147']

// Listed upper-division electives from other departments (and MATH).
const UD_LISTED = [
  // ASTR
  'ASTR 112', 'ASTR 113', 'ASTR 119',
  // BME
  'BME 110', 'BME 118', 'BME 160',
  // CSE
  'CSE 101', 'CSE 102', 'CSE 104', 'CSE 106', 'CSE 108', 'CSE 113', 'CSE 140', 'CSE 142', 'CSE 144',
  'CSE 160', 'CSE 161', 'CSE 162',
  // EART
  'EART 112', 'EART 118', 'EART 119A', 'EART 121', 'EART 124', 'EART 160', 'EART 162', 'EART 163',
  'EART 164', 'EART 125', 'EART 225', 'EART 172', 'EART 272',
  // ECE
  'ECE 101', 'ECE 103', 'ECE 115', 'ECE 135', 'ECE 136', 'ECE 141', 'ECE 145', 'ECE 149', 'ECE 151',
  'ECE 153', 'ECE 163', 'ECE 179',
  // ECON
  'ECON 100A', 'ECON 100B', 'ECON 100M', 'ECON 100N', 'ECON 101', 'ECON 113', 'ECON 114', 'ECON 115',
  'ECON 124', 'ECON 166A',
  // MATH
  'MATH 105A', 'MATH 105B', 'MATH 105C', 'MATH 110', 'MATH 111A', 'MATH 111T', 'MATH 114', 'MATH 115',
  'MATH 117', 'MATH 116', 'MATH 118', 'MATH 120', 'MATH 121A', 'MATH 121B', 'MATH 124', 'MATH 130',
  'MATH 134', 'MATH 140', 'MATH 152', 'MATH 160',
  // OCEA
  'OCEA 260', 'OCEA 267', 'OCEA 286', 'OCEA 100', 'OCEA 200', 'OCEA 111', 'OCEA 211',
  // PHYS
  'PHYS 105', 'PHYS 110A', 'PHYS 110B', 'PHYS 139A', 'PHYS 139B', 'PHYS 150', 'PHYS 171',
  // STAT
  'STAT 108', 'STAT 132', 'STAT 204', 'STAT 205',
  // TIM
  'TIM 147', 'TIM 150',
]
// Cross-listed partners named on the page ("EART 172 [/OCEA 172]", "PHYS 150 [/CSE 109]", …)
// are the same course to the library; they need no listing.
// "Either of the following courses": the undergraduate and graduate versions count once.
const EITHER_PAIRS: [string[], string][] = [
  [['EART 125', 'EART 225'], 'EART 125 / EART 225'],
  [['EART 172', 'EART 272'], 'EART 172 / EART 272'],
  [['OCEA 100', 'OCEA 200'], 'OCEA 100 / OCEA 200'],
  [['OCEA 111', 'OCEA 211'], 'OCEA 111 / OCEA 211'],
]

// Catalog: "Students cannot receive credit for this course and …" pairs inside the elective pool.
const CREDIT_ONCE = [
  ['MATH 111A', 'MATH 111T'], ['ECON 100A', 'ECON 100M'], ['ECON 100B', 'ECON 100N'], ['AM 107', 'AM 217'],
  ['AM 115', 'AM 215'], ['AM 160', 'AM 261'], ['AM 212', 'AM 212B'],
]
// Graduate AM courses the catalog bars alongside a core course ("AM 212A: Students
// cannot receive credit for this course and AM 112"): never an elective next to it.
const CORE_TWINS: [string, string][] = [['AM 112', 'AM 212A']]
const PROGRAMMING = ['CSE 20', 'CSE 13S', 'ECE 13', 'ASTR 19', 'ECON 22P']

const Q_PHYS_DOUBLE =
  'Students who are planning a double-major with physics can replace the AM 100 and AM 112 courses with the PHYS 116A and PHYS 116C courses. Special approval by both undergraduate directors will be required to do so.'
const Q_UD_ELECTIVES =
  'Students are required to take three upper-division elective courses from the following list of possible electives. Up to one of these electives can be replaced by a 5-credit independent study to do research with one of the program faculty.'
const Q_AM_ELECTIVES =
  'Any 5-credit upper-division (100-199) or graduate (200-299) AM course that is not already a core course. AM 198 can only be used once for elective credit. AM 200, AM 211, and the AM 280 series and above may not be used.'

export default defineHarness({
  program: 'applied-mathematics-bs',
  edition: '2026-27',
  title: 'Applied Mathematics B.S.',
  attestations: [
    {
      id: 'physics-double-major',
      label: 'Physics double major: approval to replace AM 100 / AM 112 with PHYS 116A / PHYS 116C',
      quote: Q_PHYS_DOUBLE,
      aliases: ['physics double major', 'phys 116 substitution', 'double major with physics'],
    },
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 Testout exam (after matriculation at UCSC)',
      quote: 'The requirement can also be satisfied by passing the',
      aliases: ['cse 20 testout', 'cse 20 test-out', 'testout', 'test-out'],
    },
    {
      id: 'exit-survey',
      label: 'Exit survey completed',
      quote: 'All students are required to complete an exit survey.',
      aliases: ['exit survey', 'survey'],
    },
  ],
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major.',
    'Course substitutions (including courses not on the elective lists) need an approved Petition for Course Substitution through the Baskin Engineering Undergraduate Advising Office.',
  ],
  evaluate(h) {
    // "Baskin Engineering requires letter grades for all courses in an engineering major."
    h.policy = { letter: true }
    // CSE 20 catalog: "Students may not receive credit for CSE 20 after receiving credit for CSE 30."
    const cse20Void = firstTerm(h, 'CSE 20') > firstTerm(h, 'CSE 30') && Number.isFinite(firstTerm(h, 'CSE 20')) ? ['CSE 20'] : []

    const programming = h.take('programming', 'Programming (CSE 20, CSE 13S, ECE 13, ASTR 19 or ECON 22P)', 'Plus one of the following programming courses', codes(...PROGRAMMING).except(cse20Void), {
      notes: [
        'An equivalent prior programming course (via assist.org articulation or syllabus review by the program) also satisfies this requirement — add it to your plan as the course it is equivalent to.',
        ...(cse20Void.length ? ['CSE 20 taken after CSE 30 earns no credit (catalog), so it does not count here.'] : []),
      ],
    })
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('calc', 'MATH 19A + 19B, or MATH 20A + 20B', 'Choose one of the following series:', [['MATH 19A', 'MATH 19B'], ['MATH 20A', 'MATH 20B']]),
      h.take('linalg', 'Linear algebra (AM 10 or MATH 21)', 'Plus one of the following courses:', codes('AM 10', 'MATH 21'), { notes: ['AM 10 is preferred.'] }),
      h.take('ode', 'Differential equations (AM 20 or MATH 24)', 'Plus one of the following courses:', codes('AM 20', 'MATH 24'), { notes: ['AM 20 is preferred.'] }),
      h.options('multivar', 'AM 30, or MATH 23A + 23B', 'Plus one of the following options:', [['AM 30'], ['MATH 23A', 'MATH 23B']], { notes: ['AM 30 is preferred.'] }),
      h.take('proof', 'CSE 16 or MATH 100', 'Plus one of the following options:', codes('CSE 16', 'MATH 100'), {
        notes: ['MATH 100 is strongly recommended for students who eventually wish to take some upper-division electives in mathematics.'],
      }),
      // "The requirement can also be satisfied by passing the CSE 20 Testout exam" — an
      // exam, not a course: §1a test-out attestation, offered only when CSE 20 is absent (below).
      programming,
    ])

    const ldElectives = h.take(
      'ld-electives',
      'Two lower-division electives',
      ['Students are required to take two lower-division electives from the following list, in preparation for the upper-division electives they are later required to take.', 'Lecture/lab combinations count as one course.'],
      codes(...LD_ELECTIVES),
      {
        n: 2,
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        atMost: [
          { set: codes('PHYS 5A', 'PHYS 15A'), n: 1, label: 'PHYS 5A / PHYS 15A count once' },
          { set: codes('PHYS 5C', 'PHYS 15C'), n: 1, label: 'PHYS 5C / PHYS 15C count once' },
        ],
        labs: { pairs: [['STAT 7', 'STAT 7L'], ['STAT 17', 'STAT 17L']], mode: 'merge' },
        notes: ['Associated labs (e.g. STAT 7L, STAT 17L, the PHYS 5 labs) are required when the lecture requires them (corequisite).'],
      },
    )

    const coreQuote = 'Complete the following core courses:'
    const am100 = h.take('core-am100', 'AM 100', [coreQuote, Q_PHYS_DOUBLE], codes('AM 100', 'PHYS 116A'), { prefer: (c) => (c === 'AM100' ? 0 : 1) })
    const am112 = h.take('core-am112', 'AM 112', [coreQuote, Q_PHYS_DOUBLE], codes('AM 112', 'PHYS 116C'), { prefer: (c) => (c === 'AM112' ? 0 : 1) })
    const core = h.group('core', 'AM 100, 112, 114 and 129', [
      am100,
      am112,
      h.take('core-am114', 'AM 114', coreQuote, codes('AM 114')),
      h.take('core-am129', 'AM 129', coreQuote, codes('AM 129')),
    ], { quote: coreQuote })
    const upper = h.group('upper', 'Upper-Division Courses', [
      core,
      h.take('numerics', 'AM 147 or MATH 148', 'Plus one of the following courses:', codes('AM 147', 'MATH 148'), { notes: ['AM 147 is preferred.'] }),
      h.take('probability', 'STAT 131 or CSE 107', 'Plus one of the following courses:', codes('STAT 131', 'CSE 107')),
    ])

    // The capstone courses AM 170A/170B are treated like core courses (judgement call:
    // the page counts them under the comprehensive requirement, not as electives).
    // AM 195 (senior thesis research) and AM 198 are the independent-study options.
    const coreTwins = CORE_TWINS.filter(([core]) => h.taken(codes(core)).length).map(([, twin]) => twin)
    const amPool = range('AM', 100, 279).minCredits(5).except([...CORE, 'AM 170A', 'AM 170B', 'AM 200', 'AM 211', ...coreTwins])
    const indep = codes('AM 195', 'AM 198')
    const udElectives = h.take(
      'ud-electives',
      'Three upper-division electives',
      [Q_UD_ELECTIVES, Q_AM_ELECTIVES, 'All students, but especially those doing a double major or a major-minor combination, may also petition to count courses that are not already on the list as electives, subject to approval.'],
      amPool.or(codes(...UD_LISTED)),
      {
        n: 3,
        atMost: [
          { set: indep, n: 1, label: 'at most one independent study (AM 198) / research course' },
          ...EITHER_PAIRS.map(([c, label]) => ({ set: codes(...c), n: 1, label: `${label} count once` })),
          // Catalog credit restrictions ("Students cannot receive credit for this course and …").
          ...CREDIT_ONCE.map((c) => ({ set: codes(...c), n: 1, label: `${c.join(' / ')} (credit for only one)` })),
        ],
        labs: { pairs: [['CSE 161', 'CSE 161L'], ['CSE 162', 'CSE 162L'], ['ECE 101', 'ECE 101L'], ['ECE 135', 'ECE 135L']], mode: 'merge' },
        pool: 'any 5-credit AM 100–279 course that is not a core course (not AM 200 or AM 211), or a listed ASTR/BME/CSE/EART/ECE/ECON/MATH/OCEA/PHYS/STAT/TIM elective',
        notes: ['Graduate courses require permission of the instructor.'],
      },
    )

    // Comprehensive: the capstone sequence (exclusive — AM 170A/170B/195 are AM courses the elective pool could otherwise take).
    const comprehensive = h.options(
      'comprehensive',
      'Comprehensive Requirement: AM 170A + 170B, or AM 170A + AM 195',
      ['Students satisfy the senior comprehensive requirement by completing the capstone course sequence:', 'Either these two courses:', 'Or these two courses:'],
      [['AM 170A', 'AM 170B'], ['AM 170A', 'AM 195']],
    )
    // DC: AM 170A, already counted toward the comprehensive requirement (overlay).
    const dc = h.take('dc', 'Disciplinary Communication (DC): AM 170A', 'The DC requirement in the Applied Mathematics B.S. is satisfied by completing the capstone course AM 170A (see below).', codes('AM 170A'), { exclusive: false })

    h.solve()
    cse20TestOut(h, programming)
    physicsSubstitution(h, core, [am100, am112])
    ambiguousElectives(h, udElectives, comprehensive)

    const exit = h.group('exit', 'Exit Requirement', [h.attest('exit-survey')], { quote: 'All students are required to complete an exit survey.' })

    return [lower, ldElectives, upper, udElectives, dc, comprehensive, exit]
  },
})

/** PHYS 116A/116C standing in for AM 100/112 needs the double-major approval. */
function physicsSubstitution(h: HarnessContext, core: Node, slots: Node[]) {
  const subs = slots.flatMap((n) => (n.used ?? []).filter((e) => e.code.startsWith('PHYS')))
  if (!subs.length) return
  core.children!.push(
    h.attest('physics-double-major', undefined, {
      detail: `${subs.map((e) => e.display).join(', ')} ${subs.length > 1 ? 'count' : 'counts'} in place of ${subs.map((e) => (e.code === 'PHYS116A' ? 'AM 100' : 'AM 112')).join(', ')} only for physics double majors with approval from both undergraduate directors.`,
    }),
  )
}

function firstTerm(h: HarnessContext, code: string): number {
  return Math.min(...h.taken(codes(code)).map((e) => Number(e.term ?? 0)))
}

/**
 * §1a test-out convention: "The requirement can also be satisfied by passing
 * the CSE 20 Testout exam CSE 20 after matriculation at UCSC." Offered only
 * when CSE 20 is absent from the plan; attested ⇒ the line is met by test-out.
 */
function cse20TestOut(h: HarnessContext, n: Node) {
  if (n.status !== 'unmet' || h.enrollments.some((e) => e.code === 'CSE20')) return
  const def = h.attestations.find((a) => a.id === 'cse20-testout')!
  if (h.attested('cse20-testout')) {
    n.status = 'met'
    n.detail = 'Met by test-out (Passed the CSE 20 Testout exam).'
    return
  }
  n.status = 'needs-attestation'
  n.attest = def
  n.detail = 'Take one of the listed programming courses, or confirm you passed the CSE 20 Testout exam.'
}

/**
 * "Any 5-credit upper-division (100-199) or graduate (200-299) AM course that
 * is not already a core course." The core list is AM 100/112/114/129; AM 147
 * (one of "AM 147 or MATH 148") and AM 170B (when AM 170A + AM 195 is the
 * capstone) are not named core courses, but the page does not say whether
 * they may count as electives. The harness does not count them; when they
 * would close the gap, the elective line is cannot-check, not unmet.
 */
function ambiguousElectives(h: HarnessContext, electives: Node, comprehensive: Node) {
  if (electives.status !== 'unmet') return
  // By code: a retake of the capstone's AM 170B is the same course, not an extra one.
  const capstone = new Set((comprehensive.used ?? []).map((e: Enrollment) => e.code))
  const extras: string[] = []
  if (h.taken(codes('AM 147')).length && h.taken(codes('MATH 148')).length) extras.push('AM 147 / MATH 148 (the one not used for the numerics course)')
  if (h.taken(codes('AM 170B')).length && !capstone.has('AM170B') && comprehensive.status === 'met') extras.push('AM 170B (not used for the capstone)')
  const missing = (electives.progress?.need ?? 3) - (electives.progress?.have ?? 0)
  if (extras.length && missing <= extras.length) {
    electives.status = 'cannot-check'
    electives.detail = `The page does not say whether ${extras.join(' or ')} may count as an elective — ask Baskin advising.`
  }
}
