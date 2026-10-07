// Biotechnology B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biotechnology-ba.md
//
// Unusual bits handled in code below:
//  - "CHEM 3A is waived for students transferring in credit for BIOL 20A":
//    BIOL 20A on record with no UCSC term (transfer credit) waives chemistry.
//  - STAT 131 may substitute for STAT 7 + 7L (an extra package).
//  - Electives: three, or four when CSE 20 replaces BME 160; the 40
//    upper-division credits are checked over the major's upper-division
//    courses (core, electives, DC BME 185, comprehensive BME 175) — with
//    BME 160 (6 credits) + three 5-credit electives that is 41, with CSE 20 +
//    four electives 40, which is how the page's two rules fit together.
//  - "CSE 20 has a test-out exam that will also be accepted": attestation
//    offered only when neither BME 160 nor CSE 20 is in the plan (§1a); the
//    test-out stands in for CSE 20, so four electives are then required.
//  - One upper-division BIOL course may count as an elective by petition
//    (attestation, asked only when such a course is actually needed).
import { codes, defineHarness, range } from '@harness'
import type { Enrollment, Node } from '@harness'

const ELECTIVES = [
  'BME 122H', 'BME 128', 'BME 130', 'BME 132', 'BME 140', 'BME 177', 'BME 178', 'ECE 104',
  'FMST 124', 'FMST 133', 'METX 100', 'SOCY 121', 'SOCY 123', 'SOCY 127P',
]
const ELECTIVE_SET = codes(...ELECTIVES)
const UD_BIOL = range('BIOL', 100, 199)
const Q_ELECTIVES =
  'Three or more of the following courses must be taken to meet the requirement of 40 upper-division credits for the major. At least four of the following courses must be taken if a student completes CSE 20 instead of BME 160.'
const Q_PETITION = 'Students may petition to have one upper-division biology credited as an elective, but most such courses have prerequisites that are not required for the major.'
const Q_CSE20 = 'Students may substitute CSE 20 for BME 160, although BME 160 is strongly recommended. CSE 20 has a test-out exam that will also be accepted.'

