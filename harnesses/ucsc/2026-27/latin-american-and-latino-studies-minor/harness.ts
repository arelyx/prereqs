// Latin American and Latino Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/latin-american-and-latino-studies-minor.md
//
// Intro + lower-division elective + one core (LALS 100, or LALS 100A with
// 100L) + four upper-division electives, one allocation. Outside courses: "up
// to two courses taken outside the LALS department" from a pre-approved list
// the source only links to — an elective short of courses while unused
// outside courses could fill it (within the two-course limit) is cannot-check.
//
// Grades: this page says "Courses may be taken for a letter grade or
// Pass/No Pass."; the LALS B.A. page's Letter Grade Policy adds "Major and
// minor requirements will be met with grades of C or better or Pass" (manifest
// depends_on latin-american-and-latino-studies-ba).
//
// AP Spanish 4+ ("May also be satisfied with a score of 4+ on the AP Spanish
// Literature and Culture exam.") is an attestation offered only when the
// lower-division elective is missing.
import { codes, defineHarness, display, policyFailure, range } from '@harness'
import type { AttestationDef, Enrollment, GradePolicy, HarnessContext, Node } from '@harness'

const POLICY: GradePolicy = { min: 'C', pCounts: true }
const AP_SPANISH: AttestationDef = {
  id: 'ap-spanish',
  label: 'Scored 4+ on the AP Spanish Literature and Culture exam',
  quote: 'May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam.',
  aliases: ['ap spanish', 'spanish literature and culture'],
}
/** A LALS course code, including a cross-listed partner code (PHIL 80E = LALS 80E). */
const isLals = (h: HarnessContext, code: string) => code.startsWith('LALS') || h.catalog.equivalents(code).some((c) => c.startsWith('LALS'))

const LD_LALS = range('LALS', 1, 99).minCredits(5)
// "Four additional 5-credit upper-division electives chosen from LALS 100-194."
const UD_LALS = range('LALS', 100, 194).minCredits(5)
const INDEPENDENT = codes('LALS 195B', 'LALS 195C', 'LALS 198', 'LALS 199')

export default defineHarness({
  program: 'latin-american-and-latino-studies-minor',
  edition: '2026-27',
  title: 'Latin American and Latino Studies Minor',
  attestations: [AP_SPANISH],
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass; a letter grade must be C or better (LALS Letter Grade Policy).',
    'At most two courses from outside the LALS department (other UCSC departments, other institutions, study abroad) may count. The pre-approved outside elective list is a separate catalog page the app does not have: outside courses are shown as “check yourself”, never counted automatically.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass." + (LALS B.A. page)
    // "Major and minor requirements will be met with grades of C or better or Pass"
    h.policy = POLICY

    const intro = h.take('intro', 'One LALS introductory course', 'One LALS introductory course', codes('LALS 1', 'LALS 5', 'LALS 10'))
    const ldElective = h.take(
      'ld-elective',
      'One lower-division elective',
      ['One 5-credit course chosen from LALS 1-99 including additional LALS introductory courses (LALS 1, LALS 5, or LALS 10).', 'May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam.'],
      LD_LALS,
      { pool: 'LALS 1–99 (5 credits), including another of LALS 1, 5 or 10' },
    )
    const lower = h.group('lower', 'Lower-Division Courses', [intro, ldElective])

    const core = h.options(
      'core',
      'Upper-division core: LALS 100, or LALS 100A + 100L',
      'Students choose one of the core courses, LALS 100 or LALS 100A (which is taken concurrently with LALS 100L, the research lab) and four upper-division electives.',
      [['LALS 100'], ['LALS 100A', 'LALS 100L']],
    )
    const electives = h.take(
      'ud-electives',
      'Four upper-division electives',
      [
        'Four additional 5-credit upper-division electives chosen from LALS 100-194.',
        'This can include an additional core course (LALS 100 or 100A/LALS 100L, whichever was not used above), or one or more senior seminars (LALS 194A-Z), space permitting.',
      ],
      UD_LALS,
      {
        n: 4,
        repeatable: 'catalog',
        // "100A/LALS 100L" count together as one elective.
        labs: { pairs: [['LALS 100A', 'LALS 100L']], mode: 'merge' },
        pool: 'LALS 100–194 (5 credits), including the core course not used above and senior seminars',
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [core, electives])

    h.solve()
    if (ldElective.status === 'unmet' && h.attested(AP_SPANISH.id)) {
      ldElective.status = 'met'
      ldElective.detail = 'By AP Spanish Literature and Culture (score 4+), as you confirmed.'
    }
    maybeOutside(h, [
      { node: ldElective, lower: true },
      { node: electives, lower: false },
    ])
    if (ldElective.status === 'unmet') {
      ldElective.status = 'needs-attestation'
      ldElective.attest = AP_SPANISH
      ldElective.detail = 'Missing — unless you scored 4+ on the AP Spanish Literature and Culture exam (confirm it).'
    }
    return [lower, upper]
  },
})

/** An unmet elective may be fillable from the external pre-approved list (≤ 2 outside courses) or by approved independent study. */
function maybeOutside(h: HarnessContext, slots: { node: Node; lower: boolean }[]): void {
  let room = 2
  const taken = new Set<string>()
  for (const { node, lower } of slots) {
    if (node.status !== 'unmet' || !node.progress) continue
    const gap = node.progress.need - node.progress.have
    const free = (pred: (e: Enrollment) => boolean) =>
      uniqueCodes(h.passed.filter((e) => !h.used.has(e.id) && !taken.has(e.code) && policyFailure(e, h.policy) == null && pred(e)))
    const outside = free((e) => {
      const c = h.catalog.get(e.code)
      return !!c && !isLals(h, e.code) && c.credits >= 5 && c.division === (lower ? 'lower' : 'upper')
    })
    const indep = lower ? [] : free((e) => INDEPENDENT.has(e.code))
    const outUse = Math.min(outside.length, Math.max(room, 0), gap)
    if (outUse + indep.length < gap) continue
    room -= outUse
    for (const e of [...outside.slice(0, outUse), ...indep]) taken.add(e.code)
    const parts: string[] = []
    if (outUse) parts.push(`${list(outside)} may be on the pre-approved outside elective list (not in the app; at most two outside courses count)`)
    if (indep.length) parts.push(`${list(indep)} counts only with the undergraduate advisor’s approval`)
    node.status = 'cannot-check'
    node.detail = `${gap} more needed: ${parts.join('; ')} — check with the LALS advisor.`
  }
}

const uniqueCodes = (es: Enrollment[]) => es.filter((e, i) => es.findIndex((x) => x.code === e.code) === i)
const list = (es: Enrollment[]) => es.map((e) => display(e.code)).join(', ')
