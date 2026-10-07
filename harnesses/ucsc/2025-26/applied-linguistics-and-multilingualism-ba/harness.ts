// Applied Linguistics and Multilingualism B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/applied-linguistics-and-multilingualism-ba.md
//
// 65 credits: APLX 80, LING 50, a Level 6 language course; APLX 101, LING 100,
// LING 111/112; two advanced language proficiency courses in the target
// language; four electives (at least three APLX); APLX 190 (DC and
// comprehensive, letter grade). One allocation, so a course counts once
// ("Courses used to fulfill the advanced language proficiency requirement
// cannot be counted toward the APLX electives."). At most two courses used
// for the major may be P/NP.
import { anyOf, canon, codes, defineHarness, display, range, series, subject } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

type Lang = 'arabic' | 'chinese' | 'french' | 'italian' | 'japanese' | 'spanish'

// The in-page Advanced Language Proficiency list, by target language.
// 2025-26 lists Arabic as a target language with no in-page courses: "approved
// upper-division coursework in Arabic through the Division of Global
// Engagement" (asked as an attestation when used, below).
const ADVANCED: Record<Lang, { label: string; list: string[]; subjects: string[]; lit?: CourseSet }> = {
  arabic: { label: 'Arabic', list: [], subjects: ['ARBC'] },
  chinese: { label: 'Chinese', list: ['CHIN 103', 'CHIN 104', 'CHIN 105', 'CHIN 107', 'CHIN 108'], subjects: ['CHIN'] },
  french: {
    label: 'French',
    list: ['FREN 108', 'FREN 111', 'FREN 114', 'FREN 120', 'FREN 121', 'FREN 125A', 'FREN 125B', 'FREN 130', 'FREN 136', 'FREN 131'],
    subjects: ['FREN'],
    lit: series('LIT', 182),
  },
  italian: { label: 'Italian', list: ['ITAL 100'], subjects: ['ITAL'], lit: series('LIT', 185) },
  japanese: { label: 'Japanese', list: ['JAPN 103', 'JAPN 104', 'JAPN 105', 'JAPN 109'], subjects: ['JAPN'] },
  spanish: {
    label: 'Spanish',
    list: [
      'SPAN 114', 'SPHS 115', 'SPAN 140', 'SPAN 141', 'SPAN 142', 'SPAN 150', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154',
      'SPAN 155', 'SPAN 156A', 'SPAN 156E', 'SPAN 156F', 'SPAN 156J', 'SPAN 156K', 'SPAN 156L', 'SPAN 157', 'SPAN 158',
    ],
    subjects: ['SPAN', 'SPHS'],
    lit: series('LIT', 188).or(series('LIT', 189)),
  },
}
const LANG_KEYS = Object.keys(ADVANCED) as Lang[]
const LEVEL6: Record<Lang, string[]> = { arabic: [], chinese: ['CHIN 6'], french: ['FREN 6'], italian: ['ITAL 6'], japanese: ['JAPN 6'], spanish: ['SPAN 6', 'SPHS 6'] }
// LALS 171 "Brazil in Black and White" (catalog: taught in Portuguese) is on
// the list but belongs to none of the six target languages: never assumed.
const UNASSIGNED = ['LALS 171']

const ELECTIVES = [
  'ANTH 139', 'ANTH 143', 'APLX 102', 'APLX 103', 'APLX 105', 'APLX 112', 'APLX 113', 'APLX 116', 'APLX 115', 'APLX 122', 'APLX 124',
  'APLX 135', 'APLX 136', 'APLX 138', 'EDUC 141', 'LING 117', 'LING 154', 'LING 155', 'LING 171', 'LING 181', 'LING 183', 'LIT 101',
  'LIT 102', 'SOCY 142', 'SPAN 140', 'SPAN 150', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154', 'SPAN 156K', 'SPAN 156L',
]
const APLX = subject('APLX')

const LIST_QUOTE = 'The complete [Advanced Language Proficiency course list](https://language.ucsc.edu) is posted on the department’s web page.'
const ARABIC_QUOTE =
  'Although languages and applied linguistics does not currently offer upper-division coursework in Arabic students who have completed the two-year sequence in this language (or demonstrate equivalent proficiency) have the option to, and are welcome to, complete approved upper-division coursework in Arabic through the Division of Global Engagement in order to satisfy the upper-division language requirement for the major in applied linguistics and multilingualism.'
