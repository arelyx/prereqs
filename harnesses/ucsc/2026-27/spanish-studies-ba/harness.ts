// Spanish Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/spanish-studies-ba.md
//
// Lower division: SPAN 1-6 or SPHS 4-6 (or equivalent proficiency), LING 50,
// one Latin American / Latino history course. Upper division (45 credits):
// four core courses, three concentration courses, one elective, one capstone
// in the concentration — one allocation, because "no course taken may count
// toward more than one requirement". DC is SPAN 114 / SPHS 115 (overlay on the
// core). Sequencing rules from the page: concentration courses not before LIT
// 189C and SPAN 150; capstone after at least three of the four core courses.
// Letter grades: the Level 4 Spanish course and the capstone.
import { codes, defineHarness, display, range, series } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Conc = 'languages-linguistics' | 'literature-culture'

const REGULAR: string[][] = [['SPAN 1'], ['SPAN 2'], ['SPAN 3'], ['SPAN 4'], ['SPAN 5', 'SPAN 5M'], ['SPAN 6']]
const HERITAGE: string[][] = [['SPHS 4'], ['SPHS 5'], ['SPHS 6']]

const CORE_LIT = codes('LIT 189A', 'LIT 189B')
const CORE_SS = codes('LIT 189C', 'SPAN 105')
const CORE_LING = codes('SPAN 150')
const CORE_LANG = codes('SPAN 114', 'SPHS 115')

const LL_LIST = [
  'SPAN 130', 'LGST 130A', 'SPAN 140', 'SPAN 141', 'SPAN 142', 'SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154', 'SPAN 155', 'SPAN 156A',
  'SPAN 156E', 'SPAN 156F', 'SPAN 156J', 'SPAN 156K', 'SPAN 156L', 'SPAN 156M', 'SPAN 157', 'SPAN 158',
]
// "Other 5-credit Spanish-language courses numbered SPAN 100-SPAN 189, SPAN 199
// (except SPAN 114, SPAN 150, SPHS 115, and LIT 189C/SPAN 105) may be accepted
// with the permission of the Spanish studies director."
const LL_PERMISSION = range('SPAN', 100, 189).or(codes('SPAN 199')).minCredits(5).except(['SPAN 114', 'SPAN 150', 'SPAN 105', ...LL_LIST])
// "Three 5-credit literature courses numbered LIT 188-LIT 189, LIT 199.
// Current courses within this range are listed below."
const LC_LISTED = [
  'LIT 188A', 'LIT 188B', 'LIT 188E', 'LIT 188G', 'LIT 188H', 'LIT 188I', 'LIT 188M', 'LIT 189F', 'LIT 189G', 'LIT 189H', 'LIT 189I',
  'LIT 189L', 'LIT 189M', 'LIT 189N', 'LIT 189O', 'LIT 189Q', 'LIT 189S', 'LIT 189T', 'LIT 189U', 'LIT 189V', 'LIT 189X',
]
const LC_POOL = codes(...LC_LISTED).or(series('LIT', 188)).or(series('LIT', 189)).or(codes('LIT 199')).minCredits(5)
const ELECTIVE_LIST = [
  'ANTH 130L', 'ANTH 130M', 'ANTH 176B', 'APLX 101', 'APLX 102', 'APLX 103', 'APLX 105', 'APLX 112', 'APLX 113', 'APLX 115', 'APLX 116',
  'APLX 122', 'APLX 124', 'APLX 135', 'APLX 138', 'FMST 115', 'FMST 175', 'HAVC 143C', 'HAVC 160A', 'HAVC 160B', 'HAVC 162A', 'HAVC 162B',
  'HAVC 163', 'HAVC 191B', 'LALS 100', 'LALS 122', 'LALS 133', 'LALS 144', 'LALS 152', 'LALS 155', 'LALS 157', 'LALS 165', 'LALS 172',
  'LALS 175', 'LING 182', 'LIT 155E', 'POLI 140C', 'SOCY 156', 'SOCY 177A',
]
// "Choose one course from the list below or from the Languages and
// Linguistics or Literature and Culture Concentration lists above."
const ELECTIVE_POOL = codes(...ELECTIVE_LIST, ...LL_LIST).or(LC_POOL)

