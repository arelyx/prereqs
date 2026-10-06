// Theater Arts Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/theater-arts-minor.md
//
// Eight courses: one THEA 61 drama course, one practice course, THEA 50;
// three history/theory/critical studies and two studio courses, one of which
// may be a production course from the optional list.
// 2025-26 differs from 2026-27: no ARTG 138/139/142/143 or LIT 111D on the
// history/theory/critical studies list; THEA 158 is not a studio; THEA 155 is
// on both the studio list and the production list, so it does not count
// against the one-production-course limit.
// The "area of focus" is advisory (no completion rule), so it is not a choice.
import { codes, defineHarness } from '@harness'

const LD_DRAMA = ['THEA 61A', 'THEA 61B', 'THEA 61C']
const LD_PRACTICE = [
  'THEA 10', 'THEA 20', 'THEA 21', 'THEA 30', 'THEA 31A', 'THEA 31B', 'THEA 31C', 'THEA 31L', 'THEA 31M', 'THEA 33C',
  'THEA 36', 'THEA 37', 'THEA 40', 'THEA 80Z',
]
// Cross-listed partners ([/X] in the source) need nothing: the library treats
// cross-listed codes as one course.
const HTCS = [
  'THEA 100A', 'THEA 100B', 'THEA 100C', 'THEA 100W', 'THEA 104', 'THEA 108', 'THEA 113', 'THEA 116A', 'THEA 122',
  'THEA 160', 'THEA 161', 'THEA 161B', 'THEA 161C', 'THEA 161D', 'THEA 161H', 'THEA 161M', 'THEA 161P', 'THEA 161Q',
  'THEA 161R', 'THEA 161S', 'THEA 161T', 'THEA 161U', 'THEA 161Y', 'THEA 163A', 'THEA 163E',
  'THEA 163G', 'THEA 163H', 'THEA 163K', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168',
]
const STUDIO = [
  'THEA 103', 'THEA 106', 'THEA 114', 'THEA 115A', 'THEA 115B', 'THEA 117', 'THEA 117A', 'THEA 118', 'THEA 119', 'THEA 120', 'THEA 121', 'THEA 123', 'THEA 124', 'THEA 126', 'THEA 126M',
  'THEA 131A', 'THEA 131B', 'THEA 131C', 'THEA 131L', 'THEA 135', 'THEA 136', 'THEA 141', 'THEA 142', 'THEA 145R',
  'THEA 152', 'THEA 155', 'THEA 157', 'THEA 159',
]
// "Optional: one 5-credit upper-division theater arts production course, which
//  may be used toward an upper-division studio requirement:"
const PRODUCTION = ['THEA 137', 'THEA 137A', 'THEA 139', 'THEA 151', 'THEA 151A', 'THEA 151I', 'THEA 155']
// THEA 155 is also on the studio list itself, so only the others are capped.
const ONE_ONLY = PRODUCTION.filter((c) => !STUDIO.includes(c))
const EXCLUDED = ['THEA 55A', 'THEA 55B', 'THEA 190', 'THEA 198', 'THEA 199']

export default defineHarness({
  program: 'theater-arts-minor',
  edition: '2025-26',
  title: 'Theater Arts Minor',
  notes: [
    'Courses may be taken Pass/No Pass (campus P/NP limit applies).',
    'Transfer equivalents of lower-division courses count only by petition — add them once approved.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy aside from the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('ld-drama', 'One of THEA 61A, 61B, 61C', 'Choose one from the following series:', codes(...LD_DRAMA)),
      h.take('ld-practice', 'One practice course', 'Plus one course in the student’s area of focus chosen from:', codes(...LD_PRACTICE)),
      h.take('thea50', 'THEA 50 Fundamentals of Theater Production', 'Plus the following production fundamentals course:', codes('THEA 50')),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('htcs', 'Three history/theory/critical studies courses', 'Three history/theory/critical studies courses chosen from the following:', codes(...HTCS), { n: 3 }),
      h.take(
        'studio',
        'Two studio courses',
        [
          'Plus two studio courses (one of which may be a 5-credit upper-division theater arts production; see separate section below):',
          'Optional: one 5-credit upper-division theater arts production course, which may be used toward an upper-division studio requirement:',
        ],
        codes(...STUDIO, ...PRODUCTION),
        { n: 2, atMost: [{ set: codes(...ONE_ONLY), n: 1, label: 'only one production course (THEA 137, 137A, 139, 151, 151A, 151I)' }] },
      ),
      h.info('excluded', 'Courses that do not count', 'The following DO NOT satisfy theater arts minor requirements:', `${EXCLUDED.join(', ')} do not satisfy the minor.`),
    ])
    return [lower, upper]
  },
})
