// Politics B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/politics-ba.md
import { codes, defineHarness, range } from '@harness'
import type { Enrollment, HarnessContext } from '@harness'

export const GROUPS: { key: string; label: string; list: string[] }[] = [
  { key: 'theory', label: 'Theory', list: ['POLI 105A', 'POLI 105B', 'POLI 105C', 'POLI 105D'] },
  { key: 'us', label: 'U.S. Politics', list: ['POLI 120A', 'POLI 120B', 'POLI 120C'] },
  { key: 'comparative', label: 'Comparative', list: ['POLI 140A', 'POLI 140C', 'POLI 140D', 'POLI 140E'] },
  { key: 'global', label: 'Global Politics/International Relations', list: ['POLI 160A', 'POLI 160B', 'POLI 160C', 'POLI 160D'] },
]

const CORE_QUOTE =
  'The following four groups of courses constitute the core of the politics major. Four courses are required: two courses from one group, one course from a second group, and one course from a third group.'
const WRITING_QUOTE =
  'The student must receive prior approval from the instructor of the course with the substantial writing component, and must enroll in a two-credit independent study, POLI 199F, as part of this option.'

// Group sets match cross-listed partner codes ("POLI 105A [/LGST 105A]")
// through the library.
const GROUP_SETS = GROUPS.map((g) => ({ key: g.key, set: codes(...g.list) }))

/** Group counts of the chosen core courses, largest first. */
function pattern(chosen: Enrollment[], h: HarnessContext): number[] {
  const n = new Map<string, number>()
  for (const e of chosen) {
    const g = GROUP_SETS.find((x) => x.set.has(e.code, h.catalog))?.key
    if (g) n.set(g, (n.get(g) ?? 0) + 1)
  }
  return [...n.values()].sort((a, b) => b - a)
}

const SUB_QUOTE =
  'Students may petition the department to substitute only one upper-division independent study or field study toward the elective requirement in the politics major. UCDC and UCSAC internships are exempt from this limit.'
// Upper-division (5-credit) field study, group tutorial, independent field study, tutorial.
const INDEP = codes('POLI 193', 'POLI 194', 'POLI 198', 'POLI 199')

