// Computer Science B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/computer-science-ba.md
import { anyOf, canon, codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const BREADTH_1 = [
  'CSE 101M', 'CSE 102', 'CSE 103', 'CSE 112', 'CSE 114A', 'CSE 118', 'CSE 120', 'CSE 140', 'CSE 142', 'CSE 143',
  'CSE 144', 'CSE 150', 'CSE 183', 'CSE 184',
]
const BREADTH_2 = ['CSE 110A', 'CSE 130', 'CSE 132', 'CSE 134', 'CSE 138', 'CSE 160', 'CSE 180', 'CSE 186']
const BA_ELECTIVES = [
  'ARTG 118', 'EART 124', 'EART 125', 'EART 172', 'ECON 100M', 'ECON 100N', 'ECON 101', 'ENVS 115A', 'ENVS 115L',
  'FILM 170A', 'LING 112', 'LING 113', 'LING 118', 'LING 125', 'MATH 110', 'MATH 115', 'MATH 116', 'MATH 117',
  'MATH 118', 'MATH 134', 'MATH 140', 'MATH 145', 'MATH 145L', 'MATH 148', 'MATH 160', 'MATH 161', 'MUSC 123A',
  'MUSC 123B', 'MUSC 123C', 'PHYS 115', 'PHYS 150',
]
const CAPSTONES = [
  'CSE 110A', 'CSE 115C', 'CSE 115D', 'CSE 134', 'CSE 138', 'CSE 140', 'CSE 143', 'CSE 144', 'CSE 145', 'CSE 156',
  'CSE 156L', 'CSE 157', 'CSE 160', 'CSE 161', 'CSE 161L', 'CSE 162', 'CSE 162L', 'CSE 163', 'CSE 168', 'CSE 181',
  'CSE 183', 'CSE 184', 'CSE 187', 'CMPM 172',
]
// "1. Any 5-credit or more upper-division course with a number between 100 and
// 189 offered by Baskin Engineering, except for the DC courses CSE 115A and
// CSE 185E/CSE 185S." Baskin Engineering subjects (departments: Applied
// Mathematics, Biomolecular Engineering, Computational Media, Computer Science
// and Engineering, Electrical and Computer Engineering, Statistics, Technology
// Management) — as in technology-and-information-management-bs.
const BE_SUBJECTS = ['AM', 'BME', 'CMPM', 'CSE', 'ECE', 'STAT', 'TIM']
const BE_UD = anyOf(...BE_SUBJECTS.map((s) => range(s, 100, 189))).except(['CSE 115A', 'CSE 185E']).minCredits(5)
// "2. Any 5-credit or more CSE course with a number between 201 and 279."
const CSE_GRAD = range('CSE', 201, 279).minCredits(5)
// "3. CSE 195 (if not used to satisfy the DC requirement)."
const ELECTIVE_POOL = anyOf(BE_UD, CSE_GRAD, codes('CSE 195'), codes(...BA_ELECTIVES))
// "including at least one upper-division CSE course(s) numbered between 100 and 189, or CSE 195"
const CSE_UD = range('CSE', 100, 189).or(codes('CSE 195'))

const Q_LABS = 'Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.'

export default defineHarness({
  program: 'computer-science-ba',
  edition: '2025-26',
  title: 'Computer Science B.A.',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'Students with a prior programming course, AP credit, or clearing the CSE 20 “[Test-out](https://sites.google.com/ucsc.edu/cse-20-testout)” bar will start with CSE 30, and CSE 12.',
      aliases: ['cse 20 test', 'cse20 test'],
    },
    {
      id: 'cse40-testout',
      label: 'Passed the CSE 40 test-out',
      quote: 'CSE 40 has a test-out option that can satisfy this requirement.',
      aliases: ['cse 40 test', 'cse40 test'],
    },
  ],
  coverage: {
    ignore: { CSE13S: 'major qualification course only; the page says "CSE 13S is not required for the CS B.A."' },
  },
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'Students may not receive both the computer science B.A. and computer science B.S. degrees, nor both the Network and Digital Technology B.A. and the Computer Science B.A.',
  ],
  evaluate(h) {
    // "must take all courses required for that major for a letter grade"
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('cse12', 'CSE 12', 'All of the following', codes('CSE 12')),
      h.take('cse16', 'CSE 16', 'All of the following', codes('CSE 16')),
      h.take('cse20', 'CSE 20', ['All of the following', 'Students with no prior programming will take CSE 20 before CSE 30, and CSE 12.'], codes('CSE 20')),
      h.take('cse30', 'CSE 30', 'All of the following', codes('CSE 30')),
      h.take('cse40', 'CSE 40', ['All of the following', 'CSE 40 has a test-out option that can satisfy this requirement.'], codes('CSE 40')),
      h.options('calc', 'Calculus', 'Plus one of the following options', [
        ['MATH 19A', 'MATH 19B'],
        ['MATH 20A', 'MATH 20B'],
      ]),
      h.take('linalg', 'Linear algebra', 'Plus one of the following', codes('AM 10', 'MATH 21')),
    ])

    const dsa = h.take('dsa', 'CSE 101P or CSE 101', 'One of the following courses', codes('CSE 101P', 'CSE 101'))

    const breadth = h.take('breadth', 'Breadth (three courses)', 'Three courses from either Breadth List below. Courses in the second Breadth List require CSE 101.', codes(...BREADTH_1, ...BREADTH_2), { n: 3 })

    // "Three courses from the list of B.A. electives below, including at least
    // one upper-division CSE course(s) numbered between 100 and 189, or CSE
    // 195." — so CSE 100–189 and CSE 195 count as B.A. electives too.
    const labPairs = pairsFor(h)
    const electives = h.take('electives', 'Electives (three)', [
      'Three courses from the list of B.A. electives below, including at least one upper-division CSE course(s) numbered between 100 and 189, or CSE 195.',
      Q_LABS,
      'The course used for the DC requirement cannot also be used as an upper-division elective.',
    ], ELECTIVE_POOL, {
      n: 3,
      labs: { pairs: labPairs, mode: 'required' },
      atLeast: [{ set: CSE_UD, n: 1, label: 'at least one CSE 100–189 or CSE 195' }],
      // "PHYS 150 [/CSE 109]", "EART 172 [/OCEA 172]": cross-listed codes are
      // one course. The allocator dedupes them across slots but not within one
      // n>1 slot (library gap, reported), so guard here generically.
      check: (chosen) => {
        const keys = chosen.map((e) => [e.code, ...h.catalog.equivalents(e.code)].sort()[0])
        return new Set(keys).size !== keys.length ? 'cross-listed codes are the same course' : null
      },
      pool: 'any 5+ credit Baskin Engineering (AM, BME, CMPM, CSE, ECE, STAT, TIM) course 100–189 except CSE 115A/185E/185S, any 5+ credit CSE 201–279, CSE 195, or a course on the list of B.A. electives (at least one CSE 100–189 or CSE 195)',
      notes: [
        'Additional courses may be accepted by petition.',
        'Approval for courses with numbers 290 and above may be requested by submitting a course substitution petition to the BE Undergraduate Advising Office.',
      ],
    })

    const dc = h.take('dc', 'Disciplinary Communication (DC)', [
      'The DC requirement for the computer science B.A. is satisfied by completing one of the following additional courses:',
      'The course used for the DC requirement cannot also be used as an upper-division elective.',
    ], codes('CSE 115A', 'CSE 185E', 'CSE 195'), {
      // CSE 195 last, so it stays free for the electives when another DC course
      // exists ("CSE 195 (if not used to satisfy the DC requirement)"; it is
      // not repeatable, so it can never count for both).
      prefer: (c) => (c === 'CSE195' ? 1 : 0),
    })
    h.solve()

    // Comprehensive: one capstone OR a senior thesis. The 16-course count
    // ("eight lower-division and eight upper-division": CSE 101/101P, three
    // breadth, three electives, DC) leaves no room for a separate capstone, so
    // the capstone may be a course already counted above (an overlay).
    const capstone = h.take('capstone', 'Capstone course', [
      'Students may choose from one of the following capstone courses to satisfy their exit requirement (lecture/lab combinations count as one course.):',
      'Students need to pass the capstone course to pass the exit requirement.',
    ], codes(...CAPSTONES), {
      exclusive: false,
      // "lecture/lab combinations count as one course": a lecture with a
      // catalog-required lab (CSE 156/156L) counts only with it.
      labs: 'catalog-required',
      notes: ['No course may be attempted more than twice without prior approval from the chair of the department offering the course. Withdrawals count as an attempted class for this purpose.'],
    })
    const thesis = h.take('thesis', 'Senior thesis (CSE 195)', 'A student wishing to complete a senior thesis must successfully complete a minimum of 5 credits in CSE 195, Senior Thesis Research.', codes('CSE 195'), { exclusive: false })
    h.solve()
    testOut(h, findNode(lower, 'cse20')!, 'CSE20', 'cse20-testout', 'Take CSE 20, or confirm you passed the CSE 20 test-out (AP credit: add it as CSE 20).')
    testOut(h, findNode(lower, 'cse40')!, 'CSE40', 'cse40-testout', 'Take CSE 40, or confirm you passed the CSE 40 test-out.')

    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement', 'In addition to the above B.A. requirements, students in the computer science majors must satisfy one of the following two exit requirements:', [capstone, thesis])

    return [lower, h.group('upper', 'Upper-Division Courses', [dsa]), breadth, electives, dc, comprehensive]
  },
})

