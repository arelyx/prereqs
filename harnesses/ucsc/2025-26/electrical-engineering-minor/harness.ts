// Electrical Engineering Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/electrical-engineering-minor.md
//
// Shape: math + physics, one upper-division core list, then at
// least 15 credits of electives that all come from ONE concentration list.
// The elective rule is credit-based, so it is computed here (after the core is
// allocated) rather than by a counted `take` slot.
import { canon, codes, defineHarness, display } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const CONCENTRATIONS: { value: string; label: string; heading: string; list: string[] }[] = [
  {
    value: 'communications-signal-processing',
    label: 'Communications Signal Processing',
    heading: 'Communications Signal Processing Concentration',
    list: [
      'ECE 118', 'ECE 130', 'ECE 130L', 'ECE 136', 'ECE 141', 'ECE 145', 'ECE 149', 'ECE 152', 'ECE 157', 'ECE 157L',
      'ECE 163', 'ECE 183', 'ECE 193', 'ECE 198', 'ECE 215', 'ECE 242', 'ECE 243', 'ECE 245', 'ECE 251', 'ECE 253',
      'ECE 255', 'ECE 256', 'CSE 150',
    ],
  },
  {
    value: 'control-and-signal-processing',
    label: 'Control and Signal Processing',
    heading: 'Control and Signal Processing Concentration',
    list: [
      'ECE 130', 'ECE 130L', 'ECE 135', 'ECE 135L', 'ECE 136', 'ECE 145', 'ECE 149', 'CSE 152', 'ECE 163', 'ECE 172',
      'ECE 176', 'ECE 176L', 'ECE 177', 'ECE 177L', 'ECE 183', 'ECE 193', 'ECE 198', 'ECE 215', 'ECE 237', 'ECE 242',
      'ECE 243', 'ECE 244', 'ECE 245', 'ECE 251', 'ECE 253', 'ECE 255', 'ECE 256', 'CSE 150',
    ],
  },
  {
    value: 'electronics-and-photonics',
    label: 'Electronics and Photonics',
    heading: 'Electronics and Photonics Concentration',
    list: [
      'ECE 102', 'ECE 102L', 'ECE 104', 'ECE 110', 'ECE 115', 'ECE 121', 'ECE 130', 'ECE 130L', 'ECE 153', 'ECE 135',
      'ECE 135L', 'ECE 136', 'ECE 141', 'ECE 145', 'ECE 149', 'ECE 152', 'ECE 157', 'ECE 157L', 'ECE 163', 'ECE 172',
      'ECE 167', 'ECE 173', 'ECE 174', 'ECE 175', 'ECE 175L', 'ECE 176', 'ECE 176L', 'ECE 177', 'ECE 177L', 'ECE 178', 'ECE 180J',
      'ECE 183', 'ECE 193', 'ECE 198', 'ECE 201', 'ECE 203', 'ECE 210', 'ECE 215', 'ECE 231', 'ECE 242', 'ECE 243',
      'ECE 245',
    ],
  },
  {
    value: 'power-and-energy',
    label: 'Power and Energy',
    heading: 'Power and Energy Concentration',
    list: [
      'ECE 104', 'ECE 121', 'ECE 130', 'ECE 130L', 'ECE 135', 'ECE 135L', 'ECE 136', 'ECE 141', 'ECE 149', 'ECE 152',
      'ECE 153', 'ECE 157', 'ECE 157L', 'ECE 163', 'ECE 167', 'ECE 170', 'ECE 172', 'ECE 173', 'ECE 174', 'ECE 175',
      'ECE 175L', 'ECE 176', 'ECE 176L', 'ECE 177', 'ECE 177L', 'ECE 178', 'ECE 180J', 'ECE 181J', 'ECE 183', 'ECE 185',
      'ECE 193', 'ECE 198', 'ECE 215', 'ECE 242', 'ECE 243', 'ECE 275',
    ],
  },
  {
    value: 'robotics-and-automation',
    label: 'Robotics and Automation',
    heading: 'Robotics and Automation Concentration',
    list: [
      'ECE 115', 'ECE 145', 'ECE 149', 'ECE 151', 'ECE 152', 'ECE 153', 'ECE 163', 'ECE 176', 'ECE 176L', 'ECE 183',
      'ECE 193', 'ECE 198', 'ECE 215', 'ECE 242', 'ECE 243', 'ECE 245',
    ],
  },
  {
    value: 'digital-hardware',
    label: 'Digital Hardware',
    heading: 'Digital Hardware Concentration',
    list: [
      'ECE 130', 'ECE 130L', 'ECE 135', 'ECE 135L', 'ECE 136', 'ECE 141', 'ECE 145', 'ECE 149', 'ECE 151', 'ECE 152',
      'ECE 153', 'ECE 163', 'ECE 167', 'ECE 172', 'ECE 176', 'ECE 176L', 'ECE 183', 'ECE 193', 'ECE 198', 'ECE 215',
      'ECE 242', 'ECE 243', 'ECE 245',
    ],
  },
]
// 2025-26: the Electronics and Photonics list also has ECE 176 (not in 2026-27).
const LISTS = new Map(CONCENTRATIONS.map((c) => [c.value, new Set(c.list.map(canon))]))
// Course sets are cross-listing aware ("ECE 253 [/CSE 208]": either code is the course).
const LIST_SETS = new Map(CONCENTRATIONS.map((c) => [c.value, codes(...c.list)]))
// Courses that count only with an approval are tallied last, so the
// approval is asked only when the other courses fall short.
// (2025-26 has no ECE 218-for-ECE 118 petition.)
const NEEDS_APPROVAL = new Set(['ECE183'])

