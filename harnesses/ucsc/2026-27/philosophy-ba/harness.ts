// Philosophy B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/philosophy-ba.md
//
// Eleven courses: PHIL 9 + one lower-division elective, two history courses,
// six upper-division electives (one in value theory, two in metaphysics and/or
// epistemology; PHIL 190 is the "advanced seminar" among them), and an 11th
// course from any level. Every requirement needs P or C or better.
import { codes, defineHarness, range } from '@harness'
import type { HarnessContext } from '@harness'

const HISTORY = ['PHIL 100A', 'PHIL 100B', 'PHIL 100C', 'PHIL 100D']
const VALUE = ['PHIL 100D', 'PHIL 118', 'PHIL 142', 'PHIL 143', 'PHIL 144', 'PHIL 147', 'PHIL 148', 'PHIL 152', 'PHIL 153']
const METAPHYSICS = [
  'PHIL 106', 'PHIL 113', 'PHIL 114', 'PHIL 121', 'PHIL 122', 'PHIL 124', 'PHIL 125', 'PHIL 126', 'PHIL 127', 'PHIL 133', 'PHIL 135',
]
// "excluding PHIL 195A, PHIL 195B, and PHIL 199" + "The senior essay, like
// individual studies more generally, does not count toward the 11 courses
// required for the major." (catalog: 199F tutorial; 294/295/297/299 graduate
// individual study, reading and thesis research)
const EXCLUDED = ['PHIL 195A', 'PHIL 195B', 'PHIL 199', 'PHIL 199F', 'PHIL 294', 'PHIL 295', 'PHIL 295F', 'PHIL 297', 'PHIL 297F', 'PHIL 299', 'PHIL 299F']

const GRADE_QUOTE = 'Students must complete all requirements for the major with a grade of P, C (2.0), or better.'

/**
 * Catalog "cannot receive credit for both" pairs: "Students may not receive
 * credit for this course and PHIL 9." (PHIL 7) and "Students cannot receive
 * credit for this course and course 214." (PHIL 114). With both on the record
 * only one counts: PHIL 9 is required, so PHIL 7 never counts next to it; of
 * 114/214 the graduate course is dropped.
 */
function noCredit(h: HarnessContext): string[] {
  const out: string[] = []
  for (const [keep, drop] of [['PHIL 9', 'PHIL 7'], ['PHIL 114', 'PHIL 214']])
    if (h.has(keep) && h.has(drop)) out.push(drop)
  return out
}

export default defineHarness({
  program: 'philosophy-ba',
  edition: '2026-27',
  title: 'Philosophy B.A.',
  notes: [
    'Every course for the major needs a P or C (2.0) or better.',
    'Up to two upper-division courses (and lower-division courses from elsewhere) may be substituted by petition to the undergraduate program director — add an approved substitute once it is approved.',
    'PHIL 195A/195B (senior essay) and individual studies do not count toward the 11 courses.',
  ],
  evaluate(h) {
    // "Students must complete all requirements for the major with a grade of P, C (2.0), or better."
    h.policy = { min: 'C', pCounts: true }

    // Cross-listed partner codes (LGST 140P for PHIL 100D, LGST 144 for
    // PHIL 144) match through the library; membership tests pass the catalog.
    const cat = h.catalog
    const history = codes(...HISTORY)
    const value = codes(...VALUE)
    const meta = codes(...METAPHYSICS)
    const dropped = noCredit(h)
    const ud = range('PHIL', 100, 299).except([...EXCLUDED, ...dropped]).minCredits(5)
    const d = codes('PHIL 100D')
    const hasD = h.taken(d).length > 0

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('phil9', 'PHIL 9 Introductory Symbolic Logic', 'The following course:', codes('PHIL 9')),
      h.take(
        'lower-elective',
        'One lower-division elective',
        'One 5-credit course numbered PHIL 1-98, with the exception of PHIL 7 and PHIL 8.',
        // PHIL 9 is its own requirement; excluding it here keeps the allocator from weighing it twice.
        range('PHIL', 1, 98).except(['PHIL 7', 'PHIL 8', 'PHIL 9']).minCredits(5),
        { pool: 'PHIL 1–98 (5 credits), except PHIL 7 and PHIL 8' },
      ),
    ])

    // PHIL 100D first: it also covers value theory when it is a history course.
    const hist = h.take('history', 'History of philosophy (two)', ['History of philosophy', 'Two of the following courses:'], history, {
      n: 2,
      prefer: (c) => (d.has(c, cat) ? 0 : 1),
    })
    const six = h.take(
      'ud-electives',
      'Six upper-division electives',
      [
        'Take six 5-credit courses numbered PHIL 100A or above, excluding PHIL 195A, PHIL 195B, and PHIL 199.',
        'The two courses satisfying the history of philosophy requirement cannot be counted toward the six upper-division electives. PHIL 100D may simultaneously satisfy both the history of philosophy and value theory requirement, however, six additional electives must still be completed.',
      ],
      ud,
      {
        n: 6,
        atLeast: [
          { set: meta, n: 2, label: 'Metaphysics and Epistemology' },
          // With PHIL 100D in the plan the history slot takes it and it covers value theory.
          ...(hasD ? [] : [{ set: value, n: 1, label: 'Value Theory' }]),
        ],
        pool: 'PHIL 100A and above (5 credits), excluding PHIL 195A/195B, 199 and individual studies',
      },
    )
    const valueQuote = 'At least one must be in value theory and two in metaphysics and/or epistemology. See the lists below for approved courses.'
    const seminar = h.take('seminar', 'Senior Seminar PHIL 190', ['Senior Seminar', 'Take the following:'], codes('PHIL 190'), { exclusive: false })
    const eleventh = h.take(
      'eleventh',
      'An 11th course (any level)',
      'An 11th 5-credit course from any level (lower, upper, or graduate).',
      range('PHIL', 1, 299).except([...EXCLUDED, ...dropped]).minCredits(5),
      { pool: 'any 5-credit PHIL course (lower, upper or graduate), except the senior essay and individual studies' },
    )

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      "The DC requirement in philosophy is met by completing any two from the sequence:",
      history,
      { n: 2, exclusive: false },
    )
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive: PHIL 190',
      'In the fourth year, students satisfy the comprehensive (exit) requirement by taking one course numbered 190.',
      codes('PHIL 190'),
      { exclusive: false },
    )

    h.solve()
    const viaHistory = (hist.used ?? []).some((e) => d.has(e.code, cat))
    const viaSix = (six.used ?? []).filter((e) => value.has(e.code, cat))
    const valueNode = h.node(
      'value-theory',
      'At least one value theory course',
      valueQuote,
      viaHistory || viaSix.length ? 'met' : 'unmet',
      {
        detail: viaHistory ? 'PHIL 100D (history) also covers value theory.' : viaSix.length ? undefined : 'Take one course from the Value Theory list.',
        used: viaHistory ? (hist.used ?? []).filter((e) => d.has(e.code, cat)) : viaSix.slice(0, 1),
        options: value.members,
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [hist, six, valueNode, seminar, eleventh])
    const grades = h.info('grades', 'Grades: P or C (2.0) or better', GRADE_QUOTE, 'Courses below C (or NP) do not count toward any requirement.')
    return [grades, lower, upper, dc, comprehensive]
  },
})
