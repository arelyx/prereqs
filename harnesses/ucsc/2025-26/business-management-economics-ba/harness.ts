// Business Management Economics B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/business-management-economics-ba.md
//
// Two variants: the general major and the accounting concentration (an
// optional transcript designation). Undeclared students are checked against
// the general major; the only place the accounting concentration is easier
// (one computer-literacy course instead of two) asks for the choice.
import { codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FINANCE = ['ECON 101', 'ECON 133', 'ECON 135']
// 2025-26: CRWN 152 is not on the Business Management list (added in 2026-27).
const BUSINESS = [
  'ECON 101', 'ECON 110', 'ECON 111A', 'ECON 111B', 'ECON 111C', 'ECON 112', 'ECON 115', 'ECON 117A',
  'ECON 117B', 'ECON 119', 'ECON 124', 'ECON 130', 'ECON 131', 'ECON 133', 'ECON 135', 'ECON 136',
  'ECON 138', 'ECON 139A', 'ECON 139B', 'ECON 159', 'ECON 160A', 'ECON 160B', 'ECON 161A', 'ECON 161B',
  'ECON 164', 'ECON 188', 'ECON 194',
]
// "Economics Electives (choose one)" — general major list (includes ECON 190).
// 2025-26: ECON 188 is not on this list (only on Business Management).
const ECON_GENERAL = [
  'ECON 105', 'ECON 114', 'ECON 120', 'ECON 121', 'ECON 125', 'ECON 128', 'ECON 130', 'ECON 140',
  'ECON 141', 'ECON 142', 'ECON 143', 'ECON 149', 'ECON 150', 'ECON 156', 'ECON 159', 'ECON 160A',
  'ECON 160B', 'ECON 165', 'ECON 166A', 'ECON 166B', 'ECON 169', 'ECON 170', 'ECON 171', 'ECON 175',
  'ECON 180', 'ECON 182', 'ECON 183', 'ECON 190',
]
// Accounting concentration's economics-elective list: same, without ECON 190.
const ECON_ACCOUNTING = ECON_GENERAL.filter((c) => c !== 'ECON 190')
const ACCOUNTING = ['ECON 110', 'ECON 111A', 'ECON 111B', 'ECON 111C', 'ECON 112', 'ECON 116', 'ECON 117A', 'ECON 117B']
// "Either course ECON 195 or ECON 199 may be used to fill one of the five elective upper-division major requirements."
const INDEPENDENT = ['ECON 195', 'ECON 199']
// "Students may only use one of ECON 130, ECON 159, ECON 160A, or ECON 160B." (2025-26: ECON 188 is not in this cap.)
const ONLY_ONE = ['ECON 130', 'ECON 159', 'ECON 160A', 'ECON 160B']
const COMPUTING = [
  'CSE 5J', 'CSE 10', 'CSE 12', 'CSE 13S', 'CSE 20', 'CSE 30', 'CSE 80N', 'ECE 13', 'ECON 22P', 'TIM 50', 'TIM 58',
]

const PETITION_QUOTE =
  'MATH 11A, MATH 11B, MATH 23A may be taken to satisfy the mathematics content only by petition via the Mathematics Department.'
const ELECTIVES_QUOTE = [
  'Students are required to take five additional courses: one in finance, three in business management and one other economics elective. See the lists below for options.',
  'Students may only use one of ECON 130, ECON 159, ECON 160A, or ECON 160B. No course may satisfy both an elective and another requirement of the major.',
  'Courses ECON 191, ECON 192, ECON 193, ECON 193F may not be used to meet major requirements. Either course ECON 195 or ECON 199 may be used to fill one of the five elective upper-division major requirements.',
]

// Category sets are CourseSets, so a cross-listed partner code
// ("ECON 160A [/LGST 160A]") is the same course in the assignment check too
// (checked with the catalog; no hand-written alias map).
const F = codes(...FINANCE)
const BM = codes(...BUSINESS)
const E = codes(...ECON_GENERAL)
const W = codes(...INDEPENDENT)
const CSE20 = codes('CSE 20')
const ONLY = codes(...ONLY_ONE)

type Cat = 'F' | 'BM' | 'E'
const NEED: Record<Cat, number> = { F: 1, BM: 3, E: 1 }

/**
 * Can these courses be split into 1 finance + 3 business management +
 * 1 economics elective? ECON 195/199 fills the economics elective (strict)
 * or any one of the five (lenient: "may be used to fill one of the five").
 */
function assignable(list: string[], h: HarnessContext, lenient: boolean): boolean {
  const left: Record<Cat, number> = { ...NEED }
  const cats = (code: string): Cat[] => {
    if (W.has(code, h.catalog)) return lenient ? ['F', 'BM', 'E'] : ['E']
    const out: Cat[] = []
    if (F.has(code, h.catalog)) out.push('F')
    if (BM.has(code, h.catalog)) out.push('BM')
    if (E.has(code, h.catalog)) out.push('E')
    return out
  }
  const go = (i: number): boolean => {
    if (i === list.length) return true
    for (const k of cats(list[i])) {
      if (!left[k]) continue
      left[k]--
      if (go(i + 1)) return true
      left[k]++
    }
    return false
  }
  return go(0)
}

export default defineHarness({
  program: 'business-management-economics-ba',
  edition: '2025-26',
  title: 'Business Management Economics B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Accounting concentration',
      quote:
        "Only students in the business management economics major have the option of adding an accounting concentration designation on their transcripts, provided they meet the curricular criteria.",
      options: [
        { value: 'general', label: 'General Business Management Economics Major', aliases: ['general', 'none', 'no concentration'] },
        { value: 'accounting', label: 'Business Management with Accounting Concentration', aliases: ['accounting', 'accounting concentration'] },
      ],
    },
  ],
  attestations: [
    {
      // §1a: a test-out that satisfies a listed course is an attestation,
      // offered only when CSE 20 is not in the plan.
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'CSE 20 has a [test out](https://sites.google.com/ucsc.edu/cse-20-testout) option which counts as one of the two required courses.',
      aliases: ['cse 20 testout', 'cse 20 test-out', 'cse20testout', 'test-out', 'testout', 'test out'],
    },
    {
      id: 'math-petition',
      label: 'Mathematics Department petition approved for MATH 11A / 11B / 23A',
      quote: PETITION_QUOTE,
      aliases: ['petition', 'math petition'],
    },
  ],
  notes: [
    'P/NP is allowed for major courses (the department recommends no more than two); the comprehensive core courses need C/P or better.',
    'Transfer students must take ECON 100A, 100B, 113, the DC course, and at least three upper-division electives at UC Santa Cruz — the app does not track where a course was taken.',
    'ECON 191, 192, 193 and 193F never count; economics field-study courses do not satisfy upper-division requirements.',
  ],
  evaluate(h) {
    // "The Economics Department allows classes toward major requirements taken for the Pass/No Pass (P/NP) grade notification."
    h.policy = undefined
    const conc = h.choice('concentration')
    const accounting = conc === 'accounting'

    const PETITION = new Set(['MATH11A', 'MATH11B', 'MATH23A'])
    const math = h.options(
      'math',
      'Mathematics content',
      [accounting ? 'Plus one of the following mathematics options:' : 'Plus one of the following mathematics content options:', PETITION_QUOTE],
      [
        ['AM 11A', 'AM 11B'],
        ['MATH 19A', 'MATH 19B', 'AM 30'],
        ['MATH 19A', 'AM 11B'],
        ['MATH 11A', 'MATH 11B', 'MATH 22'],
        ['MATH 19A', 'MATH 19B', 'MATH 23A'],
        ['MATH 11A', 'AM 11B'],
      ],
    )
    const comp = computing(h, conc)
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('core-lower', 'ECON 1, 2, 10A and 10B', 'All of the following courses:', ['ECON 1', 'ECON 2', 'ECON 10A', 'ECON 10B']),
      math,
      h.all('stats', 'STAT 17 and STAT 17L', 'Plus the following statistics courses:', ['STAT 17', 'STAT 17L']),
      comp.node,
    ])

    const upperCore = [
      h.take('micro', 'Intermediate Microeconomics', 'Choose one of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.take('macro', 'Intermediate Macroeconomics', 'Plus one of the following courses:', codes('ECON 100B', 'ECON 100N')),
      h.take('econ113', 'ECON 113 Econometrics', 'Plus the following course:', codes('ECON 113')),
      h.take('dc', 'Disciplinary Communication (DC)', [
        'Plus one of the following disciplinary communication (DC) courses:',
        'The DC requirement in economics is satisfied by completing one of the following courses:',
      ], codes('ECON 104', 'ECON 197')),
    ]
    const electives = accounting ? accountingElectives(h) : generalElectives(h)
    const upper = h.group('upper', 'Upper-Division Courses', [...upperCore, ...electives.nodes])

    // "passing the following intermediate core courses with grades of C/P or better (here) at UC Santa Cruz"
    const C = { min: 'C', pCounts: true }
    const compQuote = accounting
      ? 'The comprehensive requirement is satisfied by passing the following intermediate core courses with grades of C/P or better at UC Santa Cruz:'
      : 'The comprehensive requirement is satisfied by passing the following intermediate core courses with grades of C/P or better here at UC Santa Cruz:'
    const comprehensive = h.group(
      'comprehensive',
      'Comprehensive Requirement (C/P or better)',
      [
        h.take('comp-micro', 'ECON 100A or 100M, C/P or better', compQuote, codes('ECON 100A', 'ECON 100M'), { exclusive: false, policy: C }),
        h.take('comp-macro', 'ECON 100B or 100N, C/P or better', compQuote, codes('ECON 100B', 'ECON 100N'), { exclusive: false, policy: C }),
        h.take('comp-113', 'ECON 113, C/P or better', compQuote, codes('ECON 113'), { exclusive: false, policy: C }),
      ],
      { quote: compQuote, notes: ['These must be taken at UC Santa Cruz.'] },
    )

    h.solve()
    electives.after()
    // Undeclared, one computing course short, but every accounting-concentration
    // course is in the plan: "Students electing the accounting concentration may
    // also reduce their computer literacy requirements by one course (from two to one)."
    const cn = comp.node
    if (!conc && cn.status === 'unmet' && cn.progress && cn.progress.have === cn.progress.need - 1 && ACCOUNTING.every((c) => h.has(c))) {
      cn.status = 'needs-choice'
      cn.choice = 'concentration'
      cn.detail = 'Declare whether you are in the accounting concentration: it needs only one computer-literacy course.'
    }
    comp.after()
    if (comp.node !== cn) lower.children = lower.children!.map((n) => (n === cn ? comp.node : n))
    // A package using MATH 11A/11B/23A counts only with the petition.
    if (math.status === 'met' && (math.used ?? []).some((e) => PETITION.has(e.code))) {
      lower.children = lower.children!.map((n) =>
        n === math ? h.group('math-petition-path', 'Mathematics content (by petition)', [math, h.attest('math-petition')], { quote: PETITION_QUOTE }) : n,
      )
    }
    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'Students must complete three courses, with combined GPA of 2.8 or higher, to qualify for entry to the business management economics major:',
      'ECON 1, ECON 2 and one of AM 11A / MATH 11A / MATH 19A, letter grades, combined GPA 2.8 or higher. This gates declaration; it is not checked here.',
    )
    return [qualification, lower, upper, comprehensive]
  },
})

