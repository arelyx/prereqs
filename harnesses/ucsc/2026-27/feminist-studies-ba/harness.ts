// Feminist Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/feminist-studies-ba.md
//
// 11 courses: FMST 1, one lower-division FMST course, FMST 100, seven 5-credit
// upper-division electives (FMST 100–199 or the affiliated-department lists),
// and the comprehensive (an FMST 194 senior seminar or FMST 195 by petition).
// One allocation, so every course counts once. Cross-program rules checked
// over the courses actually applied: at least five FMST-designated courses
// (not FMST 193/198/199; cross-listed with FMST counts), and letter grades in
// at least 10 of the 11 (FMST 100 and the comprehensive always letter).
import { canon, codes, defineHarness, display, isPass, range, series } from '@harness'
import type { Catalog, Enrollment, Node } from '@harness'

const LD = [
  'FMST 10', 'FMST 12', 'FMST 14', 'FMST 15', 'FMST 16', 'FMST 18', 'FMST 19', 'FMST 20', 'FMST 21',
  'FMST 30', 'FMST 31', 'FMST 40', 'FMST 41', 'FMST 43', 'FMST 71',
]

// Approved electives from affiliated departments (page order). Bracketed
// cross-listed codes need nothing: the library treats them as one course.
const APPROVED = [
  // Humanities
  'APLX 112', 'CRES 100', 'CRES 101', 'HIS 106B', 'HIS 109A', 'HIS 110A', 'HIS 112', 'HIS 113C', 'HIS 119',
  'HIS 121B', 'HIS 128', 'HIS 131', 'HIS 140C', 'HIS 140D', 'HIS 140E', 'HIS 150F', 'HIS 151A', 'HIS 159B', 'HIS 196H',
  'HISC 113', 'HISC 125', 'LIT 112P', 'LIT 121M', 'LIT 121O', 'LIT 146G', 'LIT 156A', 'LIT 161B', 'LIT 162C', 'LIT 166A',
  'LIT 166E', 'LIT 167E', 'PHIL 147',
  // Social Sciences
  'ANTH 110G', 'ANTH 110Q', 'ANTH 110T', 'ANTH 130E', 'ANTH 130F',
  'ANTH 130L', 'ANTH 130O', 'ANTH 131', 'ANTH 134', 'ANTH 140', 'ANTH 148', 'ANTH 158', 'ANTH 160',
  'ANTH 194M', 'ANTH 194X', 'CMMU 151', 'CMMU 161', 'EDUC 135', 'ECON 183', 'LALS 144', 'LALS 172', 'LALS 175',
  'LGST 111B', 'POLI 103', 'POLI 105B', 'PSYC 107', 'PSYC 140G', 'PSYC 140H', 'PSYC 140L',
  'PSYC 140Q', 'PSYC 140T', 'PSYC 149', 'PSYC 153', 'SOCY 158', 'PSYC 159A', 'PSYC 159D', 'SOCY 111', 'SOCY 120',
  'SOCY 121', 'SOCY 126', 'SOCY 132', 'SOCY 145', 'SOCY 149', 'SOCY 150', 'SOCY 152', 'SOCY 157', 'SOCY 156', 'SOCY 172',
  'SOCY 176', 'SOCY 187',
  // Arts
  'FILM 130', 'FILM 165A', 'FILM 165B', 'FILM 165C', 'FILM 165D', 'FILM 165E', 'FILM 165G', 'FILM 194E', 'HAVC 115',
  'HAVC 140C', 'HAVC 141F', 'HAVC 170', 'HAVC 172', 'HAVC 186', 'HAVC 186Q', 'THEA 161M', 'THEA 161T',
  // The Colleges
  'JRLC 135', 'OAKS 150',
]

// Comprehensive: the FMST 194 senior seminars, FMST 195, and the CRES 190
// seminars cross-listed as FMST 194 (either code is the same course).
const COMPREHENSIVE = series('FMST', 194).or(codes('FMST 194K', 'FMST 194M', 'FMST 194O', 'FMST 194Q', 'FMST 195', 'CRES 190A', 'CRES 190L', 'CRES 190R', 'CRES 190U', 'CRES 190V'))
// Codes listed explicitly in the comprehensive table (for lint coverage): FMST 194A–194Y.
const COMP_LISTED = ['FMST 194A', 'FMST 194B', 'FMST 194C', 'FMST 194D', 'FMST 194F', 'FMST 194G', 'FMST 194H', 'FMST 194I',
  'FMST 194T', 'FMST 194W', 'FMST 194X', 'FMST 194Y']

const NOT_IN_FIVE = new Set(['FMST193', 'FMST193F', 'FMST198', 'FMST198F', 'FMST199', 'FMST199F'])

/** "courses designated FMST, not including FMST 193, FMST 198, or FMST 199" — cross-listed with FMST counts. */
function isFmst(code: string, cat: Catalog): boolean {
  if (NOT_IN_FIVE.has(code)) return false
  if (code.startsWith('FMST')) return true
  // Either code of a cross-listing (VAST 01 = FMST 71, CRES 190K = FMST 194K).
  return cat.equivalents(code).some((x) => x.startsWith('FMST') && !NOT_IN_FIVE.has(x))
}

