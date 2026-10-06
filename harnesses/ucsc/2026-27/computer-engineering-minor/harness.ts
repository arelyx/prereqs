// Computer Engineering Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-engineering-minor.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const Q_CSE20 = ['Students with no prior programming will take CSE 20 before CSE 30, and CSE 12.', 'bar will start with CSE 30 and CSE 12.']

export default defineHarness({
  program: 'computer-engineering-minor',
  edition: '2026-27',
  title: 'Computer Engineering Minor',
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
 * CSE 20 is listed as required, but the page says students who clear the
 * CSE 20 test-out "will start with CSE 30" without saying whether the test-out
 * itself satisfies the CSE 20 line. AP credit is a course in the plan; a
 * test-out is not. If CSE 20 is missing but CSE 30 was passed, do not guess.
 */
function cse20TestOut(h: HarnessContext, n: Node) {
  if (n.status !== 'unmet' || !h.has('CSE 30')) return
  n.status = 'cannot-check'
  n.detail = 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm with an advisor that it satisfies this line; otherwise take CSE 20 (AP credit: add it as CSE 20).'
}