/** Lecture → lab pairs for the elective pool: catalog "<code>L" labs plus ENVS 115A/115L. */
function pairsFor(h: HarnessContext): [string, string][] {
  const out = new Map<string, string>([['ENVS115A', 'ENVS115L']])
  for (const e of h.enrollments) {
    const c = e.code
    if (c.endsWith('L') && h.catalog.has(c.slice(0, -1))) out.set(c.slice(0, -1), c)
    else if (h.catalog.has(canon(c + 'L'))) out.set(c, canon(c + 'L'))
  }
  return [...out].filter(([lec]) => ELECTIVE_POOL.has(lec, h.catalog))
}

function findNode(root: Node, id: string): Node | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return undefined
}

/**
 * §1a test-out convention: "CSE 40 has a test-out option that can satisfy this
 * requirement."; "Students with a prior programming course, AP credit, or
 * clearing the CSE 20 “Test-out” bar will start with CSE 30". The attestation
 * is offered only when the course is absent from the plan (a failed attempt
 * is not rescued); attested ⇒ the line is met by test-out.
 */
function testOut(h: HarnessContext, n: Node, code: string, att: string, ask: string) {
  if (n.status !== 'unmet' || h.enrollments.some((e) => e.code === code)) return
  const def = h.attestations.find((a) => a.id === att)!
  if (h.attested(att)) {
    n.status = 'met'
    n.detail = `Met by test-out (${def.label}).`
    return
  }
  n.status = 'needs-attestation'
  n.attest = def
  n.detail = ask
}

