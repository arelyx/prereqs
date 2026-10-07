// Latin American and Latino Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/latin-american-and-latino-studies-ba.md
//
// Two shapes: the LALS major (10 courses + 2 labs) and the Language Intensive
// Concentration (13 courses + 2 labs). Every course counts once: intro,
// lower-division elective(s), core, upper-division electives and the senior
// seminar are one allocation. DC (LALS 100A/100L) and the comprehensive
// (the senior seminar) are overlays.
//
// AP Spanish: "May also be satisfied with a score of 4+ on the AP Spanish
// Literature and Culture exam." An attestation, offered only when a
// lower-division elective is actually missing (it covers one elective).
//
// Outside courses: "up to two courses taken outside the LALS Department"
// may count, from a pre-approved list the source only links to. The app
// counts LALS courses (and, for the concentration, the listed Spanish-taught
// courses, which count toward the same limit). When an elective is short and
// the student has unused outside courses that could be on that list, the
// elective is cannot-check (never unmet) as long as the two-course limit
// leaves room for them.
import { codes, defineHarness, display, policyFailure, range, series } from '@harness'
import type { AttestationDef, Enrollment, GradePolicy, HarnessContext, Node } from '@harness'

const POLICY: GradePolicy = { min: 'C', pCounts: true }

const INTRO = codes('LALS 1', 'LALS 5', 'LALS 10')
// "One 5-credit course from from LALS courses numbered 1-99, including additional LALS introductory courses"
const LD_LALS = range('LALS', 1, 99).minCredits(5)
// "five additional 5-credit electives chosen from LALS 101-194" (LALS 194L is a 2-credit lab)
const UD_LALS = range('LALS', 101, 194).minCredits(5)
// "one senior seminar (LALS 194 A-Z, excluding L) and seminar lab (LALS 194L)"
const SEMINAR = series('LALS', 194).except(codes('LALS 194L'))
// Independent study / senior project numbers outside 101-194: advisor approval only.
const INDEPENDENT = codes('LALS 195B', 'LALS 195C', 'LALS 198', 'LALS 199')

// "Courses taught primarily in Spanish" (Language Intensive Concentration).
// LIT 189C [/SPAN 105]: the library treats the cross-listed code as the same course.
// 2025-26 lists LALS 127 and LALS 129S as well (dropped from the 2026-27 list).
const SPANISH_LALS = ['LALS 127', 'LALS 129S', 'LALS 135', 'LALS 147']
const SPANISH_OTHER = [
  'LIT 188R', 'LIT 189A', 'LIT 189B', 'LIT 189C', 'LIT 189F', 'LIT 189G', 'LIT 189L', 'LIT 189O',
  'LIT 189Q', 'LIT 189S', 'LIT 189V', 'LIT 189X', 'LIT 189Z', 'SPAN 156A', 'SPAN 156F', 'SPAN 156J', 'SPAN 156M',
  'SPHS 115',
]
const SPANISH = codes(...SPANISH_LALS, ...SPANISH_OTHER)
const SPANISH_NON_LALS = codes(...SPANISH_OTHER)
// Listed as "taught primarily in Spanish" on the LALS/EDJ combined major page, not on this list
// (manifest depends_on that page).
const MAYBE_SPANISH = codes('LALS 157', 'LALS 183')

const Q_SEMINAR = 'All students complete one senior seminar (LALS 194 A-Z, excluding L) and seminar lab (LALS 194L).'
const Q_COMPREHENSIVE = 'The Comprehensive Requirement is fulfilled by completing one senior seminar (LALS 194 A-Z, excluding L) and seminar lab (LALS 194L).'
const AP_SPANISH: AttestationDef = {
  id: 'ap-spanish',
  label: 'Scored 4+ on the AP Spanish Literature and Culture exam',
  quote: 'May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam.',
  aliases: ['ap spanish', 'spanish literature and culture'],
}

/** A course code of the LALS Department, including a cross-listed partner code (PHIL 80E = LALS 80E). */
function isLals(h: HarnessContext, code: string): boolean {
  return code.startsWith('LALS') || h.catalog.equivalents(code).some((c) => c.startsWith('LALS'))
}

export default defineHarness({
  program: 'latin-american-and-latino-studies-ba',
  edition: '2025-26',
  title: 'Latin American and Latino Studies B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Major / concentration',
      quote: 'The LALS B.A. with Language Intensive Concentration requires 13 courses and two labs',
      options: [
        { value: 'lals', label: 'Latin American and Latino Studies Major', aliases: ['lals major', 'standard', 'general', 'none', 'no concentration', 'major'] },
        { value: 'language-intensive', label: 'Language Intensive Concentration', aliases: ['language intensive', 'lals language intensive concentration', 'intensive'] },
      ],
      default: 'lals',
    },
  ],
  attestations: [AP_SPANISH],
  notes: [
    'Major courses need a C or better, or a P.',
    'At most two courses from outside the LALS Department (other UCSC departments, other institutions, study abroad) may count. The pre-approved outside elective list is a separate catalog page the app does not have: an outside course is shown as “check yourself”, never counted automatically.',
    'Independent study counts as an elective only with the undergraduate advisor’s approval.',
  ],
  evaluate(h) {
    // "Major and minor requirements will be met with grades of C or better or Pass"
    h.policy = POLICY
    return h.choice('concentration') === 'language-intensive' ? intensive(h) : major(h)
  },
})

