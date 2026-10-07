// Computer Engineering B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/computer-engineering-bs.md
import { anyOf, canon, codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

// 2025-26: every concentration elective comes from external lists the app does
// not have (2026-27 instead opens any 5+ credit CSE 100–189 / 201–279 and CSE 195).
const Q_APPROVED = 'From the [approved elective list](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/baskin-engineering/computer-science-and-engineering/computer-engineering-bs-elective-course-list) for the computer engineering major.'
const Q_APPROVED_DH = 'From the [approved elective list](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/baskin-engineering/computer-science-and-engineering/computer-engineering-bs-elective-course-list) for the computer engineering major or the [Computer Engineering B.S. Digital Hardware Concentration Grad-Level Course List](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/baskin-engineering/computer-science-and-engineering/computer-engineering-bs-digital-hardware-concentration-grad-level-course-list).'
const Q_151 = 'Either the lecture-lab combination of CSE 151 and CSE 151L, or one upper-division or graduate elective from the [approved elective list](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/baskin-engineering/computer-science-and-engineering/computer-engineering-bs-elective-course-list) for the computer engineering major.'
/** "CSE 140, ECE 171" → "CSE140,ECE171" (course codes the student read off the external list). */
const parseCodes = (raw: string) => {
  const parts = raw.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)
  if (!parts.length || !parts.every((x) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(x))) return undefined
  return parts.map(canon).join(',')
}

export default defineHarness({
  program: 'computer-engineering-bs',
  edition: '2025-26',
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
    {
      key: 'approved-electives',
      label: 'Your courses on the approved CE elective list (Digital Hardware: or the DH grad-level course list), comma-separated',
      quote: Q_APPROVED,
      options: [],
      free: true,
      parse: parseCodes,
    },
  ],
  notes: [
    'Baskin Engineering requires a letter grade in every course used for the major (including courses from other departments).',
    'The approved CE elective list (and the Digital Hardware grad-level course list) are separate catalog pages the app does not have: tell the dashboard which of your courses are on them.',
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
        // 2025-26: no PHYS 15A/15C substitution note.
        h.take('phys5a', 'PHYS 5A', 'PHYS 5A — Introduction to Physics I (5)', codes('PHYS 5A')),
        h.take('phys5l', 'PHYS 5L', 'PHYS 5L — Introduction to Physics I Laboratory (1)', codes('PHYS 5L')),
        h.take('phys5c', 'PHYS 5C', 'PHYS 5C — Introduction to Physics III (5)', codes('PHYS 5C')),
        h.take('phys5n', 'PHYS 5N', 'PHYS 5N — Introduction to Physics Laboratory III (1)', codes('PHYS 5N')),
      ]),
      h.options('phys5b-or-ece9', 'PHYS 5B + 5M, or ECE 9', 'Plus one of the following options', [
        ['PHYS 5B', 'PHYS 5M'],
        ['ECE 9'],
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Core', [
      // 2025-26: CSE 185E [/CSE 185S] is a core course (not in the 2026-27 core).
      h.all('core', 'Core requirements', 'Core requirements:', ['CSE 100', 'CSE 100L', 'CSE 101', 'CSE 120', 'CSE 121', 'CSE 185E', 'ECE 101', 'ECE 101L', 'ECE 103', 'ECE 103L']),
      h.take('prob', 'Probability', 'Plus one of the following', codes('CSE 107', 'STAT 131')),
    ])

    // 2025-26: the core already requires CSE 185E, which also satisfies DC → overlay.
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in computer engineering is satisfied by one of the following:', codes('CSE 185E', 'CSE 185S', 'CSE 195'), {
      exclusive: false,
      prefer: (c) => (c === 'CSE195' ? 1 : 0),
    })

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
    if (concNode) approvedListCheck(h, concNode, declared(h).length > 0)

    return [lower, upper, ...(concNode ? [concNode] : []), dc, capstone]
  },
})

const declared = (h: HarnessContext) => (h.choice('approved-electives') ?? '').split(',').filter(Boolean)

/**
 * One upper-division or graduate elective from the external list(s) (§1a:
 * the student declares which of their courses are on it). `with151`: the
 * Networks / System Programming option "the lecture-lab combination of CSE 151
 * and CSE 151L".
 */
