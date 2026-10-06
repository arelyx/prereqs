// Middle Eastern and North African Studies (MENAS) Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/middle-eastern-and-north-african-studies-menas-minor.md
//
// Language (three quarters of Arabic or of Hebrew, or ARBC 4 / HEBR 4; the
// 2025-26 page has no placement-exam path) plus six courses: one lower-division survey
// and five upper-division, from at least two departments. Up to two of the
// requirements may be P/NP.
import { codes, defineHarness, display, isPass, parseCode } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const ARBC = ['ARBC 1', 'ARBC 2', 'ARBC 3', 'ARBC 4']
const HEBR = ['HEBR 1', 'HEBR 2', 'HEBR 3', 'HEBR 4']
// 2025-26 lists: no HIS 5B (lower) and no ANTH 126, ANTH 130Y, HIS 163B,
// HIS 163C (upper) — all added in 2026-27.
const LOWER = ['HIS 41', 'HIS 50', 'HIS 51', 'HIS 58', 'HIS 74A', 'HIS 74B', 'LIT 81D']
const UPPER = [
  'ANTH 130T', 'CRES 134', 'CRES 170', 'CRES 171', 'CRES 172', 'CRES 173', 'CRES 174', 'FILM 168',
  'HAVC 153', 'HAVC 154', 'HAVC 155', 'HAVC 190C', 'HAVC 190N',
  'HIS 154', 'HIS 156A', 'HIS 156B', 'HIS 156C', 'HIS 157', 'HIS 159A', 'HIS 159B', 'HIS 159C', 'HIS 159D', 'HIS 170C',
  'HIS 185C', 'HIS 185M', 'HIS 185O', 'HIS 194L', 'HIS 194S', 'HIS 194V', 'HIS 194W',
  'LIT 117A', 'LIT 125H', 'LIT 130B', 'LIT 130D', 'LIT 141A', 'LIT 141D', 'LIT 141E', 'LIT 141G', 'LIT 159M', 'LIT 168A', 'LIT 168B',
  'POLI 140E', 'POLI 184', 'POLI 187',
]
const SIX = codes(...LOWER, ...UPPER)


/** Departments a course can stand for: its subject plus cross-listed subjects. */
function depts(h: HarnessContext, e: Enrollment): string[] {
  return [...new Set([e.code, ...h.catalog.equivalents(e.code)].map((c) => parseCode(c).subject))]
}

export default defineHarness({
  program: 'middle-eastern-and-north-african-studies-menas-minor',
  edition: '2025-26',
  title: 'Middle Eastern and North African Studies (MENAS) Minor',
  notes: [
    'Up to two MENAS requirements may be taken Pass/No Pass; the rest need a letter grade.',
    'Transfer courses (up to three), EAP courses, related courses not on the list, and independent/field studies (up to two) may count by petition — add them once approved.',
  ],
  evaluate(h) {
    // P/NP for up to two requirements (counted below).
    h.policy = undefined

    // The language courses are not among the "six additional courses"; they
    // never appear in another list, so the alternatives are overlays.
    const sameLanguage = (chosen: Enrollment[]) => (new Set(chosen.map((e) => parseCode(e.code).subject)).size > 1 ? 'all three must be in one language' : null)
    const three = h.take('language/three', 'Three quarters of one language', ['Take three from the following OR complete the highest-level course, ARBC 4.', 'Take three from the following OR complete the highest-level course, HEBR 4.'], codes(...ARBC, ...HEBR), { n: 3, exclusive: false, check: sameLanguage })
    const level4 = h.take('language/level4', 'ARBC 4 or HEBR 4', 'complete the highest level of your chosen language (ARBC 4, HEBR 4)', codes('ARBC 4', 'HEBR 4'), { exclusive: false })

    const lower = h.take('lower', 'One lower-division survey', 'Plus at least one lower-division survey course from the following list:', codes(...LOWER))
    const upper = h.take('upper', 'Five upper-division courses', 'Plus at least five upper-division courses from the following list.', codes(...UPPER), { n: 5 })
    h.solve()
    // 2025-26: no placement-exam alternative (2026-27 adds one).
    const language = h.either('language', 'Language: Arabic or Hebrew', 'At least three quarters of language instruction from a single language or complete the highest level of your chosen language (ARBC 4, HEBR 4).', [three, level4])

    const twoDepts = departments(h, lower, upper)

    return [
      h.group('language-group', 'At least three quarters of language instruction', [language]),
      h.group('lower-group', 'Lower-Division Courses', [lower]),
      h.group('upper-group', 'Upper-Division Courses', [upper, twoDepts]),
      pnpLimit(h, [lower, upper], language, SIX, 'Students can take up to two MENAS minor requirements pass/no pass. The remainder of the classes must be taken for a letter grade.'),
    ]
  },
})

