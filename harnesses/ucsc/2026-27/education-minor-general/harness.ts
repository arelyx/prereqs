// Education Minor (General) — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/education-minor-general.md
//
// Six courses: EDUC 60, EDUC 110 or 180, four 5-credit EDUC 102-187
// electives. One allocation, so a second of EDUC 110/180 can be an elective
// (both are in 102-187). Order does not matter ("Electives may be taken
// before EDUC 110/180").
import { codes, defineHarness, range } from '@harness'

export default defineHarness({
  program: 'education-minor-general',
  edition: '2026-27',
  title: 'Education Minor (General)',
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'EDUC 180 needs a background check, TB test and mandated-reporter training before the first day of instruction.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const lower = h.take('educ60', 'EDUC 60 Schooling, Democracy, and Justice', 'Take the following course:', codes('EDUC 60'))
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('foundation', 'EDUC 110 or EDUC 180', 'Take one of the following courses:', codes('EDUC 110', 'EDUC 180')),
      h.take('electives', 'Four EDUC electives (102–187)', ['Students take four 5-credit electives chosen EDUC 102-187.', 'Electives may be taken before EDUC 110/180.'], range('EDUC', 102, 187).minCredits(5), {
        n: 4,
        repeatable: 'catalog',
        pool: 'EDUC 102–187 (5 credits)',
      }),
    ])
    return [h.group('lower', 'Lower-Division Courses', [lower]), upper]
  },
})
