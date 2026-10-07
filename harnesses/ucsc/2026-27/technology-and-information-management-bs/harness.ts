// Technology and Information Management B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/technology-and-information-management-bs.md
//
// Fixed lower/upper-division lists; two Baskin Engineering electives (any
// 5-credit BE course numbered 100–189 or 200–289, labs required, STAT 131 /
// CSE 107 not both, at most one TIM 193/195/198/199 with prior approval);
// one 5-credit ECON 100–189 course; DC = TIM 175; comprehensive = TIM 172A/B
// + TIM 172P/Q (taken concurrently in pairs) + TIM 175. Baskin letter grades.
import { anyOf, codes, defineHarness, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

// Baskin Engineering course subjects (departments: Applied Mathematics,
// Biomolecular Engineering, Computational Media, Computer Science and
// Engineering, Electrical and Computer Engineering, Statistics, TIM; plus the
// BE graduate-only subjects GAME, HCI, NLP). The page does not list them.
const BE_SUBJECTS = ['AM', 'BME', 'CMPM', 'CSE', 'ECE', 'STAT', 'TIM', 'GAME', 'HCI', 'NLP']
const TIM_INDEP = ['TIM 193', 'TIM 195', 'TIM 198', 'TIM 199']

const Q_BE =
  'These electives may be any 5-credit upper-division or graduate Baskin Engineering courses numbered 100-189 or 200-289. At most one of these could be replaced by a TIM independent or field study course (TIM 193, TIM 195, TIM 198, and TIM 199) with prior approval from the department.'
const Q_CONCURRENT = 'TIM 172A and TIM 172P need to be taken concurrently, as do TIM 172B and TIM 172Q.'

export default defineHarness({
  program: 'technology-and-information-management-bs',
  edition: '2026-27',
  title: 'Technology and Information Management B.S.',
  attestations: [
    {
      id: 'tim-independent-approval',
      label: 'Prior department approval to use a TIM independent/field study course as a BE elective',
      quote: Q_BE,
      aliases: ['tim independent study', 'independent study approval', 'field study approval'],
    },
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'Students with a prior programming course, exam credit, or clearing the',
      aliases: ['cse 20 testout', 'cse 20 test-out', 'testout', 'test-out', 'test out'],
    },
  ],
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'Course substitutions need an approved Petition for Course Substitution through the Baskin Engineering Undergraduate Advising Office.',
  ],
  evaluate(h) {
    // "must take all courses required for that major for a letter grade"
    h.policy = { letter: true }
    // Catalog: "Students cannot receive credit for this course and course 100M." —
    // with both on the record, only the earlier counts (so 100M cannot be the ECON elective next to 100A).
    const noDouble = creditOnce(h, 'ECON 100A', 'ECON 100M')

    const cse20 = h.take('cse-ld/CSE20', 'CSE 20', 'All of the following', codes('CSE 20'), { minor: true })
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('stats', 'STAT 17 and STAT 17L', 'Statistics', ['STAT 17', 'STAT 17L']),
      h.group('math', 'Mathematics', [
        h.options('calc', 'MATH 19A + 19B, or MATH 20A + 20B', 'One of the following options', [['MATH 19A', 'MATH 19B'], ['MATH 20A', 'MATH 20B']]),
        h.take('multivar', 'AM 30, MATH 22 or MATH 23A', 'Plus one of the following', codes('AM 30', 'MATH 22', 'MATH 23A')),
        h.take('linalg', 'AM 10 or MATH 21', 'One of these courses', codes('AM 10', 'MATH 21')),
        h.take('ode', 'AM 20 or MATH 24', 'And one of these courses', codes('AM 20', 'MATH 24')),
      ]),
      h.all('econ-ld', 'ECON 1, ECON 2 and ECON 10A', 'All of the following', ['ECON 1', 'ECON 2', 'ECON 10A']),
      h.group('cse-ld', 'CSE 12, 13S, 16, 20 and 30', [
        ...['CSE 12', 'CSE 13S', 'CSE 16'].map((c) => h.take(`cse-ld/${c.replace(' ', '')}`, c, 'All of the following', codes(c), { minor: true })),
        cse20,
        h.take('cse-ld/CSE30', 'CSE 30', 'All of the following', codes('CSE 30'), { minor: true }),
      ], { quote: 'All of the following' }),
      h.all('tim-ld', 'TIM 50 and TIM 58', 'Plus these courses', ['TIM 50', 'TIM 58']),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('cse-ud', 'CSE 150, 182, TIM 170, 172A, 172B, 172P, 172Q and 175', 'All of the following:', ['CSE 150', 'TIM 170', 'TIM 172A', 'TIM 172B', 'TIM 172P', 'TIM 172Q', 'TIM 175', 'CSE 182']),
      h.take('micro', 'ECON 100A or ECON 100M', 'One of the following courses', codes('ECON 100A', 'ECON 100M').except(noDouble)),
      h.take('econ113', 'ECON 113', 'Plus the following', codes('ECON 113')),
    ])

    const beRange = anyOf(...BE_SUBJECTS.flatMap((s) => [range(s, 100, 189), range(s, 200, 289)])).minCredits(5)
    const beElectives = h.take(
      'be-electives',
      'Two 5-credit Baskin Engineering electives',
      [
        'Students select two upper-division Baskin Engineering electives on the basis of their particular interests.',
        Q_BE,
        'Students may take STAT 131 or CSE 107, but not both;',
        'In cases in which a course has an associated lab, both are required to satisfy one elective.',
        'Classes that can be repeated for credit can only be used once to satisfy an elective requirement.',
      ],
      beRange.or(codes(...TIM_INDEP)),
      {
        n: 2,
        atMost: [
          { set: codes('STAT 131', 'CSE 107'), n: 1, label: 'STAT 131 or CSE 107, not both' },
          { set: codes(...TIM_INDEP), n: 1, label: 'at most one TIM independent/field study' },
        ],
        labs: 'catalog-required',
        prefer: (c) => (codes(...TIM_INDEP).has(c) ? 1 : 0),
        pool: 'any 5-credit Baskin Engineering (AM, BME, CMPM, CSE, ECE, STAT, TIM; GAME/HCI/NLP graduate) course numbered 100–189 or 200–289; at most one TIM 193/195/198/199 with prior approval',
      },
    )
    const econElective = h.take('econ-elective', 'One upper-division economics course', ['Plus one economics course', 'Students take one 5-credit, upper-division economics course numbered 100-189.'], range('ECON', 100, 189).minCredits(5).except([...noDouble, ...creditOnce(h, 'ECON 100B', 'ECON 100N')]), {
      pool: 'any 5-credit ECON 100–189',
      notes: ['Suggested economics courses are on the TIM curriculum chart (Baskin Engineering Undergraduate Advising).'],
    })
    const electives = h.group('electives', 'Electives', [beElectives, econElective])

    // DC and comprehensive reuse required upper-division courses (overlays).
    const dc = h.take('dc', 'Disciplinary Communication (DC): TIM 175', 'The DC requirement in technology and information management is satisfied by completing TIM 175.', codes('TIM 175'), { exclusive: false })
    const compQuote = 'Students complete the comprehensive requirement in two areas, the management of technology and the technology of management.'
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [
      h.group('comp-mot', 'Management of technology: TIM 172A, 172B, 172P, 172Q', [
        ...['TIM 172A', 'TIM 172B', 'TIM 172P', 'TIM 172Q'].map((c) =>
          h.take(`comp-${c.replace(' ', '')}`, c, 'The comprehensive requirement in the management of technology consists of two five-credit courses, TIM 172A and TIM 172B, and two three-credit project courses, TIM 172P and TIM 172Q.', codes(c), { exclusive: false, minor: true }),
        ),
      ], { quote: 'The comprehensive requirement in the management of technology consists of two five-credit courses, TIM 172A and TIM 172B, and two three-credit project courses, TIM 172P and TIM 172Q.' }),
      h.take('comp-tom', 'Technology of management: TIM 175', 'The comprehensive requirement in the technology of management consists of a five-credit project-intensive course, TIM 175.', codes('TIM 175'), { exclusive: false }),
    ], { quote: compQuote })

    h.solve()
    cse20TestOut(h, cse20)
    timIndependent(h, electives, beElectives)
    comprehensive.children!.push(concurrent(h, [['TIM172A', 'TIM172P'], ['TIM172B', 'TIM172Q']]))

    return [lower, upper, electives, dc, comprehensive]
  },
})