function major(h: HarnessContext): Node[] {
  const intro = h.take('intro', 'One LALS introductory course', 'One LALS Introductory Course', INTRO)
  const ldElective = h.take(
    'ld-elective',
    'One lower-division LALS elective',
    ['One 5-credit course from from LALS courses numbered 1-99, including additional LALS introductory courses (LALS 1, 5, or 10).', 'May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam.'],
    LD_LALS,
    { pool: 'LALS 1–99 (5 credits), including another of LALS 1, 5 or 10' },
  )
  const lower = h.group('lower', 'Lower-Division Requirements', [intro, ldElective])

  const core = h.all('core', 'LALS Core Courses', 'LALS Core Courses', ['LALS 100', 'LALS 100A', 'LALS 100L'])
  const electives = h.take(
    'ud-electives',
    'Five upper-division LALS electives',
    'Students take five additional 5-credit electives chosen from LALS 101-194.',
    UD_LALS,
    { n: 5, repeatable: 'catalog', pool: 'LALS 101–194 (5 credits; LALS 194L does not count)' },
  )
  const seminar = seminarNode(h)
  const upper = h.group('upper', 'Upper-Division Requirements', [core, electives, seminar])

  const dc = dcNode(h, 'The DC requirement for the Latin American and Latino Studies B.A. is met by completing:')
  const comprehensive = comprehensiveNode(h, Q_COMPREHENSIVE)

  h.solve()
  apCredit(h, ldElective)
  maybeOutside(h, [
    { node: ldElective, lower: true },
    { node: electives, lower: false },
  ])
  apAsk(h, ldElective)
  return [lower, upper, dc, comprehensive]
}

function intensive(h: HarnessContext): Node[] {
  const intro = h.take('intro', 'One LALS introductory course', 'One LALS Introductory Course', INTRO)
  const ldElectives = h.take(
    'ld-electives',
    'Two lower-division LALS electives',
    ['Two 5-credit courses chosen from LALS courses numbered 1-99 including additional LALS introductory courses (LALS 1, 5, or 10).', 'One elective may be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam.'],
    LD_LALS,
    { n: 2, pool: 'LALS 1–99 (5 credits), including another of LALS 1, 5 or 10' },
  )
  const lower = h.group('lower', 'Lower-Division Requirements', [intro, ldElectives])

  const core = h.all('core', 'LALS Core Courses', 'LALS Core Courses', ['LALS 100', 'LALS 100A', 'LALS 100L'])
  const electives = h.take(
    'ud-electives',
    'Seven upper-division electives',
    [
      'Students take seven additional elective courses, with two or more taught primarily in a second language. Students may choose these electives from LALS 101-194 or the list of courses taught primarily in Spanish below.',
      'Note that courses on the pre-approved outside electives list, as well as non-LALS courses on the list of courses taught primarily in Spanish, count toward the limit of two outside courses described in the Course Substitution Policy.',
    ],
    UD_LALS.or(SPANISH),
    {
      n: 7,
      repeatable: 'catalog',
      atMost: [{ set: SPANISH_NON_LALS, n: 2, label: 'non-LALS courses (two-course outside limit)' }],
      pool: `LALS 101–194 (5 credits; not LALS 194L), or the Spanish-taught list: ${[...SPANISH_LALS, ...SPANISH_OTHER].join(', ')} (at most two non-LALS)`,
    },
  )
  const secondLanguage = secondLanguageNode(h)
  const seminar = seminarNode(h)
  const upper = h.group('upper', 'Upper-Division Requirements', [core, electives, secondLanguage, seminar])

  const dc = dcNode(h, 'The DC requirement for the Latin American and Latino Studies Language Intensive Concentration is met by completing:')
  const comprehensive = comprehensiveNode(h, Q_SEMINAR)

  h.solve()
  apCredit(h, ldElectives)
  maybeOutside(h, [
    { node: ldElectives, lower: true },
    { node: electives, lower: false },
  ])
  apAsk(h, ldElectives)
  if (secondLanguage.status === 'unmet') {
    const maybe = h.taken(MAYBE_SPANISH)
    if (maybe.length) {
      secondLanguage.status = 'cannot-check'
      secondLanguage.detail = `${maybe.map((e) => e.display).join(', ')} is described as taught in Spanish elsewhere in the catalog but is not on this list — ask the LALS advisor whether it counts.`
    }
  }
  return [lower, upper, dc, comprehensive]
}

