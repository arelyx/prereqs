// Global and Community Health B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/global-and-community-health-ba.md
//
// Unusual bits handled in code below:
//  - Every major course needs a letter grade of C or better.
//  - Lower division: GCH 1 + one course from each of four lists (A–D).
//    "For courses with a required concurrently enrolled lab, only successful
//    completion of the lecture is required for the major" — so STAT 7 / STAT 17
//    count without their labs, although the quantitative list shows them as
//    lecture + lab pairs (the explicit lab sentence wins; labs merge).
//  - Language (D): a listed course, or testing out of a first-year series
//    (attestation; the page names the placement route explicitly).
//  - Upper division: two common-core courses, one course per context area
//    (I–IV) and two more from any area — all distinct courses ("no one course
//    can be used to satisfy multiple requirements"), one shared allocation.
//  - One upper-division independent/field study may replace an elective by
//    petition (attestation, only when such a course is actually used).
//  - Comprehensive = the DC courses.
import { codes, defineHarness } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const LIST_A = [
  'ANTH 1', 'BIOE 19', 'BIOL 20A', 'BIOL 80A', 'BIOL 80J', 'BIOL 86', 'BIOL 88', 'BME 5', 'BME 18', 'BME 80H',
  'CHEM 3A', 'CHEM 4A', 'CHEM 8A', 'CSE 80A', 'ENVS 24', 'ENVS 25', 'ENVS 80F',
]
const LIST_B = [
  'ANTH 2', 'BME 80G', 'CMMU 10', 'CMPM 20', 'ECON 1', 'ECON 20', 'FMST 10', 'FMST 30', 'FMST 31', 'FMST 41',
  'GCH 10', 'GCH 41', 'HAVC 48', 'HIS 81', 'JRLC 60', 'LALS 5', 'LALS 45', 'LALS 54', 'LALS 55', 'LALS 56',
  'LALS 57', 'LALS 80J', 'LALS 80S', 'LIT 80K', 'MERR 41', 'POLI 17', 'POLI 61', 'PSYC 1', 'SOCY 1', 'SOCY 10', 'SOCY 15',
]
const LIST_C = ['BIOE 80S', 'CMMU 30', 'LALS 15', 'STAT 5', 'STAT 7', 'STAT 17']
const LIST_C_LABS: [string, string][] = [['STAT 7', 'STAT 7L'], ['STAT 17', 'STAT 17L']]
const LIST_D = ['ARBC 3', 'CHIN 3', 'FREN 3', 'HEBR 3', 'ITAL 3', 'JAPN 3', 'PUNJ 3', 'SPAN 3', 'SPAN 5M', 'SPHS 6', 'YIDD 3']
const LIST_D_SET = codes(...LIST_D)

const AREA_I = [
  'ANTH 104', 'ANTH 110F', 'ANTH 111', 'ANTH 112', 'ANTH 136', 'BIOE 118', 'BIOL 117', 'BIOL 188', 'CMMU 162',
  'ENVS 130B', 'ENVS 135', 'ENVS 176', 'LALS 174', 'METX 100', 'METX 115', 'METX 133', 'PSYC 109',
]
const AREA_II = [
  'ANTH 110M', 'ANTH 110T', 'ANTH 110Y', 'ANTH 129', 'ANTH 130Y', 'ANTH 134', 'ANTH 146', 'ANTH 161', 'ANTH 161S',
  'CMMU 156', 'CMMU 160', 'CMMU 161', 'CMMU 163', 'CMMU 164', 'ECON 120', 'GCH 123', 'LALS 100', 'LALS 155', 'LALS 175',
  'LALS 177', 'LALS 178', 'PSYC 140G', 'PSYC 140L', 'PSYC 144', 'PSYC 172', 'PSYC 178', 'SOCY 121', 'SOCY 121G',
  'SOCY 127P', 'SOCY 143', 'SOCY 146', 'SOCY 147', 'SOCY 153', 'SOCY 154', 'SOCY 159', 'SOCY 161',
]
const AREA_III = [
  'ECON 156', 'ENVS 130B', 'ENVS 143', 'ENVS 147', 'ENVS 158', 'ENVS 172', 'GCH 186', 'HIS 151B', 'LGST 108', 'LGST 137',
  'LGST 173', 'POLI 155', 'POLI 160B', 'POLI 166', 'POLI 175', 'POLI 189', 'POLI 190S', 'SOCY 122', 'SOCY 127',
  'SOCY 128I', 'SOCY 128M', 'SOCY 135', 'SOCY 185',
]
const AREA_IV = [
  'AM 115', 'ANTH 107A', 'ECON 104', 'ENVS 104A', 'ENVS 104L', 'ENVS 133', 'FMST 124', 'FMST 133', 'HAVC 141N',
  'HIS 101D', 'HIS 101F', 'HIS 151', 'HIS 151A', 'JRLC 136', 'LALS 126', 'LALS 143', 'LALS 151', 'LALS 152',
  'LIT 121O', 'LIT 160C', 'LIT 167G', 'LIT 167I', 'POLI 187', 'SOCY 123', 'SOCY 132',
]
// ENVS 104A (2 credits, the lecture: "Introduction to Environmental Field
// Methods") and ENVS 104L (5, "Field Methods Laboratory") require concurrent
// enrollment in each other. "All lecture/lab combinations count as one course.
// For courses with a required concurrently enrolled lab, only successful
// completion of the lecture is required for the major." — ENVS 104A is the
// counting unit and absorbs ENVS 104L (review 2026-10-06: the pair was
// reversed, so ENVS 104A alone did not count).
const AREA_IV_LABS: [string, string][] = [['ENVS 104A', 'ENVS 104L']]

