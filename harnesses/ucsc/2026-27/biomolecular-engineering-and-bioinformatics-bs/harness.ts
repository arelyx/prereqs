// Biomolecular Engineering and Bioinformatics B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biomolecular-engineering-and-bioinformatics-bs.md
//
// Two concentrations (BME, BINF) — a declared choice. Unusual bits:
//  - General chemistry: CHEM 3B/3C taken before fall 2026 need CHEM 3BL/3CL
//    (same rule and helper as biology-bs).
//  - Transfer students may use PHIL 22/24/28 articulated courses taken before
//    UCSC in place of BME 80G: accepted only for courses with no UCSC term.
//  - CSE 20 for BME 160, BIOL 105 for BME 105 (explicit substitutions).
//  - Test-outs ("CSE 20 has a test-out exam that will also be accepted",
//    "CSE 40 has a test-out option which can satisfy this requirement"):
//    attestations offered only when no course of the slot is in the plan
//    (docs/HARNESSES.md §1a).
//  - The elective "cannot satisfy other requirements of the major": an
//    exclusive slot, so it never shares a course with the modeling/design
//    sequence, the capstone (BME 205/230A are 5-credit graduate courses) etc.
//  - BME 185 is both Technical Writing and DC (DC is an overlay).
//  - Exit requirements (portfolio, exit survey, exit interview) = attestation.
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const ELECTIVES_BME = [
  'AM 115', 'METX 100', 'METX 140', 'BIOC 100C', 'BIOL 115', 'BME 118', 'BME 122H', 'BME 123L', 'AM 147',
  'BME 128', 'BME 128L', 'BME 130', 'BME 132', 'BME 140', 'BME 175', 'BME 177', 'BME 177L', 'BME 178', 'ECE 104',
]
const ELECTIVES_BINF = [
  'AM 115', 'AM 147', 'BME 118', 'BME 122H', 'BME 123L', 'BME 128', 'BME 128L', 'BME 130', 'BME 132', 'BME 140',
  'BME 175', 'BME 177', 'BME 177L', 'BME 178', 'BIOC 100B', 'CSE 142', 'CSE 144', 'CSE 182', 'METX 100', 'METX 140',
]
const GRAD_BME = range('BME', 201, 279).minCredits(5)

const Q_SUBS = 'Students may substitute BIOL 105 for BME 105, although BME 105 is strongly recommended.Students may substitute CSE 20 for BME 160, although BME 160 is strongly recommended. CSE 20 has a test-out exam that will also be accepted.'
const Q_PHIL = 'Transfer students may use courses articulated to PHIL 22, PHIL 24, or PHIL 28 in place of BME 80G, if these courses are taken prior to registering at UC Santa Cruz.'
const Q_CHEM_NOTE = 'CHEM 3B and 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_THESIS = 'The thesis option consists of three quarters of BME 195, where students conduct research in biomolecular engineering or related field such as chemistry, biology, or biochemistry.'

export default defineHarness({
  program: 'biomolecular-engineering-and-bioinformatics-bs',
  edition: '2026-27',
  title: 'Biomolecular Engineering and Bioinformatics B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'The Biomolecular Engineering and Bioinformatics (BMEB) Bachelor of Science includes the biomolecular engineering (BME) and bioinformatics (BINF) concentrations.',
      options: [
        { value: 'bme', label: 'Biomolecular Engineering', aliases: ['biomolecular engineering concentration', 'biomolecular', 'BME concentration'] },
        { value: 'binf', label: 'Bioinformatics', aliases: ['bioinformatics concentration', 'BINF concentration'] },
      ],
    },
  ],
  attestations: [
    {
      id: 'exit',
      label: 'Exit requirements: portfolio, exit survey and exit interview',
      quote: 'Students are required to submit a portfolio, exit survey, and attend an exit interview.',
      aliases: ['portfolio', 'exit survey', 'exit interview', 'exit requirement'],
    },
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'CSE 20 has a test-out exam that will also be accepted.',
      aliases: ['cse 20 test-out', 'cse 20 testout', 'cse20 testout', 'cse 20 test out'],
    },
    {
      id: 'cse40-testout',
      label: 'Passed the CSE 40 test-out',
      quote: 'CSE 40 has a test-out option which can satisfy this requirement.',
      aliases: ['cse 40 test-out', 'cse 40 testout', 'cse40 testout', 'cse 40 test out'],
    },
  ],
  notes: [
    'Baskin Engineering requires letter grades for all courses in an engineering major.',
    'The BMEB B.S. cannot be combined with the Biotechnology B.A. or the Bioinformatics minor.',
    'Capstone series are taken in the senior year; the senior thesis needs an approved two-page proposal before the first quarter of BME 195.',
  ],
  evaluate(h) {
    // "Baskin Engineering requires letter grades for all courses in an engineering major."
    h.policy = { letter: true }
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    const bme = h.choice('concentration') === 'bme'
    return bme ? bmeConcentration(h) : binfConcentration(h)
  },
})