function seminarNode(h: HarnessContext): Node {
  return h.group(
    'seminar',
    'Senior seminar and lab',
    [
      h.take('seminar-course', 'Senior seminar (LALS 194A–Z, not L)', Q_SEMINAR, SEMINAR, { pool: 'LALS 194 A–Z (excluding 194L)' }),
      h.take('seminar-lab', 'LALS 194L seminar lab', Q_SEMINAR, codes('LALS 194L')),
    ],
    { quote: Q_SEMINAR },
  )
}

function secondLanguageNode(h: HarnessContext): Node {
  return h.take(
    'second-language',
    'Two electives taught in a second language',
    'At least two elective courses must be taught in a second language(s) of Spanish, Portuguese, or another approved language.',
    SPANISH,
    {
      n: 2,
      exclusive: false,
      notes: ['Courses in Portuguese or another approved language (often taken abroad) need the LALS advisor’s approval; add them as completed courses once approved.'],
    },
  )
}

function dcNode(h: HarnessContext, quote: string): Node {
  return h.group(
    'dc',
    'Disciplinary Communication (DC)',
    ['LALS 100A', 'LALS 100L'].map((c) => h.take(`dc/${c.replace(' ', '')}`, c, quote, codes(c), { exclusive: false, minor: true })),
    { quote },
  )
}

function comprehensiveNode(h: HarnessContext, quote: string): Node {
  return h.group(
    'comprehensive',
    'Comprehensive Requirement',
    [
      h.take('comp-seminar', 'Senior seminar (LALS 194A–Z, not L)', quote, SEMINAR, { exclusive: false, minor: true }),
      h.take('comp-lab', 'LALS 194L', quote, codes('LALS 194L'), { exclusive: false, minor: true }),
    ],
    { quote },
  )
}

/**
 * AP Spanish 4+ covers one lower-division elective. Attested: a slot short by
 * one is met "by AP"; a slot short by two (concentration) is credited one.
 */
function apCredit(h: HarnessContext, node: Node): void {
  if (node.status !== 'unmet' || !node.progress || !h.attested(AP_SPANISH.id)) return
  node.progress = { ...node.progress, have: node.progress.have + 1 }
  if (node.progress.have >= node.progress.need) {
    node.status = 'met'
    node.detail = 'One elective by AP Spanish Literature and Culture (score 4+), as you confirmed.'
  } else {
    node.detail = 'One elective counted by AP Spanish Literature and Culture (score 4+); the other still needed.'
  }
}

/** Not attested and exactly one elective missing: offer the AP Spanish attestation. */
function apAsk(h: HarnessContext, node: Node): void {
  if (node.status !== 'unmet' || !node.progress || h.attested(AP_SPANISH.id)) return
  if (node.progress.need - node.progress.have !== 1) return
  node.status = 'needs-attestation'
  node.attest = AP_SPANISH
  node.detail = 'One elective missing — unless you scored 4+ on the AP Spanish Literature and Culture exam (confirm it).'
}

/**
 * An unmet elective slot may still be fillable by unused outside courses on
 * the pre-approved list (not in the app), within the two-course limit, or by
 * an advisor-approved independent study. Then it is cannot-check, not unmet.
 */
function maybeOutside(h: HarnessContext, slots: { node: Node; lower: boolean }[]): void {
  const outsideUsed = slots.reduce((n, s) => n + (s.node.used ?? []).filter((e) => !isLals(h, e.code)).length, 0)
  let room = 2 - outsideUsed
  const taken = new Set<string>()
  for (const { node, lower } of slots) {
    if (node.status !== 'unmet' || !node.progress) continue
    const gap = node.progress.need - node.progress.have
    const free = (pred: (e: Enrollment) => boolean) =>
      uniqueCodes(h.passed.filter((e) => !h.used.has(e.id) && !taken.has(e.code) && policyFailure(e, POLICY) == null && pred(e)))
    const outside = free((e) => {
      const c = h.catalog.get(e.code)
      return !!c && !isLals(h, e.code) && c.credits >= 5 && c.division === (lower ? 'lower' : 'upper')
    })
    const indep = lower ? [] : free((e) => INDEPENDENT.has(e.code))
    const usable = Math.min(outside.length, Math.max(room, 0)) + indep.length
    if (usable < gap) continue
    const outUse = Math.min(outside.length, Math.max(room, 0), gap)
    room -= outUse
    for (const e of [...outside.slice(0, outUse), ...indep]) taken.add(e.code)
    const parts: string[] = []
    if (outside.length && outUse) parts.push(`${list(outside)} may be on the pre-approved outside elective list (not in the app; at most two outside courses count)`)
    if (indep.length) parts.push(`${list(indep)} counts only with the undergraduate advisor’s approval`)
    node.status = 'cannot-check'
    node.detail = `${gap} more needed: ${parts.join('; ')} — check with the LALS advisor.`
  }
}

const uniqueCodes = (es: Enrollment[]) => es.filter((e, i) => es.findIndex((x) => x.code === e.code) === i)
const list = (es: Enrollment[]) => es.map((e) => display(e.code)).join(', ')