/**
 * "Between the upper- and lower-division elective options, courses must be
 * taken from at least two different departments." Subject codes stand for
 * departments; a cross-listed course stands for either. When the six counted
 * courses are all one department, an unused listed course from another
 * department can always replace one (the two lists are disjoint and nothing
 * else draws on them), so the rule is met if such a course is in the plan.
 */
function departments(h: HarnessContext, lower: Node, upper: Node): Node {
  const title = 'Courses from at least two departments'
  const quote = 'Between the upper- and lower-division elective options, courses must be taken from at least two different departments.'
  const six = [...(lower.used ?? []), ...(upper.used ?? [])]
  if (!six.length) return h.node('departments', title, quote, 'unmet', { detail: 'No MENAS courses yet.' })
  const plain = new Set(six.map((e) => parseCode(e.code).subject))
  if (plain.size >= 2) return h.node('departments', title, quote, 'met', { detail: [...plain].join(', ') })
  const only = [...plain][0]
  const spare = h.passed.filter((e) => !h.used.has(e.id) && SIX.has(e.code, h.catalog) && parseCode(e.code).subject !== only)
  if (spare.length)
    return h.node('departments', title, quote, 'met', { detail: `Count ${spare[0].display} in place of one of your ${only} courses.`, used: [spare[0]] })
  const xl = six.filter((e) => depts(h, e).length > 1)
  if (xl.length)
    return h.cannotCheck('departments', title, quote, `All six counted courses are ${only}; ${xl.map((e) => e.display).join(', ')} is cross-listed with another department — ask whether it counts as the second department.`)
  return h.node('departments', title, quote, 'unmet', { detail: `All your MENAS courses are ${only} (${six.map((e) => display(e.code)).join(', ')}); take one from another department.` })
}

/**
 * "Up to two MENAS minor requirements pass/no pass": counted over the six
 * courses. Whether P/NP language courses also count against the two is not
 * stated, so when only they would push the count over two the node is
 * cannot-check rather than unmet.
 */
function pnpLimit(h: HarnessContext, counted: Node[], language: Node, pool: CourseSet, quote: string): Node {
  const title = 'At most two requirements taken Pass/No Pass'
  const used = [...new Map(counted.flatMap((n) => n.used ?? []).map((e) => [e.id, e])).values()]
  const pnp = used.filter((e) => isPass(e.grade))
  const langUsed = (language.children ?? []).find((c) => c.status === 'met')?.used ?? []
  const langP = langUsed.filter((e) => isPass(e.grade))
  if (pnp.length <= 2) {
    if (pnp.length + langP.length > 2)
      return h.cannotCheck('pnp-limit', title, quote, `${[...pnp, ...langP].map((e) => e.display).join(', ')} are P/NP; whether language courses count toward the two-course P/NP limit is not stated — ask the program.`)
    return h.node('pnp-limit', title, quote, 'met', { progress: { have: pnp.length, need: 2, unit: 'P/NP max' }, minor: true })
  }
  const spare = h.passed.filter((e) => !h.used.has(e.id) && !isPass(e.grade) && pool.has(e.code, h.catalog))
  const detail = `${pnp.map((e) => e.display).join(', ')} are P/NP — only two may be.`
  return spare.length
    ? h.cannotCheck('pnp-limit', title, quote, `${detail} A letter-graded course you also took (${spare.map((e) => e.display).join(', ')}) may be able to replace one — check with an advisor.`)
    : h.node('pnp-limit', title, quote, 'unmet', { detail, used: pnp })
}