function common(h: HarnessContext) {
  return {
    biol20a: h.take('biol20a', 'Biology: BIOL 20A', 'BIOL 20A — Cell and Molecular Biology (5)', codes('BIOL 20A')),
    bioethics: bioethics(h),
    chem: generalChem(h),
    calc: h.options('calc', 'Calculus', ['One of the following options:', 'Either these courses', 'or these courses'], [['MATH 19A', 'MATH 19B'], ['MATH 20A', 'MATH 20B']]),
    linalg: h.take('linalg', 'Linear algebra', 'Plus one of the following:', codes('AM 10', 'MATH 21')),
  }
}

function bmeCore(h: HarnessContext): Node {
  return h.group('bme-core', 'Biomolecular Engineering core', [
    h.take('bme105', 'BME 105 (or BIOL 105)', ['BME 105 — Genetics in the Genomics Era (5)', Q_SUBS], codes('BME 105', 'BIOL 105'), { prefer: (c) => (c === 'BME105' ? 0 : 1) }),
    h.take('bme110', 'BME 110', 'BME 110 — Computational Biology Tools (5)', codes('BME 110')),
    testOut(h, 'cse20-testout', ['BME160', 'CSE20'], h.take('bme160', 'BME 160 (or CSE 20)', ['BME 160 — Research Programming in the Life Sciences (6)', Q_SUBS], codes('BME 160', 'CSE 20'), {
      prefer: (c) => (c === 'BME160' ? 0 : 1),
    })),
    h.take('bme163', 'BME 163', 'BME 163 — Applied Visualization and Analysis of Scientific Data (5)', codes('BME 163')),
  ], { quote: 'All of these courses:' })
}

function technicalWritingAndDc(h: HarnessContext, twQuote: string, dcQuote: string): Node[] {
  return [
    h.take('tech-writing', 'Technical Writing: BME 185', ['BME 185 — Technical Writing for Biomolecular Engineers (5)', twQuote], codes('BME 185')),
    // DC is the same course: an overlay.
    h.take('dc', 'Disciplinary Communication (DC)', dcQuote, codes('BME 185'), { exclusive: false }),
  ]
}

function elective(h: HarnessContext, list: string[], quote: string): Node {
  return h.take('elective', 'Elective', ['One of the following:', 'or any 5-credit biomolecular engineering graduate course', quote], codes(...list).or(GRAD_BME), {
    pool: `${list.join(', ')}, or any 5-credit BME 201–279 graduate course`,
  })
}

