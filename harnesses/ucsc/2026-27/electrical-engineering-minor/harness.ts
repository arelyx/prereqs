// Electrical Engineering Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/electrical-engineering-minor.md
//
// Shape: math + physics, one of two upper-division core packages, then at
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
      'ECE 167', 'ECE 173', 'ECE 174', 'ECE 175', 'ECE 175L', 'ECE 176L', 'ECE 177', 'ECE 177L', 'ECE 178', 'ECE 180J',
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
const LISTS = new Map(CONCENTRATIONS.map((c) => [c.value, new Set(c.list.map(canon))]))

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
  edition: '2026-27',
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
    {
      id: 'ece218-petition',
      label: 'Petition to substitute ECE 218 for ECE 118 approved',
      quote: 'Students can petition to substitute ECE 218 for ECE 118 to fulfill program requirements, but will not fulfill the PR GE requirement.',
      aliases: ['ece 218', 'ece218'],
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
        // "PHYS 15A can be used as a substitute for PHYS 5A, and PHYS 15C as a substitute for PHYS 5C."
        h.options('phys-a', 'PHYS 5A + 5L or PHYS 6A + 6L', ['One of the following lecture/lab combinations', 'PHYS 15A can be used as a substitute for PHYS 5A'], [
          ['PHYS 5A', 'PHYS 5L'],
          ['PHYS 15A', 'PHYS 5L'],
          ['PHYS 6A', 'PHYS 6L'],
        ]),
        h.options('phys-c', 'PHYS 5C + 5N or PHYS 6C + 6N', ['Plus one of the following lecture/lab combinations', 'PHYS 15C as a substitute for PHYS 5C'], [
          ['PHYS 5C', 'PHYS 5N'],
          ['PHYS 15C', 'PHYS 5N'],
          ['PHYS 6C', 'PHYS 6N'],
        ]),
      ]),
    ])

    // "ECE 141 may not count toward the core requirement and the elective
    // requirement." — the core is allocated first; the electives only see
    // courses the core did not use.
    const core = h.options('core', 'Upper-Division Core', ['All of the following:', 'or all of the following:', 'ECE 141 may not count toward the core requirement and the elective requirement.'], [
      ['ECE 101', 'ECE 101L', 'ECE 103', 'ECE 171', 'ECE 171L'],
      ['ECE 101', 'ECE 101L', 'ECE 141', 'ECE 171', 'ECE 171L', 'PHYS 116A', 'PHYS 116C', 'PHYS 133'],
    ])
    h.solve()

    const electives = electiveNode(h)
    return [lower, h.group('upper', 'Upper-Division Courses', [core, electives])]
  },
})

const credits = (h: HarnessContext, e: Enrollment) => {
  const c = h.catalog.get(e.code)?.credits
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
  const list = LISTS.get(value)!
  const passedCodes = new Set(h.passed.map((e) => e.code))
  const seen = new Set<string>()
  const used: Enrollment[] = []
  const pending = new Map<string, { credits: number; used: Enrollment[] }>()
  let total = 0
  const conj = (code: string) => CONJOINED.find((p) => p.includes(code))
  for (const e of avail) {
    // ECE 218 by petition stands in for ECE 118 (stated only for the
    // Communications Signal Processing list).
    const as = e.code === 'ECE218' && list.has('ECE118') ? 'ECE118' : e.code
    if (!list.has(as) || seen.has(as)) continue
    // Labs: "students must pass the lecture and lab in order to use the lab credits".
    if (as.endsWith('L') && h.catalog.has(as.slice(0, -1)) && !passedCodes.has(as.slice(0, -1))) continue
    const pair = conj(as)
    if (pair && pair.some((p) => p !== as && seen.has(p))) continue
    seen.add(as)
    const attId = as === 'ECE183' ? 'ece183-approval' : e.code === 'ECE218' ? 'ece218-petition' : null
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
  const avail = h.passed.filter((e) => !h.used.has(e.id))
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
  // Would an approval / petition complete it?
  for (const t of tallies) {
    for (const [attId, p] of t.pending) {
      if (t.total + p.credits >= 15) {
        const def = h.attestations.find((a) => a.id === attId)!
        return h.node('electives', 'Electives (15 credits, one concentration)', Q_ELECTIVES, 'needs-attestation', {
          ...extra,
          used: [...t.used, ...p.used],
          attest: def,
          detail: `${p.used.map((e) => e.display).join(', ')} counts only with approval: ${def.label.toLowerCase()}.`,
        })
      }
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