function elective(h: HarnessContext, id: string, quote: string, with151 = false): Node {
  const list = declared(h)
  const sets = [...(list.length ? [codes(...list)] : []), ...(with151 ? [codes('CSE 151')] : [])]
  const pool = sets.length ? anyOf(...sets) : codes()
  return h.take(id, with151 ? 'CSE 151 + 151L, or an approved elective' : 'Upper-division or graduate elective', with151 ? quote : ['Plus one upper-division or graduate elective', quote], pool, {
    labs: with151 ? { pairs: [['CSE 151', 'CSE 151L']], mode: 'required' } : 'catalog-merge',
    pool: `${with151 ? 'CSE 151 + CSE 151L, or ' : ''}a course you declared from the approved CE elective list`,
  })
}

function concentration(h: HarnessContext, c: string): Node {
  if (c === 'computer-systems') {
    return h.group('conc', 'Computer Systems Concentration', [
      h.take('cs/vlsi', 'CSE 125 or CSE 122', 'One of the following courses', codes('CSE 125', 'CSE 122'), {
        notes: ['CSE 222A (for 122) or CSE 225 (for 125) may substitute with department approval.'],
      }),
      h.take('cs/130', 'CSE 130', 'Plus the following course', codes('CSE 130')),
      // 2025-26: CSE 110A is not an option here (2026-27 adds it).
      h.take('cs/sys', 'CSE 111 or CSE 134', 'Plus one of the following courses', codes('CSE 111', 'CSE 134')),
      elective(h, 'cs/elective', Q_APPROVED),
    ])
  }
  if (c === 'digital-hardware') {
    return h.group('conc', 'Digital Hardware Concentration', [
      h.take('dh/125', 'CSE 125', 'The following course', codes('CSE 125'), { notes: ['CSE 225 may substitute with department approval.'] }),
      h.options('dh/analog-or-vlsi', 'ECE 171 + 171L, or CSE 122', 'Plus one of the following options', [['ECE 171', 'ECE 171L'], ['CSE 122']]),
      h.take('dh/one-more', 'One more hardware course', ['Plus one of the following courses', 'Lecture-lab combinations count as one course. Note that CSE 122 or ECE 171 and ECE 171L cannot be used again here.'], codes('CSE 122', 'CSE 220', 'CSE 228A', 'ECE 171', 'ECE 171L', 'ECE 173'), {
        labs: { pairs: [['ECE 171', 'ECE 171L']], mode: 'required' },
      }),
      elective(h, 'dh/elective', Q_APPROVED_DH),
    ])
  }
  if (c === 'networks') {
    return h.group('conc', 'Networks Concentration', [
      h.all('net/core', 'CSE 150, 156, 156L, 130', 'All of the following courses', ['CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130']),
      elective(h, 'net/elective', Q_151, true),
    ])
  }
  return h.group('conc', 'System Programming Concentration', [
    h.take('sp/130', 'CSE 130', 'The following course', codes('CSE 130')),
    h.take('sp/111-134', 'CSE 111 or CSE 134', 'Plus one of the following courses', codes('CSE 111', 'CSE 134')),
    h.take('sp/150', 'CSE 150', 'Plus the following course', codes('CSE 150')),
    elective(h, 'sp/elective', Q_151, true),
    h.take('sp/last', 'One of CSE 110A, 113, 156 (+156L)', ['Plus one of the following courses', 'CSE 156 and CSE 156L lecture-lab combination count as one course.'], codes('CSE 110A', 'CSE 113', 'CSE 156', 'CSE 156L'), {
      labs: { pairs: [['CSE 156', 'CSE 156L']], mode: 'merge' },
    }),
  ])
}

/**
 * §1a external list: an unmet elective while the student has unused
 * upper-division or graduate courses that may be on the list → cannot-check
 * until they declare which of their courses are on it.
 */
function approvedListCheck(h: HarnessContext, conc: Node, isDeclared: boolean) {
  const visit = (n: Node) => {
    n.children?.forEach(visit)
    if (n.id.endsWith('/elective') && n.status === 'unmet' && !isDeclared) {
      const candidates = h.passed.filter((e) => {
        const div = h.catalog.get(e.code)?.division
        return !h.used.has(e.id) && (div === 'upper' || div === 'graduate') && !e.code.endsWith('L')
      })
      if (candidates.length) {
        n.status = 'cannot-check'
        n.choice = 'approved-electives'
        n.detail = `${candidates.map((e) => e.display).join(', ')} may be on the approved CE elective list (not in the app) — check that list and declare which of your courses are on it.`
      }
    }
  }
  visit(conc)
}
