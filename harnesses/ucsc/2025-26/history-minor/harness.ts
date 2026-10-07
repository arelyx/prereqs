// History Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/history-minor.md
//
// Eight 5-credit HIS courses: five upper-division (HIS 100–199) plus three
// more that may be lower- or upper-division. Up to two may be P/NP.
import { defineHarness, isPass, range } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const UPPER = range('HIS', 100, 199).minCredits(5)
const ANY = range('HIS', 1, 199).minCredits(5)

export default defineHarness({
  program: 'history-minor',
  edition: '2025-26',
  title: 'History Minor',
  notes: ['Up to two of the eight courses may be taken Pass/No Pass.'],
  evaluate(h) {
    // P/NP is allowed for at most two courses (counted below), so no slot-level grade rule.
    h.policy = undefined
    const upper = h.take('upper', 'Five upper-division history courses', ['Eight history courses are required, five of which must be 5-credit upper-division courses.', 'Five 5-credit upper-division (HIS 100–HIS 199) history courses.'], UPPER, {
      n: 5,
      pool: 'HIS 100–199, 5 credits',
      // Topics courses (HIS 196G, HIS 194 series, HIS 199) are catalog-repeatable:
      // a second offering is another of the "Eight history courses".
      repeatable: 'catalog',
    })
    const lower = h.take('lower', 'Three more history courses (lower- or upper-division)', 'Three 5-credit lower-division (HIS 1–HIS 99) and/or 5-credit upper-division (HIS 100–HIS 199) history courses.', ANY, {
      n: 3,
      pool: 'HIS 1–199, 5 credits',
      repeatable: 'catalog',
    })
    h.solve()
    return [
      h.group('lower-group', 'Lower-Division Courses', [lower]),
      h.group('upper-group', 'Upper-Division Courses', [upper]),
      pnpLimit(h, [lower, upper], ANY, 'Students are allowed to complete up to two of their minor courses for pass/no pass grades.'),
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