/**
 * Computer literacy: two courses (general) or one (accounting concentration).
 * The CSE 20 test-out counts as one course; it is asked only when CSE 20 is
 * not in the plan and the student is short by exactly that one course.
 */
function computing(h: HarnessContext, conc: string | undefined): { node: Node; after: () => void } {
  const accounting = conc === 'accounting'
  const base = accounting ? 1 : 2
  const hasCse20 = h.taken(CSE20).length > 0
  const testout = !hasCse20 && h.attested('cse20-testout')
  const need = base - (testout ? 1 : 0)
  const quote = [
    accounting
      ? 'Students in the accounting concentration complete one course from the following list:'
      : 'Students in the general major complete two courses from the following list:',
    'Note: Lecture/lab combinations count as one course.',
    accounting
      ? 'CSE 20 has a [test out](https://sites.google.com/ucsc.edu/cse-20-testout) option which may count as the required course.'
      : 'CSE 20 has a [test out](https://sites.google.com/ucsc.edu/cse-20-testout) option which counts as one of the two required courses.',
  ]
  const title = accounting ? 'Computer literacy (one course)' : 'Computer literacy (two courses)'
  const sub = 'With department approval, a student may substitute other computing courses — add an approved substitute once the department confirms it.'
  if (need <= 0) {
    const node = h.node('computing', title, quote, 'met', { detail: 'By test-out: you confirmed passing the CSE 20 test-out.' })
    return { node, after: () => {} }
  }
  const take = h.take('computing', title, quote, codes(...COMPUTING), {
    n: need,
    labs: 'catalog-merge',
    // Catalog: "Students cannot receive credit for both CSE 13S and ECE 13."
    check: (chosen) =>
      chosen.some((e) => e.code === 'CSE13S') && chosen.some((e) => e.code === 'ECE13')
        ? 'CSE 13S and ECE 13 cannot both be credited (same course)'
        : null,
    notes: testout ? [sub, 'One course is covered by the CSE 20 test-out (as you confirmed).'] : [sub],
  })
  const out = { node: take, after: () => {} }
  if (!hasCse20 && !testout) {
    out.after = () => {
      if (take.status === 'met' || !take.progress || take.progress.have < need - 1) return
      // One course short and no CSE 20: the test-out would complete it.
      out.node = h.either('computing-or-testout', title, quote, [
        take,
        h.attest('cse20-testout', undefined, { detail: 'If you passed the CSE 20 test-out, confirm it: it counts as one computer-literacy course.' }),
      ])
    }
  }
  return out
}

