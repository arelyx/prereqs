// Computer Science B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-science-bs.md
import { anyOf, codes, defineHarness, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const ELECTIVE_LIST = [
  'AM 114', 'AM 147', 'AM 148', 'AM 160', 'CMPM 120', 'CMPM 131', 'CMPM 146', 'CMPM 163', 'CMPM 164',
  'CMPM 164L', 'CMPM 171', 'CMPM 172', 'MATH 110', 'MATH 115', 'MATH 116', 'MATH 117', 'MATH 118',
  'MATH 134', 'MATH 145', 'MATH 145L', 'MATH 148', 'MATH 160', 'MATH 161', 'MATH 162', 'STAT 132',
]
const CAPSTONES = [
  'CSE 110B', 'CSE 115C', 'CSE 115D', 'CSE 121', 'CSE 134', 'CSE 138', 'CSE 140', 'CSE 143', 'CSE 144',
  'CSE 145', 'CSE 156', 'CSE 156L', 'CSE 157', 'CSE 160', 'CSE 161', 'CSE 161L', 'CSE 162', 'CSE 162L',
  'CSE 163', 'CSE 168', 'CSE 181', 'CSE 183', 'CSE 184', 'CSE 187', 'CMPM 172',
]

const Q_ELECTIVES =
  'Four courses must be completed from the list below . At least one course must be a computer science and engineering course. At most two courses can be from applied mathematics, statistics or mathematics, of which at most one may be substituted with two physics classes, chosen from the following list of class pairs: PHYS 6A and PHYS 6C, PHYS 6A and PHYS 6B, PHYS 5A (or PHYS 15A) and PHYS 5C (or PHYS 15C), PHYS 5A (or PHYS 15A) and PHYS 5B.'
const Q_LABS = 'Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.'

/** The physics class pairs that may stand in for one AM/STAT/MATH elective. */
const PHYS_PAIRS: [string[], string[]][] = [
  [['PHYS6A'], ['PHYS6C']],
  [['PHYS6A'], ['PHYS6B']],
  [['PHYS5A', 'PHYS15A'], ['PHYS5C', 'PHYS15C']],
  [['PHYS5A', 'PHYS15A'], ['PHYS5B']],
]
function physicsPairs(avail: Enrollment[]): Enrollment[][] {
  const out: Enrollment[][] = []
  for (const [a, b] of PHYS_PAIRS) {
    const x = avail.find((e) => a.includes(e.code))
    const y = avail.find((e) => b.includes(e.code))
    if (x && y) out.push([x, y])
  }
  return out
}

export default defineHarness({
  program: 'computer-science-bs',
  edition: '2026-27',
  title: 'Computer Science B.S.',
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'Course substitutions need an approved Petition for Course Substitution through the BE Undergraduate Advising Office.',
  ],
  evaluate(h) {
    // "must take all courses required for that major for a letter grade"
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('cse-ld', 'Computer Science and Engineering', 'All of the following', ['CSE 12', 'CSE 13S', 'ECE 30', 'CSE 16', 'CSE 20', 'CSE 30', 'CSE 40']),
      h.options('calc', 'Mathematics (calculus)', 'Plus one of the following options:', [
        ['MATH 19A', 'MATH 19B'],
        ['MATH 20A', 'MATH 20B'],
      ]),
      h.group('am', 'Applied Mathematics', [
        h.take('linalg', 'Linear algebra', 'One of these courses', codes('AM 10', 'MATH 21')),
        h.take('multivar', 'Multivariable calculus', 'Plus one of these courses', codes('AM 30', 'MATH 23A')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('cse-ud', 'Computer Science and Engineering', 'Take the following courses:', ['CSE 101', 'CSE 101M', 'CSE 102', 'CSE 120', 'CSE 130']),
      h.take('pl', 'Programming languages', 'Plus one of the following', codes('CSE 112', 'CSE 114A')),
      h.take('stats', 'Statistics', 'Take one of the following:', codes('STAT 131', 'CSE 107')),
    ])

    // Electives: the four sources, plus the physics-pair substitution.
    const cseRange = range('CSE', 100, 189).except(['CSE 115A', 'CSE 185E', 'CSE 185S']).minCredits(5)
    const cseGrad = range('CSE', 201, 279).minCredits(5)
    const pool = anyOf(cseRange, cseGrad, codes('CSE 195'), codes(...ELECTIVE_LIST))
    const amStatMath = anyOf(codes(...ELECTIVE_LIST.filter((c) => /^(AM|STAT|MATH) /.test(c))), range('PHYS', 1, 99))
    const electives = h.take('electives', 'Electives (four)', [Q_ELECTIVES, Q_LABS, 'CSE 195 (if not used to satisfy the DC requirement).'], pool, {
      n: 4,
      labs: 'catalog-required',
      atLeast: [{ set: range('CSE', 1, 299), n: 1, label: 'at least one CSE course' }],
      atMost: [
        { set: amStatMath, n: 2, label: 'at most two AM/STAT/MATH (a physics pair counts as one)' },
        { set: range('PHYS', 1, 99), n: 1, label: 'at most one physics pair' },
      ],
      composite: { eligible: codes(...PHYS_PAIRS.flatMap(([a, b]) => [...a, ...b])), build: physicsPairs },
      pool: 'CSE 100–189 (5+ credits, not CSE 115A/185E/185S), CSE 201–279 (5+ credits), CSE 195, or the listed AM/CMPM/MATH/STAT courses; one AM/STAT/MATH course may be replaced by a physics pair',
      notes: ['CSE 290+ only by approved course-substitution petition; CSE 280–289 are not eligible.'],
    })

    // "Course CSE 195 may be used either as an elective, or to satisfy the
    // DC requirement, but not for both." → DC competes with the electives.
    const dc = h.take('dc', 'Disciplinary Communication (DC)', ['The DC requirement in computer science B.S. is satisfied by completing an additional course from the following options.', 'Course CSE 195 may be used either as an elective, or to satisfy the DC requirement, but not for both.'], codes('CSE 115A', 'CSE 185E', 'CSE 185S', 'CSE 195'))

    h.solve()

    // Comprehensive: a capstone (which may ALSO count as an elective) or a
    // senior thesis (CSE 195, at least 5 credits).
    const capstone = h.take('capstone', 'Capstone course', ['Students may choose from one of the following capstone courses to satisfy their exit requirement (lecture-lab combinations count as one course):', 'A passed capstone course also counts toward satisfying the minimum number of upper-division electives requirement.'], codes(...CAPSTONES), {
      exclusive: false,
      labs: 'catalog-merge',
    })
    const thesis = h.take('thesis', 'Senior thesis (CSE 195)', 'A student wishing to complete a senior thesis must successfully complete a minimum of 5 credits in CSE 195, Senior Thesis Research.', codes('CSE 195'), { exclusive: false })
    h.solve()
    thesisDoubleCount(h, thesis, dc)

    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement', 'students must satisfy one of the following two exit requirements: pass one of the capstone courses (see Capstone Courses below); or successfully complete a senior thesis.', [capstone, thesis])

    return [lower, upper, electives, dc, comprehensive]
  },
})

/**
 * The page does not say whether one CSE 195 may serve as both the DC course
 * and the senior thesis. If that is the only way the thesis is met, say so
 * instead of guessing.
 */
function thesisDoubleCount(h: HarnessContext, thesis: Node, dc: Node) {
  if (thesis.status !== 'met') return
  const t = thesis.used ?? []
  const d = new Set((dc.used ?? []).map((e) => e.id))
  const all195 = h.taken(codes('CSE 195'))
  if (t.length && t.every((e) => d.has(e.id)) && all195.length < 2) {
    thesis.status = 'cannot-check'
    thesis.detail = 'Your only CSE 195 is counted as your DC course; the catalog does not say whether it may also be the senior thesis — ask an advisor.'
  }
}
