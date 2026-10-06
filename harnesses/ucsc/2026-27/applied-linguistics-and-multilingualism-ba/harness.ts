// Applied Linguistics and Multilingualism B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/applied-linguistics-and-multilingualism-ba.md
//
// 65 credits: APLX 80, LING 50, a Level 6 language course; APLX 101, LING 100,
// LING 111/112; two advanced language proficiency courses in the target
// language; four electives (at least three APLX); APLX 190 (DC and
// comprehensive, letter grade). One allocation, so a course counts once
// ("Courses used to fulfill the advanced language proficiency requirement
// cannot be counted toward the APLX electives."). At most two courses used
// for the major may be P/NP.
import { anyOf, codes, defineHarness, display, range, series, subject } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

type Lang = 'chinese' | 'french' | 'italian' | 'japanese' | 'spanish'

// The in-page Advanced Language Proficiency list, by target language.
const ADVANCED: Record<Lang, { label: string; list: string[]; subjects: string[]; lit?: CourseSet }> = {
  chinese: { label: 'Chinese', list: ['CHIN 103', 'CHIN 104', 'CHIN 105', 'CHIN 107', 'CHIN 108'], subjects: ['CHIN'] },
  french: {
    label: 'French',
    list: ['FREN 105', 'FREN 108', 'FREN 111', 'FREN 114', 'FREN 115', 'FREN 120', 'FREN 121', 'FREN 125A', 'FREN 125B', 'FREN 130', 'FREN 136', 'FREN 131'],
    subjects: ['FREN'],
    lit: series('LIT', 182),
  },
  italian: { label: 'Italian', list: ['ITAL 100'], subjects: ['ITAL'], lit: series('LIT', 185) },
  japanese: { label: 'Japanese', list: ['JAPN 103', 'JAPN 104', 'JAPN 105', 'JAPN 109', 'JAPN 111'], subjects: ['JAPN'] },
  spanish: {
    label: 'Spanish',
    list: [
      'SPAN 114', 'SPHS 115', 'SPAN 130', 'LGST 130A', 'SPAN 140', 'SPAN 141', 'SPAN 142', 'SPAN 150', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154',
      'SPAN 155', 'SPAN 156A', 'SPAN 156E', 'SPAN 156F', 'SPAN 156J', 'SPAN 156K', 'SPAN 156L', 'SPAN 157', 'SPAN 158',
    ],
    subjects: ['SPAN', 'SPHS'],
    lit: series('LIT', 188).or(series('LIT', 189)),
  },
}
const LANG_KEYS = Object.keys(ADVANCED) as Lang[]
const LEVEL6: Record<Lang, string[]> = { chinese: ['CHIN 6'], french: ['FREN 6'], italian: ['ITAL 6'], japanese: ['JAPN 6'], spanish: ['SPAN 6', 'SPHS 6'] }
// LALS 171 "Brazil in Black and White" (catalog: taught in Portuguese) is on
// the list but belongs to none of the five target languages: never assumed.
const UNASSIGNED = ['LALS 171']

const ELECTIVES = [
  'ANTH 139', 'ANTH 143', 'APLX 102', 'APLX 103', 'APLX 105', 'APLX 112', 'APLX 113', 'APLX 116', 'APLX 115', 'APLX 122', 'APLX 124',
  'APLX 135', 'APLX 136', 'APLX 138', 'EDUC 141', 'LING 117', 'LING 154', 'LING 155', 'LING 171', 'LING 181', 'LING 183', 'LIT 101',
  'LIT 102', 'SOCY 142', 'SPAN 140', 'SPAN 150', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154', 'SPAN 156K', 'SPAN 156L',
]
const APLX = subject('APLX')

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const parseLang = (raw: string | undefined): Lang | undefined => {
  if (!raw) return undefined
  const n = norm(raw)
  return LANG_KEYS.find((k) => n.includes(k) || n.includes(norm(ADVANCED[k].label))) ?? (n.includes('sphs') || n.includes('heritage') ? 'spanish' : undefined)
}