// "(ECE 130 and ECE 230, ECE 141 and ECE 241, and ECE 153 and ECE 250 are
// undergraduate and graduate courses taught in conjunction, and only one can
// be taken for this program.)" (the graduate halves are not on any minor list,
// so this only matters through cross-listing; kept for completeness)
const CONJOINED: [string, string][] = [['ECE130', 'ECE230'], ['ECE141', 'ECE241'], ['ECE153', 'ECE250'], ['ECE172', 'ECE221']]

const Q_ELECTIVES = [
  'Plus at least 15 additional credits of upper-division or graduate courses from the lists below. All of the upper-division electives must come from the same concentration.',
  'If a course has a required lab, students must pass the lecture and lab in order to use the lab credits to fulfill the 15-credit requirement for the minor.',
  'Each of ECE 183, ECE 193 and ECE 198 courses can be taken only once as an elective course.',
]

export default defineHarness({
  program: 'electrical-engineering-minor',
  edition: '2025-26',
  title: 'Electrical Engineering Minor',
  choices: [
    {
      key: 'concentration',
      label: 'Elective concentration',
      quote: 'All of the upper-division electives must come from the same concentration.',
      options: CONCENTRATIONS.map((c) => ({ value: c.value, label: c.label })),
    },
  ],
  attestations: [
    {
      id: 'ece183-approval',
      label: 'Undergraduate director approved ECE 183 as an elective',
      quote: 'ECE 183 can be taken as an elective course with an approval of the undergraduate director.',
      aliases: ['ece 183', 'ece183'],
    },
  ],
  notes: [
    'Courses for the minor may be taken P/NP, but your major may require letter grades for the same courses (all Baskin Engineering majors do).',
    'You do not have to declare an elective concentration here: without one, the app checks every concentration list and reports the best fit.',
  ],
  evaluate(h) {
    // "Though courses for the minor may be taken for a letter grade or Pass/No Pass (P/NP)"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.group('math', 'Mathematics', [
        h.all('calc', 'MATH 19A, 19B', 'All of the following', ['MATH 19A', 'MATH 19B']),
        h.take('multivar', 'Multivariable calculus', 'Plus one of the following courses', codes('MATH 23A', 'AM 30')),
        h.take('linalg', 'Linear algebra', 'Plus one of the following', codes('AM 10', 'MATH 21')),
        h.take('ode', 'Differential equations', 'Plus one of the following', codes('AM 20', 'MATH 24')),
      ]),
      h.group('science', 'Science', [
        // 2025-26: no PHYS 15A/15C substitution note.
        h.options('phys-a', 'PHYS 5A + 5L or PHYS 6A + 6L', 'One of the following lecture/lab combinations', [
          ['PHYS 5A', 'PHYS 5L'],
          ['PHYS 6A', 'PHYS 6L'],
        ]),
        h.options('phys-c', 'PHYS 5C + 5N or PHYS 6C + 6N', 'Plus one of the following lecture/lab combinations', [
          ['PHYS 5C', 'PHYS 5N'],
          ['PHYS 6C', 'PHYS 6N'],
        ]),
      ]),
    ])

    // 2025-26: a single core list (2026-27 adds an alternative package with
    // ECE 141 and PHYS 116A/116C/133). The core is allocated first; the
    // electives only see courses the core did not use.
    const core = h.all('core', 'Upper-Division Core', 'All of the following courses', ['ECE 101', 'ECE 101L', 'ECE 103', 'ECE 171', 'ECE 171L'])
    h.solve()

    const electives = electiveNode(h)
    return [lower, h.group('upper', 'Upper-Division Courses', [core, electives])]
  },
})

const credits = (h: HarnessContext, e: Enrollment) => {
  // A cross-listed partner code may be missing from the catalog (CSE 208 → ECE 253).
  const c = (h.catalog.get(e.code) ?? h.catalog.equivalents(e.code).map((x) => h.catalog.get(x)).find(Boolean))?.credits
  return c === undefined || Number.isNaN(c) ? 0 : c
}