const Q_LD_LABS =
  'All lecture/lab combinations count as one course. For courses with a required concurrently enrolled lab, only successful completion of the lecture is required for the major. Successful completion of the lab may count toward total degree credits.'
const Q_UNIQUE = 'All upper-division major requirement electives must be satisfied by unique, single courses; no one course can be used to satisfy multiple requirements.'
const Q_AREAS = 'One course must be taken from each of the four GCH context areas, plus two additional electives from any of the areas.'
const Q_PETITION = 'Students may petition the program to substitute one upper-division independent study or field study toward the elective requirements of the major.'

export default defineHarness({
  program: 'global-and-community-health-ba',
  edition: '2026-27',
  title: 'Global and Community Health B.A.',
  attestations: [
    {
      id: 'language-test-out',
      label: 'Tested out of a first-year language series',
      quote: 'Students are expected to complete or test out of a first-year language series.',
      aliases: ['test out', 'placement', 'language placement', 'language competency'],
    },
    {
      id: 'independent-study-petition',
      label: 'Petition approved to count an independent/field study as an elective',
      quote: Q_PETITION,
      aliases: ['independent study petition', 'field study petition', 'petition'],
    },
  ],
  notes: [
    'All courses that are taken to satisfy any major requirement must be completed with a letter grade of C or better.',
    'Other courses (including UCEAP courses for Area IV and approved UC Online courses) can replace electives only through a course substitution request — add them once approved.',
    'The upper-division common core and the DC requirement may not be fulfilled abroad.',
    'The GCH B.A. cannot be combined with the GCH B.S.',
  ],
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be completed with a letter grade of C or better."
    h.policy = { letter: true, min: 'C' }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('gch1', 'GCH 1', ['Take the following course:', 'GCH 1 — Foundations for Global and Community Health (5)'], codes('GCH 1')),
      h.group('ld-electives', 'Four lower-division GCH electives', [
        h.take('ld-a', 'A) Natural science and bio-environmental competency', ['A) one from the natural science and bio-environmental competency list;', Q_LD_LABS], codes(...LIST_A), {
          labs: 'catalog-merge',
          notes: ['BIOL 88 is cross-listed as HIS 88.'],
        }),
        h.take('ld-b', 'B) Social science and political-cultural competency', ['B) one from the social science and political-cultural competency list;', Q_LD_LABS], codes(...LIST_B), {
          notes: ['Cross-listed: BME 80G/PHIL 80G, CMPM 20/GCH 20, GCH 41/CSE 41.'],
        }),
        h.take('ld-c', 'C) Quantitative competency', ['C) one from the quantitative competency list; and,', Q_LD_LABS], codes(...LIST_C), {
          labs: { pairs: LIST_C_LABS, mode: 'merge' },
        }),
        language(h),
      ], { quote: 'One course required from each of the four lists.' }),
    ])

    // Upper division: one shared allocation, every course used once.
    const petitionCodes = [...new Set(h.passed.filter((e) => isIndependentStudy(h.catalog.get(e.code))).map((e) => e.code))]
    const petitionSet: CourseSet = codes(...petitionCodes)
    const anyArea = codes(...AREA_I, ...AREA_II, ...AREA_III, ...AREA_IV)
    const areaLabs = { pairs: AREA_IV_LABS, mode: 'merge' as const }
    const core = h.group('common-core', 'Required Common Core Courses', [
      h.take('core-1', 'Requirement 1: Community Analysis', ['Choose one course:', Q_UNIQUE], codes('ANTH 134', 'CMMU 165', 'GCH 166', 'METX 108'), {
        notes: ['CMMU 165 is cross-listed as GCH 165.'],
      }),
      h.take('core-2', 'Requirement 2: Social Analysis', ['Choose one course:', Q_UNIQUE], codes('GCH 123', 'GCH 186', 'SOCY 146')),
    ], { quote: 'All students are required to complete and pass two common core courses: the first, a course in Community Analysis for Global and Community Health; the second, a course in Social Analysis for Global and Community Health.' })
    const additional = h.take('area-additional', 'Two additional electives from any area', [Q_AREAS, Q_PETITION], anyArea.or(petitionSet), {
      n: 2,
      labs: areaLabs,
      atMost: [{ set: petitionSet, n: 1, label: 'independent or field study (by petition)' }],
      prefer: (c) => (anyArea.has(c) ? 0 : 1),
      pool: 'any course from Areas I–IV (or one upper-division independent/field study by petition)',
    })
    const areas = h.group('areas', 'Six upper-division electives from the four GCH context areas', [
      h.take('area-1', 'Area I: Biological and environmental contexts', Q_AREAS, codes(...AREA_I), {
        notes: ['Cross-listed: ENVS 130B/LGST 130B, LALS 174/GCH 174.'],
      }),
      h.take('area-2', 'Area II: Social, cultural and historical contexts', Q_AREAS, codes(...AREA_II)),
      h.take('area-3', 'Area III: Institutional and policy contexts', Q_AREAS, codes(...AREA_III)),
      h.take('area-4', 'Area IV: Methods, skills & humanities-informed analysis', Q_AREAS, codes(...AREA_IV), {
        labs: areaLabs,
        notes: ['UCEAP study abroad courses focused on public and global health can substitute for Area IV after approval by the GCH B.A. advisor.'],
      }),
      additional,
    ], { quote: Q_AREAS })

    const dc = h.options(
      'dc',
      'Disciplinary Communication (DC)',
      'The 7-credit DC requirement for the GCH B.A. is satisfied by completing one of the following course combination options:',
      [['GCH 190', 'GCH 195'], ['GCH 195', 'GCH 199A'], ['GCH 195', 'GCH 199A', 'GCH 199B']],
      { labels: ['Option 1', 'Option 2', 'Option 3'] },
    )
    h.solve()

    const petitioned = (additional.used ?? []).filter((e) => petitionSet.has(e.code))
    if (petitioned.length && additional.status === 'met' && !h.attested('independent-study-petition')) {
      additional.status = 'needs-attestation'
      additional.attest = h.attestations.find((a) => a.id === 'independent-study-petition')
      additional.detail = `${petitioned[0].display} counts only with an approved petition.`
    }

    const comprehensive: Node = h.node(
      'comprehensive',
      'Comprehensive Requirement',
      'The comprehensive requirement for the GCH B.A. is satisfied by completing the same courses as those required for the Disciplinary Communication requirements.',
      dc.status === 'met' ? 'met' : 'unmet',
      { used: dc.used, detail: dc.status === 'met' ? 'Satisfied by the DC courses.' : 'Satisfied when the DC requirement is complete.' },
    )
    return [lower, h.group('upper', 'Upper-Division Courses', [core, areas]), comprehensive, dc]
  },
})

/**
 * Language (D): a listed course, or the test-out — offered only when no listed
 * language course is in the plan (docs/HARNESSES.md §1a test-out convention).
 */
function language(h: HarnessContext): Node {
  const quote = ['D) one from the language competency list.', 'Students are expected to complete or test out of a first-year language series.']
  const slot = h.take('ld-d/course', 'A listed language course', 'D) one from the language competency list.', codes(...LIST_D))
  if (h.enrollments.some((e) => LIST_D_SET.has(e.code, h.catalog))) return h.group('ld-d', 'D) Language competency', [slot], { quote })
  if (h.attested('language-test-out')) return h.node('ld-d', 'D) Language competency', quote, 'met', { detail: 'by test-out of a first-year language series' })
  return h.either('ld-d', 'D) Language competency', quote, [slot, h.attest('language-test-out')])
}

/** Upper-division independent study / field study (by catalog title), not the GCH senior thesis. */
function isIndependentStudy(c: { division: string; title: string; code: string } | undefined): boolean {
  if (!c || c.division !== 'upper') return false
  if (c.code === 'GCH199A' || c.code === 'GCH199B') return false
  return /independent study|field study|tutorial/i.test(c.title)
}