function bmeConcentration(h: HarnessContext): Node[] {
  const c = common(h)
  const lower = h.group('lower', 'Lower-Division Courses', [
    c.biol20a,
    c.bioethics,
    c.chem,
    h.all('orgo', 'Organic Chemistry', 'All of the following courses:', ['CHEM 8A', 'CHEM 8B']),
    h.all('lab-training', 'Laboratory Training', 'All of the following courses:', ['BME 21L', 'BME 22L']),
    h.group('math-stats', 'Mathematics and Statistics', [
      c.calc,
      c.linalg,
      h.options('stats', 'Statistics', ['Plus one of these options:', 'Either these courses', 'or this course'], [['STAT 7', 'STAT 7L'], ['STAT 131']], { notes: ['STAT 131: see prerequisites.'] }),
    ]),
    h.group('physics', 'Physics', [
      h.take('phys5a', 'PHYS 5A or PHYS 15A', 'Either one of these courses', codes('PHYS 5A', 'PHYS 15A')),
      h.all('phys-rest', 'PHYS 5L, 5B, 5M', 'AND', ['PHYS 5L', 'PHYS 5B', 'PHYS 5M']),
    ]),
  ])
  const [tw, dc] = technicalWritingAndDc(h, 'This also satisfies the Disciplinary Communication (DC) requirement.', 'Biomolecular engineering and bioinformatics majors satisfy the DC requirement by completing the following course:')
  const upper = h.group('upper', 'Upper-Division Courses', [
    h.options('biochem', 'Biochemistry and Molecular Biology', ['Choose one of the following options:', 'Either these courses', 'or these courses'], [
      ['BIOC 100A', 'BIOC 100B'],
      ['BME 101', 'CHEM 103'],
      ['BME 101', 'BIOL 100'],
    ], { notes: ['BIOC 100A and BIOC 100B are strongly preferred for students who plan to pursue research in protein engineering, genetics, molecular biology, or biochemistry-related fields.'] }),
    bmeCore(h),
    h.options('modeling-design', 'Modeling/Design sequence', ['Plus one of the following Modeling/Design sequences:', 'Either these courses', 'or these courses'], [
      ['BME 128', 'BME 128L'],
      ['BME 177', 'BME 177L'],
      ['BME 130', 'BME 123L'],
    ]),
    tw,
  ])
  const el = elective(h, ELECTIVES_BME, 'Graduate courses must be numbered BME 201-279.This course cannot satisfy other requirements of the major.')
  const capstone = h.options(
    'capstone',
    'Comprehensive Requirement: senior capstone',
    ['To complete the senior capstone requirement, biomolecular engineering concentration students must complete one of the following options:', Q_THESIS],
    [
      ['BME 129A', 'BME 129B', 'BME 129C'],
      ['BME 180', 'BME 188A', 'BME 188B', 'BME 188C'],
      ['BME 205', 'BME 230A', 'BME 129C'],
      ['BME 195', 'BME 195', 'BME 195'],
    ],
    {
      labels: ['Option 1: BME Team Design', 'Option 2: iGEM', 'Option 3: Bioinformatics Capstone', 'Option 4: Senior Thesis'],
      notes: [
        'iGEM courses (BME 188A/B/C) need a permission code: only students selected for the iGEM team in fall of their junior year may register.',
        'Senior thesis: three quarters of BME 195 (typically 5 credits each) after an approved proposal.',
      ],
    },
  )
  thesisDetail(h, capstone)
  return [lower, upper, el, dc, capstone, exit(h)]
}

