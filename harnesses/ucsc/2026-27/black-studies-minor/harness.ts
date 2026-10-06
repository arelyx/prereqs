// Black Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/black-studies-minor.md
//
// Six courses: CRES 68 plus five upper-division General Electives, at least
// two of them CRES courses (a listed course cross-listed with CRES counts as
// CRES). Letter grade or P/NP.
import { codes, defineHarness } from '@harness'

// General Electives in page order. Bracketed cross-listed codes ("ANTH 130F
// [/CRES 130]") need nothing: the library treats them as one course.
const ELECTIVES = [
  'CRES 113', 'CRES 115', 'CRES 118', 'CRES 124', 'CRES 129', 'CRES 131', 'CRES 132', 'CRES 134', 'CRES 144', 'CRES 153',
  'CRES 161', 'CRES 183', 'CRES 188B', 'CRES 190C', 'CRES 190D', 'CRES 190F', 'CRES 190W',
  'ANTH 110G', 'ANTH 110Q', 'ANTH 130A', 'ANTH 130F', 'ANTH 130L',
  'ANTH 159', 'ANTH 194L', 'ANTH 196J', 'ARTG 142', 'EDUC 160', 'EDUC 164', 'EDUC 181', 'ENVS 130B',
  'ENVS 178', 'FILM 165B', 'FMST 102', 'FMST 115', 'FMST 117', 'FMST 124', 'FMST 145', 'FMST 147', 'HAVC 140C',
  'HIS 109A', 'HIS 110H', 'HIS 120', 'HIS 121A', 'HIS 121B', 'HIS 122A', 'HIS 122B', 'HIS 158C', 'JRLC 111',
  'LALS 150', 'LALS 151', 'LALS 171', 'LIT 121N', 'LIT 135A', 'LIT 148I', 'LIT 154C', 'LIT 161A', 'LIT 161B', 'LIT 179E',
  'LIT 190O', 'MUSC 101F', 'PSYC 148', 'PSYC 159P', 'SOCY 117E', 'SOCY 128I', 'SOCY 143',
  'SOCY 161', 'SOCY 170P', 'SOCY 180', 'THEA 100A', 'THEA 100B', 'THEA 100W', 'THEA 151', 'THEA 161B', 'THEA 167',
]
const ELECTIVE_SET = codes(...ELECTIVES)

/** CRES-designated, or a listed course cross-listed with a CRES course (catalog cross-listing, either code). */
const CRES_SET = ELECTIVE_SET.where((c) => c.subject === 'CRES' || c.crossListed.some((x) => x.startsWith('CRES')), 'CRES or cross-listed with CRES')

export default defineHarness({
  program: 'black-studies-minor',
  edition: '2026-27',
  title: 'Black Studies Minor',
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Up to two courses not on the approved list may count by Petition for Course Credit — add them once approved (the app counts only listed courses).',
  ],

  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const lower = h.take('cres68', 'CRES 68 Approaches to Black Studies', 'CRES 68 — Approaches to Black Studies (5)', codes('CRES 68'))
    const upper = h.take(
      'electives',
      'Five upper-division General Electives (at least two CRES)',
      [
        'Five upper-division courses from the General Electives list below. At least two of these electives must be CRES courses (i.e., under the CRES designation). Courses in the General Electives list that are cross-listed with a CRES course may also count toward the two required CRES courses.',
      ],
      ELECTIVE_SET,
      { n: 5, atLeast: [{ set: CRES_SET, n: 2, label: 'CRES (or CRES cross-listed) courses' }] },
    )
    return [h.group('lower', 'Lower-Division Courses', [lower]), h.group('upper', 'Upper-Division Courses', [upper])]
  },
})
