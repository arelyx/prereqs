// Bioinformatics Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/bioinformatics-minor.md
//
// Unusual bits handled in code below:
//  - CSE 20 may replace BME 160, and "CSE 20 has a test-out exam that will
//    also be accepted": an attestation offered only when neither BME 160 nor
//    CSE 20 is in the plan (docs/HARNESSES.md §1a test-out convention).
//  - Electives: "two or more ... to meet the requirement of 25 credits of
//    upper-division credits". Two electives alone can never reach 25 credits,
//    so the 25 credits are read as the minor's total upper-division credits
//    (genetics, BME 160/163, STAT 131, BME 110 and the electives); extra
//    electives count toward it. Checked in code after allocation.
import { codes, defineHarness } from '@harness'
import type { Enrollment, Node } from '@harness'

const ELECTIVES = ['BME 118', 'BME 122H', 'BME 130', 'BME 132', 'BME 140', 'BME 175', 'BME 205', 'BME 230A', 'BME 237', 'BME 273']
const Q_ELECTIVES = 'Choose two or more electives to meet the requirement of 25 credits of upper-division credits:'
const Q_CSE20 = 'Students may substitute CSE 20 for BME 160, although BME 160 is strongly recommended. CSE 20 has a test-out exam that will also be accepted.'

export default defineHarness({
  program: 'bioinformatics-minor',
  edition: '2026-27',
  title: 'Bioinformatics Minor',
  attestations: [
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: Q_CSE20,
      aliases: ['cse 20 test-out', 'cse 20 testout', 'cse20 testout', 'cse 20 test out'],
    },
  ],
  notes: [
    'The bioinformatics minor cannot be combined with the Biomolecular Engineering and Bioinformatics B.S. or the Biotechnology B.A.',
    'The page states no letter-grade rule for the minor; campus P/NP limits apply.',
  ],
  evaluate(h) {
    h.policy = undefined // the page states no grade rule for the minor

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('biol20a', 'Biology: BIOL 20A', 'BIOL 20A — Cell and Molecular Biology (5)', codes('BIOL 20A')),
      h.options('chem', 'Chemistry', ['Either this course', 'or these courses'], [['CHEM 3A'], ['CHEM 4A', 'CHEM 4AL']]),
      h.options('calc', 'Single-Variable Calculus', ['Either these courses', 'or these courses'], [
        ['MATH 19A', 'MATH 19B'],
        ['MATH 11A', 'MATH 11B'],
        ['MATH 20A', 'MATH 20B'],
      ], { notes: ['MATH 19A, MATH 19B: preferred'] }),
      h.take('bioethics', 'Bioethics: BME 80G', 'BME 80G [/PHIL 80G] — Bioethics in the 21st Century: Science, Business, and Society (5)', codes('BME 80G'), {
        notes: ['PHIL 80G is the same course (cross-listed).'],
      }),
    ])

    const genetics = h.take('genetics', 'Genetics', 'Choose one of the following:', codes('BME 105', 'BIOL 105', 'METX 140'), {
      notes: ['BME 105: strongly recommended'],
    })
    const Q_BME160 = ['BME 160 — Research Programming in the Life Sciences (6)', Q_CSE20]
    // Test-out: offered only when neither course is in the plan at all.
    const programmingAbsent = !h.enrollments.some((e) => e.code === 'BME160' || e.code === 'CSE20')
    const bme160Slot = h.take('bme160', 'BME 160 (or CSE 20)', Q_BME160, codes('BME 160', 'CSE 20'), {
      prefer: (c) => (c === 'BME160' ? 0 : 1),
    })
    const bme160: Node = !programmingAbsent
      ? bme160Slot
      : h.attested('cse20-testout')
        ? h.node('bme160-testout', 'BME 160 (or CSE 20)', Q_BME160, 'met', { detail: 'by test-out (CSE 20 test-out exam)' })
        : h.either('bme160-or-testout', 'BME 160, CSE 20, or the CSE 20 test-out', Q_CSE20, [bme160Slot, h.attest('cse20-testout')])
    const bme163 = h.take('bme163', 'BME 163', 'BME 163 — Applied Visualization and Analysis of Scientific Data (5)', codes('BME 163'))
    const stats = h.options('stats', 'Statistics', ['One of the following:', 'Either these courses', 'or this course'], [['STAT 7', 'STAT 7L'], ['STAT 131']], {
      notes: ['STAT 131: see prerequisites.'],
    })
    const bme110 = h.take('bme110', 'Bioinformatics: BME 110', 'BME 110 — Computational Biology Tools (5)', codes('BME 110'))
    const upper = h.group('upper', 'Upper-Division Courses', [
      genetics,
      h.group('programming', 'Programming', [bme160, bme163]),
      stats,
      bme110,
    ])

    const electives = h.take('electives', 'Two or more electives', Q_ELECTIVES, codes(...ELECTIVES), { n: 2 })
    h.solve()

    // 25 upper-division credits over the courses the minor counts, plus any
    // further passed electives (they are not used by any other requirement).
    const counted: Enrollment[] = [genetics, bme160Slot, bme163, stats, bme110, electives].flatMap((n) => n.used ?? [])
    const ids = new Set(counted.map((e) => e.id))
    const extra = h.taken(codes(...ELECTIVES)).filter((e) => !ids.has(e.id) && !h.used.has(e.id))
    const seen = new Set<string>()
    const ud = [...counted, ...extra].filter((e) => {
      const c = h.catalog.get(e.code)
      if (!c || c.division === 'lower' || seen.has(e.code)) return false
      seen.add(e.code)
      return true
    })
    const credits = ud.reduce((s, e) => s + (h.catalog.get(e.code)?.credits || 0), 0)
    const creditNode: Node = h.node(
      'ud-credits',
      '25 upper-division credits',
      Q_ELECTIVES,
      credits >= 25 ? 'met' : 'unmet',
      {
        used: ud,
        progress: { have: credits, need: 25, unit: 'credits' },
        detail: credits >= 25 ? `${credits} upper-division credits` : `${credits} of 25 upper-division credits — add another elective`,
      },
    )
    return [lower, upper, h.group('elective-group', 'Electives', [electives, creditNode])]
  },
})
