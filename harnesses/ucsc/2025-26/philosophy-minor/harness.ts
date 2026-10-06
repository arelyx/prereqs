// Philosophy Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/philosophy-minor.md
//
// The minor's value-theory and metaphysics/epistemology lists are on the
// Philosophy B.A. page ("see Philosophy B.A. course requirements for a list of
// courses that satisfy these requirements"); they are copied from the
// committed 2025-26 philosophy-ba source, the same catalog edition
// (manifest --depends philosophy-ba).
import { codes, defineHarness, range } from '@harness'

// 2025-26: the history list is PHIL 100A-100C only.
const HISTORY = ['PHIL 100A', 'PHIL 100B', 'PHIL 100C']
// sources/philosophy-ba.md, "Courses satisfying the value theory requirement:".
// History of Ethics is "PHIL 140 [/LGST 140P]"; the current catalog files it as
// PHIL 100D ("Formerly PHIL 140."), so both codes count — as value theory only.
const VALUE = ['PHIL 118', 'PHIL 140', 'PHIL 100D', 'PHIL 142', 'PHIL 143', 'PHIL 144', 'PHIL 147', 'PHIL 148', 'PHIL 152', 'PHIL 153']
// sources/philosophy-ba.md, "Courses satisfying the metaphysics and epistemology requirement:"
const METAPHYSICS = [
  'PHIL 106', 'PHIL 113', 'PHIL 114', 'PHIL 121', 'PHIL 122', 'PHIL 124', 'PHIL 125', 'PHIL 126', 'PHIL 127', 'PHIL 133', 'PHIL 135',
]
// "PHIL 195A, PHIL 195B, and PHIL 199 also cannot be counted among these courses." (+ 2-credit tutorial and graduate individual studies, by the 5-credit rule / catalog)
const EXCLUDED = ['PHIL 195A', 'PHIL 195B', 'PHIL 199', 'PHIL 199F', 'PHIL 294', 'PHIL 295', 'PHIL 297', 'PHIL 299']

const VALUE_QUOTE =
  'Four additional 5-credit upper-division courses numbered 100A or above. This includes one in value theory and two in metaphysics and/or epistemology (see Philosophy B.A. course requirements for a list of courses that satisfy this requirement).'
const GRADE_QUOTE = 'This program does not have a letter grade policy.'

export default defineHarness({
  program: 'philosophy-minor',
  edition: '2025-26',
  title: 'Philosophy Minor',
  notes: [
    'The 2025-26 minor page sets no minimum grade (the major page requires P or C or better for the major).',
    'One upper-division course substitution may be considered by petition (lower-division courses may not replace upper-division requirements) — add an approved substitute once it is approved.',
    'There is no senior exit requirement for the minor.',
  ],
  evaluate(h) {
    // 2025-26: "This program does not have a letter grade policy." (no P/C-or-better sentence, unlike 2026-27)
    h.policy = undefined

    // Cross-listed partner codes (LGST 140P for PHIL 140/100D, LGST 144 for
    // PHIL 144) match through the library; membership tests pass the catalog.
    const cat = h.catalog
    const history = codes(...HISTORY)
    const value = codes(...VALUE)
    const meta = codes(...METAPHYSICS)
    // Catalog PHIL 114: "Students cannot receive credit for this course and
    // course 214." — with both on the record only one counts.
    const dropped = h.has('PHIL 114') && h.has('PHIL 214') ? ['PHIL 214'] : []
    // Catalog PHIL 7: "Students may not receive credit for this course and PHIL 9."
    // PHIL 9 is required, so PHIL 7 never counts next to it.
    if (h.has('PHIL 9') && h.has('PHIL 7')) dropped.push('PHIL 7')
    // "numbered PHIL 100A or above"
    const ud = range('PHIL', 100, 299).except([...EXCLUDED, ...dropped]).minCredits(5)

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('phil9', 'PHIL 9 Introductory Symbolic Logic', 'The following course:', codes('PHIL 9')),
      h.take(
        'lower-elective',
        'One lower-division elective',
        'At least one other 5-credit course numbered PHIL 1-98, with the exception of PHIL 8.',
        range('PHIL', 1, 98).except(['PHIL 8', 'PHIL 9', ...dropped]).minCredits(5),
        { pool: 'PHIL 1–98 (5 credits), except PHIL 8 (and 9)' },
      ),
    ])

    const hist = h.take('history', 'History of Philosophy (one)', ['History of Philosophy', 'One of following courses:'], history)
    const four = h.take(
      'ud-electives',
      'Four upper-division electives',
      [
        VALUE_QUOTE,
        'Note that the course counted toward fulfilling the history of philosophy requirement cannot be counted among these additional courses. PHIL 195A, PHIL 195B, and PHIL 199 also cannot be counted among these courses.',
      ],
      ud,
      {
        n: 4,
        atLeast: [
          { set: meta, n: 2, label: 'Metaphysics and Epistemology' },
          { set: value, n: 1, label: 'Value Theory' },
        ],
        pool: 'PHIL 100A and above (5 credits), excluding PHIL 195A/195B and 199',
      },
    )
    h.solve()
    const viaFour = (four.used ?? []).filter((e) => value.has(e.code, cat))
    const valueNode = h.node(
      'value-theory',
      'At least one value theory course',
      VALUE_QUOTE,
      viaFour.length ? 'met' : 'unmet',
      {
        detail: viaFour.length ? undefined : 'Take one course from the Value Theory list.',
        used: viaFour.slice(0, 1),
        options: value.members,
      },
    )
    const grades = h.info('grades', 'No letter-grade policy', GRADE_QUOTE, 'P/NP courses count; the page sets no minimum grade.')
    return [grades, lower, h.group('upper', 'Upper-Division Courses', [hist, four, valueNode])]
  },
})
