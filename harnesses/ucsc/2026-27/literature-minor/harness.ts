// Literature Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/literature-minor.md
//
// Seven courses: LIT 1, one LIT 60/61/80/81-series course, LIT 101 and four
// 5-credit LIT 108-189 electives (not LIT 179A/179B). No language, distribution
// or senior-seminar rule (the page says so explicitly). P/NP allowed.
import { anyOf, codes, defineHarness, range, series } from '@harness'

const CW_ONLY = ['LIT 179A', 'LIT 179B']

export default defineHarness({
  program: 'literature-minor',
  edition: '2026-27',
  title: 'Literature Minor',
  notes: [
    'Courses may be taken for a letter grade or P/NP.',
    'Independent studies, internships and substitutions (up to three upper-division courses: at most two from another UC campus/EAP, at most one from another UCSC department) count only with department approval — add them once approved.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('lit1', 'LIT 1 Literary Interpretation', 'LIT 1 — Literary Interpretation (5)', codes('LIT 1')),
      h.take('lit60-80', 'One course from the LIT 60/61 or LIT 80/81 series', ['One course from the LIT 60 or LIT 61-series, or', 'One course from the LIT 80 or LIT 81-series'], anyOf(series('LIT', 60), series('LIT', 61), series('LIT', 80), series('LIT', 81))),
      h.info('declare', 'LIT 1 before declaring', 'Students must complete LIT 1 or its equivalent prior to declaring the minor.', 'A declaration rule, not a completion rule.'),
    ])

    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        h.take('lit101', 'LIT 101 Theory and Interpretation', 'LIT 101 — Theory and Interpretation (5)', codes('LIT 101')),
        h.take(
          'electives',
          'Four upper-division literature electives',
          'Students take four 5-credit upper-division electives chosen from LIT 108-189, excluding LIT 179A or LIT 179B, which are only available to students who have been accepted to the creative writing concentration.',
          range('LIT', 108, 189).minCredits(5).except(CW_ONLY),
          {
            n: 4,
            repeatable: 'catalog',
            pool: 'LIT 108–189, 5 credits, not LIT 179A/179B',
            notes: ['Independent studies and internships may count toward the electives with department approval.'],
          },
        ),
      ],
      { quote: 'Five upper-division courses are required.' },
    )
    return [lower, upper]
  },
})
