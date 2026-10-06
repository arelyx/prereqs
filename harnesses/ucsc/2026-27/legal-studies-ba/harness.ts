// Legal Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/legal-studies-ba.md
//
// Cross-listed partners ("POLI 111A [/LGST 111A]") are the same course; the
// catalog files each under its primary code, so sets are widened with the
// partner codes the catalog lists.
import { canon, codes, defineHarness } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const PHIL = ['PHIL 7', 'PHIL 9', 'PHIL 22', 'PHIL 24', 'PHIL 27']
const CONLAW = ['POLI 111A', 'LGST 111B', 'LGST 111C']
const GLOBAL = ['LGST 116', 'POLI 160B', 'POLI 175']
const THEORY = [
  'POLI 103', 'POLI 105A', 'POLI 105C', 'POLI 105B', 'POLI 105D', 'LGST 107', 'LGST 109', 'LGST 146', 'LGST 155',
  'LGST 157', 'POLI 184', 'ANTH 148', 'ANTH 187', 'ART 172', 'ART 181', 'ENVS 147', 'FMST 194O', 'LIT 168A',
  'PHIL 126', 'PHIL 100D', 'PHIL 143', 'PHIL 144', 'PHIL 153', 'SOCY 128C', 'SOCY 128J', 'PSYC 114', 'PSYC 140M',
]
const PUBLIC = [
  'POLI 111A', 'LGST 111C', 'LGST 115', 'LGST 116', 'POLI 120A', 'POLI 120C', 'LGST 124', 'LGST 125', 'LGST 131',
  'LGST 133', 'LGST 137', 'LGST 139', 'LGST 148', 'LGST 152', 'LGST 153', 'LGST 155', 'LGST 156', 'LGST 159',
  'LGST 173', 'POLI 132', 'POLI 134', 'POLI 165', 'POLI 167', 'POLI 175', 'ECON 128', 'ENVS 140',
  'ENVS 144', 'ENVS 149', 'ENVS 151', 'ENVS 150', 'ENVS 152', 'ENVS 165', 'GCH 186', 'SOCY 117E', 'SOCY 128J',
  'SOCY 128M',
]
const SOCIETY = [
  'LGST 108', 'LGST 111B', 'LGST 113', 'LGST 114', 'LGST 117', 'LGST 118', 'LGST 130', 'LGST 150', 'LGST 153',
  'LGST 154', 'LGST 158', 'LGST 161', 'LGST 173', 'LGST 185', 'POLI 110', 'POLI 120B', 'POLI 120C', 'POLI 121',
  'POLI 151', 'POLI 182', 'ANTH 110C', 'ANTH 126', 'ANTH 130C', 'ANTH 138', 'ANTH 142', 'ANTH 187', 'ENVS 144',
  'ANTH 187B', 'ART 175', 'ART 186', 'ECON 160A', 'ECON 162', 'ECON 169', 'ECON 183', 'ENVS 130B', 'FMST 112',
  'FMST 194O', 'HIS 110B', 'HIS 110D', 'LIT 168A', 'LIT 168B', 'LIT 189A', 'PSYC 147A', 'PSYC 147B', 'SOCY 117E',
  'SOCY 122', 'SOCY 127', 'SOCY 128', 'SOCY 128I', 'SPAN 130',
]
// "LGST 188A/OAKS 188A and OAKS 188B/LGST 188B must both be taken to count as one course." (Public Law list)
const PAIR_A = ['LGST 188A', 'OAKS 188A']
const PAIR_B = ['OAKS 188B', 'LGST 188B']
const PAIR = 'PAIR188'

const THEMES: { key: 'A' | 'B' | 'C'; label: string; list: string[] }[] = [
  { key: 'A', label: 'A. Theory', list: THEORY },
  { key: 'B', label: 'B. Public Law and Institutions', list: PUBLIC },
  { key: 'C', label: 'C. Law and Society', list: SOCIETY },
]

const PNP_QUOTE = 'Students are permitted to take up to three LGST courses on a P/NP basis that will count toward the major.'
const THEMATIC_QUOTE =
  'Legal studies majors are required to take six thematic core courses, with a minimum of one in each of the three thematic areas:'