const Q_ELECTIVES =
  'Students complete seven additional 5-credit upper-division electives. Courses may be chosen from FMST 100-199, or the lists of approved electives from affiliated departments below.'
const Q_FIVE =
  'To satisfy the major requirements, students must complete a minimum of five courses at UC Santa Cruz taught directly in the feminist studies program (courses designated FMST, not including FMST 193, FMST 198, or FMST 199).'
const Q_XL_FIVE = 'Courses cross-listed with a FMST course will count toward this five-course minimum.'
const Q_LETTER = 'Letter grades are required for 10 of the 11 courses applied toward the feminist studies major.'
const Q_LETTER_TWO = 'FMST 100 and the comprehensive requirement course (FMST 194 or FMST 195) must be taken for a letter grade.'

export default defineHarness({
  program: 'feminist-studies-ba',
  edition: '2026-27',
  title: 'Feminist Studies B.A.',
  attestations: [
    {
      id: 'thesis-petition',
      label: 'Senior thesis/project (FMST 195) petition approved',
      quote: 'The senior thesis or project option is by petition only',
      aliases: ['fmst 195', 'thesis', 'project petition'],
    },
  ],
  notes: [
    'At most three courses may be transferred (including EAP) — the app assumes your courses are UC Santa Cruz courses, and the five FMST courses must be taken at UCSC.',
    'The Feminist Studies Tentative Curriculum is the definitive list of courses that satisfy major requirements in a given year.',
    'FMST 1, one lower-division FMST course and FMST 100 should be completed before the senior year.',
  ],

  evaluate(h) {
    // P/NP is allowed in one of the 11 courses (checked below), never in FMST 100 or the comprehensive.
    h.policy = undefined
    const LETTER = { letter: true }
    const cat = h.catalog
    const fmstFirst = (code: string) => (isFmst(code, cat) ? 0 : 1)

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('fmst1', 'FMST 1 Feminist Studies: An Introduction', 'FMST 1 — Feminist Studies: An Introduction (5)', codes('FMST 1')),
      h.take('ld-fmst', 'One lower-division feminist studies course', 'And one of the following courses:', codes(...LD)),
    ])

    const fmst100 = h.take('fmst100', 'FMST 100 Feminist Theories', 'FMST 100 — Feminist Theories (5)', codes('FMST 100'), {
      policy: LETTER,
      notes: ['Must be taken at UC Santa Cruz absent a petition.'],
    })

    const electives = h.take('electives', 'Seven upper-division electives', Q_ELECTIVES, range('FMST', 100, 199).minCredits(5).or(codes(...APPROVED)), {
      n: 7,
      prefer: fmstFirst,
      pool: 'any 5-credit FMST 100–199, or the approved Humanities, Social Sciences, Arts and Colleges electives listed on the page',
    })

    const comp = h.take('comprehensive-course', 'Senior seminar (FMST 194) or senior thesis/project (FMST 195)', 'Comprehensive requirement options include a senior seminar taught by core faculty or a senior thesis/project.', COMPREHENSIVE, {
      policy: LETTER,
      prefer: (c) => (c === 'FMST195' ? 1 : 0),
      pool: `FMST 194 series (${COMP_LISTED.map(display).join(', ')}, FMST 194K/M/O/Q, CRES 190A/L/R/U/V), or FMST 195`,
    })

    h.solve()

    // --- rules over the courses actually applied --------------------------
    const applied: Enrollment[] = [lower, fmst100, electives, comp].flatMap(usedOf)
    const fmstCount = applied.filter((e) => isFmst(e.code, cat)).length
    const five = h.node('fmst-five', 'At least five FMST-designated courses', [Q_FIVE, Q_XL_FIVE], fmstCount >= 5 ? 'met' : 'unmet', {
      progress: { have: Math.min(fmstCount, 5), need: 5 },
      detail: fmstCount >= 5 ? undefined : `${fmstCount} of the courses applied to the major are FMST (or cross-listed with FMST); FMST 193/198/199 do not count.`,
    })
    const pnp = applied.filter((e) => isPass(e.grade))
    const letters = h.node('letter-grades', 'Letter grades in at least 10 of the 11 courses', [Q_LETTER, Q_LETTER_TWO], pnp.length <= 1 ? 'met' : 'unmet', {
      detail: pnp.length <= 1 ? undefined : `${pnp.length} applied courses were taken P/NP (${pnp.map((e) => e.display).join(', ')}); at most one may be.`,
      used: pnp,
    })

    const thesis = comp.used?.some((e) => e.code === canon('FMST 195'))
    const comprehensive = h.group(
      'comprehensive',
      'Comprehensive Requirement',
      [comp, thesis ? h.attest('thesis-petition') : null],
    )
    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement in feminist studies is satisfied by completing the comprehensive requirement (FMST 194 or FMST 195).', COMPREHENSIVE, {
      exclusive: false,
      policy: LETTER,
    })

    const ud: Node = h.group('upper', 'Upper-Division Courses', [fmst100, electives])
    return [lower, ud, dc, comprehensive, h.group('program-rules', 'Program rules', [five, letters])]
  },
})

function usedOf(n: Node): Enrollment[] {
  return [...(n.used ?? []), ...(n.children ?? []).flatMap((c) => usedOf(c as Node))]
}
