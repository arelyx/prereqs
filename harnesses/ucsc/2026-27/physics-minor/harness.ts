// Physics Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/physics-minor.md
//
// Handled in code below:
//  - Physics series: PHYS 5A–5C + labs (15A/15C may replace 5A/5C) or
//    PHYS 6A–6C + labs; PHYS 5D is required with either series.
//  - Electives: any 5-credit PHYS 100–180, or the listed outside courses.
//    "The elective courses cannot be offered by the department that sponsors
//    the student's major": the student may declare their major's department
//    (a choice); courses that department offers (own subject or a
//    cross-listing, e.g. AM 107/PHYS 107, PHYS 150/CSE 109) are then excluded.
//    If a course offered outside Physics is counted and no department is
//    declared, the electives node is cannot-check rather than met.
//  - P/NP allowed.
import { codes, defineHarness, parseCode, range } from '@harness'
import type { Catalog, Enrollment } from '@harness'

const OUTSIDE = [
  'AM 107', 'AM 114', 'ASTR 111', 'ASTR 112', 'ASTR 113', 'ASTR 117', 'ASTR 118', 'EART 121', 'EART 160',
  'EART 172', 'ECE 101', 'ECE 102', 'ECE 103', 'ECE 130', 'ECE 136', 'ECE 141', 'ECE 171', 'ECE 172',
  'ECE 178', 'MATH 130',
]
// Cross-listed codes: AM 107 [/PHYS 107] and EART 172 [/OCEA 172] from the page; CSE 109,
// ASTR 114 and ASTR 135 are catalog cross-listings of PHYS 150, PHYS 130 and PHYS 135.
const ALIASES = ['OCEA 172', 'CSE 109', 'ASTR 114', 'ASTR 135']

// Department → subjects it offers. A course counts as offered by a department
// when its own subject or any cross-listing's subject belongs to it.
const DEPTS: { value: string; label: string; subjects: string[]; aliases: string[] }[] = [
  { value: 'am', label: 'Applied Mathematics', subjects: ['AM'], aliases: ['am', 'applied math', 'applied mathematics'] },
  { value: 'astr', label: 'Astronomy and Astrophysics', subjects: ['ASTR'], aliases: ['astr', 'astronomy', 'astrophysics'] },
  { value: 'cse', label: 'Computer Science and Engineering', subjects: ['CSE'], aliases: ['cse', 'computer science', 'computer science and engineering'] },
  { value: 'eart', label: 'Earth and Planetary Sciences', subjects: ['EART'], aliases: ['eart', 'earth sciences', 'earth and planetary sciences'] },
  { value: 'ocea', label: 'Ocean Sciences', subjects: ['OCEA'], aliases: ['ocea', 'ocean sciences'] },
  { value: 'ece', label: 'Electrical and Computer Engineering', subjects: ['ECE'], aliases: ['ece', 'electrical engineering', 'computer engineering', 'electrical and computer engineering'] },
  { value: 'math', label: 'Mathematics', subjects: ['MATH'], aliases: ['math', 'mathematics'] },
  { value: 'other', label: 'Another department (none of the above)', subjects: [], aliases: ['other', 'none'] },
]
// Cross-listed codes a student may enter that are not separate catalog entries → the catalog course.
const ALIAS_OF: Record<string, string> = { PHYS107: 'AM107', OCEA172: 'EART172', CSE109: 'PHYS150', ASTR114: 'PHYS130', ASTR135: 'PHYS135' }

const Q_ELECT = 'These can be any 5-credit physics upper-division courses chosen from PHYS 100 to PHYS 180, or courses from the following list:'
const Q_DEPT = 'The elective courses cannot be offered by the department that sponsors the student’s major.'
const PHYS_UD = range('PHYS', 100, 180).minCredits(5)