const CAPSTONE: Record<Conc, { set: CourseSet; title: string; quote: string }> = {
  'languages-linguistics': {
    set: codes('SPAN 151', 'SPAN 152', 'SPAN 153', 'SPAN 154', 'SPAN 155', 'SPAN 157', 'SPAN 158'),
    title: 'Languages and Linguistics capstone',
    quote: 'Languages and Linguistics Capstone Courses',
  },
  'literature-culture': { set: codes('LIT 190X', 'SPAN 190A'), title: 'Literature and Culture capstone: LIT 190X (SPAN 190A)', quote: 'Literature and Culture Capstone Course' },
}

export default defineHarness({
  program: 'spanish-studies-ba',
  edition: '2026-27',
  title: 'Spanish Studies B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'Students must choose either the Languages and Linguistics Concentration or the Literature and Culture Concentration.',
      options: [
        { value: 'languages-linguistics', label: 'Languages and Linguistics', aliases: ['language and linguistics', 'linguistics', 'languages and linguistics concentration', 'language'] },
        { value: 'literature-culture', label: 'Literature and Culture', aliases: ['literature', 'literature and culture concentration', 'culture'] },
      ],
    },
  ],
  attestations: [
    {
      id: 'equivalent-proficiency',
      label: 'Equivalent proficiency (placed beyond the lower-division sequence)',
      quote: 'NOTE: Or equivalent proficiency. SPAN 5M may substitute for SPAN 5.',
      aliases: ['equivalent proficiency', 'placement', 'proficiency'],
    },
    {
      id: 'director-permission',
      label: 'Spanish studies director accepted another SPAN course for the concentration',
      quote: 'NOTE: Other 5-credit Spanish-language courses numbered SPAN 100-SPAN 189, SPAN 199 (except SPAN 114, SPAN 150, SPHS 115, and LIT 189C/SPAN 105) may be accepted with the permission of the Spanish studies director.',
      aliases: ['director permission', 'permission of the spanish studies director', 'director'],
    },
  ],
  coverage: {
    unknownOk: {
      LGST130A: 'cross-listing of SPAN 130 named on the page; not a separate catalog entry',
      SPAN105: 'cross-listing of LIT 189C named on the page; not a separate catalog entry',
      SPAN190A: 'cross-listing of LIT 190X named on the page; not a separate catalog entry',
      LIT199: 'named by the page for the Literature and Culture concentration; not in the current catalog',
    },
  },
  notes: [
    'Courses may be taken P/NP except the Level 4 Spanish course (SPAN 4 or SPHS 4) and the capstone, which must be letter-graded.',
    'The capstone must be taken in the senior year — the app checks only that it follows three of the four core courses.',
    'Up to three study-abroad courses (15 upper-division credits) may count by petition — add them once approved.',
  ],
  evaluate(h) {
    h.policy = undefined
    const ask = h.needChoice('concentration')
    if (ask) return [ask]
    const conc = h.choice('concentration') as Conc

    // --- lower division ----------------------------------------------------
    const lower = h.group('lower', 'Lower-Division Courses', [
      spanishTrack(h),
      level4Letter(h),
      h.take('ling50', 'LING 50 Introduction to Linguistics', 'LING 50 — Introduction to Linguistics (5)', codes('LING 50')),
      h.take('history', 'One Latin American / Latino history course', 'Plus one of the following courses:', codes('HIS 11A', 'HIS 11B', 'HIS 12')),
    ])

    // --- upper division (one allocation) -----------------------------------
    const core = h.group('core', 'Core courses', [
      h.take('core-literature', 'Literature: LIT 189A or LIT 189B', ['Literature: (5 credits)', 'Choose one of the following courses:'], CORE_LIT),
      h.take('core-spanish-studies', 'Spanish Studies: LIT 189C (SPAN 105)', 'LIT 189C [/SPAN 105] — Introducción a Spanish Studies (5)', CORE_SS),
      h.take('core-linguistics', 'Linguistics: SPAN 150', 'SPAN 150 — Topics in Hispanic Linguistics: Introduction to Hispanic Linguistics (5)', CORE_LING),
      h.take('core-language', 'Spanish Language: SPAN 114 or SPHS 115', ['Spanish Language: (5 credits)', 'Choose one of the following courses:'], CORE_LANG),
    ], { quote: 'Four required Spanish studies core courses (20 credits total). Though some courses may be able to satisfy multiple requirements of the major, no course taken may count toward more than one requirement.' })

    const ll = conc === 'languages-linguistics'
    // Courses the director could accept join the pool as last-choice
    // wildcards; a fill that needs one waits on the director's permission.
    const permitted = ll ? new Set(h.passed.filter((e) => LL_PERMISSION.has(e.code, h.catalog)).map((e) => e.code)) : new Set<string>()
    const concPool = ll ? codes(...LL_LIST).or(codes(...permitted)) : LC_POOL
    const concentration = h.take(
      'concentration-courses',
      ll ? 'Three Languages and Linguistics courses' : 'Three Literature and Culture courses (LIT 188–189, LIT 199)',
      ll
        ? ['Three courses from the following list that are not used as an elective or capstone:']
        : ['Three 5-credit literature courses numbered LIT 188-LIT 189, LIT 199. Current courses within this range are listed below.', 'The courses LIT 189C/SPAN 105, LIT 189A, and LIT 189B may not be taken as a concentration or elective course if used as a core course.'],
      concPool,
      {
        n: 3,
        repeatable: 'catalog',
        prefer: (c) => (permitted.has(c) ? 1 : 0),
        pool: ll ? undefined : 'LIT 188–189 series or LIT 199 (5 credits)',
        notes: ll ? ['Other 5-credit SPAN 100–189 or SPAN 199 courses count only with the Spanish studies director’s permission.'] : undefined,
      },
    )
    const elective = h.take('elective', 'One elective', 'Choose one course from the list below or from the Languages and Linguistics or Literature and Culture Concentration lists above.', ELECTIVE_POOL, {
      repeatable: 'catalog',
      pool: 'the elective list, the Languages and Linguistics list, or LIT 188–189 / LIT 199',
    })
    const cap = CAPSTONE[conc]
    const capstone = h.take(
      'capstone',
      `${cap.title} (letter grade)`,
      [
        'The senior comprehensive requirement is satisfied by completing one capstone course in the student\'s concentration listed below.',
        'Courses used for the capstone requirement cannot be used for the elective or concentration requirements.',
        cap.quote,
        'Courses used to satisfy major requirements may be taken for a Pass/No Pass or letter grade, with the exception that the Level 4 Spanish course and senior comprehensive course must be taken for a letter grade.',
      ],
      cap.set,
      { policy: { letter: true } },
    )
    h.solve()
    if (ll) needsPermission(h, concentration, permitted)

    const dc = h.take('dc', 'Disciplinary Communication (DC): SPAN 114 or SPHS 115', 'The Disciplinary Communication requirement (DC requirement) is satisfied by successfully completing one of the following courses:', CORE_LANG, { exclusive: false })
    h.solve()

    const order = sequencing(h, core, concentration, capstone)

    const upper = h.group('upper', 'Upper-Division Courses', [
      core,
      h.group('concentration', ll ? 'Languages and Linguistics Concentration' : 'Literature and Culture Concentration', [concentration, order.concentration]),
      h.group('electives', 'Electives', [elective]),
    ], { quote: 'There are a total of 45 upper-division credits required for the Spanish studies major.' })
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [capstone, order.capstone], {
      quote: 'The course must be taken senior year after completion of at least three of the four core courses.',
    })
    return [lower, upper, dc, comprehensive]
  },
})

