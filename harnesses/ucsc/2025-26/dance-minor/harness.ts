// Dance Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/dance-minor.md
//
// Eight courses: three lower-division (creative practice, cross-cultural
// technique, THEA 50) and five upper-division (creative practice/cross-
// cultural, critical studies, three electives). Electives may also come from
// the two upper-division lists "but not double counted" (exclusive slots);
// repeatable courses may repeat, THEA 139 at most twice as an elective.
import { codes, defineHarness } from '@harness'

const LD_CREATIVE = ['THEA 30', 'THEA 36']
const LD_CROSS = ['THEA 31A', 'THEA 31B', 'THEA 31C', 'THEA 31L', 'THEA 31M', 'THEA 37', 'THEA 80R', 'THEA 80U', 'THEA 80Z']
const UD_PRACTICE = ['THEA 131A', 'THEA 131B', 'THEA 131C', 'THEA 131L', 'THEA 135', 'THEA 136']
// ARTG 143 [/THEA 143], THEA 161R [/LALS 161R]: the library treats cross-listed codes as one course.
const UD_CRITICAL = ['ARTG 143', 'THEA 161R', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168']
const UD_ELECTIVE = ['THEA 100A', 'THEA 124', 'THEA 137', 'THEA 137A', 'THEA 139', 'THEA 151I', 'THEA 161D']
const EXCLUDED = ['THEA 55A', 'THEA 55B', 'THEA 158', 'THEA 190', 'THEA 198', 'THEA 199']

export default defineHarness({
  program: 'dance-minor',
  edition: '2025-26',
  title: 'Dance Minor',
  notes: [
    'Courses may be taken Pass/No Pass (campus P/NP limit applies).',
    'Theater arts majors: lower-division courses may count for both, but the minor needs its own upper-division courses — the app does not check across programs.',
    'Other courses count as electives only with the department’s advance approval — add them only once approved. Transfer equivalents of lower-division courses count by petition.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy aside from the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('ld-creative', 'Creative practice', 'One course in creative practice, chosen from:', codes(...LD_CREATIVE)),
      h.take('ld-cross', 'Cross-cultural techniques', 'Plus one course in cross-cultural techniques, chosen from:', codes(...LD_CROSS)),
      h.take('thea50', 'THEA 50 Fundamentals of Theater Production', 'The following production fundamentals course:', codes('THEA 50')),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('ud-practice', 'Creative practice or cross-cultural techniques', 'One course in creative practice or cross-cultural techniques, chosen from:', codes(...UD_PRACTICE)),
      h.take('ud-critical', 'Critical studies', 'Plus one course in critical studies, chosen from:', codes(...UD_CRITICAL)),
      h.take(
        'electives',
        'Three upper-division electives',
        [
          'Plus three upper-division elective courses, which may be chosen from the following:',
          'Any upper-division course listed in the Creative Practice/Cross-Cultural Techniques or Critical Studies sections may be used as an elective (but not double counted).',
          'THEA 139, Random With A Purpose, is repeatable for credit and may be used to fulfill up to two upper-division elective requirements for the dance minor.',
        ],
        codes(...UD_ELECTIVE, ...UD_PRACTICE, ...UD_CRITICAL).except(EXCLUDED),
        {
          n: 3,
          // "Courses that list “Repeatable For Credit: Yes” in the General Catalog may be taken more than once."
          repeatable: 'catalog',
          atMost: [{ set: codes('THEA 139'), n: 2, label: 'THEA 139 counts at most twice' }],
          notes: ['A select number of other courses may be used if approved by the department in advance.'],
        },
      ),
      h.info('excluded', 'Courses that do not count', 'The following DO NOT satisfy the dance minor requirements:', `${EXCLUDED.join(', ')} do not satisfy the minor.`),
    ])
    return [lower, upper]
  },
})
