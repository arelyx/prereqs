// Critical Race and Ethnic Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/critical-race-and-ethnic-studies-ba.md
//
// 10 courses: CRES 10, CRES 100 + 101, six electives and one senior
// comprehensive seminar, all with P, C or better.
//
// 2025-26 differs in structure from 2026-27: the General Electives,
// Transnational and Social Movements lists are printed on this page (closed
// lists, so no declared choices are needed), there is no separate
// lower-division elective — "six electives ... No more than one may be
// lower-division" — and at least TWO electives must be CRES courses. The
// 2026-27 statements that senior comprehensive courses do not count toward
// the Transnational / Social Movements requirements are absent here; a course
// still counts once (10 courses in all), so the seminar used for the
// comprehensive is not also an elective.
import { codes, defineHarness, parseCode, series } from '@harness'
import type { Enrollment } from '@harness'

// Page order; bracketed cross-listed codes need nothing (one course).
const GENERAL = [
  'CRES 12', 'CRES 14', 'CRES 15', 'CRES 118', 'CRES 121', 'CRES 150', 'CRES 151', 'CRES 161', 'CRES 185', 'CRES 188B',
  'CRES 188S', 'CRES 188T', 'CRES 188X', 'ANTH 110I', 'ANTH 110Q', 'ANTH 130O', 'ANTH 140', 'ANTH 158', 'ANTH 187',
  'ANTH 196J', 'ARTG 139', 'ARTG 142', 'ARTG 143', 'CMMU 163', 'ECON 128', 'EDUC 125', 'EDUC 128', 'EDUC 135',
  'EDUC 140', 'EDUC 141', 'EDUC 160', 'EDUC 164', 'EDUC 173', 'EDUC 174', 'EDUC 177', 'EDUC 181', 'FILM 165B',
  'FILM 165D', 'FILM 165E', 'FMST 117', 'FMST 124', 'FMST 125', 'FMST 136', 'FMST 145', 'HAVC 140A', 'HAVC 140C',
  'HAVC 141F', 'HAVC 190J', 'HIS 9', 'HIS 104C', 'HIS 104D', 'HIS 106B', 'HIS 109A', 'HIS 110H', 'HIS 120', 'HIS 122A',
  'HIS 122B', 'HIS 123', 'HIS 128', 'HIS 151A', 'HISC 83', 'JRLC 135', 'JRLC 136', 'LALS 112', 'LALS 128', 'LALS 131',
  'LALS 143', 'LALS 144', 'LGST 111B', 'LING 135', 'LIT 80H', 'LIT 121L', 'LIT 121M', 'LIT 121N', 'LIT 134A',
  'LIT 135F', 'LIT 135G', 'LIT 145A', 'LIT 148I', 'LIT 149E', 'LIT 154C', 'LIT 160E', 'LIT 160K', 'LIT 161A',
  'LIT 161B', 'LIT 162A', 'LIT 163A', 'LIT 165B', 'LIT 169A', 'LIT 179E', 'LIT 189F', 'LIT 189V', 'MUSC 81M',
  'PSYC 148', 'PSYC 153', 'PSYC 159H', 'PSYC 159I', 'PSYC 159P', 'SOCY 120', 'SOCY 127P', 'SOCY 128C', 'SOCY 128I',
  'SOCY 139T', 'SOCY 148', 'SOCY 152', 'SOCY 156', 'SOCY 159', 'SOCY 161', 'SOCY 170P', 'SOCY 173X', 'THEA 151A',
]
const TRANSNATIONAL = [
  'CRES 45', 'CRES 60E', 'CRES 68', 'CRES 70U', 'CRES 112', 'CRES 113', 'CRES 115', 'CRES 120', 'CRES 123', 'CRES 127',
  'CRES 134', 'CRES 153', 'CRES 170', 'CRES 171', 'CRES 172', 'CRES 173', 'CRES 174', 'CRES 179A', 'CRES 188A',
  'CRES 188M', 'CRES 190Y', 'ANTH 110O', 'ANTH 129', 'ANTH 130A', 'ANTH 130C', 'ANTH 130F', 'ANTH 130L', 'ANTH 130T',
  'ANTH 159', 'CMMU 145', 'ENVS 130B', 'ENVS 178', 'FIL 82', 'FMST 112', 'FMST 115', 'FMST 194U', 'HAVC 124B',
  'HAVC 170', 'HAVC 179', 'HIS 106A', 'HIS 131', 'HIS 140D', 'HIS 150E', 'HIS 154', 'HIS 156', 'HIS 158C', 'HIS 166',
  'HIS 170C', 'HIS 181B', 'HIS 184B', 'HIS 190A', 'HIS 194T', 'HIS 194U', 'HISC 117', 'LALS 100', 'LALS 150',
  'LALS 152', 'LALS 151', 'LALS 170', 'LALS 171', 'LALS 172', 'LALS 175', 'LALS 178', 'LALS 180', 'LALS 194H',
  'LIT 131C', 'LIT 133G', 'LIT 133H', 'LIT 135A', 'LIT 138A', 'LIT 155E', 'LIT 160I', 'LIT 160J', 'LIT 162B',
  'LIT 164G', 'LIT 165A', 'LIT 165C', 'LIT 179E', 'LIT 189P', 'LIT 189S', 'LIT 190O', 'POLI 187', 'SOCY 117E',
  'SOCY 128', 'SOCY 128M', 'SOCY 143', 'THEA 167',
]
const SOCIAL_MOVEMENTS = [
  'CRES 45', 'CRES 68', 'CRES 70B', 'CRES 70U', 'CRES 112', 'CRES 113', 'CRES 115', 'CRES 120', 'CRES 123', 'CRES 127',
  'CRES 131', 'CRES 132', 'CRES 134', 'CRES 153', 'CRES 160', 'CRES 170', 'CRES 172', 'CRES 173', 'CRES 174',
  'CRES 179C', 'CRES 190Y', 'ANTH 110G', 'ANTH 130F', 'CMMU 186', 'ENVS 130B', 'ENVS 178', 'FIL 82', 'FMST 20',
  'FMST 147', 'FMST 194R', 'HAVC 141K', 'HIS 121B', 'HIS 154', 'HIS 156', 'HIS 184B', 'JRLC 111', 'LALS 170',
  'LALS 178', 'LIT 179E', 'SOCY 172',
]
const ALL_ELECTIVES = [...new Set([...GENERAL, ...TRANSNATIONAL, ...SOCIAL_MOVEMENTS])]
// Listed courses printed with a CRES cross-listing ("ANTH 130F [/CRES 130]").
const PAGE_CRES_CROSS = [
  'ANTH 110G', 'ANTH 110Q', 'ANTH 130F', 'ANTH 140', 'ARTG 139', 'ARTG 142', 'FIL 82', 'FMST 125', 'FMST 136',
  'FMST 194R', 'FMST 194U', 'HISC 117', 'HISC 83', 'LING 135', 'LIT 179E',
]

