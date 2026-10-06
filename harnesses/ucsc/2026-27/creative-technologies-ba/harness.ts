// Creative Technologies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/creative-technologies-ba.md
//
// Unusual bits handled in code below:
//  - Three quarters of the CT 1 colloquium (a repeatable 2-credit course).
//  - Breadth of Arts electives come from an external list the committed
//    source only links to. As in anthropology-minor, the student names which
//    of their courses are the three breadth electives (declared choices,
//    validated here: in the plan, passed, not used for a CT requirement,
//    distinct; at least one numbered 100+). Undeclared ⇒ cannot-check, never met.
//  - DC = CT 101 + CT 195; comprehensive = CT 195 (overlays on the core).
//  - No letter-grade rule beyond campus P/NP limits.
import { canon, codes, defineHarness, display, parseCode } from '@harness'
import type { ChoiceDef, Enrollment, HarnessContext, Node } from '@harness'

const BREADTH_KEYS = ['breadth1', 'breadth2', 'breadth3']
const Q_BREADTH = 'Students majoring in creative technologies are required to take three Breadth of Arts elective courses. At least one of the three Breadth of Arts elective courses must be upper-division (numbered 100 and above). The remaining two courses may be lower- or upper-division.'
const Q_BREADTH_LIST = 'Students may choose from the list of [Breadth of Arts elective courses](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/arts-division/creative-technologies/creative-technologies-breadth-of-arts-electives).'
const Q_PETITION = 'Courses relevant to the requirement, but not listed here (including graduate seminars), may be proposed to fulfill this requirement via petition; please contact the major advisor to learn about the petition process.'

const parse = (raw: string) => (/^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(raw.trim()) ? canon(raw) : undefined)

export default defineHarness({
  program: 'creative-technologies-ba',
  edition: '2026-27',
  title: 'Creative Technologies B.A.',
  choices: BREADTH_KEYS.map(
    (k, i): ChoiceDef => ({
      key: k,
      label: `Breadth of Arts elective ${i + 1}`,
      quote: 'Students majoring in creative technologies are required to take three Breadth of Arts elective courses.',
      options: [],
      free: true,
      parse,
    }),
  ),
  notes: [
    'Breadth of Arts electives come from the program’s Breadth of Arts elective list, which the app does not have: tell the dashboard which of your courses are your three breadth electives.',
    'Two Breadth of Arts courses are also part of major qualification (declaration), with a personal statement.',
    'No letter-grade rule beyond the campus P/NP limit.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy outside the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined

    const ct1 = h.take('ct1', 'Three quarters of colloquium (CT 1)', ['Take three quarters of colloquium:', 'CT 1 — Creative Interventions: A Colloquium in Contemporary Media (2)'], codes('CT 1'), {
      n: 3,
      repeatable: true,
    })
    const ldCore = h.all('ld-core', 'CT 10, CT 11, CT 20', 'Plus the following courses:', ['CT 10', 'CT 11', 'CT 20'])

    const udCore = h.all('ud-core', 'Upper-division core', 'Take the following courses:', ['CT 100', 'CT 101', 'CT 120', 'CT 125', 'CT 151', 'CT 195'], {
      notes: ['CT 100 is cross-listed as ART 102.'],
    })
    const topics = h.take('special-topics', 'One special topics course', 'Plus one of the following special topics courses:', codes('CT 167I', 'CT 167N', 'CT 167Q', 'CT 167S'))

    const dc = h.all('dc', 'Disciplinary Communication (DC)', 'The DC requirement in creative technologies is satisfied by completing the following two courses:', ['CT 101', 'CT 195'], { exclusive: false })
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', 'Students satisfy the senior comprehensive requirement by completing the following course:', codes('CT 195'), { exclusive: false })
    h.solve()

    const breadth = breadthNode(h)
    return [
      h.group('lower', 'Lower-Division Courses', [ct1, ldCore, breadth]),
      h.group('upper', 'Upper-Division Courses', [udCore, topics], {
        quote: 'Students take six upper-division core courses, one special topics course, and one upper-division Breadth of Arts elective (see above), for a total of eight upper-division courses.',
      }),
      dc,
      comprehensive,
    ]
  },
})

function breadthNode(h: HarnessContext): Node {
  const pool = breadthPool(h)
  const poolCodes = [...new Set(pool.map((e) => e.code))]
  const taken = new Set<string>()
  const used: Enrollment[] = []
  const kids: Node[] = BREADTH_KEYS.map((k, i) => {
    const id = `breadth/${i + 1}`
    const title = `Breadth of Arts elective ${i + 1}`
    const code = h.choice(k)
    if (!code) {
      const free = pool.filter((e) => !taken.has(e.code))
      if (!free.length)
        return h.node(id, title, Q_BREADTH_LIST, 'unmet', { detail: 'No other course in your plan to use as a breadth elective.', choice: k })
      return h.cannotCheck(id, title, Q_BREADTH_LIST, 'Check the Breadth of Arts elective list, then pick which of your courses this is.', { choice: k, options: poolCodes })
    }
    if (taken.has(code)) return h.node(id, title, Q_BREADTH_LIST, 'unmet', { detail: `${display(code)} is already one of your breadth electives.`, choice: k, options: poolCodes })
    // Match by course (cross-listed codes are one course: ART 102 = CT 100).
    const same = (x: Enrollment) => x.code === code || h.catalog.equivalents(code).includes(x.code)
    const e = pool.find(same)
    if (!e) {
      const elsewhere = h.passed.some(same)
      return h.node(id, title, Q_BREADTH_LIST, 'unmet', {
        detail: elsewhere ? `${display(code)} already counts for a creative technologies requirement.` : `${display(code)} is not in your plan (or was not passed).`,
        choice: k,
        options: poolCodes,
      })
    }
    taken.add(code)
    used.push(e)
    return h.node(id, title, Q_BREADTH_LIST, 'met', { used: [e], choice: k, detail: 'Per your declaration (check it is on the Breadth of Arts list, or petitioned).', options: poolCodes })
  })
  const declared = kids.filter((n) => n.status === 'met')
  let udStatus: 'met' | 'unmet' | 'cannot-check'
  if (used.some((e) => parseCode(e.code).number >= 100)) udStatus = 'met'
  else if (declared.length === 3) udStatus = 'unmet'
  else udStatus = pool.some((e) => parseCode(e.code).number >= 100 && !taken.has(e.code)) ? 'cannot-check' : 'unmet'
  kids.push(
    h.node('breadth/upper', 'At least one upper-division (100+)', Q_BREADTH, udStatus, {
      detail: udStatus === 'met' ? undefined : udStatus === 'unmet' ? 'None of your breadth electives is numbered 100 or above.' : 'Declare an upper-division breadth elective.',
    }),
  )
  return h.group('breadth', 'Breadth of Arts Electives', kids, { quote: [Q_BREADTH, Q_PETITION] })
}

/**
 * Passed courses not used by any CT requirement (candidates for breadth). A
 * non-repeatable course counts once, so a retake of a course a CT requirement
 * already uses (e.g. a second CT 101) is not a candidate (review 2026-10-06).
 */
function breadthPool(h: HarnessContext): Enrollment[] {
  const usedKeys = new Set(h.enrollments.filter((e) => h.used.has(e.id)).map(h.courseKey))
  return h.passed.filter((e) => !h.used.has(e.id) && !usedKeys.has(h.courseKey(e)))
}
