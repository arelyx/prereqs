// Theater Arts B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/theater-arts-ba.md
//
// Lower division: THEA 20/21, THEA 10 + 61A/B/C, a practice-based dance
// course, THEA 50 three times, one more 5-credit THEA 1-99 course.
// Upper division (eight courses): THEA 160, two studios, two history/theory/
// critical studies, two electives, THEA 185. The Production Requirement is an
// overlay: a lower-division production course may also be the lower-division
// elective, an upper-division one may also be an upper-division elective.
import { codes, defineHarness, parseCode, range } from '@harness'

const ACTING = ['THEA 20', 'THEA 21']
const DANCE = ['THEA 30', 'THEA 31A', 'THEA 31B', 'THEA 31C', 'THEA 31L', 'THEA 31M', 'THEA 37', 'THEA 36', 'THEA 80Z']
// Cross-listed partners ([/X] in the source) need nothing: the library treats
// cross-listed codes as one course.
const STUDIO = [
  'THEA 103', 'THEA 106', 'THEA 114', 'THEA 115A', 'THEA 115B', 'THEA 117', 'THEA 117A', 'THEA 118', 'THEA 119', 'THEA 120', 'THEA 121', 'THEA 123', 'THEA 124', 'THEA 126', 'THEA 126M',
  'THEA 131A', 'THEA 131B', 'THEA 131C', 'THEA 131L', 'THEA 135', 'THEA 136', 'THEA 141', 'THEA 142', 'THEA 145R',
  'THEA 152', 'THEA 157', 'THEA 158', 'THEA 159', 'ARTG 118', 'ARTG 134', 'ARTG 137', 'ARTG 140', 'ARTG 180',
]
const HTCS = [
  'THEA 100A', 'THEA 100B', 'THEA 100C', 'THEA 100W', 'THEA 104', 'THEA 108', 'THEA 113', 'THEA 116A', 'THEA 122',
  'THEA 161', 'THEA 161B', 'THEA 161C', 'THEA 161D', 'THEA 161H', 'THEA 161M', 'THEA 161P', 'THEA 161Q', 'THEA 161R',
  'THEA 161S', 'THEA 161T', 'THEA 161U', 'THEA 161Y', 'THEA 163A', 'THEA 163E', 'THEA 163G',
  'THEA 163H', 'THEA 163K', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168', 'ARTG 138', 'ARTG 139', 'ARTG 142', 'ARTG 143',
]
const PRODUCTION_LD = ['THEA 55A', 'THEA 56R']
const PRODUCTION_UD = ['THEA 137', 'THEA 137A', 'THEA 139', 'THEA 151', 'THEA 151A', 'THEA 151I', 'THEA 155']
const EXCLUDED = ['THEA 55B', 'THEA 190', 'THEA 198', 'THEA 199']

const ELECTIVE_POOL = codes(...STUDIO, ...HTCS, ...PRODUCTION_UD)
const NOT_OTHER = codes(...EXCLUDED, 'THEA 160', 'THEA 185')