const ELECTIVE_SET = codes(...ALL_ELECTIVES)
const T_SET = codes(...TRANSNATIONAL)
const SM_SET = codes(...SOCIAL_MOVEMENTS)
// "Courses which are cross-listed with a CRES course may also count toward this requirement."
// The page's brackets, plus the catalog's cross-listings (FMST 145 is
// printed without one here but the catalog cross-lists it with CRES 145).
const CRES_SET = codes(...ALL_ELECTIVES.filter((c) => c.startsWith('CRES ')), ...PAGE_CRES_CROSS).or(
  ELECTIVE_SET.where((c) => c.subject === 'CRES' || c.crossListed.some((x) => x.startsWith('CRES')), 'cross-listed with CRES'),
)
// "No more than one may be lower-division." Listed lower-division courses (number < 100).
const LD_SET = codes(...ALL_ELECTIVES.filter((c) => parseCode(c).number < 100))

// Comprehensive: any CRES 190-series course, plus the listed seminars.
const COMP_LISTED = [
  'ANTH 196G', 'CRES 190A', 'CRES 190B', 'CRES 190C', 'CRES 190D', 'CRES 190F', 'CRES 190L', 'CRES 190N', 'CRES 190P',
  'CRES 190S', 'CRES 190T', 'CRES 190X', 'CRES 190Y', 'FMST 194K', 'FMST 194M', 'FMST 194O', 'FMST 194Q', 'FMST 194R',
  'FMST 194U', 'FMST 194V',
]
const COMPREHENSIVE = series('CRES', 190).or(codes(...COMP_LISTED))

const Q = {
  six: 'Students must complete six electives from the General Electives, Transnational, and Social Movements lists below. Each course must be at least 5 credits. No more than one may be lower-division.',
  t: 'At least two must be from the Transnational list. These are designated courses focusing on phenomena outside of the U.S. or on transnational or hemispheric subjects.',
  sm: 'At least one must be from the Social Movements list.',
  both: 'One class may be used to satisfy both Transnational and Social Movement requirements, however, a total of six electives must still be completed.',
  cres: 'At least two must be CRES courses. These courses may overlap with the Transnational and Social Movements requirement above. Courses which are cross-listed with a CRES course may also count toward this requirement.',
}