/**
 * §1a test-out convention (as computer-engineering-minor reads the same
 * sentence): "Students with a prior programming course, exam credit, or
 * clearing the “Test-out” bar will start with CSE 30 and CSE 12." Exam credit
 * is a course in the plan (add it as CSE 20). The test-out is an attestation,
 * offered only when CSE 20 is absent from the plan; attested ⇒ the CSE 20 line
 * is met by test-out. A failed CSE 20 stays unmet.
 */
function cse20TestOut(h: HarnessContext, cse20: Node) {
  if (cse20.status !== 'unmet' || h.enrollments.some((e) => e.code === 'CSE20')) return
  const def = h.attestations.find((a) => a.id === 'cse20-testout')!
  if (h.attested('cse20-testout')) {
    cse20.status = 'met'
    cse20.detail = 'Met by test-out (Passed the CSE 20 test-out).'
    return
  }
  cse20.status = 'needs-attestation'
  cse20.attest = def
  cse20.detail = h.has('CSE 30')
    ? 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm it; if you started at CSE 30 because of a prior programming course, check with Baskin advising; exam credit: add it as CSE 20.'
    : 'Take CSE 20, or confirm you passed the CSE 20 test-out (exam credit: add it as CSE 20).'
}

/** A TIM 193/195/198/199 used as a BE elective needs the department's prior approval. */
function timIndependent(h: HarnessContext, electives: Node, be: Node) {
  const used = (be.used ?? []).filter((e) => /^TIM19[3589]$/.test(e.code))
  if (used.length) electives.children!.push(h.attest('tim-independent-approval', undefined, { detail: `${used.map((e) => e.display).join(', ')} counts as a BE elective only with prior department approval.` }))
}