interface Xl {
  set: CourseSet
  primary: (code: string) => string
}
/** Widen an explicit list with its catalog cross-listed partners. */
function xl(h: HarnessContext, list: string[]): Xl {
  const alias = new Map<string, string>()
  for (const c of list) for (const x of h.catalog.get(c)?.crossListed ?? []) alias.set(x, canon(c))
  const set = codes(...list, ...alias.keys())
  set.describe = codes(...list).describe
  return { set, primary: (code) => alias.get(code) ?? code }
}

/** Distinct courses a∈A, b∈B, c∈C among the chosen units (strict reading). */
function coversThemes(items: string[], member: Record<'A' | 'B' | 'C', Set<string>>): boolean {
  const keys = ['A', 'B', 'C'] as const
  const used = new Set<number>()
  const go = (k: number): boolean => {
    if (k === keys.length) return true
    for (let i = 0; i < items.length; i++) {
      if (used.has(i) || !member[keys[k]].has(items[i])) continue
      used.add(i)
      if (go(k + 1)) return true
      used.delete(i)
    }
    return false
  }
  return go(0)
}

export default defineHarness({
  program: 'legal-studies-ba',
  edition: '2026-27',
  title: 'Legal Studies B.A.',
  coverage: {
    ignore: {
      LGST195C: 'third thesis quarter is optional ("two or three quarters"): LGST 195A + 195B complete the thesis option',
    },
    unknownOk: {
      OAKS188A: 'cross-listed partner of LGST 188A ("LGST 188A/OAKS 188A"); the catalog files it under LGST',
      LGST188B: 'cross-listed partner of OAKS 188B ("OAKS 188B/LGST 188B"); the catalog files it under OAKS',
    },
  },
  notes: [
    'Students may petition to substitute one upper-division independent study or field study toward the elective requirement (UCDC and UCSAC internships are exempt from this limit) — add an approved substitute once the department confirms it.',
    'Declaring the major needs LGST 10 with C/P or better; that gates declaration, not completion.',
  ],
  evaluate(h) {
    h.policy = undefined // P/NP allowed, up to three LGST courses (checked below)

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('lgst10', 'LGST 10 Introduction to Legal Process', 'All students are required to complete and pass LGST 10 prior to declaring the major.', codes('LGST 10')),
      h.take(
        'philosophy',
        'Philosophical logic or ethics',
        ['Choose one of the following courses:', 'All legal studies majors are required to take one of these philosophy courses'],
        codes(...PHIL),
      ),
    ])

    const con = xl(h, CONLAW)
    const glob = xl(h, GLOBAL)
    const themes = THEMES.map((t) => ({ ...t, x: xl(h, t.list) }))
    const primaryOf = new Map<string, string>()
    for (const t of themes) for (const c of t.x.set.members ?? []) primaryOf.set(c, t.x.primary(c))
    const pairCodes = new Set([...PAIR_A, ...PAIR_B].map(canon))
    const member = {
      A: new Set(THEORY.map(canon)),
      B: new Set([...PUBLIC.map(canon), PAIR]),
      C: new Set(SOCIETY.map(canon)),
    }
    const thematicSet = themes.map((t) => t.x.set).reduce((a, b) => a.or(b)).except([...pairCodes])
    const pairEligible = codes(...PAIR_A, ...PAIR_B)
    const tokens = (chosen: Enrollment[]) => {
      const out: string[] = []
      let pair = false
      for (const e of chosen) {
        if (pairCodes.has(e.code)) {
          if (!pair) out.push(PAIR)
          pair = true
        } else out.push(primaryOf.get(e.code) ?? e.code)
      }
      return out
    }
    const thematic = h.take('thematic', 'Six thematic core courses', [THEMATIC_QUOTE, 'Take any of the following courses:'], thematicSet, {
      n: 6,
      atLeast: themes.map((t) => ({ set: t.key === 'B' ? t.x.set.or(pairEligible) : t.x.set, n: 1, label: t.label })),
      check: (chosen) => (coversThemes(tokens(chosen), member) ? null : 'needs a different course in each of the three thematic areas'),
      composite: {
        eligible: pairEligible,
        build: (avail) => {
          const a = avail.find((e) => PAIR_A.map(canon).includes(e.code))
          const b = avail.find((e) => PAIR_B.map(canon).includes(e.code))
          return a && b ? [[a, b]] : []
        },
      },
      pool: 'A. Theory, B. Public Law and Institutions, C. Law and Society lists (at least one from each)',
      notes: ['LGST 188A/OAKS 188A and OAKS 188B/LGST 188B must both be taken; together they count as one Public Law course.'],
    })

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('conlaw', 'Constitutional Law', 'Complete one of the following "Constitutional Law" courses:', con.set),
      h.take('global', 'Global Law', 'Plus one of the following "Global Law" courses:', glob.set),
      thematic,
    ])

    const thesis = ['LGST 195A', 'LGST 195B']
    const dc = h.options(
      'dc',
      'Disciplinary Communication (DC)',
      'The DC requirement in legal studies is satisfied by completing one of the following two options:',
      [['LGST 196'], thesis],
      { labels: ['Senior Seminar: LGST 196', 'Senior Thesis (two or three quarters): LGST 195A, 195B (and 195C)'] },
    )
    const comprehensive = h.options(
      'comprehensive',
      'Comprehensive Requirement',
      'Students can satisfy the senior comprehensive requirement in the legal studies major by successfully completing one of the following two options:',
      [['LGST 196'], thesis],
      { exclusive: false, labels: ['Senior Capstone: LGST 196', 'Senior Thesis (2-3 quarters): LGST 195A, 195B (and 195C)'] },
    )

    h.solve()

    // A course listed under two themes covers one area (strict reading: six
    // distinct courses, a different one per area). If only counting such a
    // course for both areas completes the rule, do not call it unmet.
    // (Courses counted for Constitutional/Global Law are not reused: each
    // course fills one requirement unless the page says otherwise.)
    if (thematic.status === 'unmet') {
      const mine = new Set((thematic.used ?? []).map((e) => e.id))
      const free = (e: Enrollment) => !h.used.has(e.id) || mine.has(e.id)
      const pairs = h.taken(pairEligible).filter(free)
      const units = new Set(tokens(h.taken(thematicSet).filter(free)))
      if (pairs.some((e) => PAIR_A.map(canon).includes(e.code)) && pairs.some((e) => PAIR_B.map(canon).includes(e.code))) units.add(PAIR)
      const covered = (['A', 'B', 'C'] as const).every((k) => [...units].some((u) => member[k].has(u)))
      if (units.size >= 6 && covered) {
        thematic.status = 'cannot-check'
        thematic.detail =
          'Complete only if one course counts for two thematic areas (it is listed under both) — the page does not say; confirm with the advisor.'
      }
    }

    const pnp = pnpLimit(h, [lower, upper, dc], [con.set, glob.set, thematicSet, pairEligible, codes(...PHIL, 'LGST 10', 'LGST 196', ...thesis)])
    return [pnp, lower, upper, dc, comprehensive]
  },
})

