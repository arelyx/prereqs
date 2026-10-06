// Spanish Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/spanish-studies-minor.md
//
// Lower division: the regular SPAN 1-6 track or the SPHS 4-6 heritage track
// (or equivalent proficiency), plus LING 50. Upper division: four core courses
// and one elective, one allocation (a course counts once). P/NP allowed.
import { codes, defineHarness } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const REGULAR: string[][] = [['SPAN 1'], ['SPAN 2'], ['SPAN 3'], ['SPAN 4'], ['SPAN 5', 'SPAN 5M'], ['SPAN 6']]
const HERITAGE: string[][] = [['SPHS 4'], ['SPHS 5'], ['SPHS 6']]

// "Spanish Elective (5 credits)" list. The row "SPAN 130 / SPAN 6 / SPHS 6
// [/LGST 130A] — Spanish for the Legal Profession" is a garbled cross-listing:
// only SPAN 130 (= LGST 130A; the library treats cross-listed codes as one
// course) is the upper-division elective it names.
const ELECTIVES = [
  'LIT 188A', 'LIT 188B', 'LIT 188E', 'LIT 188F', 'LIT 188G', 'LIT 188H', 'LIT 188I', 'LIT 188L', 'LIT 188M', 'LIT 188R', 'LIT 188Z',
  'LIT 189D', 'LIT 189E', 'LIT 189F', 'LIT 189G', 'LIT 189H', 'LIT 189I', 'LIT 189K', 'LIT 189L', 'LIT 189M', 'LIT 189N', 'LIT 189O',
  'LIT 189P', 'LIT 189Q', 'LIT 189R', 'LIT 189S', 'LIT 189T', 'LIT 189U', 'LIT 189V', 'LIT 189X', 'LIT 189Z', 'SPAN 156A', 'SPAN 156E',
  'SPAN 156F', 'SPAN 156J', 'SPAN 156K', 'SPAN 156L', 'SPAN 156M', 'SPAN 157', 'SPAN 158', 'SPAN 130', 'SPAN 140',
  'SPAN 141', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154', 'SPAN 155',
]

export default defineHarness({
  program: 'spanish-studies-minor',
  edition: '2026-27',
  title: 'Spanish Studies Minor',
  attestations: [
    {
      id: 'equivalent-proficiency',
      label: 'Equivalent proficiency (placed beyond the lower-division sequence)',
      quote: 'NOTE: Or equivalent proficiency. SPAN 5M may substitute for SPAN 5.',
      aliases: ['equivalent proficiency', 'placement', 'proficiency'],
    },
  ],
  notes: ['Courses may be taken for a letter grade or P/NP.'],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      spanishTrack(h),
      h.take('ling50', 'LING 50 Introduction to Linguistics', 'LING 50 — Introduction to Linguistics (5)', codes('LING 50')),
    ])

    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        h.take('core-literature', 'Literature: LIT 189A or LIT 189B', ['Literature (5 credits)', 'Choose one of the following courses:'], codes('LIT 189A', 'LIT 189B')),
        h.take('core-spanish-studies', 'Spanish Studies: LIT 189C (SPAN 105)', 'LIT 189C [/SPAN 105] — Introducción a Spanish Studies (5)', codes('LIT 189C')),
        h.take('core-linguistics', 'Linguistics: SPAN 150', 'SPAN 150 — Topics in Hispanic Linguistics: Introduction to Hispanic Linguistics (5)', codes('SPAN 150')),
        h.take('core-language', 'Spanish Language: SPAN 114 or SPHS 115', ['Spanish Language (5 credits)', 'Choose one of the following courses:'], codes('SPAN 114', 'SPHS 115')),
        h.take('elective', 'Spanish elective', ['Spanish Elective (5 credits)', 'Choose one of the following courses:'], codes(...ELECTIVES)),
      ],
      { quote: 'Four required Spanish studies core courses (20 credits total), in addition to one upper-division Spanish studies elective course (5 credits total):' },
    )
    return [lower, upper]
  },
})

/**
 * "Either six courses in the regular track" / "Or three courses in the
 * Spanish for Heritage Speakers (SPHS) track" — "Or equivalent proficiency".
 * A track counts when its top course is passed (lower levels skipped by
 * placement are implied: each course requires the previous level or
 * placement). Equivalent proficiency without the courses is a confirmation —
 * offered only when no lower-division Spanish appears in the plan (a student
 * who started a track and stopped short has not shown it).
 */
function spanishTrack(h: HarnessContext): Node {
  const regular = trackNode(h, 'track/regular', 'Regular track: SPAN 1–6', 'Either six courses in the regular track', REGULAR)
  const heritage = trackNode(h, 'track/heritage', 'Heritage track: SPHS 4–6', 'Or three courses in the Spanish for Heritage Speakers (SPHS) track', HERITAGE)
  const started = [...REGULAR, ...HERITAGE].flat().some((c) => h.taken(codes(c)).length)
  const branches = [regular, heritage]
  if (!started) branches.push(h.attest('equivalent-proficiency'))
  return h.either('track', 'Spanish language sequence (or equivalent proficiency)', ['Either six courses in the regular track', 'Or three courses in the Spanish for Heritage Speakers (SPHS) track'], branches)
}

function trackNode(h: HarnessContext, id: string, title: string, quote: string, levels: string[][]): Node {
  const got = levels.map((alts) => h.taken(codes(...alts))[0] as Enrollment | undefined)
  const top = got.reduce((t, e, i) => (e ? i : t), -1)
  const ok = top === levels.length - 1
  const skipped = levels.filter((_, i) => i < top && !got[i]).map((alts) => alts[0])
  return h.node(id, title, quote, ok ? 'met' : 'unmet', {
    used: got.filter((e): e is Enrollment => !!e),
    progress: { have: top + 1, need: levels.length },
    options: levels.flat().map((c) => c.replace(' ', '')),
    detail: ok
      ? skipped.length
        ? `${skipped.join(', ')} presumed placed out of (the next level needs it or placement).`
        : undefined
      : top >= 0
        ? `Still needs ${levels.slice(top + 1).map((a) => a.join(' or ')).join(', ')} (or an equivalent the department accepts).`
        : undefined,
  })
}