function binfConcentration(h: HarnessContext): Node[] {
  const c = common(h)
  const lower = h.group('lower', 'Lower-Division Courses', [
    c.biol20a,
    c.bioethics,
    c.chem,
    h.take('chem8a', 'Organic Chemistry: CHEM 8A', 'CHEM 8A — Organic Chemistry (5)', codes('CHEM 8A')),
    h.all('cse', 'Computer Science and Engineering', 'All of the following courses:', ['CSE 16', 'CSE 30']),
    h.group('math', 'Mathematics', [
      c.calc,
      c.linalg,
      h.options('multivar', 'Multivariable calculus', ['Plus one of the following:', 'Either this course', 'or this course', 'or these courses'], [['AM 30'], ['MATH 22'], ['MATH 23A', 'MATH 23B']]),
    ]),
    testOut(h, 'cse40-testout', ['CSE40', 'STAT132'], h.take('ld-stats', 'Statistics: CSE 40 or STAT 132', 'One of the following:', codes('CSE 40', 'STAT 132'))),
  ])
  const [tw, dc] = technicalWritingAndDc(h, 'Also satisfies the Disciplinary Communication (DC) requirement.', 'BMEB majors satisfy the DC requirement by completing the following course.')
  const upper = h.group('upper', 'Upper-Division Courses', [
    h.take('dsa', 'Data Structures and Algorithms', 'One of the following courses:', codes('CSE 101', 'CSE 101P'), { notes: ['CSE 101 has an additional prerequisite of CSE 13S.'] }),
    h.take('biochem', 'Biochemistry and Molecular Biology', 'One of the following courses:', codes('BIOC 100A', 'BIOL 100', 'BME 101', 'CHEM 103'), { notes: ['BME 101 is preferred.'] }),
    bmeCore(h),
    h.take('stat131', 'Statistics: STAT 131', 'STAT 131 — Introduction to Probability Theory (5)', codes('STAT 131')),
    h.take('modeling-design', 'Modeling and Design', 'One of the following:', codes('CSE 142', 'CSE 144')),
    tw,
  ])
  const el = elective(h, ELECTIVES_BINF, 'Graduate courses must be numbered BME 201-279.Courses satisfying an elective cannot be used to satisfy other requirements of the major.')
  const capstone = h.options(
    'capstone',
    'Comprehensive Requirement: senior capstone',
    ['All bioinformatics concentration students must complete a senior capstone project through one of the following options.', Q_THESIS],
    [
      ['BME 205', 'BME 230A', 'BME 129C'],
      ['BME 195', 'BME 195', 'BME 195'],
    ],
    {
      labels: ['Option 1: Bioinformatics Capstone', 'Option 2: Senior Thesis'],
      notes: ['Senior thesis: three quarters of BME 195 (typically 5 credits each) after an approved proposal.'],
    },
  )
  thesisDetail(h, capstone)
  return [lower, upper, el, dc, capstone, exit(h)]
}

/**
 * Test-out convention: when no course of the slot is in the plan, the
 * test-out attestation is offered next to the slot; attested ⇒ met "by test-out".
 */
function testOut(h: HarnessContext, attId: string, slotCodes: string[], slot: Node): Node {
  if (h.enrollments.some((e) => slotCodes.includes(e.code))) return slot
  if (h.attested(attId)) return h.node(`${slot.id}-testout`, slot.title, slot.quote, 'met', { detail: 'by test-out' })
  return h.either(`${slot.id}-or-testout`, `${slot.title}, or its test-out`, h.attestations.find((a) => a.id === attId)!.quote, [slot, h.attest(attId)])
}

/** Senior thesis: "three quarters of BME 195" — explain a short count. */
function thesisDetail(h: HarnessContext, capstone: Node) {
  h.solve()
  if (capstone.status !== 'unmet') return
  const n = h.taken(codes('BME 195')).length
  if (n > 0 && (capstone.used ?? []).every((e) => e.code === 'BME195'))
    capstone.detail = `Senior thesis: ${n} of 3 quarters of BME 195 — or complete another capstone option`
}

function exit(h: HarnessContext): Node {
  return h.attest('exit')
}

/** BME 80G, or (transfer students) a PHIL 22/24/28 articulated course taken before UCSC. */
function bioethics(h: HarnessContext): Node {
  const PHIL = new Set(['PHIL22', 'PHIL24', 'PHIL28'])
  return h.take('bioethics', 'Bioethics: BME 80G', ['BME 80G [/PHIL 80G] — Bioethics in the 21st Century: Science, Business, and Society (5)', Q_PHIL], codes('BME 80G', 'PHIL 22', 'PHIL 24', 'PHIL 28'), {
    prefer: (c) => (c === 'BME80G' ? 0 : 1),
    check: (chosen) => {
      const e = chosen[0]
      if (!PHIL.has(e.code)) return null
      if (e.term != null || h.entry === 'frosh') return `${e.display} counts only for transfer students who took it before registering at UC Santa Cruz`
      return null
    },
    notes: ['PHIL 80G is the same course as BME 80G (cross-listed).'],
  })
}

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Either these courses', 'or these courses', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  const title = 'General Chemistry'
  if (missingA.length === 0 && !undated) return h.node('gen-chem', title, quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', title, quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', title, quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', title, quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}