interface Tally {
  value: string
  total: number
  used: Enrollment[]
  /** credits that would count only with an attestation, per attestation id */
  pending: Map<string, { credits: number; used: Enrollment[] }>
}

function tally(h: HarnessContext, value: string, avail: Enrollment[]): Tally {
  const set = LIST_SETS.get(value)!
  // One key per course however it was entered (cross-listed codes are one course).
  const key = (code: string) => [code, ...h.catalog.equivalents(code)].sort()[0]
  const passedKeys = new Set(h.passed.map((e) => key(e.code)))
  const seen = new Set<string>()
  const used: Enrollment[] = []
  const pending = new Map<string, { credits: number; used: Enrollment[] }>()
  let total = 0
  const conj = (k: string) => CONJOINED.find((p) => p.includes(k))
  const ordered = [...avail].sort((a, b) => Number(NEEDS_APPROVAL.has(a.code)) - Number(NEEDS_APPROVAL.has(b.code)))
  for (const e of ordered) {
    const as = e.code
    if (!set.has(as, h.catalog)) continue
    const k = key(as)
    // "Each of ECE 183, ECE 193 and ECE 198 courses can be taken only once"; no course counts twice.
    if (seen.has(k)) continue
    // Labs: "students must pass the lecture and lab in order to use the lab credits".
    if (as.endsWith('L') && h.catalog.has(as.slice(0, -1)) && !passedKeys.has(key(as.slice(0, -1)))) continue
    const pair = conj(k)
    if (pair && pair.some((p) => p !== k && seen.has(p))) continue
    seen.add(k)
    const attId = as === 'ECE183' ? 'ece183-approval' : null
    if (attId && !h.attested(attId)) {
      const p = pending.get(attId) ?? { credits: 0, used: [] }
      p.credits += credits(h, e)
      p.used.push(e)
      pending.set(attId, p)
      continue
    }
    total += credits(h, e)
    used.push(e)
  }
  return { value, total, used, pending }
}

function electiveNode(h: HarnessContext): Node {
  // Exclude every enrollment of a course another slot used (a retake is the same course).
  const usedKeys = new Set(h.enrollments.filter((e) => h.used.has(e.id)).map(h.courseKey))
  const avail = h.passed.filter((e) => !h.used.has(e.id) && !usedKeys.has(h.courseKey(e)))
  const chosen = h.choice('concentration')
  const values = chosen ? [chosen] : CONCENTRATIONS.map((c) => c.value)
  const tallies = values.map((v) => tally(h, v, avail))
  const best = tallies.reduce((a, b) => (b.total > a.total ? b : a))
  const label = (v: string) => CONCENTRATIONS.find((c) => c.value === v)!.label
  const extra = {
    progress: { have: Math.min(best.total, 15), need: 15, unit: 'credits' },
    used: best.used,
    pool: chosen ? `${label(chosen)} concentration list` : 'one concentration list (all electives from the same list)',
    options: chosen ? [...LISTS.get(chosen)!] : undefined,
  }
  const met = tallies.find((t) => t.total >= 15)
  if (met) {
    return h.node('electives', 'Electives (15 credits, one concentration)', Q_ELECTIVES, 'met', {
      ...extra,
      used: met.used,
      progress: { have: 15, need: 15, unit: 'credits' },
      detail: `${met.total} credits from the ${label(met.value)} list.`,
    })
  }
  // Would an approval / petition complete it? (one alone first, then both)
  for (const t of tallies) {
    const all = [...t.pending]
    const tries = [...all.map((x) => [x]), ...(all.length > 1 ? [all] : [])]
    for (const combo of tries) {
      const add = combo.reduce((n, [, p]) => n + p.credits, 0)
      if (t.total + add < 15) continue
      const defs = combo.map(([attId]) => h.attestations.find((a) => a.id === attId)!)
      const extraUsed = combo.flatMap(([, p]) => p.used)
      return h.node('electives', 'Electives (15 credits, one concentration)', Q_ELECTIVES, 'needs-attestation', {
        ...extra,
        used: [...t.used, ...extraUsed],
        attest: defs[0],
        detail: `${extraUsed.map((e) => e.display).join(', ')} count only with approval: ${defs.map((d) => d.label.toLowerCase()).join('; ')}.`,
      })
    }
  }
  const short = 15 - best.total
  return h.node('electives', 'Electives (15 credits, one concentration)', Q_ELECTIVES, 'unmet', {
    ...extra,
    detail: `${best.total} of 15 credits${values.length > 1 ? ` (best list: ${label(best.value)})` : ''}; ${short} more needed${
      best.used.length ? ` — counted: ${best.used.map((e) => display(e.code)).join(', ')}` : ''
    }`,
  })
}