export default defineHarness({
  program: 'applied-linguistics-and-multilingualism-ba',
  edition: '2026-27',
  title: 'Applied Linguistics and Multilingualism B.A.',
  choices: [
    {
      key: 'language',
      label: 'Target language',
      quote: 'Students must take a minimum of two courses from the following list in the student’s target language (Chinese, French, Italian, Japanese, or Spanish).',
      options: LANG_KEYS.map((k) => ({ value: k, label: ADVANCED[k].label, aliases: [ADVANCED[k].subjects[0].toLowerCase()] })),
      parse: parseLang,
    },
  ],
  notes: [
    'At most two courses used for the major may be taken P/NP; APLX 190 must be letter-graded.',
    'Study abroad courses (up to three, 15 upper-division credits) and other upper-division courses in your target language count only by petition — add them once approved.',
    'Additional electives can be considered with approval of the APLX faculty director.',
    'APLX 190 is taken in the senior year (the app does not check the year).',
  ],
  coverage: {
    ignore: Object.fromEntries(['CHIN4', 'FREN4', 'ITAL4', 'JAPN4', 'SPAN4', 'SPHS4'].map((c) => [c, 'Level 4 is a major-qualification (declaration) course, shown as info'])),
    unknownOk: { LGST130A: 'cross-listing of SPAN 130 named on the page; not a separate catalog entry' },
  },
  evaluate(h) {
    h.policy = undefined // the P/NP rule is a count, handled below
    const lang = target(h)
    if (!lang) return [h.needChoice('language')!]
    const A = ADVANCED[lang]

    // --- lower division ----------------------------------------------------
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('lower-all', 'APLX 80 and LING 50', 'All of the following courses:', ['APLX 80', 'LING 50']),
      h.take('level6', 'A Level 6 language course', ['Take one of the following Level 6 courses', 'NOTE: These courses have Level 1 to Level 5 language prerequisites that have to be completed or satisfied through placement by assessment.'], codes('CHIN 6', 'FREN 6', 'ITAL 6', 'JAPN 6', 'SPAN 6', 'SPHS 6')),
      h.info(
        'qualification',
        'Major qualification: Level 4 with B- or better',
        'To declare the major, students must have completed Level 4 of a non-English language (e.g., CHIN 4, FREN 4, ITAL 4, JAPN 4, SPAN 4, SPHS 4) with a grade of B- or better, or place into Level 5 or higher via placement exam.',
        'Gates declaration, not completion (the Level 4 course must be letter-graded).',
      ),
    ])

    // --- upper division ----------------------------------------------------
    const foundation = h.group('foundation', 'Foundation Courses', [
      h.all('foundation-all', 'APLX 101 and LING 100', 'Take the following courses:', ['APLX 101', 'LING 100']),
      h.take('syntax', 'LING 111 or LING 112', 'and one of the following courses:', codes('LING 111', 'LING 112')),
    ])

    // Advanced language: the in-page list for the target language, plus
    // wildcards — other upper-division courses in that language might be on the
    // complete list posted on the department's web page.
    const listed = codes(...A.list)
    const wildPool = anyOf(...A.subjects.map((s) => range(s, 100, 199)), ...(A.lit ? [A.lit] : []), codes(...UNASSIGNED)).minCredits(5).except(listed)
    const wild = new Set(h.passed.filter((e) => wildPool.has(e.code, h.catalog)).map((e) => e.code))
    const advanced = h.take(
      'advanced',
      `Two advanced ${A.label} proficiency courses`,
      [
        'Students must take a minimum of two courses from the following list in the student’s target language (Chinese, French, Italian, Japanese, or Spanish).',
        'Courses used to fulfill the advanced language proficiency requirement cannot be counted toward the APLX electives.',
      ],
      wild.size ? listed.or(codes(...wild)) : listed,
      { n: 2, prefer: (c) => (wild.has(c) ? 1 : 0), pool: `${A.label} courses on the Advanced Language Proficiency list` },
    )
    const electives = h.take(
      'electives',
      'Four upper-division electives (at least three APLX)',
      'Four upper-division (5-credit) electives from the following list are required, at least three of which must be APLX courses.',
      codes(...ELECTIVES),
      { n: 4, atLeast: [{ set: APLX, n: 3, label: 'APLX courses' }] },
    )
    const aplx190 = h.take('aplx190', 'APLX 190 Research Seminar (letter grade)', ['In their senior year, applied linguistics and multilingualism majors must satisfy the senior exit requirement with:', 'APLX 190 — Research Seminar in Applied Linguistics (5)', 'Please note that the Level 4 course in the student\'s chosen language and APLX 190 must be taken for a letter grade.'], codes('APLX 190'), { policy: { letter: true } })
    h.solve()
    if (advanced.status === 'met') {
      const w = (advanced.used ?? []).filter((e) => wild.has(e.code))
      if (w.length) {
        advanced.status = 'cannot-check'
        advanced.detail = `Counts only if ${w.map((e) => display(e.code)).join(', ')} ${w.length > 1 ? 'are' : 'is'} on the department’s complete Advanced Language Proficiency list (or approved by petition) — check it.`
      }
    }

    const dc = h.take('dc', 'Disciplinary Communication (DC): APLX 190', 'The Disciplinary Communication requirement (DC) is satisfied by successfully completing:', codes('APLX 190'), { exclusive: false, policy: { letter: true } })
    h.solve()

    const upper = h.group('upper', 'Upper-Division Courses', [foundation, h.group('advanced-group', 'Advanced Language Proficiency Courses', [advanced])])
    const elect = h.group('electives-group', 'Electives', [electives])
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [aplx190])
    const pnp = passFailCount(h, [lower, upper, elect, comprehensive])
    return [lower, upper, elect, dc, comprehensive, pnp]
  },
})

/** Declared target language, else the only one the plan has courses in. */
function target(h: HarnessContext): Lang | undefined {
  const v = (h.choice('language') as Lang | undefined) ?? parseLang(h.rawChoices.concentration)
  if (v) return v
  const hits = LANG_KEYS.filter((k) => h.passed.some((e) => ADVANCED[k].subjects.some((s) => e.code.startsWith(s)) || LEVEL6[k].some((c) => c.replace(' ', '') === e.code)))
  return hits.length === 1 ? hits[0] : undefined
}

/** "A maximum of two courses that are used to satisfy the major requirements may be taken for a Pass/No Pass." */
function passFailCount(h: HarnessContext, nodes: Node[]): Node {
  const used = new Map<string, string>()
  const walk = (n: Node) => {
    for (const e of n.used ?? []) used.set(e.id, e.grade ?? '')
    n.children?.forEach(walk)
  }
  nodes.forEach(walk)
  const pnp = [...used.values()].filter((g) => g === 'P' || g === 'S').length
  return h.node('pnp-limit', 'At most two courses taken P/NP', 'A maximum of two courses that are used to satisfy the major requirements may be taken for a Pass/No Pass.', pnp <= 2 ? 'met' : 'unmet', {
    detail: pnp ? `${pnp} of the courses counted for the major ${pnp === 1 ? 'is' : 'are'} P/NP` : undefined,
    minor: true,
  })
}