export default defineHarness({
  program: 'biotechnology-ba',
  edition: '2026-27',
  title: 'Biotechnology B.A.',
  attestations: [
    {
      id: 'biology-elective-petition',
      label: 'Petition approved to count an upper-division biology course as an elective',
      quote: Q_PETITION,
      aliases: ['biology petition', 'biol petition', 'petition'],
    },
    {
      id: 'cse20-testout',
      label: 'Passed the CSE 20 test-out',
      quote: 'CSE 20 has a test-out exam that will also be accepted.',
      aliases: ['cse 20 test-out', 'cse 20 testout', 'cse20 testout', 'cse 20 test out'],
    },
  ],
  notes: [
    'Baskin Engineering requires letter grades for all courses in a major.',
    'The Biotechnology B.A. cannot be combined with the BMEB B.S. or the Bioinformatics minor.',
    'Students migrating from MCDB may have appropriate MCDB courses substituted for specific electives (department decision).',
  ],
  evaluate(h) {
    // "Baskin Engineering requires letter grades for all courses in a major."
    h.policy = { letter: true }

    const chem = h.options('chem', 'Chemistry', ['CHEM 3A — General Chemistry (5)', 'CHEM 4A — Advanced General Chemistry: Molecular Structure and Reactivity (5)'], [['CHEM 3A'], ['CHEM 4A', 'CHEM 4AL']], {
      notes: ['CHEM 3A is recommended.', 'CHEM 3A is waived for students transferring in credit for BIOL 20A.'],
    })
    const lower = h.group('lower', 'Lower-Division Courses', [
      chem,
      h.all('intro', 'Introductory Biology and Biotechnology', ['BIOL 20A — Cell and Molecular Biology (5)', 'BME 5 — Introduction to Biotechnology (5)'], ['BIOL 20A', 'BME 5']),
      h.options('stats', 'Statistics', ['Either these courses', 'or this course', 'Students may substitute STAT 131 for STAT 7 and STAT 7L, but it has several prerequisites that are not required for the major.'], [['STAT 7', 'STAT 7L'], ['STAT 5'], ['STAT 131']], {
        notes: ['STAT 7 and STAT 7L is strongly preferred.'],
      }),
      h.group('society', 'Biotechnology and Society', [
        h.take('bme80g', 'BME 80G', ['This course', 'BME 80G [/PHIL 80G] — Bioethics in the 21st Century: Science, Business, and Society (5)'], codes('BME 80G'), {
          notes: ['PHIL 80G is the same course (cross-listed).'],
        }),
        h.take('society-one', 'One of BME 18, BME 80H, ECE 80B', 'And one of these courses', codes('BME 18', 'BME 80H', 'ECE 80B')),
      ]),
    ])

    const bme160Taken = h.taken(codes('BME 160')).length > 0
    const Q_BME160 = ['BME 160 — Research Programming in the Life Sciences (6)', Q_CSE20]
    const progSlot = h.take('bme160', 'BME 160 (or CSE 20)', Q_BME160, codes('BME 160', 'CSE 20'), {
      prefer: (c) => (c === 'BME160' ? 0 : 1),
    })
    // Test-out: offered only when neither BME 160 nor CSE 20 is in the plan.
    const progAbsent = !h.enrollments.some((e) => e.code === 'BME160' || e.code === 'CSE20')
    const testedOut = progAbsent && h.attested('cse20-testout')
    const prog: Node = !progAbsent
      ? progSlot
      : testedOut
        ? h.node('bme160-testout', 'BME 160 (or CSE 20)', Q_BME160, 'met', { detail: 'by test-out (CSE 20 test-out exam)' })
        : h.either('bme160-or-testout', 'BME 160, CSE 20, or the CSE 20 test-out', 'CSE 20 has a test-out exam that will also be accepted.', [progSlot, h.attest('cse20-testout')])
    const core = h.group('ud-core', 'Biotechnology Upper-Division Core', [
      h.take('bme105', 'BME 105', 'BME 105 — Genetics in the Genomics Era (5)', codes('BME 105')),
      h.take('bme110', 'BME 110', 'BME 110 — Computational Biology Tools (5)', codes('BME 110')),
      prog,
    ])
    const cse20Taken = !bme160Taken && (h.taken(codes('CSE 20')).length > 0 || testedOut)
    const n = cse20Taken ? 4 : 3
    const electives = h.take('electives', cse20Taken ? 'Four electives (CSE 20 instead of BME 160)' : 'Three electives', [Q_ELECTIVES, Q_PETITION], ELECTIVE_SET.or(UD_BIOL), {
      n,
      atMost: [{ set: UD_BIOL, n: 1, label: 'upper-division biology courses (by petition)' }],
      prefer: (c) => (ELECTIVE_SET.has(c) ? 0 : 1),
      pool: `${ELECTIVES.join(', ')}; or one upper-division BIOL course by petition`,
      notes: ['We recommend that two or more of the courses should be BME courses.', 'BME 128, BME 177, BME 178, ECE 104, FMST 133, and SOCY 127P all have additional prerequisites not covered by the major requirements.'],
    })
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'BME 185 — Technical Writing for Biomolecular Engineers (5)', codes('BME 185'))
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', ['The comprehensive requirement is covered by the project in the entrepreneurship course:', 'BME 175 — Entrepreneurship in Biotechnology (5)'], codes('BME 175'))
    h.solve()

    // Chemistry waiver for transferred BIOL 20A.
    if (chem.status === 'unmet' && h.taken(codes('BIOL 20A')).some((e) => e.term == null)) {
      chem.status = 'met'
      chem.detail = 'Waived: BIOL 20A transferred in (CHEM 3A is waived for students transferring in credit for BIOL 20A).'
    }

    // Petitioned biology elective.
    const biolUsed = (electives.used ?? []).filter((e) => UD_BIOL.has(e.code))
    if (biolUsed.length && electives.status === 'met' && !h.attested('biology-elective-petition')) {
      electives.status = 'needs-attestation'
      electives.attest = h.attestations.find((a) => a.id === 'biology-elective-petition')
      electives.detail = `${biolUsed[0].display} counts only with an approved petition.`
    }

    // 40 upper-division credits over the major's upper-division courses.
    const counted: Enrollment[] = [...core.children!.filter((c) => c !== prog), progSlot, electives, dc, comprehensive].flatMap((c) => c.used ?? [])
    const ids = new Set(counted.map((e) => e.id))
    const extra = h.taken(ELECTIVE_SET).filter((e) => !ids.has(e.id) && !h.used.has(e.id))
    const seen = new Set<string>()
    const ud = [...counted, ...extra].filter((e) => {
      const c = h.catalog.get(e.code)
      if (!c || c.division === 'lower' || seen.has(e.code)) return false
      seen.add(e.code)
      return true
    })
    const credits = ud.reduce((s, e) => s + (h.catalog.get(e.code)?.credits || 0), 0)
    const creditNode: Node = h.node('ud-credits', '40 upper-division credits', Q_ELECTIVES, credits >= 40 ? 'met' : 'unmet', {
      used: ud,
      progress: { have: credits, need: 40, unit: 'credits' },
      detail: `${credits} of 40 upper-division credits (core, electives, BME 185, BME 175)`,
    })

    return [lower, core, h.group('elective-group', 'Electives', [electives, creditNode]), dc, comprehensive]
  },
})