/** TIM 172A with 172P, and 172B with 172Q, in the same quarter. */
function concurrent(h: HarnessContext, pairs: [string, string][]): Node {
  const terms = (code: string): Enrollment[] => h.taken(codes(code))
  const problems: string[] = []
  let unknown = false
  for (const [a, b] of pairs) {
    const ea = terms(a)
    const eb = terms(b)
    if (!ea.length || !eb.length) continue // missing courses are reported by the course rows
    if (ea.some((x) => x.term == null) || eb.some((x) => x.term == null)) {
      unknown = true
      continue
    }
    if (!ea.some((x) => eb.some((y) => y.term === x.term))) problems.push(`${ea[0].display} and ${eb[0].display} were not taken in the same quarter`)
  }
  const status = problems.length ? 'unmet' : unknown ? 'cannot-check' : 'met'
  return h.node('comp-concurrent', 'TIM 172A with 172P, and 172B with 172Q, taken concurrently', Q_CONCURRENT, status, {
    detail: problems.length ? problems.join('; ') : unknown ? 'Some of these courses have no quarter recorded — check that each pair was taken together.' : undefined,
  })
}

/**
 * Catalog: "Students cannot receive credit for this course and course 100M" (and
 * vice versa). If both are on the record, only the earlier one counts.
 */
function creditOnce(h: HarnessContext, a: string, b: string): string[] {
  const first = (c: string) => Math.min(...h.taken(codes(c)).map((e) => Number(e.term ?? 0)))
  const ta = first(a)
  const tb = first(b)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return []
  return [tb >= ta ? b : a]
}