function generalElectives(h: HarnessContext): { nodes: Node[]; after: () => void } {
  const all = [...new Set([...FINANCE, ...BUSINESS, ...ECON_GENERAL, ...INDEPENDENT])]
  const set = codes(...all)
  const node = h.take('electives', 'Five upper-division electives', ELECTIVES_QUOTE, set, {
    n: 5,
    atMost: [
      { set: ONLY, n: 1, label: 'only one of ECON 130, 159, 160A, 160B' },
      { set: W, n: 1, label: 'ECON 195 / ECON 199' },
    ],
    check: (chosen: Enrollment[]) =>
      assignable(chosen.map((e) => e.code), h, false) ? null : 'need one finance, three business management and one economics elective',
    pool: 'Finance (ECON 101, 133, 135) · Business Management list · Economics Electives list · ECON 195/199',
    notes: ['Finance: one of ECON 101, 133, 135. Business management: three from its list. Economics: one from its list.'],
  })
  const after = () => {
    if (node.status !== 'unmet') return
    // Strict reading: ECON 195/199 fills the "one other economics elective".
    // The page says it may fill "one of the five", so if a lenient
    // assignment exists, do not call it unmet.
    const mine = new Set((node.used ?? []).map((e) => e.id))
    const avail = h.taken(set).filter((e) => !h.used.has(e.id) || mine.has(e.id))
    const r = lenientFeasible(avail.map((e) => e.code), h)
    if (r !== false) {
      node.status = 'cannot-check'
      node.detail =
        r === 'maybe'
          ? 'Too many combinations to check automatically — ask an advisor.'
          : 'Complete only if ECON 195/199 replaces a finance or business-management elective (the page says it may fill “one of the five”) — confirm with an advisor.'
    }
  }
  return { nodes: [node], after }
}

