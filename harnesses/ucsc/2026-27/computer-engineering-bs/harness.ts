// Computer Engineering B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-engineering-bs.md
import { anyOf, codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const Q_ELECTIVE = [
  'Any 5-credit or more CSE course with a number between 100 and 189, except for the DC courses CSE 115A and CSE 185E/CSE 185S.',
  'Any 5-credit or more CSE course with a number between 201 and 279.',
  'CSE 195 (if not used to satisfy the DC or capstone requirement).',
  'Any course from the [approved elective list]',
]

export default defineHarness({
  program: 'computer-engineering-bs',
  edition: '2026-27',
  title: 'Computer Engineering B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'students must complete all courses listed within their selected concentration below.',
      options: [
        { value: 'computer-systems', label: 'Computer Systems' },
        { value: 'digital-hardware', label: 'Digital Hardware' },
        { value: 'networks', label: 'Networks' },
        { value: 'systems-programming', label: 'System Programming', aliases: ['systems programming', 'system programming concentration'] },
      ],
    },
  ],
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'The approved CE elective list is a separate catalog page the app does not have; electives outside the CSE ranges must be checked against it.',
  ],
  evaluate(h) {
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('calc', 'Calculus', 'All of the following', ['MATH 19A', 'MATH 19B']),
      h.take('multivar', 'Multivariable calculus', 'Plus one of the following', codes('AM 30', 'MATH 23A')),
      h.take('linalg', 'Linear algebra', 'Plus one of the following', codes('AM 10', 'MATH 21')),
      h.all('ode-cse12', 'AM 20 and CSE 12', 'Plus all of the following', ['AM 20', 'CSE 12']),
      h.take('c-prog', 'C programming', 'Plus one of the following', codes('CSE 13S', 'ECE 13')),
      h.group('ld-core', 'CSE 16, 20, 30 and physics', [
        h.all('cse-ld', 'CSE 16, 20, 30', 'Plus all of the following', ['CSE 16', 'CSE 20', 'CSE 30']),
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        h.take('phys5a', 'PHYS 5A (or 15A)', 'PHYS 15A can be used as a substitute for PHYS 5A', codes('PHYS 5A', 'PHYS 15A')),
        h.take('phys5l', 'PHYS 5L', 'PHYS 5L — Introduction to Physics I Laboratory (1)', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C (or 15C)', 'PHYS 15C as a substitute for PHYS 5C', codes('PHYS 5C', 'PHYS 15C')),
        h.take('phys5n', 'PHYS 5N', 'PHYS 5N — Introduction to Physics Laboratory III (1)', codes('PHYS 5N')),
      ]),
      h.options('phys5b-or-ece9', 'PHYS 5B + 5M, or ECE 9', 'Plus one of the following options', [
        ['PHYS 5B', 'PHYS 5M'],
        ['ECE 9'],
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Core', [
      h.all('core', 'Core requirements', 'Core requirements:', ['CSE 100', 'CSE 100L', 'CSE 101', 'CSE 120', 'CSE 121', 'ECE 101', 'ECE 101L', 'ECE 103', 'ECE 103L']),
      h.take('prob', 'Probability', 'Plus one of the following', codes('CSE 107', 'STAT 131')),
    ])

    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in computer engineering is satisfied by one of the following:', codes('CSE 185E', 'CSE 185S', 'CSE 195'))

    const conc = h.choice('concentration')
    const concNode = h.needChoice('concentration') ?? concentration(h, conc!)

    // Capstone sequences. ECE 118 "May not also be used as a concentration
    // elective" (it is not in our elective pool, so no clash is possible here).
    // One slot with four packages, so unchosen sequences never compete with
    // other requirements for courses.
    const capstone = h.options(
      'capstone',
      'Capstone Requirement',
      ['All computer engineering students complete one of the following capstone sequences:', 'Both of the following courses', 'Or all of the following courses', 'Or the following course'],
      [['CSE 123A', 'CSE 123B'], ['CSE 129A', 'CSE 129B', 'CSE 129C'], ['CSE 195'], ['ECE 118']],
      { notes: ['CSE 195 also requires the submission of an approved senior thesis.', 'ECE 118: May not also be used as a concentration elective.'] },
    )
    h.solve()
    cse195Shared(h, capstone, dc)
    if (concNode) approvedListCheck(h, concNode)

    return [lower, upper, ...(concNode ? [concNode] : []), dc, capstone]
  },
})

/** One upper-division or graduate elective (shared by every concentration). */
function elective(h: HarnessContext, id: string, quote: string | string[]): Node {
  const pool = anyOf(
    range('CSE', 100, 189).except(['CSE 115A', 'CSE 185E', 'CSE 185S']).minCredits(5),
    range('CSE', 201, 279).minCredits(5),
    codes('CSE 195'),
  )
  return h.take(id, 'Upper-division or graduate elective', [...Q_ELECTIVE, ...(Array.isArray(quote) ? quote : [quote])], pool, {
    labs: 'catalog-merge',
    pool: 'any 5+ credit CSE 100–189 (not 115A/185E/185S), CSE 201–279, CSE 195, or a course on the approved CE elective list',
  })
}

