// Network and Digital Technology B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/network-and-digital-technology-ba.md
import { anyOf, canon, codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

// 2025-26: the comprehensive list has no ECE courses (2026-27 adds ECE 121,
// 141, 157/157L, 167, 171/171L, 173); every course on it is on a focus list.
const COMPREHENSIVE = ['CSE 115A', 'CSE 156', 'CSE 156L', 'CSE 157', 'CSE 181', 'CSE 183', 'CSE 187']
// 2025-26: "Students may choose courses from either or both of the lists below,
// or from the [additional approved electives list]". The two focus lists ARE the
// elective pool here (2026-27 instead opens any 5+ credit CSE 100–189 / 201–279
// course and CSE 195, and keeps the focus lists as suggestions).
const FOCUS_NETWORKING = ['CSE 118', 'CSE 151', 'CSE 151L', 'CSE 156', 'CSE 156L', 'CSE 157', 'CSE 167', 'CSE 183']
const FOCUS_SOFTWARE = ['CSE 115A', 'CSE 117', 'CSE 119', 'CSE 130', 'CSE 165', 'CSE 180', 'CSE 181', 'CSE 182', 'CSE 186', 'CSE 187']
const FOCUS = [...FOCUS_NETWORKING, ...FOCUS_SOFTWARE]
const BASE_POOL = codes(...FOCUS)
const Q_APPROVED = 'Students may choose courses from either or both of the lists below, or from the [additional approved electives list](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/baskin-engineering/computer-science-and-engineering/network-and-digital-technology-electives-course-list/).'
/** "ECE 171, LING 112" → "ECE171,LING112" (course codes the student read off the external list). */
const parseCodes = (raw: string) => {
  const parts = raw.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)
  if (!parts.length || !parts.every((x) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(x))) return undefined
  return parts.map(canon).join(',')
}

const Q_ELECTIVES = [
  'Five additional 5-credit or more, upper-division electives, and associated laboratories are required.',
  Q_APPROVED,
  'One of these five courses should also be used to satisfy the comprehensive requirement below.',
  'Students may not receive credit for both CSE 180 and CSE 182.',
  'This course can count as one of the five required electives.',
]

export default defineHarness({
  program: 'network-and-digital-technology-ba',
  edition: '2025-26',
  title: 'Network and Digital Technology B.A.',
  choices: [
    {
      key: 'approved-electives',
      label: 'Your courses on the additional approved electives list (comma-separated)',
      quote: Q_APPROVED,
      options: [],
      free: true,
      parse: parseCodes,
    },
  ],
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'Students with a prior programming course, AP credit, or clearing the “[Test-out](https://sites.google.com/ucsc.edu/cse-20-testout)” bar will start with CSE 30 and CSE 12.',
      aliases: ['test-out', 'testout', 'cse 20 test'],
    },
    {
      id: 'comprehensive-petition',
      label: 'Petition approved: another engineering course with a substantial technology-based project satisfies the comprehensive requirement',
      quote: 'Students may petition to request approval to satisfy the comprehensive requirement with another engineering course having a substantial technology based project.',
      aliases: ['comprehensive petition', 'capstone petition'],
    },
  ],
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'The additional approved electives list is a separate catalog page the app does not have: tell the dashboard which of your courses are on it.',
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
      // 2025-26: no PHYS 15A/15C substitution note.
      h.options('phys-a', 'PHYS 5A + 5L or PHYS 6A + 6L', 'Plus one of the following lecture/lab combinations', [
        ['PHYS 5A', 'PHYS 5L'],
        ['PHYS 6A', 'PHYS 6L'],
      ]),
      h.options('phys-c', 'PHYS 5C + 5N or PHYS 6C + 6N', 'Plus one of the following lecture/lab combinations', [
        ['PHYS 5C', 'PHYS 5N'],
        ['PHYS 6C', 'PHYS 6N'],
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      // 2025-26: CSE 101 is required (2026-27 allows ECE 101 + 101L instead).
      h.take('cse101', 'CSE 101', 'All of the following', codes('CSE 101')),
      h.take('cse150', 'CSE 150', 'All of the following', codes('CSE 150')),
      h.take('cse185', 'CSE 185E (or CSE 185S)', 'CSE 185E [/CSE 185S] — Technical Writing for Computer Science and Engineering (5)', codes('CSE 185E')),
    ])

    // Approved-list courses the student declared (§1a external list convention).
    const declared = (h.choice('approved-electives') ?? '').split(',').filter(Boolean)
    const pool = anyOf(BASE_POOL, ...(declared.length ? [codes(...declared).minCredits(5)] : []))
    const electives = h.take('electives', 'Five upper-division electives', Q_ELECTIVES, pool, {
      n: 5,
      labs: { pairs: labPairs(h, pool), mode: 'required' },
      check: (chosen) => {
        if (chosen.some((e) => e.code === 'CSE180') && chosen.some((e) => e.code === 'CSE182')) return 'no credit for both CSE 180 and CSE 182'
        // Cross-listed codes are one course (the allocator dedupes them across slots, not within one).
        const keys = chosen.map((e) => [e.code, ...h.catalog.equivalents(e.code)].sort()[0])
        return new Set(keys).size !== keys.length ? 'cross-listed codes are the same course' : null
      },
      pool: `the Digital Technology for Networking or Internet Software Technology focus lists (${FOCUS.join(', ')}), or a course you declared from the additional approved electives list`,
    })
    h.solve()
    approvedListCheck(h, electives, declared.length > 0)

    // "The DC requirement in network and digital technology is satisfied by
    // completing CSE 185E" — the same course already required above.
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in network and digital technology is satisfied by completing CSE 185E, Technical Writing for Computer Engineers.', codes('CSE 185E'), { exclusive: false })

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