/** "up to three LGST courses on a P/NP basis that will count toward the major". */
function pnpLimit(h: HarnessContext, roots: Node[], sets: CourseSet[]): Node {
  const used: Enrollment[] = []
  const seen = new Set<string>()
  const visit = (n: Node) => {
    for (const e of n.used ?? []) if (!seen.has(e.id)) (seen.add(e.id), used.push(e))
    n.children?.forEach(visit)
  }
  roots.forEach(visit)
  const isP = (e: Enrollment) => e.grade === 'P' || e.grade === 'S'
  const isLgst = (code: string) => code.startsWith('LGST') || (h.catalog.get(code)?.crossListed ?? []).some((x) => x.startsWith('LGST'))
  const pAll = used.filter(isP)
  const pLgst = pAll.filter((e) => isLgst(e.code))
  const title = 'P/NP limit: at most three courses'
  if (pAll.length <= 3) return h.node('pnp-limit', title, PNP_QUOTE, 'met', { detail: `${pAll.length} P/NP course(s) counted.`, minor: true })
  // A spare letter-graded course might let a different assignment stay under the limit.
  const spare = h.passed.some((e) => !seen.has(e.id) && !isP(e) && sets.some((s) => s.has(e.code, h.catalog)))
  if (pLgst.length > 3 && !spare)
    return h.node('pnp-limit', title, PNP_QUOTE, 'unmet', { detail: `${pLgst.length} LGST courses taken P/NP count toward the major; at most three may.`, used: pLgst })
  return h.cannotCheck(
    'pnp-limit',
    title,
    PNP_QUOTE,
    `${pAll.length} courses counted toward the major were taken P/NP (${pLgst.length} of them LGST or cross-listed with LGST). The limit is three LGST courses — check with the advisor which of your courses it applies to.`,
    { used: pAll },
  )
}
