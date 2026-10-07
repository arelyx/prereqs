// Ancient Studies Minor (slug classical-studies-minor) — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/classical-studies-minor.md
//
// GREE 1+2 or LATN 1+2; LIT 184A or LIT 186A; four more from the list (the
// list repeats LIT 184A/186A, so the other one may count there). One
// allocation: a course counts once. Up to two P/NP.
import { codes, defineHarness, isPass } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const LIST = [
  'HIS 147A', 'HIS 150A', 'HIS 159A', 'HIS 159B', 'HIS 159C', 'HIS 159D', 'HIS 160A', 'HIS 160C', 'HIS 161B', 'HIS 163B', 'HIS 194S', 'HIS 196S',
  'HAVC 135F', 'HAVC 151', 'HAVC 152', 'HAVC 154', 'HAVC 155', 'HAVC 190C',
  // 2025-26: no LIT 116C (added in 2026-27); LIT 190T is listed (dropped in 2026-27).
  'LIT 116I', 'LIT 117A', 'LIT 118A', 'LIT 121A', 'LIT 125A', 'LIT 130A', 'LIT 154B', 'LIT 159M',
  'LIT 181A', 'LIT 181B', 'LIT 181D', 'LIT 181E', 'LIT 181F', 'LIT 190T',
  'LIT 184A', 'LIT 184B', 'LIT 184C', 'LIT 184D', 'LIT 184E', 'LIT 186A', 'LIT 186B', 'LIT 186C', 'LIT 186D',
  'PHIL 100A', 'PHIL 118', 'POLI 105A',
]
const ALL = codes('GREE 1', 'GREE 2', 'LATN 1', 'LATN 2', ...LIST)

export default defineHarness({
  program: 'classical-studies-minor',
  edition: '2025-26',
  title: 'Ancient Studies Minor',
  attestations: [
    {
      id: 'language-equivalent',
      label: 'Ancient studies faculty determined my prior Greek/Latin satisfies the elementary language courses',
      quote: 'Students with prior knowledge of ancient Greek or Latin are advised to consult with the ancient studies faculty to determine if they have satisfied any of the elementary language course requirements.',
      aliases: ['prior knowledge', 'language equivalent', 'elementary language waived', 'or equivalent'],
    },
  ],
  notes: [
    'Students with prior knowledge of ancient Greek or Latin should consult the ancient studies faculty about the elementary language courses; transfer/AP credit for GREE/LATN goes in the plan as the course itself.',
    'Up to two of the minor courses may be taken Pass/No Pass.',
  ],
  evaluate(h) {
    // P/NP allowed for up to two courses (counted below).
    h.policy = undefined
    const lang = h.options('language', 'Elementary Greek or Latin (two quarters)', ['A minor in ancient studies requires the lower-division sequence in elementary Greek or Latin language (or equivalent):'], [
      ['GREE 1', 'GREE 2'],
      ['LATN 1', 'LATN 2'],
    ])
    const intro = h.take('intro', 'LIT 184A or LIT 186A', ['Choose one of the following courses:', 'Reading proficiency in ancient Greek or Latin required for these courses.'], codes('LIT 184A', 'LIT 186A'))
    const four = h.take('four', 'Four more upper-division ancient studies courses', 'Plus any four of the upper-division courses listed below', codes(...LIST), {
      n: 4,
      // Special-topics courses (HIS 194S/196S, LIT 184E/186D, ...) are
      // catalog-repeatable; a second offering is another 5 upper-division
      // credits toward "minimum of 25 upper-division credits".
      repeatable: 'catalog',
    })
    h.solve()
    // "(or equivalent)" + the NOTE on consulting the faculty: a faculty
    // determination, asked only when the sequence is not in the plan.
    const langNode = lang.status === 'met'
      ? lang
      : h.either('language-or-equivalent', 'Elementary Greek or Latin (or equivalent)', 'Students with prior knowledge of ancient Greek or Latin are advised to consult with the ancient studies faculty to determine if they have satisfied any of the elementary language course requirements.', [lang, h.attest('language-equivalent')])
    return [
      h.group('lower', 'Lower-Division Courses', [langNode]),
      h.group('upper', 'Upper-Division Courses', [intro, four]),
      pnpLimit(h, [lang, intro, four], ALL, 'Students are allowed to complete up to two of their minor courses for pass/no pass grades.'),
    ]
  },
})

/** "Up to two … pass/no pass": count P grades among the courses counted. */
function pnpLimit(h: HarnessContext, counted: Node[], pool: CourseSet, quote: string): Node {
  const used = [...new Map(counted.flatMap((n) => n.used ?? []).map((e) => [e.id, e])).values()]
  const pnp = used.filter((e) => isPass(e.grade))
  if (pnp.length <= 2)
    return h.node('pnp-limit', 'At most two courses taken Pass/No Pass', quote, 'met', { progress: { have: pnp.length, need: 2, unit: 'P/NP max' }, minor: true })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && !isPass(e.grade) && pool.has(e.code, h.catalog))
  const detail = `${pnp.map((e) => e.display).join(', ')} are P/NP — only two may be.`
  return spare.length
    ? h.cannotCheck('pnp-limit', 'At most two courses taken Pass/No Pass', quote, `${detail} A letter-graded course you also took (${spare.map((e) => e.display).join(', ')}) may be able to replace one — check with an advisor.`)
    : h.node('pnp-limit', 'At most two courses taken Pass/No Pass', quote, 'unmet', { detail, used: pnp })
}
