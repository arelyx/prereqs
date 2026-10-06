// Robotics Engineering B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/robotics-engineering-bs.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const ADVANCED = ['ECE 215', 'ECE 216', 'ECE 240', 'ECE 242', 'ECE 243', 'ECE 244', 'ECE 245', 'ECE 246', 'ECE 249', 'ECE 263']
const UD_GRAD = [
  'ECE 102', 'ECE 102L', 'ECE 110', 'ECE 130', 'ECE 130L', 'ECE 135', 'ECE 135L', 'ECE 145', 'ECE 149', 'ECE 151',
  'ECE 152', 'ECE 153', 'ECE 163', 'ECE 169', 'ECE 171', 'ECE 171L', 'ECE 172', 'ECE 173', 'ECE 175', 'ECE 175L',
  'ECE 193', 'ECE 198', 'ECE 222A', 'ECE 264', 'ECE 269', 'AM 114', 'AM 147', 'CMPM 146', 'CSE 118', 'CSE 131',
  'CSE 140', 'CSE 142', 'CSE 156', 'CSE 156L', 'CSE 276',
]

export default defineHarness({
  program: 'robotics-engineering-bs',
  edition: '2026-27',
  title: 'Robotics Engineering B.S.',
  attestations: [
    {
      id: 'ece218-petition',
      label: 'Petition to substitute ECE 218 for ECE 118 approved',
      quote: 'Students can petition to substitute ECE 218 for ECE 118 to fulfill program requirements, but ECE 218 will not fulfill the PR GE requirement.',
      aliases: ['ece 218', 'ece218'],
    },
    {
      id: 'exit-requirement',
      label: 'Exit survey, exit interview and portfolio',
      quote: 'Students are required to complete an exit survey and attend an exit interview.',
      aliases: ['exit survey', 'exit interview', 'portfolio', 'exit requirement'],
    },
  ],
  coverage: {
    unknownOk: { CSE131: 'listed on the page (Introduction to Operating Systems) but not in the committed CSE catalog' },
  },
  notes: [
    'The Electrical and Computer Engineering Department requires a letter grade in every course used for the B.S., including courses from other departments.',
  ],
  evaluate(h) {
    // "requires letter grading for all courses applied toward the B.S. in
    // robotics engineering. This policy includes courses required for the
    // degree that are sponsored by other departments."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('linalg', 'Linear algebra', 'Either of the following:', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Either of the following:', codes('AM 20', 'MATH 24')),
      h.take('cse12', 'CSE 12', 'And the following:', codes('CSE 12')),
      h.take('cse20', 'CSE 20', ['And the following:', 'Students with no prior programming will take CSE 20 before CSE 30.'], codes('CSE 20')),
      h.take('cse30', 'CSE 30', 'And the following:', codes('CSE 30')),
      h.take('multivar', 'Multivariable calculus', 'And either of the following:', codes('MATH 23A', 'AM 30')),
      h.take('c-prog', 'C programming', 'And either of the following:', codes('ECE 13', 'CSE 13S')),
      h.group('core-ld', 'CSE 16, calculus, physics, ECE 9, ECE 10', [
        h.all('ld-all', 'CSE 16, MATH 19A, 19B, ECE 9, ECE 10', 'And all the following courses:', ['CSE 16', 'MATH 19A', 'MATH 19B', 'ECE 9', 'ECE 10']),
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        h.take('phys5a', 'PHYS 5A (or 15A)', 'PHYS 15A can be used as a substitute for PHYS 5A', codes('PHYS 5A', 'PHYS 15A')),
        h.take('phys5l', 'PHYS 5L', 'And all the following courses:', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C (or 15C)', 'PHYS 15C as a substitute for PHYS 5C', codes('PHYS 5C', 'PHYS 15C')),
        h.take('phys5n', 'PHYS 5N', 'And all the following courses:', codes('PHYS 5N')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('core', 'Required upper-division courses', 'All of the following:', [
        'CSE 100', 'CSE 100L', 'ECE 141', 'ECE 167', 'CSE 101', 'ECE 101', 'ECE 101L', 'ECE 103', 'ECE 103L', 'ECE 121',
      ]),
      h.take('ece118', 'ECE 118 (or ECE 218 by petition)', ['ECE 118 — Introduction to Mechatronics (10)', 'Students can petition to substitute ECE 218 for ECE 118 to fulfill program requirements, but ECE 218 will not fulfill the PR GE requirement.'], codes('ECE 118', 'ECE 218'), {
        prefer: (c) => (c === 'ECE218' ? 1 : 0),
      }),
      h.take('stats', 'Probability and statistics', 'And either of the following:', codes('CSE 107', 'STAT 131')),
    ])

    const electives = h.group('electives', 'Electives', [
      h.take('advanced', 'Advanced Robotics Elective', 'One of the following:', codes(...ADVANCED)),
      h.take('ud-grad', 'Upper-Division and Graduate Elective', ['One course from the following:', 'Lecture and required concurrent lab course counts as one course.'], codes(...UD_GRAD), {
        labs: 'catalog-required',
      }),
    ])

    const capstonePackages = [['ECE 129A', 'ECE 129B', 'ECE 129C'], ['ECE 129A', 'ECE 195', 'ECE 195']]
    const dc = h.options('dc', 'Disciplinary Communication (DC)', ['The DC requirement in robotics is satisfied by completing the senior capstone course sequence:', 'Either these three courses:', 'Or these two courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages)
    h.solve()
    petition218(h, upper)

    // The capstone is the same sequence as DC; it is an overlay, not a second use.
    const capstone = h.options('capstone', 'Capstone Requirement', ['Students must complete one capstone design course that spans three quarters', 'or complete the following courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages, { exclusive: false })
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [capstone, h.attest('exit-requirement')], {
      quote: 'The senior comprehensive requirement for robotics engineering majors is satisfied by completion of the capstone course and the portfolio exit requirement.',
      notes: ['Students with a GPA below 2.5 and without a senior thesis also need to submit a two-page essay concerning the relationship of engineering to society (specific topic will be provided by the Electrical and Computer Engineering Department).'],
    })

    cse20TestOut(h, lower)
    return [lower, upper, electives, dc, comprehensive]
  },
})

function findNode(root: Node, id: string): Node | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return undefined
}

/** ECE 218 stands in for ECE 118 only by an approved petition. */
function petition218(h: HarnessContext, upper: Node) {
  const n = findNode(upper, 'ece118')!
  if (n.status === 'met' && (n.used ?? []).some((e) => e.code === 'ECE218') && !h.attested('ece218-petition')) {
    const def = h.attestations.find((a) => a.id === 'ece218-petition')!
    n.status = 'needs-attestation'
    n.attest = def
    n.detail = 'ECE 218 counts for ECE 118 only with an approved petition.'
  }
}

/**
 * "Students with a prior programming course, AP credit, or clearing the
 * Test-out bar will start with CSE 30." The page lists CSE 20 as required and
 * does not say whether the test-out itself satisfies it; if CSE 20 is missing
 * but CSE 30 was passed, do not guess.
 */
function cse20TestOut(h: HarnessContext, lower: Node) {
  const n = findNode(lower, 'cse20')!
  if (n.status !== 'unmet' || !h.has('CSE 30')) return
  n.status = 'cannot-check'
  n.detail = 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm with an advisor that it satisfies this line; otherwise take CSE 20 (AP credit: add it as CSE 20).'
}