/** Either track counts when its top course is passed; equivalent proficiency only when no lower-division Spanish is in the plan. */
function spanishTrack(h: HarnessContext): Node {
  const regular = trackNode(h, 'track/regular', 'Regular track: SPAN 1–6', 'Either six courses in the regular track', REGULAR)
  const heritage = trackNode(h, 'track/heritage', 'Heritage track: SPHS 4–6', 'Or three courses in the Spanish for Heritage Speakers (SPHS) track', HERITAGE)
  const started = [...REGULAR, ...HERITAGE].flat().some((c) => h.taken(codes(c)).length)
  const branches = [regular, heritage]
  if (!started) branches.push(h.attest('equivalent-proficiency'))
  return h.either('track', 'Spanish language sequence (or equivalent proficiency)', ['Either six courses in the regular track', 'Or three courses in the Spanish for Heritage Speakers (SPHS) track'], branches)
}

/**
 * A track counts when its top course is passed: lower levels skipped by
 * placement are implied (each course requires the previous level or
 * placement).
 */
function trackNode(h: HarnessContext, id: string, title: string, quote: string, levels: string[][]): Node {
  const got = levels.map((alts) => h.taken(codes(...alts))[0] as Enrollment | undefined)
  const top = got.reduce((t, e, i) => (e ? i : t), -1)
  const ok = top === levels.length - 1
  const skipped = levels.filter((_, i) => i < top && !got[i]).map((alts) => alts[0])
  return h.node(id, title, quote, ok ? 'met' : 'unmet', {
    used: got.filter((e): e is Enrollment => !!e),
    progress: { have: top + 1, need: levels.length },
    options: levels.flat().map((c) => c.replace(' ', '')),
    detail: ok
      ? skipped.length
        ? `${skipped.join(', ')} presumed placed out of (the next level needs it or placement).`
        : undefined
      : top >= 0
        ? `Still needs ${levels.slice(top + 1).map((a) => a.join(' or ')).join(', ')} (or an equivalent the department accepts).`
        : undefined,
  })
}