const PETITION_QUOTE = 'Students may petition to have other 5-credit, upper-division courses offered in the student’s target language count toward the advanced language proficiency requirement.'

/** Free-form course list: "SPAN 199, LIT 189F" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(s))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const parseLang = (raw: string | undefined): Lang | undefined => {
  if (!raw) return undefined
  const n = norm(raw)
  return LANG_KEYS.find((k) => n.includes(k) || n.includes(norm(ADVANCED[k].label))) ?? (n.includes('sphs') || n.includes('heritage') ? 'spanish' : undefined)
}

export default defineHarness({
  program: 'applied-linguistics-and-multilingualism-ba',
  edition: '2025-26',
  title: 'Applied Linguistics and Multilingualism B.A.',
  choices: [
    {
      key: 'language',
      label: 'Target language',
      quote: 'Students must take a minimum of two courses from the following list in the student’s target language (Arabic, Chinese, French, Italian, Japanese, or Spanish).',
      options: LANG_KEYS.map((k) => ({ value: k, label: ADVANCED[k].label, aliases: [ADVANCED[k].subjects[0].toLowerCase()] })),
      parse: parseLang,
    },
    // External complete list → the student declares which courses are on it (§1a).
    { key: 'advanced_list_courses', label: 'Your courses on the complete Advanced Language Proficiency list', quote: LIST_QUOTE, options: [], free: true, parse: parseList },
  ],
  attestations: [
    {
      id: 'advanced-petition',
      label: 'Petition approved: other target-language course counts as advanced language proficiency',
      quote: PETITION_QUOTE,
      aliases: ['advanced language petition', 'petition'],
    },
    {
      id: 'arabic-global-engagement',
      label: 'Upper-division Arabic coursework approved through the Division of Global Engagement',
      quote: ARABIC_QUOTE,
      aliases: ['arabic', 'global engagement', 'study abroad'],
    },
  ],
  notes: [
    'At most two courses used for the major may be taken P/NP; APLX 190 must be letter-graded.',
    'Study abroad courses (up to three, 15 upper-division credits) count only by petition — add them once approved.',
    'Additional electives can be considered with approval of the APLX faculty director.',
    'APLX 190 is taken in the senior year (the app does not check the year).',
  ],
  coverage: {
    ignore: Object.fromEntries(['ARBC4', 'CHIN4', 'FREN4', 'ITAL4', 'JAPN4', 'SPAN4', 'SPHS4'].map((c) => [c, 'Level 4 is a major-qualification (declaration) course, shown as info'])),
  },
  evaluate(h) {
    h.policy = undefined // the P/NP rule is a count, handled below
    const lang = target(h)
    if (!lang) return [h.needChoice('language')!]
    const A = ADVANCED[lang]

    // --- lower division ----------------------------------------------------
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('lower-all', 'APLX 80 and LING 50', 'All of the following courses:', ['APLX 80', 'LING 50']),
      level6Node(h, lang),
      h.info(
        'qualification',
        'Major qualification: Level 4 with B- or better',
        'To declare the major, students must have completed Level 4 of a non-English language (e.g., ARBC 4, CHIN 4, FREN 4, ITAL 4, JAPN 4, SPAN 4, SPHS 4) with a grade of B- or better, or place into Level 5 or higher via placement exam.',
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
    const declared = new Set((h.choice('advanced_list_courses') ?? '').split(',').filter(Boolean))
    const cands = [...new Set(h.passed.filter((e) => wildPool.has(e.code, h.catalog)).map((e) => e.code))]
    const onList = cands.filter((c) => declared.has(c))
    const unassigned = new Set(UNASSIGNED.map(canon))
    const wild = new Set(cands.filter((c) => !declared.has(c) && !unassigned.has(c)))
    const advanced = h.take(
      'advanced',
      `Two advanced ${A.label} proficiency courses`,
      [
        'Students must take a minimum of two courses from the following list in the student’s target language (Arabic, Chinese, French, Italian, Japanese, or Spanish).',
        'Courses used to fulfill the advanced language proficiency requirement cannot be counted toward the APLX electives.',
        LIST_QUOTE,
        PETITION_QUOTE,
      ],
      cands.length ? listed.or(codes(...cands)) : listed,
      { n: 2, prefer: (c) => (wild.has(c) ? 2 : onList.includes(c) ? 1 : 0), pool: `${A.label} courses on the Advanced Language Proficiency list` },
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
    // A fill that needs an undeclared course: on the complete list (declare it)
    // or by petition — the petition is asked only now that it is needed (§1a).
    let advNode: Node = advanced
    const lals = (advanced.used ?? []).filter((e) => unassigned.has(e.code) && !declared.has(e.code))
    if (advanced.status === 'met' && lals.length) {
      // On the page's list, but in none of the six target languages: ask.
      advanced.status = 'cannot-check'
      advanced.detail = `${lals.map((e) => e.display).join(', ')} is on the list but not in one of the six target languages — confirm with the department that it counts for ${A.label}.`
    } else if (advanced.status === 'met' && lang === 'arabic') {
      // Arabic: every course is approved Global Engagement coursework (no
      // in-page list), confirmed once it is needed.
      advanced.detail = 'Upper-division Arabic counts when it is approved coursework through the Division of Global Engagement.'
      if (!h.attested('arabic-global-engagement')) advNode = h.group('advanced-petition-group', `Two advanced ${A.label} proficiency courses`, [advanced, h.attest('arabic-global-engagement')])
    } else if (advanced.status === 'met') {
      const w = (advanced.used ?? []).filter((e) => wild.has(e.code))
      if (w.length) {
        const names = `${w.map((e) => display(e.code)).join(', ')}`
        advanced.detail = h.attested('advanced-petition')
          ? `${names} counted by petition.`
          : `${names} counts only if on the department’s complete list (declare it) or approved by petition.`
        advanced.choice = 'advanced_list_courses'
        if (!h.attested('advanced-petition')) advNode = h.group('advanced-petition-group', `Two advanced ${A.label} proficiency courses`, [advanced, h.attest('advanced-petition')])
      }
    }

    const dc = h.take('dc', 'Disciplinary Communication (DC): APLX 190', 'The Disciplinary Communication requirement (DC) is satisfied by successfully completing:', codes('APLX 190'), { exclusive: false, policy: { letter: true } })
    h.solve()

    const upper = h.group('upper', 'Upper-Division Courses', [foundation, h.group('advanced-group', 'Advanced Language Proficiency Courses', [advNode])])
    const elect = h.group('electives-group', 'Electives', [electives])
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [aplx190])
    const pnp = passFailCount(h, [lower, upper, elect, comprehensive])
    return [lower, upper, elect, dc, comprehensive, pnp]
  },
})

const LEVEL6_QUOTE = ['Language Study: Completion of Level 6 is Required', 'NOTE: These courses have Level 1 to Level 5 language prerequisites that have to be completed or placed out of.']
const LEVEL6_ALL = codes('CHIN 6', 'FREN 6', 'ITAL 6', 'JAPN 6', 'SPAN 6', 'SPHS 6')

/**
 * One of the listed Level 6 courses. The list has no Arabic course, and the
 * page does not say how an Arabic-target student meets Level 6 (the Arabic
 * paragraph speaks of "the two-year sequence in this language (or demonstrate
 * equivalent proficiency)"): without a listed Level 6 course that case is
 * cannot-check, never unmet.
 */
function level6Node(h: HarnessContext, lang: Lang): Node {
  const take = h.take('level6', 'A Level 6 language course', LEVEL6_QUOTE, LEVEL6_ALL)
  if (lang !== 'arabic' || h.taken(LEVEL6_ALL).length) return take
  return h.either('level6-arabic', 'Level 6 (Arabic target language)', LEVEL6_QUOTE, [
    take,
    h.cannotCheck('level6-arabic/check', 'Arabic: Level 6 equivalent', ARABIC_QUOTE, 'The Level 6 list has no Arabic course; confirm with the department how the Arabic two-year sequence (or equivalent proficiency) meets the Level 6 requirement.'),
  ])
}

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
