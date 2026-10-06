// Network and Digital Technology B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/network-and-digital-technology-ba.md
import { anyOf, canon, codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const COMPREHENSIVE = [
  'CSE 115A', 'CSE 156', 'CSE 156L', 'CSE 157', 'CSE 181', 'CSE 183', 'CSE 187', 'ECE 121', 'ECE 141', 'ECE 157',
  'ECE 157L', 'ECE 167', 'ECE 171', 'ECE 171L', 'ECE 173',
]
// Focus lists are suggestions only ("should consider including"); every
// course on them is a CSE 100–189 course and so already in the elective pool.
const FOCUS = [
  'CSE 118', 'CSE 151', 'CSE 151L', 'CSE 156', 'CSE 156L', 'CSE 157', 'CSE 167', 'CSE 183',
  'CSE 115A', 'CSE 117', 'CSE 119', 'CSE 130', 'CSE 165', 'CSE 180', 'CSE 181', 'CSE 182', 'CSE 186', 'CSE 187',
]

const Q_ELECTIVES = [
  'Five additional 5-credit or more, upper-division electives, and associated laboratories are required. One of these five courses should also be used to satisfy the comprehensive requirement below.',
  'Any 5-credit or more CSE course with a number between 100 and 189, except for the DC courses CSE 115A and CSE 185E/CSE 185S.',
  'Any 5-credit or more CSE course with a number between 201 and 279.',
  'CSE 195 (if not used to satisfy the DC).',
  'Any course from the [additional approved electives list]',
  'Students may not receive credit for both CSE 180 and CSE 182.',
]

export default defineHarness({
  program: 'network-and-digital-technology-ba',
  edition: '2026-27',
  title: 'Network and Digital Technology B.A.',
  attestations: [
    {
      id: 'comprehensive-petition',
      label: 'Petition approved: another engineering course with a substantial technology-based project satisfies the comprehensive requirement',
      quote: 'Students may petition to request approval to satisfy the comprehensive requirement with another engineering course having a substantial technology based project.',
      aliases: ['comprehensive petition', 'capstone petition'],
    },
  ],
  coverage: {
    unknownOk: { CSE185S: 'cross-listed with CSE 185E on the page; not in the committed CSE catalog' },
  },
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'The additional approved electives list is a separate catalog page the app does not have; electives outside the CSE ranges must be checked against it.',
    'CSE 290+ counts only by an approved course substitution petition; CSE 280–289 are not eligible.',
  ],
  evaluate(h) {
    // "must take all courses required for that major for a letter grade"
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('linalg', 'Linear algebra', 'One of the following', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
      h.take('multivar', 'Multivariable calculus', 'Plus one of the following', codes('AM 30', 'MATH 23A')),
      h.group('ld-all', 'CSE 12, 16, 20, 30; MATH 19A, 19B', [
        h.take('cse20', 'CSE 20', ['Plus all of the following', 'Students with no prior programming will take CSE 20 before CSE 30 and CSE 12.'], codes('CSE 20')),
        h.all('ld-rest', 'CSE 12, 16, 30; MATH 19A, 19B', 'Plus all of the following', ['CSE 12', 'CSE 16', 'CSE 30', 'MATH 19A', 'MATH 19B']),
      ]),
      h.take('c-prog', 'C programming', 'Plus one of the following', codes('CSE 13S', 'ECE 13')),
      // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
      h.options('phys-a', 'PHYS 5A + 5L or PHYS 6A + 6L', ['Plus one of the following lecture/lab combinations', 'PHYS 15A can be used as a substitute for PHYS 5A'], [
        ['PHYS 5A', 'PHYS 5L'],
        ['PHYS 15A', 'PHYS 5L'],
        ['PHYS 6A', 'PHYS 6L'],
      ]),
      h.options('phys-c', 'PHYS 5C + 5N or PHYS 6C + 6N', ['Plus one of the following lecture/lab combinations', 'PHYS 15C as a substitute for PHYS 5C'], [
        ['PHYS 5C', 'PHYS 5N'],
        ['PHYS 15C', 'PHYS 5N'],
        ['PHYS 6C', 'PHYS 6N'],
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.options('algo-or-circuits', 'CSE 101, or ECE 101 + 101L', ['One of the following', 'Lecture-lab combinations count as one course.'], [['CSE 101'], ['ECE 101', 'ECE 101L']]),
      h.take('cse150', 'CSE 150', 'All of the following', codes('CSE 150')),
      h.take('cse185', 'CSE 185E (or CSE 185S)', 'CSE 185E [/CSE 185S] — Technical Writing for Computer Science and Engineering (5)', codes('CSE 185E', 'CSE 185S')),
    ])

    const pool = anyOf(
      range('CSE', 100, 189).except(['CSE 115A', 'CSE 185E', 'CSE 185S']).minCredits(5),
      range('CSE', 201, 279).minCredits(5),
      codes('CSE 195'),
    )
    const electives = h.take('electives', 'Five upper-division or graduate electives', Q_ELECTIVES, pool, {
      n: 5,
      labs: { pairs: labPairs(h, pool), mode: 'required' },
      check: (chosen) => (chosen.some((e) => e.code === 'CSE180') && chosen.some((e) => e.code === 'CSE182') ? 'no credit for both CSE 180 and CSE 182' : null),
      pool: 'any 5+ credit CSE 100–189 (not CSE 115A/185E/185S), CSE 201–279 (5+ credits), CSE 195, or a course on the additional approved electives list',
      notes: [`Suggested focus courses: ${FOCUS.join(', ')}.`],
    })
    h.solve()
    approvedListCheck(h, electives)

    // "The DC requirement in network and digital technology is satisfied by
    // completing CSE 185E" — the same course already required above.
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in network and digital technology is satisfied by completing CSE 185E, Technical Writing for Computer Engineers.', codes('CSE 185E', 'CSE 185S'), { exclusive: false })

    // "This course can count as one of the five required electives." → overlay.
    const comp = h.take('comp-course', 'Comprehensive course', ['One of the following courses must be completed. This course can count as one of the five required electives.', 'Lecture-lab combinations count as one course.'], codes(...COMPREHENSIVE), {
      exclusive: false,
      labs: 'catalog-required',
    })
    const petitionCourse = h.take('comp-petition-course', 'Another engineering course with a technology-based project', 'Students may petition to request approval to satisfy the comprehensive requirement with another engineering course having a substantial technology based project.', anyOf(range('CSE', 100, 299), range('ECE', 100, 299)), {
      exclusive: false,
      pool: 'an upper-division or graduate CSE or ECE course (by approved petition)',
    })
    const comprehensive = h.either('comprehensive', 'Comprehensive Requirement', 'The comprehensive requirement is satisfied by completion of the capstone course.', [
      comp,
      h.group('comp-petition', 'By petition', [petitionCourse, h.attest('comprehensive-petition')]),
    ])
    h.solve()
    cse20TestOut(h, lower)

    const combos = h.info('combinations', 'Degree and minor combinations', ['Students completing any of the following degrees cannot also receive the Network and Digital Technology B.A.', 'The following minors cannot be combined with the Network and Digital Technology B.A'], 'Not combinable with the Robotics Engineering B.S., Computer Engineering B.S., Computer Science B.S. or B.A., or the Computer Engineering or Computer Science minor.')

    return [lower, upper, electives, dc, comprehensive, combos]
  },
})

/** Lecture → lab pairs among the student's courses ("and associated laboratories are required"). */
function labPairs(h: HarnessContext, pool: { has(code: string, cat?: HarnessContext['catalog']): boolean }): [string, string][] {
  const out = new Map<string, string>()
  for (const e of h.enrollments) {
    const c = e.code
    if (c.endsWith('L') && h.catalog.has(c.slice(0, -1))) out.set(c.slice(0, -1), c)
    else if (h.catalog.has(canon(c + 'L'))) out.set(c, canon(c + 'L'))
  }
  return [...out].filter(([lec]) => pool.has(lec, h.catalog))
}

/** Unmet electives while unused upper-division non-CSE courses exist: maybe on the external list. */
function approvedListCheck(h: HarnessContext, n: Node) {
  if (n.status !== 'unmet') return
  const candidates = h.passed.filter((e) => !h.used.has(e.id) && h.catalog.get(e.code)?.division === 'upper' && !/^CSE/.test(e.code) && !/L$/.test(e.code))
  if (!candidates.length) return
  n.status = 'cannot-check'
  n.detail = `${candidates.map((e) => e.display).join(', ')} may be on the additional approved electives list (not in the app) — check that list.`
}

function findNode(root: Node, id: string): Node | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return undefined
}

/** CSE 20 is listed as required; a test-out student "will start with CSE 30" — the page does not say it satisfies the line. */
function cse20TestOut(h: HarnessContext, lower: Node) {
  const n = findNode(lower, 'cse20')!
  if (n.status !== 'unmet' || !h.has('CSE 30')) return
  n.status = 'cannot-check'
  n.detail = 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm with an advisor that it satisfies this line; otherwise take CSE 20 (AP credit: add it as CSE 20).'
}