/**
 * §1a external list: "Any course from the [additional approved electives
 * list]". Until the student declares which of their courses are on it, unmet
 * electives with unused upper-division courses are cannot-check.
 */
function approvedListCheck(h: HarnessContext, n: Node, declared: boolean) {
  if (n.status !== 'unmet' || declared) return
  // 2025-26: the pool is only the focus lists, so an unused upper-division CSE
  // course may also be on the external list. Focus-list courses already failed
  // a stated rule (CSE 180/182, missing lab), and CSE 185E/185S is the DC course.
  const candidates = h.passed.filter((e) => !h.used.has(e.id) && h.catalog.get(e.code)?.division === 'upper' && !e.code.endsWith('L') && !['CSE185E', 'CSE185S'].includes(e.code) && !BASE_POOL.has(e.code, h.catalog))
  if (!candidates.length) return
  n.status = 'cannot-check'
  n.choice = 'approved-electives'
  n.detail = `${candidates.map((e) => e.display).join(', ')} may be on the additional approved electives list (not in the app) — check that list and declare which of your courses are on it.`
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
 * §1a test-out convention. "Students with a prior programming course, AP
 * credit, or clearing the “Test-out” bar will start with CSE 30 and CSE 12."
 * The attestation is offered only when CSE 20 is absent from the plan (a
 * failed CSE 20 is not rescued); attested ⇒ met by test-out.
 */
function cse20TestOut(h: HarnessContext, lower: Node) {
  const n = findNode(lower, 'cse20')!
  if (n.status !== 'unmet' || h.enrollments.some((e) => e.code === 'CSE20')) return
  if (h.attested('cse20-testout')) {
    n.status = 'met'
    n.detail = 'Met by test-out (Passed the CSE 20 test-out).'
    return
  }
  n.status = 'needs-attestation'
  n.attest = h.attestations.find((a) => a.id === 'cse20-testout')!
  n.detail = h.has('CSE 30')
    ? 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm it; if you started at CSE 30 because of a prior programming course, check with an advisor; AP credit: add it as CSE 20.'
    : 'Take CSE 20, or confirm you passed the CSE 20 test-out (AP credit: add it as CSE 20).'
}