export default defineHarness({
  program: 'theater-arts-ba',
  edition: '2026-27',
  title: 'Theater Arts B.A.',
  notes: [
    'No major letter-grade policy beyond the campus Pass/No Pass limit.',
    'EAP and other off-campus credit counts only case by case with the department chair’s approval; transfer equivalents of lower-division courses count by petition — add them once approved.',
    'Double counting upper-division courses with another major or minor needs permission from both programs’ advisors — the app does not check across programs.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy aside from the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('acting', 'THEA 20 or THEA 21', 'One of the following courses:', codes(...ACTING)),
      h.all('ld-core', 'THEA 10, 61A, 61B and 61C', 'Plus all of the following courses:', ['THEA 10', 'THEA 61A', 'THEA 61B', 'THEA 61C']),
      h.take('dance', 'One practice-based dance course', 'One of the following practice-based dance courses:', codes(...DANCE)),
      h.take('thea50', 'THEA 50 Fundamentals of Theater Production (three times)', ['Plus the following production fundamentals course (three times):', 'This 2-credit course must be taken three times for a total of six credits.'], codes('THEA 50'), {
        n: 3,
        repeatable: true,
      }),
      h.take('ld-elective', 'One lower-division elective (5-credit THEA 1–99)', 'Students take one additional 5-credit THEA course numbered 1-99.', range('THEA', 1, 99).minCredits(5).except(EXCLUDED), {
        pool: 'any 5-credit THEA course numbered 1–99 not used above',
        notes: ['THEA 55A or THEA 56R may count here and for the Production Requirement.'],
      }),
    ])

    const electives = h.take(
      'ud-electives',
      'Two upper-division electives',
      'One or both classes used to fulfill the upper-division elective requirements may be chosen from any of the courses listed in the upper-division studio section, the upper-division history/theory/critical studies section, or the Production Requirement section (excluding the lower-division THEA 55A and THEA 56R) as long as they are not being used to fulfill another requirement (unless they are repeatable for credit, in which case they may be used more than once).',
      ELECTIVE_POOL,
      { n: 2, repeatable: 'catalog' },
    )
    // Overlay: "The two lower-division production courses, THEA 55A or THEA 56R, may fulfill both both production requirement and the lower-division elective requirement. The upper-division production courses listed (numbered 100 and above) may fulfill the production requirement and one of the two upper-division electives."
    const production = h.take(
      'production',
      'Production Requirement',
      [
        'Theater arts majors must take one of the following classes to fulfill the major\'s Production Requirement.',
        'The upper-division production courses listed (numbered 100 and above) may fulfill the production requirement and one of the two upper-division electives.',
      ],
      codes(...PRODUCTION_LD, ...PRODUCTION_UD),
      { exclusive: false, notes: ['Separate from the three THEA 50 enrollments. Enrollment is by audition or interview — start early.'] },
    )
    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        h.take('thea160', 'THEA 160 Dramatic Theories', 'The following course:', codes('THEA 160')),
        h.take('studio', 'Two studio courses', 'Plus two studio courses chosen from:', codes(...STUDIO), { n: 2 }),
        h.take('htcs', 'Two history/theory/critical studies courses', 'Plus two history/theory/critical studies courses, chosen from:', codes(...HTCS), { n: 2 }),
        electives,
        production,
        h.take('thea185', 'THEA 185 Senior Seminar', 'Plus this comprehensive requirement course:', codes('THEA 185')),
        h.info('excluded', 'Courses that do not count', 'The following courses DO NOT satisfy theater arts major requirements:', `${EXCLUDED.join(', ')} do not satisfy the major.`),
      ],
      { quote: 'Eight upper-division courses must be taken as part of the major, as specified here:' },
    )

    const dc = h.all('dc', 'Disciplinary Communication: THEA 160 and THEA 185', 'The DC Requirement in Theater Arts B.A. is met by completion of the required courses:', ['THEA 160', 'THEA 185'], { exclusive: false })
    const comprehensive = h.take('comprehensive', 'Comprehensive: THEA 185 Senior Seminar', 'Plus this comprehensive requirement course:', codes('THEA 185'), { exclusive: false })

    h.solve()
    // "One or both ... may be chosen from" the listed sections: the page does not
    // say the lists are exhaustive, so an unlisted upper-division THEA course
    // makes a short elective count a question, not a failure.
    if (electives.status === 'unmet') {
      const other = h.passed.filter((e) => {
        const p = parseCode(e.code)
        return p.subject === 'THEA' && p.number >= 100 && p.number <= 199 && !h.used.has(e.id) && !NOT_OTHER.has(e.code) && !ELECTIVE_POOL.has(e.code)
      })
      if (other.length) {
        electives.status = 'cannot-check'
        electives.detail = `${electives.detail ? electives.detail + ' · ' : ''}${other.map((e) => e.display).join(', ')} is not on the listed sections — ask the theater arts advisor whether it counts as an upper-division elective.`
      }
    }
    return [lower, upper, dc, comprehensive]
  },
})