function concentration(h: HarnessContext, c: string): Node {
  if (c === 'computer-systems') {
    return h.group('conc', 'Computer Systems Concentration', [
      h.take('cs/vlsi', 'CSE 125 or CSE 122', 'One of the following courses', codes('CSE 125', 'CSE 122'), {
        notes: ['CSE 222A (for 122) or CSE 225 (for 125) may substitute with department approval.'],
      }),
      h.take('cs/130', 'CSE 130', 'Plus the following course', codes('CSE 130')),
      h.take('cs/sys', 'One of CSE 110A, 111, 134', 'Plus one of the following courses', codes('CSE 110A', 'CSE 111', 'CSE 134')),
      elective(h, 'cs/elective', 'Plus one upper-division or graduate elective'),
    ])
  }
  if (c === 'digital-hardware') {
    return h.group('conc', 'Digital Hardware Concentration', [
      h.take('dh/125', 'CSE 125', 'The following course', codes('CSE 125'), { notes: ['CSE 225 may substitute with department approval.'] }),
      h.options('dh/analog-or-vlsi', 'ECE 171 + 171L, or CSE 122', 'Plus one of the following options', [['ECE 171', 'ECE 171L'], ['CSE 122']]),
      h.take('dh/one-more', 'One more hardware course', ['Plus one of the following courses', 'Lecture-lab combinations count as one course. Note that CSE 122 or ECE 171 and ECE 171L cannot be used again here.'], codes('CSE 122', 'CSE 220', 'CSE 228A', 'ECE 171', 'ECE 171L', 'ECE 173'), {
        labs: { pairs: [['ECE 171', 'ECE 171L']], mode: 'required' },
      }),
      elective(h, 'dh/elective', 'Plus one upper-division or graduate elective'),
    ])
  }
  if (c === 'networks') {
    return h.group('conc', 'Networks Concentration', [
      h.all('net/core', 'CSE 150, 156, 156L, 130', 'All of the following courses', ['CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130']),
      elective(h, 'net/elective', 'Either the lecture-lab combination of CSE 151 and CSE 151L, or any other upper division or graduate elective:'),
    ])
  }
  return h.group('conc', 'System Programming Concentration', [
    h.take('sp/130', 'CSE 130', 'The following course', codes('CSE 130')),
    h.take('sp/111-134', 'CSE 111 or CSE 134', 'Plus one of the following courses', codes('CSE 111', 'CSE 134')),
    h.take('sp/150', 'CSE 150', 'Plus the following course', codes('CSE 150')),
    elective(h, 'sp/elective', 'Plus one upper-division or graduate elective'),
    h.take('sp/last', 'One of CSE 110A, 113, 156 (+156L)', ['Plus one of the following courses', 'CSE 156 and CSE 156L lecture-lab combination count as one course.'], codes('CSE 110A', 'CSE 113', 'CSE 156', 'CSE 156L'), {
      labs: { pairs: [['CSE 156', 'CSE 156L']], mode: 'merge' },
    }),
  ])
}

/**
 * The page does not say whether one CSE 195 may count for both DC and the
 * CSE 195 capstone; report it instead of guessing.
 */
function cse195Shared(h: HarnessContext, capstone: Node, dc: Node) {
  const all195 = h.taken(codes('CSE 195'))
  if (all195.length !== 1) return
  const only = all195[0].id
  const msg = 'Your only CSE 195 would have to count for both DC and the capstone; the catalog does not say whether one enrollment may do both — ask an advisor.'
  if (capstone.status === 'unmet' && (dc.used ?? []).some((e) => e.id === only)) {
    capstone.status = 'cannot-check'
    capstone.detail = msg
  } else if (dc.status === 'unmet' && (capstone.used ?? []).some((e) => e.id === only)) {
    dc.status = 'cannot-check'
    dc.detail = msg
  }
}

/** An unmet elective while the student has unused upper-division non-CSE courses: maybe on the external list. */
function approvedListCheck(h: HarnessContext, conc: Node) {
  const visit = (n: Node) => {
    n.children?.forEach(visit)
    if (/\/elective$/.test(n.id) && n.status === 'unmet') {
      const candidates = h.passed.filter(
        (e) => !h.used.has(e.id) && h.catalog.get(e.code)?.division === 'upper' && !/^CSE/.test(e.code),
      )
      if (candidates.length) {
        n.status = 'cannot-check'
        n.detail = `${candidates.map((e) => e.display).join(', ')} may be on the approved CE elective list (not in the app) — check that list.`
      }
    }
  }
  visit(conc)
}