/** Lenient check over every 5-subset of the available distinct courses (bounded). */
function lenientFeasible(list: string[], h: HarnessContext): boolean | 'maybe' {
  // One entry per course: a cross-listed partner code is the same course.
  const seen = new Set<string>()
  const uniq: string[] = []
  for (const c of list) {
    const key = [c, ...h.catalog.equivalents(c)].sort()[0]
    if (!seen.has(key)) {
      seen.add(key)
      uniq.push(c)
    }
  }
  if (!uniq.some((c) => W.has(c, h.catalog))) return false
  let work = 0
  const pick: string[] = []
  const go = (start: number): boolean | 'maybe' => {
    if (++work > 200_000) return 'maybe'
    if (pick.length === 5) {
      if (pick.filter((c) => ONLY.has(c, h.catalog)).length > 1) return false
      if (pick.filter((c) => W.has(c, h.catalog)).length > 1) return false
      return assignable(pick, h, true)
    }
    for (let i = start; i < uniq.length; i++) {
      pick.push(uniq[i])
      const r = go(i + 1)
      pick.pop()
      if (r !== false) return r
    }
    return false
  }
  return go(0)
}

function accountingElectives(h: HarnessContext): { nodes: Node[]; after: () => void } {
  const nodes = [
    h.take('finance', 'One finance course', 'Plus one of the following finance courses:', codes(...FINANCE)),
    h.all('accounting', 'Eight accounting courses', 'Plus the following accounting courses:', ACCOUNTING),
    h.take(
      'econ-elective',
      'One economics elective',
      [
        'Plus one economics elective from the following:',
        'Courses ECON 191, ECON 192, ECON 193, ECON 193F may not be used to meet major requirements. Either course ECON 195 or ECON 199 may be used to fill the upper-division economics elective.',
      ],
      codes(...ECON_ACCOUNTING, ...INDEPENDENT),
    ),
  ]
  return { nodes, after: () => {} }
}