export default defineHarness({
  program: 'critical-race-and-ethnic-studies-ba',
  edition: '2025-26',
  title: 'Critical Race and Ethnic Studies B.A.',
  notes: [
    'Every requirement needs a grade of P, C (2.0), or better.',
    'Up to two courses not on the electives lists (or up to 10 credits of language study, internships, independent studies) may count by petition — add an approved course as completed and confirm with CRES advising; the app counts only listed courses.',
  ],

  evaluate(h) {
    // "Students must complete all requirements for the major with a grade of P, C (2.0), or better."
    h.policy = { min: 'C', pCounts: true }

    const lower = h.group('lower', 'Lower-Division Core', [
      h.take('cres10', 'CRES 10 Critical Race and Ethnic Studies: An Introduction', 'One lower-division foundation course:', codes('CRES 10')),
    ])
    const core = h.all('core', 'CRES 100 and CRES 101', 'Two upper-division core courses are required for the major:', ['CRES 100', 'CRES 101'])

    // List courses are all 5 credits on the page ("Each course must be at least 5 credits").
    const electives = h.take('electives', 'Six electives', [Q.six, Q.t, Q.sm, Q.both, Q.cres], ELECTIVE_SET, {
      n: 6,
      atLeast: [
        { set: T_SET, n: 2, label: 'Transnational list' },
        { set: SM_SET, n: 1, label: 'Social Movements list' },
        { set: CRES_SET, n: 2, label: 'CRES (or CRES cross-listed) courses' },
      ],
      atMost: [{ set: LD_SET, n: 1, label: 'lower-division' }],
      pool: 'General Electives, Transnational and Social Movements lists',
    })

    const dcTerms = h.taken(codes('CRES 101')).map((e) => e.term)
    const comp = h.take('comprehensive', 'Senior seminar (CRES 190 series or listed)', [
      'The comprehensive requirement is fulfilled by completing a senior seminar from the CRES 190 series, or one of the other senior seminars listed below.',
      'any CRES 190 series course that is listed in a subsequent General Catalog will also satisfy the comprehensive requirement.',
      'Students must complete their DC requirement prior to the Senior Seminar.',
    ], COMPREHENSIVE, {
      pool: `any CRES 190-series course, or ${COMP_LISTED.filter((c) => !c.startsWith('CRES')).join(', ')}`,
      check: (chosen) => {
        const sem = chosen[0]
        if (!dcTerms.length || sem.term == null || dcTerms.some((t) => t == null || t < sem.term!)) return null
        return `${sem.display} is not after CRES 101 (DC must be completed before the senior seminar)`
      },
    })

    h.solve()

    // Breakdown of the counted electives (the take above enforces these).
    const used: Enrollment[] = electives.used ?? []
    const sub = (id: string, title: string, quote: string | string[], set: typeof T_SET, need: number) => {
      const got = used.filter((e) => set.has(e.code, h.catalog))
      return h.node(id, title, quote, got.length >= need ? 'met' : 'unmet', {
        used: got,
        progress: { have: Math.min(got.length, need), need },
        detail: got.length >= need ? undefined : `${got.length} of ${need} among the electives counted`,
      })
    }
    const ldUsed = used.filter((e) => LD_SET.has(e.code, h.catalog))
    const breadth = h.group('breadth', 'Among the six electives', [
      sub('transnational', 'At least two Transnational courses', [Q.t, Q.both], T_SET, 2),
      sub('social-movements', 'At least one Social Movements course', [Q.sm, Q.both], SM_SET, 1),
      sub('two-cres', 'At least two CRES courses', Q.cres, CRES_SET, 2),
      h.node('one-lower', 'No more than one lower-division elective', 'No more than one may be lower-division.', ldUsed.length <= 1 ? 'met' : 'unmet', { used: ldUsed }),
    ])

    const upper = h.group('upper', 'Upper-Division Core and Electives', [core, electives, breadth])
    const dc = h.take('dc', 'Disciplinary Communication (DC): CRES 101', 'The DC requirement in CRES is satisfied by completing CRES 101, Research Methods and Writing in Critical Race and Ethnic Studies.', codes('CRES 101'), { exclusive: false })
    const comprehensive = h.group('comprehensive-req', 'Comprehensive Requirement', [comp], {
      notes: ['Prerequisites for the CRES 190 series include CRES 10, CRES 100 and CRES 101.'],
    })
    const qualification = h.info(
      'qualification',
      'Major qualification',
      'To declare the CRES major, students are required to have completed any 5-credit CRES-designated course with a passing grade (C or P) or better.',
      'Gates declaration, not completion.',
    )
    return [lower, upper, dc, comprehensive, qualification]
  },
})
