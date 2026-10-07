// Science, Technology, Engineering, and Mathematics (STEM) Education Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/science-technology-engineering-and-mathematics-stem-education-minor.md
//
// Eight courses (32 credits): one of EDUC 50A/B/C, EDUC 60, one of EDUC
// 100A/B/C, EDUC 185B or 185C, EDUC 185L, one cultural and linguistic
// diversity course, two 5-credit EDUC 102-187 electives. One allocation:
// EDUC 185B/C and the diversity course are inside 102-187 but count once.
// The department's spreadsheet of approved upper-division courses is a list
// of current offerings; the rule itself is "numbered EDUC 102-EDUC 187".
import { codes, defineHarness, range } from '@harness'

// "two additional 5-credit courses numbered EDUC 102-EDUC 187" OAKS 151A/151B [/EDUC 151A/B] are 2- and 3-credit
// courses filed under OAKS; excluded so the 5-credit rule also holds under their EDUC codes.
// (CRES 121 [/EDUC 121] counts through its cross-listing.)
const EDUC_ELECTIVES = range('EDUC', 102, 187).minCredits(5).except(['OAKS 151A', 'OAKS 151B'])

const CLD = ['EDUC 125', 'EDUC 128', 'EDUC 135', 'EDUC 140', 'EDUC 141', 'EDUC 164', 'EDUC 177', 'EDUC 181', 'EDUC 110']

export default defineHarness({
  program: 'science-technology-engineering-and-mathematics-stem-education-minor',
  edition: '2026-27',
  title: 'STEM Education Minor',
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Includes about 75 hours of classroom field placements (part of the CalTeach courses). Entry into EDUC 100 and EDUC 185L depends on completing the previous CalTeach internships.',
    'For the two electives, check the Education Department’s list of approved upper-division courses offered this year.',
  ],
  evaluate(h) {
    // "Students may take courses for a letter grade or Pass/No Pass."
    h.policy = undefined
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('educ50', 'CalTeach 1 (EDUC 50A, 50B or 50C)', 'Choose one of the following courses', codes('EDUC 50A', 'EDUC 50B', 'EDUC 50C')),
      h.take('educ60', 'EDUC 60 Schooling, Democracy, and Justice', 'Plus the following course', codes('EDUC 60')),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('educ100', 'CalTeach 2 (EDUC 100A, 100B or 100C)', 'Choose one of the following courses:', codes('EDUC 100A', 'EDUC 100B', 'EDUC 100C')),
      h.take('educ185', 'EDUC 185B or EDUC 185C', 'Plus one of the following courses:', codes('EDUC 185B', 'EDUC 185C')),
      h.take('educ185l', 'EDUC 185L CalTeach 3', 'Plus the following course:', codes('EDUC 185L')),
      h.take('cld', 'One cultural and linguistic diversity course', 'Plus one cultural and linguistic diversity course:', codes(...CLD)),
      h.take('electives', 'Two EDUC electives (102–187)', 'Students take two additional 5-credit courses numbered EDUC 102-EDUC 187.', EDUC_ELECTIVES, {
        n: 2,
        repeatable: 'catalog',
        pool: 'EDUC 102–187 (5 credits)',
      }),
    ])
    return [lower, upper]
  },
})
