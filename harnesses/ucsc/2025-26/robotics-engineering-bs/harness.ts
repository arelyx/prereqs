// Robotics Engineering B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/robotics-engineering-bs.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

// 2025-26: no ECE 263 (advanced) and no ECE 264 / ECE 269 (upper-division and graduate) — 2026-27 additions.
const ADVANCED = ['ECE 215', 'ECE 216', 'ECE 240', 'ECE 242', 'ECE 243', 'ECE 244', 'ECE 245', 'ECE 246', 'ECE 249']
const UD_GRAD = [
  'ECE 102', 'ECE 102L', 'ECE 110', 'ECE 130', 'ECE 130L', 'ECE 135', 'ECE 135L', 'ECE 145', 'ECE 149', 'ECE 151',
  'ECE 152', 'ECE 153', 'ECE 163', 'ECE 169', 'ECE 171', 'ECE 171L', 'ECE 172', 'ECE 173', 'ECE 175', 'ECE 175L',
  'ECE 193', 'ECE 198', 'ECE 222A', 'AM 114', 'AM 147', 'CMPM 146', 'CSE 118', 'CSE 131',
  'CSE 140', 'CSE 142', 'CSE 156', 'CSE 156L', 'CSE 276',
]

export default defineHarness({
  program: 'robotics-engineering-bs',
  edition: '2025-26',
  title: 'Robotics Engineering B.S.',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'Students with a prior programming course, AP credit, or clearing the “[Test-out](https://sites.google.com/ucsc.edu/cse-20-testout)” bar will start with CSE 30.',
      aliases: ['test-out', 'testout', 'cse 20 test'],
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
      // 2025-26: ECE 13 is in "And all the following courses" (no CSE 13S
      // alternative), and there is no PHYS 15A/15C substitution note.
      h.group('core-ld', 'ECE 13, CSE 16, calculus, physics, ECE 9, ECE 10', [
        h.take('c-prog', 'ECE 13', 'And all the following courses:', codes('ECE 13')),
        h.all('ld-all', 'CSE 16, MATH 19A, 19B, ECE 9, ECE 10', 'And all the following courses:', ['CSE 16', 'MATH 19A', 'MATH 19B', 'ECE 9', 'ECE 10']),
        h.take('phys5a', 'PHYS 5A', 'And all the following courses:', codes('PHYS 5A')),
        h.take('phys5l', 'PHYS 5L', 'And all the following courses:', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C', 'And all the following courses:', codes('PHYS 5C')),
        h.take('phys5n', 'PHYS 5N', 'And all the following courses:', codes('PHYS 5N')),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('core', 'Required upper-division courses', 'All of the following:', [
        'CSE 100', 'CSE 100L', 'ECE 141', 'ECE 167', 'CSE 101', 'ECE 101', 'ECE 101L', 'ECE 103', 'ECE 103L', 'ECE 121',
      ]),
      // 2025-26: no ECE 218-for-ECE 118 petition.
      h.take('ece118', 'ECE 118', 'ECE 118 — Introduction to Mechatronics (10)', codes('ECE 118')),
      h.take('stats', 'Probability and statistics', 'And either of the following:', codes('CSE 107', 'STAT 131')),
    ])

    const electives = h.group('electives', 'Electives', [
      h.take('advanced', 'Advanced Robotics Elective', 'One of the following:', codes(...ADVANCED)),
      h.take('ud-grad', 'Upper-Division and Graduate Elective', ['One course from the following (with a recommendation of ECE163):', 'Lecture and required concurrent lab course counts as one course.'], codes(...UD_GRAD), {
        labs: 'catalog-required',
      }),
    ])

    const capstonePackages = [['ECE 129A', 'ECE 129B', 'ECE 129C'], ['ECE 129A', 'ECE 195', 'ECE 195']]
    const dc = h.options('dc', 'Disciplinary Communication (DC)', ['The DC requirement in robotics is satisfied by completing the senior capstone course sequence:', 'Either these three courses:', 'Or these two courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages)
    h.solve()

    // The capstone is the same sequence as DC; it is an overlay, not a second use.
    const capstone = h.options('capstone', 'Capstone Requirement', ['Students must complete one capstone design course that spans three quarters', 'or complete the following courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages, { exclusive: false })
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [capstone, h.attest('exit-requirement')], {
      quote: 'The senior comprehensive requirement for robotics engineering majors is satisfied by completion of the capstone course and the portfolio exit requirement.',
      notes: ['The portfolios will be reviewed by the Electrical and Computer Engineering undergraduate committee and will include two project reports: ECE 118 and either the senior capstone report (ECE 129A/ECE 129B/ECE 129C) or the student’s senior thesis.'],
    })

    // 2025-26 only: "Double Majors and Major/Minor Combinations Policy".
    const combos = h.info('combinations', 'Degree and minor combinations', 'Students completing this major cannot also receive the computer engineering minor, assistive technology minor or the network and digital technology B.A. degree.', 'Not combinable with the Computer Engineering minor, the Assistive Technology minor, or the Network and Digital Technology B.A.')

    cse20TestOut(h, lower)
    return [lower, upper, electives, dc, comprehensive, combos]
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

/**
 * §1a test-out convention. "Students with a prior programming course, AP
 * credit, or clearing the “Test-out” bar will start with CSE 30." AP credit
 * is a course in the plan (add it as CSE 20). The test-out is an attestation,
 * offered only when CSE 20 is absent from the plan; attested ⇒ the CSE 20
 * line is met by test-out. A failed CSE 20 stays unmet.
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
