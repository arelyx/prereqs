// Biotechnology B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/biotechnology-ba.md
//
// Ported from the reviewed 2026-27 harness. 2025-26 differs:
//  - CSE 20 is a lower-division "Introductory" requirement; BME 160 is a
//    plain core course (no CSE 20 substitution for it).
//  - CSE 20 "is waived for students who have already completed an
//    upper-division Python programming course such as BME 160": a passed
//    BME 160 waives it. "A different introductory programming course or the
//    CSE 20 Test Out exam" are substitutes: attestations offered only when
//    CSE 20 is absent and not waived (§1a). Transfer Python courses go in the
//    plan as CSE 20 (articulated equivalent).
//  - Electives: exactly "Three of the following courses" — no 40-credit rule
//    and no fourth-elective rule.
//  - Chemistry may also be satisfied by the pre-2023 CHEM 1A.
// Kept from 2026-27:
//  - "CHEM 3A is waived for students transferring in credit for BIOL 20A":
//    BIOL 20A on record with no UCSC term (transfer credit) waives chemistry.
//  - STAT 131 may substitute for STAT 7 + 7L (an extra package).
//  - One upper-division BIOL course may count as an elective by petition
//    (attestation, asked only when such a course is actually needed).
import { codes, defineHarness, range } from '@harness'
import type { Node } from '@harness'

const ELECTIVES = [
  'BME 122H', 'BME 128', 'BME 130', 'BME 132', 'BME 140', 'BME 177', 'BME 178', 'ECE 104',
  'FMST 124', 'FMST 133', 'METX 100', 'SOCY 121', 'SOCY 123', 'SOCY 127P',
]
const ELECTIVE_SET = codes(...ELECTIVES)
const UD_BIOL = range('BIOL', 100, 199)
const Q_ELECTIVES = 'Three of the following courses must be taken. We recommend that two or more of the three are BME courses.'
const Q_PETITION = 'Students may petition to have one upper-division biology course count as an elective, but most such courses have prerequisites that are not required for the major.'
const Q_CSE20_WAIVE = 'CSE 20 is waived for students who have already completed an upper-division Python programming course such as BME 160.'
const Q_CSE20_SUBS = 'A different introductory programming course or the [CSE 20 Test Out exam](https://undergrad.engineering.ucsc.edu/advising/policies-forms-petitions/cse/)CSE 20 are acceptable substitutes for CSE 20.'
const Q_CHEM1 = 'This requirement may also be satisfied with prior completion of CHEM 1A or equivalent.'

export default defineHarness({
  program: 'biotechnology-ba',
  edition: '2025-26',
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
      quote: Q_CSE20_SUBS,
      aliases: ['cse 20 test-out', 'cse 20 testout', 'cse20 testout', 'cse 20 test out'],
    },
    {
      id: 'cse20-other-intro',
      label: 'Completed a different introductory programming course in place of CSE 20',
      quote: Q_CSE20_SUBS,
      aliases: ['other intro programming', 'different introductory programming course'],
    },
  ],
  notes: [
    'Baskin Engineering requires letter grades for all courses in a major.',
    'The Biotechnology B.A. cannot be combined with the BMEB B.S. or the Bioinformatics minor.',
    'Students migrating from MCDB may have appropriate MCDB courses substituted for specific electives (department decision).',
    'Transfer students: any course teaching Python is accepted for CSE 20 — add it to your plan as CSE 20.',
  ],
  evaluate(h) {
    // "Baskin Engineering requires letter grades for all courses in a major."
    h.policy = { letter: true }

    const chem = h.options('chem', 'Chemistry', ['CHEM 3A — General Chemistry (5)', 'CHEM 4A — Advanced General Chemistry: Molecular Structure and Reactivity (5)', Q_CHEM1], [['CHEM 3A'], ['CHEM 4A', 'CHEM 4AL'], ['CHEM 1A']], {
      notes: ['CHEM 3A is recommended.', 'CHEM 3A is waived for students transferring in credit for BIOL 20A.'],
    })

    // CSE 20: course, waived by a passed BME 160, or a substitute (attested).
    const Q_CSE20 = 'CSE 20 — Beginning Programming in Python (5)'
    const cse20Slot = h.take('cse20', 'CSE 20', Q_CSE20, codes('CSE 20'))
    const cse20Absent = !h.enrollments.some((e) => e.code === 'CSE20')
    let cse20: Node = cse20Slot
    if (cse20Absent) {
      if (h.taken(codes('BME 160')).length) {
        cse20 = h.node('cse20-waived', 'CSE 20', [Q_CSE20, Q_CSE20_WAIVE], 'met', { detail: 'Waived: BME 160 completed' })
      } else if (h.attested('cse20-testout')) {
        cse20 = h.node('cse20-testout', 'CSE 20', [Q_CSE20, Q_CSE20_SUBS], 'met', { detail: 'by test-out (CSE 20 test-out exam)' })
      } else if (h.attested('cse20-other-intro')) {
        cse20 = h.node('cse20-substitute', 'CSE 20', [Q_CSE20, Q_CSE20_SUBS], 'met', { detail: 'by a different introductory programming course' })
      } else {
        cse20 = h.either('cse20-or-substitute', 'CSE 20, the CSE 20 test-out, or another introductory programming course', Q_CSE20_SUBS, [
          cse20Slot,
          h.attest('cse20-testout'),
          h.attest('cse20-other-intro'),
        ])
      }
    }

    const lower = h.group('lower', 'Lower-Division Courses', [
      chem,
      h.group('intro', 'Introductory', [
        h.all('intro-bio', 'BIOL 20A and BME 5', ['BIOL 20A — Cell and Molecular Biology (5)', 'BME 5 — Introduction to Biotechnology (5)'], ['BIOL 20A', 'BME 5']),
        cse20,
      ]),
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

    const core = h.group('ud-core', 'Biotechnology Upper-Division Core', [
      h.take('bme105', 'BME 105', 'BME 105 — Genetics in the Genomics Era (5)', codes('BME 105')),
      h.take('bme110', 'BME 110', 'BME 110 — Computational Biology Tools (5)', codes('BME 110')),
      h.take('bme160', 'BME 160', 'BME 160 — Research Programming in the Life Sciences (6)', codes('BME 160')),
    ])
    const electives = h.take('electives', 'Three electives', [Q_ELECTIVES, Q_PETITION], ELECTIVE_SET.or(UD_BIOL), {
      n: 3,
      atMost: [{ set: UD_BIOL, n: 1, label: 'upper-division biology courses (by petition)' }],
      prefer: (c) => (ELECTIVE_SET.has(c) ? 0 : 1),
      pool: `${ELECTIVES.join(', ')}; or one upper-division BIOL course by petition`,
      notes: ['We recommend that two or more of the three are BME courses.', 'BME 128, BME 177, BME 178, ECE 104, FMST 133, and SOCY 127P all have additional prerequisites not covered by the major requirements.'],
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

    return [lower, core, electives, dc, comprehensive]
  },
})