export default defineHarness({
  program: 'physics-minor',
  edition: '2026-27',
  title: 'Physics Minor',
  choices: [
    {
      key: 'major-dept',
      label: 'Department that sponsors your major',
      quote: Q_DEPT,
      options: DEPTS.map((d) => ({ value: d.value, label: d.label, aliases: d.aliases })),
    },
  ],
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Students who complete a major sponsored by the Physics Department cannot complete the physics minor.',
    'Other courses may count as electives with the approval of the Physics Department undergraduate faculty adviser (add them once approved).',
  ],
  coverage: {
    unknownOk: {
      OCEA172: 'cross-listing of EART 172 named on the page; not a separate catalog entry',
      CSE109: 'cross-listing of PHYS 150; not a separate catalog entry',
      ASTR114: 'cross-listing of PHYS 130; not a separate catalog entry',
      ASTR135: 'cross-listing of PHYS 135; not a separate catalog entry',
    },
  },
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const dept = DEPTS.find((d) => d.value === h.choice('major-dept'))
    const blocked = new Set(dept?.subjects ?? [])

    const series = h.options(
      'physics-series',
      'PHYS 5A–5C with labs, or PHYS 6A–6C with labs',
      ['Choose one of the following options:', 'PHYS 15A can substitute for PHYS 5A, and PHYS 15C for PHYS 5C.'],
      [
        ['PHYS 5A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', 'PHYS 5C', 'PHYS 5N'],
        ['PHYS 15A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', 'PHYS 5C', 'PHYS 5N'],
        ['PHYS 5A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', 'PHYS 15C', 'PHYS 5N'],
        ['PHYS 15A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', 'PHYS 15C', 'PHYS 5N'],
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M', 'PHYS 6C', 'PHYS 6N'],
      ],
    )
    const lower = h.group('lower', 'Lower-Division Courses', [
      series,
      h.take('phys5d', 'PHYS 5D', 'Plus the following course:', codes('PHYS 5D')),
      h.take('calc-a', 'MATH 19A or 20A', 'Plus one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
    ])

    // "The elective courses cannot be offered by the department that sponsors the student’s major."
    const pool = PHYS_UD.or(codes(...OUTSIDE, ...ALIASES))
    const blockedCodes = blocked.size
      ? [...new Set(h.enrollments.map((e) => e.code))].filter((c) => pool.has(c, h.catalog) && offering(c, h.catalog).some((s) => blocked.has(s)))
      : []
    const outside = (e: Enrollment) => offering(e.code, h.catalog).some((s) => s !== 'PHYS')
    const electives = h.take('electives', 'Three electives', [Q_ELECT, Q_DEPT], pool.except(blockedCodes), {
      n: 3,
      // courses offered only by Physics first, so outside/cross-listed courses are used only when needed
      prefer: (c) => (offering(c, h.catalog).every((s) => s === 'PHYS') ? 0 : 1),
      pool: 'PHYS 100–180 (5 credits), or the listed AM/ASTR/EART/ECE/MATH courses',
    })
    const upper = h.group('upper', 'Upper-Division Courses', [h.all('ud-core', 'PHYS 102 and PHYS 133', 'All of the following courses:', ['PHYS 102', 'PHYS 133']), electives])

    h.solve()
    const used = electives.used ?? []
    if (!dept && electives.status === 'met' && used.some(outside)) {
      electives.status = 'cannot-check'
      electives.detail = `${used.filter(outside).map((e) => e.display).join(', ')} count only if not offered by your major’s department — tell the dashboard which department sponsors your major.`
      electives.choice = 'major-dept'
    }
    return [lower, upper]
  },
})

/** Subjects that offer a course: its own subject plus its cross-listings' subjects. */
function offering(code: string, catalog: Catalog): string[] {
  const primary = ALIAS_OF[code] ?? code
  const c = catalog.get(primary)
  return [...new Set([parseCode(code).subject, parseCode(primary).subject, ...(c?.crossListed ?? []).map((x) => parseCode(x).subject)])]
}