export default defineHarness({
  program: 'politics-ba',
  edition: '2026-27',
  title: 'Politics B.A.',
  attestations: [
    {
      id: 'independent-petition',
      label: 'Department approved your petition to count an independent study / field study as an elective',
      quote: SUB_QUOTE,
      aliases: ['independent study petition', 'field study petition', 'substitution petition', 'petition'],
    },
    {
      id: 'writing-component',
      label: 'Instructor approved the substantial writing component (fifth/sixth electives option)',
      quote: WRITING_QUOTE,
      aliases: ['writing component', 'instructor approval', 'substantial writing'],
    },
  ],
  coverage: {
    ignore: Object.fromEntries(
      ['POLI1', 'POLI3', 'POLI4', 'POLI17', 'POLI20', 'POLI21', 'POLI60', 'POLI61', 'POLI70'].map((c) => [
        c,
        'transfer-recommended list only; the requirement is any two of POLI 1–70 (range)',
      ]),
    ),
  },
  notes: [
    'No letter-grade policy: P/NP courses count.',
    'An approved petition may substitute one upper-division independent study or field study (POLI 193/194/198/199) for an elective; UCDC and UCSAC internships are exempt from this limit — add other approved substitutes once the department confirms them.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy."
    h.policy = undefined

    const lower = h.take(
      'lower',
      'Two lower-division politics courses',
      'Students complete two courses numbered POLI 1 through POLI 70, as a foundation for continued success in the politics major and as a requirement to declare the major.',
      range('POLI', 1, 70),
      { n: 2 },
    )

    const coreSet = GROUP_SETS.map((g) => g.set).reduce((a, b) => a.or(b))
    const core = h.take('core', 'Four upper-division core courses', CORE_QUOTE, coreSet, {
      n: 4,
      check: (chosen) => {
        const p = pattern(chosen, h)
        return p.length === 3 && p[0] === 2 ? null : 'needs two from one group, one from a second and one from a third'
      },
      pool: GROUPS.map((g) => `${g.label}: ${g.list.join(', ')}`).join(' · '),
    })

    const ud = range('POLI', 100, 189)
    const electives = h.take('electives', 'Four upper-division electives', 'Four additional courses selected from POLI 100-POLI 189.', ud.or(INDEP), {
      n: 4,
      atMost: [{ set: INDEP, n: 1, label: 'one independent study / field study (by petition)' }],
      // Range courses first: the petitioned substitute is used only when needed.
      prefer: (code) => (INDEP.has(code, h.catalog) ? 1 : 0),
      pool: 'POLI 100–189; one POLI 193/194/198/199 by petition',
    })
    const upper = h.group('upper', 'Upper-Division Courses', [core, electives])

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      'The DC requirement for politics majors is satisfied by completing any three of the four required core courses.',
      coreSet,
      { n: 3, exclusive: false },
    )

    h.solve()
    // "two from one group, one from a second, one from a third" read
    // literally excludes one course from each of the four groups; the page
    // may not mean to. Do not call that case unmet.
    if (core.status === 'unmet') {
      const groups = new Set(h.taken(coreSet).map((e) => GROUP_SETS.find((g) => g.set.has(e.code, h.catalog))?.key))
      if (groups.size === 4) {
        core.status = 'cannot-check'
        core.detail = 'You have one core course in each of the four groups; the page asks for two from one group plus one each from two others — confirm with an advisor whether four groups is accepted, or take a second course in one group.'
      }
    }

    // A petitioned independent / field study counts only with the approval.
    if (electives.status === 'met' && (electives.used ?? []).some((e) => INDEP.has(e.code, h.catalog))) {
      upper.children = upper.children!.map((n) =>
        n === electives ? h.group('electives-petition', 'Four upper-division electives (one by petition)', [electives, h.attest('independent-petition')], { quote: SUB_QUOTE }) : n,
      )
    }

    // Comprehensive: created after the main allocation so the extra electives
    // option only uses courses the major did not already count.
    const comprehensive = h.either(
      'comprehensive',
      'Comprehensive Requirement',
      'The comprehensive requirement in the Politics Department can be satisfied in any of the following methods:',
      [
        h.take(
          'comp-seminar',
          'Senior Seminar (POLI 190 series)',
          'Senior Seminar: Successful completion of a politics senior seminar (POLI 190 series) that includes the writing of an extensive paper (no less than 15 pages) with substantial research content.',
          range('POLI', 190, 190),
          { exclusive: false, pool: 'POLI 190 series (190A, 190C, …)' },
        ),
        h.group(
          'comp-electives',
          'Additional (fifth and sixth) electives + POLI 199F',
          [
            h.take(
              'comp-extra',
              'Two more POLI 100–189 electives',
              'Additional (Fifth and Sixth) Electives: Successful completion of two additional politics upper-division electives numbered POLI 100-189, one of which includes a substantial writing component comparable to a paper for a senior seminar, either as part of the existing course requirements or added with the approval of the instructor.',
              ud,
              { n: 2, pool: 'POLI 100–189 (beyond the four electives)' },
            ),
            h.take('comp-199f', 'POLI 199F (2 credits)', WRITING_QUOTE, codes('POLI 199F'), { exclusive: false }),
            h.attest('writing-component'),
          ],
        ),
        gradSeminar(h),
        h.options(
          'comp-thesis',
          'Senior thesis (POLI 195A, 195B, 195C)',
          'Thesis (2-3 quarters): Successful completion of a senior thesis (POLI 195A, POLI 195B, POLI 195C) of a minimum of 50 pages.',
          [['POLI 195A', 'POLI 195B']],
          { exclusive: false, notes: ['Two or three quarters; POLI 195C is the optional third.'] },
        ),
      ],
    )
    return [lower, upper, dc, comprehensive]
  },
})

/** Graduate seminar route: the app cannot see whether it had the 15-page paper. */
function gradSeminar(h: HarnessContext) {
  const quote =
    'Graduate Seminar: Successful completion of a politics graduate seminar (enrollment is contingent on the written recommendation of two politics faculty) that includes the writing of an extensive paper (no less than 15 pages) with substantial research content.'
  // POLI 291–299 are colloquia, field study, independent study and thesis research.
  const got = h.taken(range('POLI', 200, 290))
  if (!got.length) return h.node('comp-grad', 'Graduate seminar', quote, 'unmet', { detail: 'No POLI graduate seminar in your plan.' })
  return h.cannotCheck('comp-grad', 'Graduate seminar', quote, `${got[0].display}: confirm it was a seminar with an extensive (15+ page) research paper.`, { used: got.slice(0, 1) })
}
