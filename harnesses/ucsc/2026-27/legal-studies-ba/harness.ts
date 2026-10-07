// Legal Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/legal-studies-ba.md
//
// Cross-listed partners ("POLI 111A [/LGST 111A]") are the same course: the
// library matches either code, so lists name only the page's primary code.
import { codes, defineHarness } from '@harness'
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
const PAIR_A = codes('LGST 188A')
const PAIR_B = codes('OAKS 188B')
const PAIR_EL = codes('LGST 188A', 'OAKS 188B')
const PAIR = 'PAIR188'
// "Students may petition the department to substitute only one upper-division
// independent study or field study toward the elective requirement" — the
// LGST field study / independent field study / tutorial courses (5 credits).
const INDEP = codes('LGST 193', 'LGST 198', 'LGST 199')
const INDEP_TOKEN = 'INDEP'
const SUB_QUOTE =
  'Students may petition the department to substitute only one upper-division independent study or field study toward the elective requirement in the legal studies major. UCDC and UCSAC internships are exempt from this limit.'

const THEMES: { key: 'A' | 'B' | 'C'; label: string; list: string[] }[] = [
  { key: 'A', label: 'A. Theory', list: THEORY },
  { key: 'B', label: 'B. Public Law and Institutions', list: PUBLIC },
  { key: 'C', label: 'C. Law and Society', list: SOCIETY },
]

const PNP_QUOTE = 'Students are permitted to take up to three LGST courses on a P/NP basis that will count toward the major.'
const THEMATIC_QUOTE =
  'Legal studies majors are required to take six thematic core courses, with a minimum of one in each of the three thematic areas:'

type Theme = 'A' | 'B' | 'C'
const MEMBER: Record<Theme, ReturnType<typeof codes>> = {
  A: codes(...THEORY),
  B: codes(...PUBLIC),
  C: codes(...SOCIETY),
}

/** Distinct units a∈A, b∈B, c∈C among the chosen units (strict reading). */
function coversThemes(items: string[], h: HarnessContext): boolean {
  const keys = ['A', 'B', 'C'] as const
  const inTheme = (k: Theme, u: string) => (u === PAIR ? k === 'B' : u !== INDEP_TOKEN && MEMBER[k].has(u, h.catalog))
  const used = new Set<number>()
  const go = (k: number): boolean => {
    if (k === keys.length) return true
    for (let i = 0; i < items.length; i++) {
      if (used.has(i) || !inTheme(keys[k], items[i])) continue
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
  },
  attestations: [
    {
      id: 'independent-petition',
      label: 'Department approved your petition to count an independent study / field study as a thematic course',
      quote: SUB_QUOTE,
      aliases: ['independent study petition', 'field study petition', 'substitution petition', 'petition'],
    },
  ],
  notes: [
    'An approved petition may substitute one upper-division independent study or field study (LGST 193/198/199) toward the thematic courses; UCDC and UCSAC internships are exempt from this limit — add other approved substitutes once the department confirms them.',
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

    const conSet = codes(...CONLAW)
    const globSet = codes(...GLOBAL)
    const themeSet = codes(...THEORY, ...PUBLIC, ...SOCIETY).except(PAIR_EL)
    const thematicSet = themeSet.or(INDEP)
    const tokens = (chosen: Enrollment[]) => {
      const out: string[] = []
      let pair = false
      for (const e of chosen) {
        if (PAIR_EL.has(e.code, h.catalog)) {
          if (!pair) out.push(PAIR)
          pair = true
        } else if (INDEP.has(e.code, h.catalog)) out.push(INDEP_TOKEN)
        else out.push(e.code)
      }
      return out
    }
    const thematic = h.take('thematic', 'Six thematic core courses', [THEMATIC_QUOTE, 'Take any of the following courses:'], thematicSet, {
      n: 6,
      atLeast: THEMES.map((t) => ({ set: t.key === 'B' ? MEMBER.B.or(PAIR_EL) : MEMBER[t.key], n: 1, label: t.label })),
      atMost: [{ set: INDEP, n: 1, label: 'one independent study / field study (by petition)' }],
      check: (chosen) => (coversThemes(tokens(chosen), h) ? null : 'needs a different course in each of the three thematic areas'),
      composite: {
        eligible: PAIR_EL,
        build: (avail) => {
          const a = avail.find((e) => PAIR_A.has(e.code, h.catalog))
          const b = avail.find((e) => PAIR_B.has(e.code, h.catalog))
          return a && b ? [[a, b]] : []
        },
      },
      // Listed courses first: the petitioned substitute is used only when needed.
      prefer: (code) => (INDEP.has(code, h.catalog) ? 1 : 0),
      pool: 'A. Theory, B. Public Law and Institutions, C. Law and Society lists (at least one from each); one LGST 193/198/199 by petition',
      notes: ['LGST 188A/OAKS 188A and OAKS 188B/LGST 188B must both be taken; together they count as one Public Law course.'],
    })

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('conlaw', 'Constitutional Law', 'Complete one of the following "Constitutional Law" courses:', conSet),
      h.take('global', 'Global Law', 'Plus one of the following "Global Law" courses:', globSet),
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
      // One unit per course (a cross-listed partner code is the same course).
      const key = (c: string) => [c, ...h.catalog.equivalents(c)].sort()[0]
      const listed = h.taken(themeSet).filter(free)
      const units = new Set(listed.map((e) => key(e.code)))
      const pairs = h.taken(PAIR_EL).filter(free)
      if (pairs.some((e) => PAIR_A.has(e.code, h.catalog)) && pairs.some((e) => PAIR_B.has(e.code, h.catalog))) units.add(PAIR)
      if (h.taken(INDEP).some(free)) units.add(INDEP_TOKEN)
      const covered = (['A', 'B', 'C'] as const).every((k) => [...units].some((u) => (u === PAIR ? k === 'B' : u !== INDEP_TOKEN && MEMBER[k].has(u, h.catalog))))
      if (units.size >= 6 && covered) {
        thematic.status = 'cannot-check'
        thematic.detail =
          'Complete only if one course counts for two thematic areas (it is listed under both) — the page does not say; confirm with the advisor.'
      }
    }
    // A petitioned independent / field study counts only with the approval.
    if (thematic.status === 'met' && (thematic.used ?? []).some((e) => INDEP.has(e.code, h.catalog))) {
      upper.children = upper.children!.map((n) =>
        n === thematic ? h.group('thematic-petition', 'Six thematic core courses (one by petition)', [thematic, h.attest('independent-petition')], { quote: SUB_QUOTE }) : n,
      )
    }

    const pnp = pnpLimit(h, [lower, upper, dc], [conSet, globSet, thematicSet, PAIR_EL, codes(...PHIL, 'LGST 10', 'LGST 196', ...thesis)])
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
  // An LGST code or any code cross-listed with one (either direction).
  const isLgst = (code: string) => [code, ...h.catalog.equivalents(code)].some((x) => x.startsWith('LGST'))
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
