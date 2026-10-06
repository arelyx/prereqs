// Jewish Studies Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/jewish-studies-minor.md
//
// Eight courses: one lower-division core, three upper-division core, four
// electives (from the elective list or any core course not already used;
// two of the four must be 5-credit upper-division). One allocation, so a
// course counts once. Up to two P/NP.
import { codes, defineHarness, isPass } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const LD_CORE = ['HIS 74', 'HIS 74A', 'HIS 74B', 'HIS 75', 'HIS 76', 'LIT 61J']
const UD_CORE = [
  'HIS 155', 'HIS 163B', 'HIS 172A', 'HIS 172B', 'HIS 178E', 'HIS 185C', 'HIS 185I', 'HIS 185J', 'HIS 185K', 'HIS 185L', 'HIS 185M', 'HIS 185O',
  'HAVC 135E', 'LGST 114', 'LGST 115', 'LIT 118A', 'LIT 164A', 'LIT 164B', 'LIT 164C', 'LIT 164D', 'LIT 164G', 'LIT 164H', 'LIT 164J',
  'LIT 181A', 'LIT 181B', 'PHIL 148',
]
const ELECTIVES = [
  'HEBR 1', 'HEBR 2', 'HEBR 3', 'HEBR 4',
  'HIS 2A', 'HIS 2B', 'HIS 5C', 'HIS 70A', 'HIS 70B', 'HIS 78', 'HIS 167A', 'HIS 167B', 'HIS 169', 'HIS 172C', 'HIS 174', 'HIS 176',
  'HIS 178A', 'HIS 178B', 'HIS 178C', 'HIS 184B', 'HIS 190G', 'HIS 196E', 'HIS 196S', 'JWST 199',
  'LIT 112I', 'LIT 160U', 'MUSC 80I', 'MUSC 80T', 'MUSC 80Y', 'MUSC 81P', 'YIDD 1', 'YIDD 2', 'YIDD 3',
]
const ELECTIVE_POOL = codes(...ELECTIVES, ...LD_CORE, ...UD_CORE)
const UD5 = ELECTIVE_POOL.where((c) => c.division === 'upper' && !(c.credits < 5), '5-credit upper-division')

export default defineHarness({
  program: 'jewish-studies-minor',
  edition: '2025-26',
  title: 'Jewish Studies Minor',
  notes: [
    'Plan the minor with a Jewish studies faculty adviser.',
    'Up to two of the minor courses may be taken Pass/No Pass.',
  ],
  evaluate(h) {
    // P/NP for up to two courses (counted below).
    h.policy = undefined
    const ld = h.take('ld-core', 'One lower-division core course', 'One of the following Jewish studies core courses:', codes(...LD_CORE))
    const ud = h.take('ud-core', 'Three upper-division core courses', 'Three 5-credit upper-division Jewish studies core courses:', codes(...UD_CORE), { n: 3 })
    const el = h.take('electives', 'Four electives', 'Four courses chosen from the list below or any courses not already taken in the above lower- or upper-division core requirements. Two of the electives must be 5-credit upper-division courses.', ELECTIVE_POOL, {
      n: 4,
      atLeast: [{ set: UD5, n: 2, label: '5-credit upper-division' }],
      repeatable: 'catalog',
    })
    h.solve()
    return [
      h.group('lower', 'Lower-Division Courses', [ld]),
      h.group('upper', 'Upper-Division Courses', [ud, h.group('electives-group', 'Electives', [el])]),
      pnpLimit(h, [ld, ud, el], ELECTIVE_POOL, 'Students are allowed to complete up to two of their minor courses for pass/no pass grades.'),
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
