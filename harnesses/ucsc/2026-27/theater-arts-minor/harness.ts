// Theater Arts Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/theater-arts-minor.md
//
// Eight courses: one THEA 61 drama course, one practice course, THEA 50;
// three history/theory/critical studies and two studio courses (at most one
// of the production-style studios THEA 137/137A/139/151/151A/151I/155).
// The "area of focus" is advisory (no completion rule), so it is not a choice.
import { codes, defineHarness } from '@harness'

const LD_DRAMA = ['THEA 61A', 'THEA 61B', 'THEA 61C']
const LD_PRACTICE = [
  'THEA 10', 'THEA 20', 'THEA 21', 'THEA 30', 'THEA 31A', 'THEA 31B', 'THEA 31C', 'THEA 31L', 'THEA 31M', 'THEA 33C',
  'THEA 36', 'THEA 37', 'THEA 40', 'THEA 80Z',
]
// Cross-listed partners ([/X] in the source) are accepted alongside the catalog code.
const HTCS = [
  'THEA 100A', 'THEA 100B', 'THEA 100C', 'THEA 100W', 'THEA 104', 'THEA 108', 'THEA 113', 'THEA 116A', 'THEA 122',
  'THEA 160', 'THEA 161', 'THEA 161B', 'THEA 161C', 'THEA 161D', 'THEA 161H', 'THEA 161M', 'THEA 161P', 'THEA 161Q',
  'THEA 161R', 'LALS 161R', 'THEA 161S', 'THEA 161T', 'THEA 161U', 'THEA 161Y', 'COWL 161Y', 'THEA 163A', 'THEA 163E',
  'THEA 163G', 'THEA 163H', 'THEA 163K', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168', 'ARTG 138',
  'FMST 138', 'ARTG 139', 'CRES 139', 'ARTG 142', 'CRES 142', 'ARTG 143', 'THEA 143', 'LIT 111D',
]
const STUDIO = [
  'THEA 103', 'ART 143T', 'THEA 106', 'ART 146T', 'THEA 114', 'THEA 115A', 'THEA 115B', 'THEA 117', 'ART 147T',
  'THEA 117A', 'THEA 118', 'THEA 119', 'THEA 120', 'THEA 121', 'THEA 123', 'THEA 124', 'THEA 126', 'THEA 126M',
  'THEA 131A', 'THEA 131B', 'THEA 131C', 'THEA 131L', 'THEA 135', 'THEA 136', 'THEA 137', 'THEA 137A', 'THEA 141',
  'THEA 142', 'THEA 145R', 'THEA 139', 'THEA 151', 'THEA 151A', 'THEA 151I', 'THEA 152', 'THEA 155', 'THEA 157',
  'THEA 158', 'THEA 159',
]
const ONE_ONLY = ['THEA 137', 'THEA 137A', 'THEA 139', 'THEA 151', 'THEA 151A', 'THEA 151I', 'THEA 155']
const EXCLUDED = ['THEA 55A', 'THEA 55B', 'THEA 190', 'THEA 198', 'THEA 199']
const XL_REASON = 'cross-listed partner ([/X] in the source); the catalog files the course under the other code'

export default defineHarness({
  program: 'theater-arts-minor',
  edition: '2026-27',
  title: 'Theater Arts Minor',
  coverage: {
    unknownOk: Object.fromEntries(['LALS161R', 'COWL161Y', 'FMST138', 'CRES139', 'CRES142', 'THEA143', 'ART143T', 'ART146T', 'ART147T'].map((c) => [c, XL_REASON])),
  },
  notes: [
    'Courses may be taken Pass/No Pass (campus P/NP limit applies).',
    'Transfer equivalents of lower-division courses count only by petition — add them once approved.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy aside from the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('ld-drama', 'One of THEA 61A, 61B, 61C', 'Complete one of the following:', codes(...LD_DRAMA)),
      h.take('ld-practice', 'One practice course', ['Plus one of the following:', 'Students should choose a course within their area of focus.'], codes(...LD_PRACTICE)),
      h.take('thea50', 'THEA 50 Fundamentals of Theater Production', 'Plus the following production fundamentals course:', codes('THEA 50')),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('htcs', 'Three history/theory/critical studies courses', 'Choose three of the following:', codes(...HTCS), { n: 3 }),
      h.take(
        'studio',
        'Two studio courses',
        ['Choose two of the following courses.', 'Only one of THEA 137, THEA 137A, THEA 139, THEA 151, THEA 151A, THEA 151I, or THEA 155 may count toward this requirement.'],
        codes(...STUDIO),
        { n: 2, atMost: [{ set: codes(...ONE_ONLY), n: 1, label: 'only one of THEA 137, 137A, 139, 151, 151A, 151I, 155' }] },
      ),
      h.info('excluded', 'Courses that do not count', 'The following DO NOT satisfy theater arts minor requirements:', `${EXCLUDED.join(', ')} do not satisfy the minor.`),
    ])
    return [lower, upper]
  },
})
