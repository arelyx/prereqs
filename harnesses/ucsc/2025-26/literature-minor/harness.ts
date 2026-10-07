// Literature Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/literature-minor.md
//
// Seven courses: LIT 1, one LIT 60/61/80/81-series course, LIT 101 and four
// 5-credit LIT 108-189 electives (not LIT 179A/179B). No language, distribution
// or senior-seminar rule (the page says so explicitly). P/NP allowed.
// Internships (LIT 108A, inside the 108-189 range) and independent studies
// (LIT 198/199 tutorials) count only with department approval: an attestation
// asked only when the electives actually need one of them.
import { anyOf, codes, defineHarness, range, series } from '@harness'

const CW_ONLY = ['LIT 179A', 'LIT 179B']
const APPROVAL_QUOTE = 'Independent studies and internships may count toward the electives with department approval.'
// Catalog: LIT 108A "Literature Internships" (5); LIT 198A-C "Group Tutorial"
// and LIT 199A-C "Tutorial" (5). The 2-credit LIT 108B/199F are not 5-credit electives.
const NEEDS_APPROVAL = codes('LIT 108A', 'LIT 108B', 'LIT 198A', 'LIT 198B', 'LIT 198C', 'LIT 199A', 'LIT 199B', 'LIT 199C', 'LIT 199F')

export default defineHarness({
  program: 'literature-minor',
  edition: '2025-26',
  title: 'Literature Minor',
  attestations: [
    {
      id: 'elective-approval',
      label: 'Department approved the independent study / internship as a literature elective',
      quote: APPROVAL_QUOTE,
      aliases: ['department approval', 'independent study', 'internship'],
    },
  ],
  notes: [
    'Courses may be taken for a letter grade or P/NP.',
    'Substitutions (up to three upper-division courses: at most two from another UC campus/EAP, at most one from another UCSC department) count only by petition — add them once approved.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('lit1', 'LIT 1 Literary Interpretation', 'LIT 1 — Literary Interpretation (5)', codes('LIT 1')),
      h.take('lit60-80', 'One course from the LIT 60/61 or LIT 80/81 series', ['One course from the LIT 60 or LIT 61-series, or', 'One course from the LIT 80 or LIT 81-series'], anyOf(series('LIT', 60), series('LIT', 61), series('LIT', 80), series('LIT', 81))),
      h.info('declare', 'LIT 1 before declaring', 'Students must complete LIT 1 or its equivalent prior to declaring the minor.', 'A declaration rule, not a completion rule.'),
    ])

    const lit101 = h.take('lit101', 'LIT 101 Theory and Interpretation', 'LIT 101 — Theory and Interpretation (5)', codes('LIT 101'))
    const electives = h.take(
      'electives',
      'Four upper-division literature electives',
      ['Students take four 5-credit upper-division electives chosen from LIT 108-189, excluding LIT 179A or LIT 179B, which are only available to students who have been accepted to the creative writing concentration.', APPROVAL_QUOTE],
      range('LIT', 108, 189).except(CW_ONLY).or(NEEDS_APPROVAL).minCredits(5),
      {
        n: 4,
        repeatable: 'catalog',
        prefer: (c) => (NEEDS_APPROVAL.has(c) ? 1 : 0),
        pool: 'LIT 108–189, 5 credits, not LIT 179A/179B; internships / independent studies with approval',
      },
    )
    h.solve()
    const approved = h.attested('elective-approval')
    const pending = (electives.used ?? []).filter((e) => NEEDS_APPROVAL.has(e.code))
    let electNode = electives
    if (electives.status === 'met' && pending.length) {
      electives.detail = `${pending.map((e) => e.display).join(', ')} ${approved ? 'counted with department approval.' : 'counts only with department approval.'}`
      if (!approved) electNode = h.group('electives-approval', 'Four upper-division literature electives', [electives, h.attest('elective-approval')])
    }
    const upper = h.group('upper', 'Upper-Division Courses', [lit101, electNode], { quote: 'Five upper-division courses are required.' })
    return [lower, upper]
  },
})
