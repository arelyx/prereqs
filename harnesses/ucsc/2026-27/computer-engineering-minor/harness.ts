// Computer Engineering Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-engineering-minor.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const Q_CSE20 = ['Students with no prior programming will take CSE 20 before CSE 30, and CSE 12.', 'bar will start with CSE 30 and CSE 12.']
const Q_TESTOUT = 'Students with a prior programming course, AP credit, or clearing the [“Test-out”](https://sites.google.com/ucsc.edu/cse-20-testout) bar will start with CSE 30 and CSE 12.'

export default defineHarness({
  program: 'computer-engineering-minor',
  edition: '2026-27',
  title: 'Computer Engineering Minor',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: Q_TESTOUT,
      aliases: ['test-out', 'testout', 'cse 20 test'],
    },
  ],
  notes: [
    'Courses for the minor may be taken P/NP, but your major may require letter grades for the same courses (all Baskin Engineering majors do).',
    'Exam credit (AP etc.) for a course counts as that course — add it to your plan as completed.',
  ],
  evaluate(h) {
    // "Though courses for the minor may be taken for a letter grade or Pass/No Pass (P/NP)"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('cse12', 'CSE 12', 'The following course', codes('CSE 12')),
      h.take('c-prog', 'C programming', 'Plus one of the following', codes('CSE 13S', 'ECE 13')),
      h.group('core-ld', 'CSE 16, 20, 30; MATH 19A, 19B', [
        h.take('cse20', 'CSE 20', ['Plus all of the following', ...Q_CSE20], codes('CSE 20')),
        h.all('core-ld2', 'CSE 16, 30; MATH 19A, 19B', 'Plus all of the following', ['CSE 16', 'CSE 30', 'MATH 19A', 'MATH 19B']),
      ]),
      h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
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
      h.all('core-ud', 'CSE 100, 100L, 120', 'All of the following', ['CSE 100', 'CSE 100L', 'CSE 120']),
      h.take('embedded', 'ECE 118 or CSE 121', 'Plus one of the following', codes('ECE 118', 'CSE 121')),
      h.all('core-ud2', 'CSE 101, ECE 101, 101L', 'Plus all of the following', ['CSE 101', 'ECE 101', 'ECE 101L']),
    ])

    h.solve()
    cse20TestOut(h, cse20Node(lower))

    return [lower, upper]
  },
})

function cse20Node(root: Node): Node {
  const stack = [root]
  while (stack.length) {
    const n = stack.pop()!
    if (n.id === 'cse20') return n
    stack.push(...(n.children ?? []))
  }
  throw new Error('harness bug: no cse20 node')
}

/**
 * §1a test-out convention. "Students with a prior programming course, AP
 * credit, or clearing the “Test-out” bar will start with CSE 30 and CSE 12."
 * AP credit is a course in the plan (add it as CSE 20). The test-out is an
 * attestation, offered only when CSE 20 is absent from the plan; attested ⇒
 * the CSE 20 line is met by test-out. A failed CSE 20 stays unmet.
 */
function cse20TestOut(h: HarnessContext, n: Node) {
  if (n.status !== 'unmet' || h.enrollments.some((e) => e.code === 'CSE20')) return
  const def = h.attestations.find((a) => a.id === 'cse20-testout')!
  if (h.attested('cse20-testout')) {
    n.status = 'met'
    n.detail = 'Met by test-out (Passed the CSE 20 test-out).'
    return
  }
  n.status = 'needs-attestation'
  n.attest = def
  n.detail = h.has('CSE 30')
    ? 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm it; if you started at CSE 30 because of a prior programming course, check with an advisor; AP credit: add it as CSE 20.'
    : 'Take CSE 20, or confirm you passed the CSE 20 test-out (AP credit: add it as CSE 20).'
}
