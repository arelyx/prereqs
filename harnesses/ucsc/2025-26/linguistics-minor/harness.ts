// Linguistics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/linguistics-minor.md
//
// LING 50 + 53, two of five entry courses (never both LING 111 and LING 112),
// three upper-division LING electives. Outside substitutions (other
// departments, other campuses) come from an external pre-approved list: the
// student declares which of their courses are on it (choice); an elective
// shortfall that undeclared upper-division courses could cover is
// cannot-check, not unmet.
import { canon, codes, defineHarness, display, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const ENTRY = ['LING 100', 'LING 101', 'LING 111', 'LING 112', 'LING 171']
const SYNTAX = codes('LING 111', 'LING 112')
const LING199 = codes('LING 199')

// "three 5-credit courses chosen from LING 100-189 and/or LING 200-289" + one
// quarter of LING 199 by the substitution policy. LING 111/112 are left out of
// the elective pool: at most one of them may count toward the minor, and it is
// always at least as good to count it in the "two of" slot (every entry course
// is also in LING 100-189, so the swap never loses a fill).
const ELECTIVES = range('LING', 100, 189).or(range('LING', 200, 289)).minCredits(5).except(SYNTAX).or(LING199)

const OUTSIDE_QUOTE = 'Students may substitute up to two outside courses for the Upper-Division Electives requirement.'
/** Free-form course list: "PHIL 123, PSYC 140C" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(s))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}

export default defineHarness({
  program: 'linguistics-minor',
  edition: '2025-26',
  title: 'Linguistics Minor',
  // External list → the student declares which courses are on it (§1a).
  choices: [{ key: 'outside_courses', label: 'Your courses on the pre-approved outside electives list', quote: OUTSIDE_QUOTE, options: [], free: true, parse: parseList }],
  notes: [
    'Courses may be taken for a letter grade or P/NP.',
    'Up to two outside courses (LING 199, other UCSC departments, other institutions) may substitute for electives — see the department’s pre-approved outside courses list and declare yours; courses not on it need department approval.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.all('lower', 'Lower-Division Courses', 'LING 50 — Introduction to Linguistics (5)', ['LING 50', 'LING 53'])

    const two = h.take('entry-two', 'Two entry courses', ['Take two of the following courses:', 'NOTE: Students may not apply both LING 111 and LING 112 toward the minor.'], codes(...ENTRY), {
      n: 2,
      atMost: [{ set: SYNTAX, n: 1, label: 'LING 111 and LING 112 together' }],
    })
    const all = wildcards(h)
    const declared = new Set((h.choice('outside_courses') ?? '').split(',').filter(Boolean))
    const listed = all.filter((c) => declared.has(c))
    const wild = new Set(all.filter((c) => !declared.has(c)))
    // Every non-LING course is an outside course, declared or not.
    const outside = LING199.or(codes(...all))
    const electives = h.take(
      'electives',
      'Three upper-division electives',
      ['The minor requires three 5-credit courses chosen from LING 100-189 and/or LING 200-289.', 'Students may substitute up to two outside courses for the Upper-Division Electives requirement.', 'Students may apply no more than one quarter of LING 199.'],
      all.length ? ELECTIVES.or(codes(...all)) : ELECTIVES,
      {
        n: 3,
        repeatable: 'catalog',
        prefer: (c) => (wild.has(c) ? 2 : listed.includes(c) ? 1 : 0),
        atMost: [
          { set: LING199, n: 1, label: 'LING 199' },
          { set: outside, n: 2, label: 'outside courses' },
        ],
        pool: 'LING 100–189 or 200–289 (5 credits; not LING 111/112 — see note), or one quarter of LING 199',
        notes: ['Graduate courses need instructor permission.', 'LING 111 and LING 112 cannot both count toward the minor.'],
      },
    )
    h.solve()
    flagWild(electives, wild)

    const upper = h.group('upper', 'Upper-Division Courses', [two, electives])
    return [lower, upper]
  },
})

/**
 * "Students may substitute up to two outside courses ... A list of
 * pre-approved outside courses is available" (external). Upper-division
 * (5+ credit) non-LING courses in the plan join the elective pool as
 * last-choice wildcards; a fill that needs one is cannot-check, never met.
 */
function wildcards(h: HarnessContext): string[] {
  const out = new Set<string>()
  for (const e of h.passed) {
    if (e.code.startsWith('LING')) continue
    const c = h.catalog.get(e.code)
    if (c && !(c.division === 'upper' || c.division === 'graduate')) continue
    if (c && c.credits < 5) continue
    out.add(e.code)
  }
  return [...out]
}

function flagWild(node: Node, wild: Set<string>) {
  if (node.status !== 'met') return
  const w = (node.used ?? []).filter((e) => wild.has(e.code))
  if (!w.length) return
  node.status = 'cannot-check'
  node.choice = 'outside_courses'
  node.detail = `Counts only if ${w.map((e) => display(e.code)).join(', ')} ${w.length > 1 ? 'are' : 'is'} on the pre-approved outside courses list (declare ${w.length > 1 ? 'them' : 'it'} as yours) or approved by the department — check it.`
}
