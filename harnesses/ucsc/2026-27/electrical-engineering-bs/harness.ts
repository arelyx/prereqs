// Electrical Engineering B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/electrical-engineering-bs.md
import { canon, codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const ELECTRONICS_OPTICS = [
  'ECE 104', 'ECE 110', 'ECE 115', 'ECE 118', 'ECE 121', 'ECE 130', 'ECE 130L', 'ECE 136', 'ECE 141', 'ECE 145',
  'ECE 157', 'ECE 157L', 'ECE 163', 'ECE 167', 'ECE 172', 'ECE 173', 'ECE 169', 'ECE 170', 'ECE 175', 'ECE 175L',
  'ECE 176', 'ECE 176L', 'ECE 177', 'ECE 177L', 'ECE 178', 'ECE 180J', 'ECE 183', 'ECE 185', 'ECE 193', 'ECE 198',
  'ECE 201', 'ECE 203', 'ECE 207', 'ECE 210', 'ECE 215', 'ECE 221', 'ECE 222A', 'ECE 230', 'ECE 231', 'ECE 241',
  'ECE 242', 'ECE 243', 'ECE 245', 'ECE 275', 'PHYS 137',
]
const COMM_SIGNALS = [
  'ECE 118', 'ECE 121', 'ECE 130', 'ECE 130L', 'ECE 136', 'ECE 141', 'ECE 145', 'ECE 152', 'ECE 153', 'ECE 157',
  'ECE 157L', 'ECE 163', 'ECE 173', 'ECE 183', 'ECE 193', 'ECE 198', 'ECE 230', 'ECE 215', 'ECE 237', 'ECE 241',
  'ECE 242', 'ECE 243', 'ECE 244', 'ECE 245', 'ECE 250', 'ECE 251', 'ECE 252', 'ECE 253', 'ECE 255', 'ECE 256',
  'CSE 150',
]
// "Students can petition to substitute ECE 218 for ECE 118" (both lists).
const POOL = codes(...new Set([...ELECTRONICS_OPTICS, ...COMM_SIGNALS, 'ECE 218']))
const EO_SET = codes(...ELECTRONICS_OPTICS, 'ECE 218')
const CSS_SET = codes(...COMM_SIGNALS, 'ECE 218')

// "[(ECE 130 and ECE 230), (ECE 152 and ECE 252), (ECE 141 and ECE 241), and
// (ECE 153 and ECE 250) ...] and (ECE 172 and ECE 221) ... from each pair of
// classes only one can be taken for this program."
const CONJOINED: [string, string][] = [
  ['ECE130', 'ECE230'], ['ECE141', 'ECE241'], ['ECE172', 'ECE221'], ['ECE152', 'ECE252'], ['ECE153', 'ECE250'],
  ['ECE118', 'ECE218'], // ECE 218 only ever stands in for ECE 118
]
// Design electives: "ECE 118, ECE 121, ECE 157 & ECE 157L, ECE167 and ECE 173"
// (ECE 218 by petition stands in for ECE 118).
const DESIGN = new Set(['ECE118', 'ECE121', 'ECE157', 'ECE167', 'ECE173', 'ECE218'])
const LAB_PAIRS: [string, string][] = [
  ['ECE 130', 'ECE 130L'], ['ECE 157', 'ECE 157L'], ['ECE 175', 'ECE 175L'], ['ECE 176', 'ECE 176L'], ['ECE 177', 'ECE 177L'],
]

const Q_ELECTIVES = [
  'In addition to completing the courses required for both concentrations, electrical engineering majors must complete four elective courses chosen from the lists below.',
  'No course may be counted twice.',
  'Lecture/lab combinations count as one course. Each of the ECE 183, ECE 193, and ECE 198 courses can be taken only once as an elective course.',
]
const Q_DESIGN =
  'Design Elective: One of the four concentration courses chosen must include at least one of the following design electives ECE 118, ECE 121, ECE 157 & ECE 157L, ECE167 and ECE 173. This course must be taken before the first capstone course ECE 129A.'

export default defineHarness({
  program: 'electrical-engineering-bs',
  edition: '2026-27',
  title: 'Electrical Engineering B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'Students can pursue either of two concentrations, Electronics/Optics or Communications, Signals and Systems.',
      options: [
        { value: 'electronics-optics', label: 'Electronics/Optics', aliases: ['electronics', 'optics', 'electronics and optics'] },
        {
          value: 'communications-signals-systems',
          label: 'Communications, Signals and Systems',
          aliases: ['communications', 'communications signals systems', 'communications, signals, systems', 'css'],
        },
      ],
    },
  ],
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'A test-out option is available for CSE 20.',
      aliases: ['test-out', 'testout', 'cse 20 test'],
    },
    {
      id: 'ece183-approval',
      label: 'Undergraduate director approved ECE 183 as an elective',
      quote: 'ECE 183 can be taken as an elective course with an approval of the undergraduate director.',
      aliases: ['ece 183', 'ece183'],
    },
    {
      id: 'ece218-petition',
      label: 'Petition to substitute ECE 218 for ECE 118 approved',
      quote: 'Students can petition to substitute ECE 218 for ECE 118 to fulfill program requirements, but will not fulfill the PR GE requirement.',
      aliases: ['ece 218', 'ece218'],
    },
    {
      id: 'exit-requirement',
      label: 'Exit survey, exit interview and portfolio',
      quote: 'Students are required to complete an exit survey and attend an exit interview.',
      aliases: ['exit survey', 'exit interview', 'portfolio', 'exit requirement'],
    },
  ],
  notes: [
    'The Electrical and Computer Engineering Department requires a letter grade in every course used for the B.S.',
    'ECE 121, ECE 141 and ECE 167 used for the assistive technology minor cannot also be EE electives.',
  ],
  evaluate(h) {
    // "requires letter grading for all courses applied toward the Electrical Engineering Bachelor of Science (B.S.) degree."
    h.policy = { letter: true }
    const transfer = h.entry === 'transfer'

    const lower = h.group('lower', 'Lower-Division Courses', [
      transfer
        ? h.info('ece-intro', 'ECE 80T or ECE 8', 'This course is waived for transfer students.', 'Waived: you entered as a transfer student.')
        : h.take('ece-intro', 'ECE 80T or ECE 8', ['One of these courses:', 'This course is waived for transfer students.'], codes('ECE 80T', 'ECE 8')),
      h.take('programming', 'CSE 20 or CSE 30', ['One of these courses:', 'A test-out option is available for CSE 20.'], codes('CSE 20', 'CSE 30')),
      h.take('cse12', 'CSE 12', 'Plus this course:', codes('CSE 12')),
      h.take('c-prog', 'C programming', 'And one of the following', codes('ECE 13', 'CSE 13S')),
      h.all('calc', 'MATH 19A, 19B', 'Take the following courses:', ['MATH 19A', 'MATH 19B']),
      h.options('vector', 'MATH 23A + 23B, or AM 30 + AM 100', 'Plus one of the following options:', [
        ['MATH 23A', 'MATH 23B'],
        ['AM 30', 'AM 100'],
      ]),
      h.take('linalg', 'Linear algebra', 'One of the following', codes('AM 10', 'MATH 21')),
      h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
      h.group('physics', 'Physics', [
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        h.take('phys5a', 'PHYS 5A (or 15A)', ['All of the following:', 'PHYS 15A can be used as a substitute for PHYS 5A'], codes('PHYS 5A', 'PHYS 15A')),
        h.take('phys5c', 'PHYS 5C (or 15C)', ['All of the following:', 'PHYS 15C as a substitute for PHYS 5C'], codes('PHYS 5C', 'PHYS 15C')),
        h.all('phys-rest', 'PHYS 5B, 5L, 5M, 5N, 5D', 'All of the following:', ['PHYS 5B', 'PHYS 5L', 'PHYS 5M', 'PHYS 5N', 'PHYS 5D']),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('core', 'Required upper-division courses', 'All students are required to take the following eight upper-division courses, with associated laboratories.', [
        'ECE 101', 'ECE 101L', 'ECE 102', 'ECE 102L', 'ECE 103', 'ECE 103L', 'ECE 135', 'ECE 135L', 'ECE 151', 'ECE 171', 'ECE 171L',
        'CSE 100', 'CSE 100L',
      ]),
      h.take('stats', 'Probability and statistics', 'One of the following', codes('CSE 107', 'STAT 131')),
    ])

    const conc = h.choice('concentration')
    const concSet = conc === 'electronics-optics' ? EO_SET : CSS_SET
    const concLabel = conc === 'electronics-optics' ? 'Electronics/Optics' : 'Communication and Signals'
    const electives = conc
      ? h.take('electives', `Electives (four; at least three ${concLabel})`, [
          ...Q_ELECTIVES,
          conc === 'electronics-optics'
            ? 'Students pursuing the Electronics/Optics concentration must choose at least three courses from the Electronics/Optics courses listed below.'
            : 'Students pursuing the Communications, Signals and Systems concentration must choose at least three courses from the Communication and Signals courses listed below.',
          Q_DESIGN,
        ], POOL, {
          n: 4,
          labs: { pairs: LAB_PAIRS, mode: 'merge' },
          atLeast: [{ set: concSet, n: 3, label: `at least three from the ${concLabel} list` }],
          prefer: (c) => (c === 'ECE183' || c === 'ECE218' ? 1 : 0),
          // "ECE 253 [/CSE 208]": cross-listed codes are one course. The
          // allocator dedupes them across slots but not within one n>1 slot
          // (library gap, reported), so guard here.
          check: (chosen) => {
            const keys = chosen.map((e) => [e.code, ...h.catalog.equivalents(e.code)].sort()[0])
            return new Set(keys).size !== keys.length ? 'cross-listed codes are the same course' : electiveCheck(chosen)
          },
          notes: [
            'The design elective (ECE 157 needs ECE 157L) must be completed in a quarter before your first ECE 129A.',
            '(ECE 130/230), (ECE 141/241), (ECE 172/221), (ECE 152/252), (ECE 153/250): only one of each pair counts.',
          ],
        })
      : h.needChoice('concentration')!

    // DC and the comprehensive project course are the same capstone sequence.
    const capstonePackages = [['ECE 129A', 'ECE 129B', 'ECE 129C'], ['ECE 129A', 'ECE 195', 'ECE 195']]
    const dc = h.options('dc', 'Disciplinary Communication (DC)', ['The DC requirement is satisfied by completing the senior capstone course sequence:', 'Either these three courses:', 'Or these two courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages)
    h.solve()
    cse20TestOut(h, lower.children!.find((n) => n.id === 'programming')!)
    if (electives.id === 'electives') approvals(h, electives)
    const timing = electives.id === 'electives' ? designTiming(h, electives) : null

    const project = h.options('project', 'Project course', ['Students must complete one capstone design course that spans three quarters.', 'Or complete the following courses:', '10 credits for the senior thesis course, ECE 195, must be completed for this option.'], capstonePackages, { exclusive: false })
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [project, h.attest('exit-requirement')], {
      quote: 'The senior comprehensive requirement for electrical engineering majors is in two parts: a project course and assessment options.',
      notes: ['Students with a GPA below 2.5 and without a senior thesis also need to submit a two-page essay concerning the relationship of engineering to society (specific topic will be provided by the Electrical and Computer Engineering Department).'],
    })

    const overlap = h.info('assistive-overlap', 'Assistive technology minor overlap', 'ECE 121, ECE 141 and ECE 167, which are used toward the assistive technology minor, cannot also be used to satisfy electrical engineering B.S. electives.', 'If you are also completing the assistive technology minor, those courses cannot be EE electives — the app does not check this across programs.')

    const electivesNode = timing ? h.group('electives-all', 'Electives', [electives, timing]) : electives
    return [lower, upper, electivesNode, dc, comprehensive, overlap]
  },
})

/**
 * §1a test-out convention: "A test-out option is available for CSE 20." The
 * attestation is offered only when CSE 20 is absent from the plan (a failed
 * CSE 20 is not rescued); attested ⇒ the line is met by test-out.
 */
function cse20TestOut(h: HarnessContext, n: Node) {
  if (n.status !== 'unmet' || h.enrollments.some((e) => e.code === 'CSE20')) return
  if (h.attested('cse20-testout')) {
    n.status = 'met'
    n.detail = 'Met by test-out (Passed the CSE 20 test-out).'
    return
  }
  n.status = 'needs-attestation'
  n.attest = h.attestations.find((a) => a.id === 'cse20-testout')!
  n.detail = 'Take CSE 20 or CSE 30, or confirm you passed the CSE 20 test-out.'
}

/** Term of the first ECE 129A (null = none, or completed with no term). */
function first129A(h: HarnessContext): { term: string | null } | null {
  const all = h.enrollments.filter((e) => e.code === 'ECE129A')
  if (!all.length) return null
  if (all.some((e) => e.term == null)) return { term: null }
  return { term: all.map((e) => e.term!).sort((a, b) => Number(a) - Number(b))[0] }
}

const designOf = (chosen: Enrollment[]) => {
  const have = new Set(chosen.map((e) => e.code))
  return chosen.filter((e) => DESIGN.has(e.code) && (e.code !== 'ECE157' || have.has('ECE157L')))
}

function electiveCheck(chosen: Enrollment[]): string | null {
  const have = new Set(chosen.map((e) => e.code))
  for (const [a, b] of CONJOINED) if (have.has(a) && have.has(b)) return `only one of ${a.replace(/(\d)/, ' $1')} / ${b.replace(/(\d)/, ' $1')} counts`
  if (!designOf(chosen).length) return 'one of the four must be a design elective (ECE 118, 121, 157 + 157L, 167 or 173)'
  return null
}

/**
 * "This course must be taken before the first capstone course ECE 129A."
 * Checked on the electives actually counted; if another passed design course
 * would satisfy the timing, the allocation might be rearranged — say so.
 */
function designTiming(h: HarnessContext, electives: Node): Node {
  const cap = first129A(h)
  const before = (e: Enrollment) => !cap || cap.term == null || e.term == null || Number(e.term) < Number(cap.term)
  const quote = 'This course must be taken before the first capstone course ECE 129A.'
  if (electives.status !== 'met' && electives.status !== 'needs-attestation')
    return h.node('design-timing', 'Design elective before ECE 129A', quote, 'info', { detail: 'Checked once the electives are complete.' })
  const used = designOf(electives.used ?? [])
  if (used.some(before)) return h.node('design-timing', 'Design elective before ECE 129A', quote, 'met')
  const other = designOf(h.passed).filter(before)
  if (other.length)
    return h.node('design-timing', 'Design elective before ECE 129A', quote, 'cannot-check', {
      detail: `The counted design elective comes after your first ECE 129A, but ${other.map((e) => e.display).join(', ')} came before it — check with an advisor which courses count as your four electives.`,
    })
  return h.node('design-timing', 'Design elective before ECE 129A', quote, 'unmet', { detail: 'Your design elective must be completed in a quarter before your first ECE 129A.' })
}

/** ECE 183 needs the undergraduate director's approval; ECE 218 a petition. */
function approvals(h: HarnessContext, n: Node) {
  if (n.status !== 'met') return
  for (const [code, att] of [['ECE183', 'ece183-approval'], ['ECE218', 'ece218-petition']] as const) {
    if ((n.used ?? []).some((e) => e.code === canon(code)) && !h.attested(att)) {
      const def = h.attestations.find((a) => a.id === att)!
      n.status = 'needs-attestation'
      n.attest = def
      n.detail = `${code.replace(/(\d)/, ' $1')} counts only with approval: ${def.label.toLowerCase()}.`
    }
  }
}