/** "the Level 4 Spanish course ... must be taken for a letter grade" — when one was taken. */
function level4Letter(h: HarnessContext): Node {
  const l4 = h.taken(codes('SPAN 4', 'SPHS 4'))
  const letter = l4.filter((e) => e.grade !== 'P' && e.grade !== 'S')
  const ok = !l4.length || letter.length > 0
  return h.node('level4-letter', 'Level 4 Spanish for a letter grade', 'Courses used to satisfy major requirements may be taken for a Pass/No Pass or letter grade, with the exception that the Level 4 Spanish course and senior comprehensive course must be taken for a letter grade.', ok ? 'met' : 'unmet', {
    used: letter.slice(0, 1),
    detail: ok ? (l4.length ? undefined : 'No Level 4 course in the plan (placed beyond it).') : `${l4[0].display} was taken P/NP; it must be letter-graded.`,
    minor: true,
  })
}

/** A concentration fill that uses an unlisted SPAN course needs the director's permission. */
function needsPermission(h: HarnessContext, node: Node, permitted: Set<string>) {
  if (node.status !== 'met') return
  const w = (node.used ?? []).filter((e) => permitted.has(e.code))
  if (!w.length) return
  node.detail = `${w.map((e) => display(e.code)).join(', ')} counts only with the Spanish studies director’s permission.`
  if (h.attested('director-permission')) return
  node.status = 'needs-attestation'
  node.attest = h.attestations.find((a) => a.id === 'director-permission')
}

const termNo = (e: Enrollment) => (e.term == null ? -1 : Number(e.term))

/**
 * "LIT 189C/SPAN 105 and SPAN 150 must be taken prior to enrollment in or in
 * conjunction with concentration courses." and the capstone "must be taken
 * senior year after completion of at least three of the four core courses."
 * Checked only where terms are known; quarters without a term are treated as
 * earlier.
 */
function sequencing(h: HarnessContext, core: Node, conc: Node, capstone: Node): { concentration: Node; capstone: Node } {
  const coreUsed = (core.children ?? []).flatMap((c) => c.used ?? [])
  const ssLing = (core.children ?? []).filter((c) => c.id === 'core-spanish-studies' || c.id === 'core-linguistics').flatMap((c) => c.used ?? [])
  const gate = ssLing.length === 2 ? Math.max(...ssLing.map(termNo)) : null
  const early = gate == null ? [] : (conc.used ?? []).filter((e) => e.term != null && Number(e.term) < gate)
  const concOrder = h.node(
    'concentration-order',
    'LIT 189C and SPAN 150 before (or with) concentration courses',
    'NOTE: *LIT 189C/SPAN 105 and SPAN 150 must be taken prior to enrollment in or in conjunction with concentration courses.',
    early.length ? 'unmet' : 'met',
    { detail: early.length ? `${early.map((e) => e.display).join(', ')} came before LIT 189C / SPAN 150.` : undefined, minor: true },
  )
  const cap = (capstone.used ?? [])[0]
  let capOk = true
  let capDetail: string | undefined
  if (cap && cap.term != null && coreUsed.length >= 3) {
    const before = coreUsed.filter((e) => termNo(e) < Number(cap.term)).length
    capOk = before >= 3
    if (!capOk) capDetail = `Only ${before} of the four core courses were completed before ${cap.display}.`
  }
  const capOrder = h.node('capstone-order', 'Capstone after three of the four core courses', 'The course must be taken senior year after completion of at least three of the four core courses.', capOk ? 'met' : 'unmet', {
    detail: capDetail,
    minor: true,
  })
  return { concentration: concOrder, capstone: capOrder }
}
