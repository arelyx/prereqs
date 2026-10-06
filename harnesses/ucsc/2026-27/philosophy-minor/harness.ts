// Philosophy Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/philosophy-minor.md
//
// The minor's value-theory and metaphysics/epistemology lists are on the
// Philosophy B.A. page ("see Philosophy B.A. course requirements for a list of
// courses that satisfy these requirements"); they are copied from the
// committed 2026-27 philosophy-ba source, the same catalog edition.
import { codes, defineHarness, range } from '@harness'
import type { CourseSet, HarnessContext } from '@harness'

const HISTORY = ['PHIL 100A', 'PHIL 100B', 'PHIL 100C', 'PHIL 100D']
// sources/philosophy-ba.md, "Value Theory Courses"
const VALUE = ['PHIL 100D', 'PHIL 118', 'PHIL 142', 'PHIL 143', 'PHIL 144', 'PHIL 147', 'PHIL 148', 'PHIL 152', 'PHIL 153']
// sources/philosophy-ba.md, "Metaphysics and Epistemology Courses"
const METAPHYSICS = [
  'PHIL 106', 'PHIL 113', 'PHIL 114', 'PHIL 121', 'PHIL 122', 'PHIL 124', 'PHIL 125', 'PHIL 126', 'PHIL 127', 'PHIL 133', 'PHIL 135',
]
// "excluding PHIL 195A, 195B, and 199" (+ 2-credit tutorial and graduate individual studies, by the 5-credit rule / catalog)
const EXCLUDED = ['PHIL 195A', 'PHIL 195B', 'PHIL 199', 'PHIL 199F', 'PHIL 294', 'PHIL 295', 'PHIL 297', 'PHIL 299']

const GRADE_QUOTE = 'Students must complete all requirements for the minor with a grade of P, C (2.0), or better.'

/** Widen a set with the catalog's cross-listed partner codes ("PHIL 100D [/LGST 140P]"). */
function withPartners(h: HarnessContext, set: CourseSet): CourseSet {
  const extra: string[] = []
  const scan = set.members ? set.members.map((c) => h.catalog.get(c)).filter((c) => !!c) : h.catalog.all()
  for (const c of scan) if (set.has(c.code, h.catalog)) extra.push(...c.crossListed)
  if (!extra.length) return set
  const out = set.or(codes(...extra))
  out.describe = `${set.describe} (or a cross-listed equivalent)`
  return out
}

export default defineHarness({
  program: 'philosophy-minor',
  edition: '2026-27',
  title: 'Philosophy Minor',
  notes: [
    'Every course for the minor needs a P or C (2.0) or better.',
    'One upper-division course substitution may be considered by petition (lower-division courses may not replace upper-division requirements) — add an approved substitute once it is approved.',
    'There is no senior comprehensive requirement for the minor.',
  ],
  evaluate(h) {
    h.policy = { min: 'C', pCounts: true }

    const history = withPartners(h, codes(...HISTORY))
    const value = withPartners(h, codes(...VALUE))
    const meta = withPartners(h, codes(...METAPHYSICS))
    const d = withPartners(h, codes('PHIL 100D'))
    const hasD = h.taken(d).length > 0
    // "numbered PHIL 100A or above"
    const ud = withPartners(h, range('PHIL', 100, 299).except(EXCLUDED).minCredits(5))

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('phil9', 'PHIL 9 Introductory Symbolic Logic', 'The following course:', codes('PHIL 9')),
      h.take(
        'lower-elective',
        'One lower-division elective',
        'One other 5-credit course numbered PHIL 1-98, with the exception of PHIL 7 and PHIL 8.',
        range('PHIL', 1, 98).except(['PHIL 7', 'PHIL 8', 'PHIL 9']).minCredits(5),
        { pool: 'PHIL 1–98 (5 credits), except PHIL 7, 8 (and 9)' },
      ),
    ])

    const hist = h.take('history', 'History of Philosophy (one)', ['History of Philosophy', 'One of following courses:'], history, {
      prefer: (c) => (d.has(c) ? 0 : 1),
    })
    const four = h.take(
      'ud-electives',
      'Four upper-division electives',
      [
        'Take four 5-credit courses numbered PHIL 100A or above, excluding PHIL 195A, 195B, and 199.',
        'The course satisfying the history of philosophy requirement cannot be counted toward the four upper-division electives. PHIL 100D may simultaneously satisfy both the history of philosophy and value theory requirement, however, four additional electives must still be completed.',
      ],
      ud,
      {
        n: 4,
        atLeast: [
          { set: meta, n: 2, label: 'Metaphysics and Epistemology' },
          ...(hasD ? [] : [{ set: value, n: 1, label: 'Value Theory' }]),
        ],
        pool: 'PHIL 100A and above (5 credits), excluding PHIL 195A/195B and 199',
      },
    )
    h.solve()
    const viaHistory = (hist.used ?? []).some((e) => d.has(e.code))
    const viaFour = (four.used ?? []).filter((e) => value.has(e.code))
    const valueNode = h.node(
      'value-theory',
      'At least one value theory course',
      'At least one must be in value theory and two in metaphysics and/or epistemology (see Philosophy B.A. course requirements for a list of courses that satisfy these requirements).',
      viaHistory || viaFour.length ? 'met' : 'unmet',
      {
        detail: viaHistory ? 'PHIL 100D (history) also covers value theory.' : viaFour.length ? undefined : 'Take one course from the Value Theory list.',
        used: viaHistory ? (hist.used ?? []).filter((e) => d.has(e.code)) : viaFour.slice(0, 1),
        options: value.members,
      },
    )
    const grades = h.info('grades', 'Grades: P or C (2.0) or better', GRADE_QUOTE, 'Courses below C (or NP) do not count toward any requirement.')
    return [grades, lower, h.group('upper', 'Upper-Division Courses', [hist, four, valueNode])]
  },
})
