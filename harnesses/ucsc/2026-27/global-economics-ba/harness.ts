// Global Economics B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/global-economics-ba.md
import { canon, codes, defineHarness, display, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const GLOBAL_LIST = [
  'ECON 120', 'ECON 121', 'ECON 131', 'ECON 140', 'ECON 141', 'ECON 142', 'ECON 143', 'ECON 149', 'ECON 156', 'ECON 188',
]
// "Either course ECON 195 or ECON 199 may be used to fill one of the four electives."
const INDEPENDENT = ['ECON 195', 'ECON 199']
// Level 6 of the languages UCSC teaches through level 6 (catalog).
const LEVEL6 = ['CHIN 6', 'FREN 6', 'ITAL 6', 'JAPN 6', 'SPAN 6', 'SPHS 6']

const PETITION_QUOTE =
  'MATH 11A, MATH 11B, MATH 23A may be taken to satisfy the mathematics content only by by petition via the Mathematics Department.'
const LANGUAGE_QUOTE =
  'Students can meet this requirement be completing level 6 of a language course offered at UC Santa Cruz or its equivalent. For languages not offered at UCSC, or languages not offered through level 6, contact the department.'
const ABROAD_QUOTE =
  'All students are required to spend at least one term abroad in an approved course of study in their regional area of concentration; students may also choose a year-long program.'

const AREA_QUOTE =
  'The major requires students to take two additional courses selected from the offerings of departments other than economics in order to learn about the history, political economy, or culture of some other part of the world.'
const AREA_PLAN_QUOTE = 'The area studies course plan must be pre-approved by an economics advisor.'
const AREA_KEYS = ['area1', 'area2']
const parseCode = (raw: string) => (/^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(raw.trim()) ? canon(raw) : undefined)

export default defineHarness({
  program: 'global-economics-ba',
  edition: '2026-27',
  title: 'Global Economics B.A.',
  // §1a: the approved area-studies list is an external page, so the student
  // declares which of their courses are the two area-study courses.
  choices: AREA_KEYS.map((key, i) => ({
    key,
    label: `Area study course ${i + 1}`,
    quote: AREA_QUOTE,
    options: [],
    free: true,
    parse: parseCode,
  })),
  attestations: [
    {
      id: 'math-petition',
      label: 'Mathematics Department petition approved for MATH 11A / 11B / 23A',
      quote: PETITION_QUOTE,
      aliases: ['petition', 'math petition'],
    },
    {
      id: 'language-equivalent',
      label: 'Level-6 language proficiency by an equivalent (placement or prior study, confirmed by the language department / Economics)',
      quote: LANGUAGE_QUOTE,
      aliases: ['language equivalent', 'language placement', 'language proficiency', 'level 6'],
    },
    {
      id: 'area-plan',
      label: 'Area studies course plan pre-approved by an economics advisor',
      quote: AREA_PLAN_QUOTE,
      aliases: ['area studies plan', 'area study approval', 'area plan'],
    },
    {
      id: 'study-abroad',
      label: 'At least one term abroad in an approved program in your regional area',
      quote: ABROAD_QUOTE,
      aliases: ['study abroad', 'abroad', 'uceap', 'eap', 'overseas'],
    },
  ],
  notes: [
    'P/NP is allowed for major courses (the department recommends no more than two); the comprehensive core courses need C/P or better.',
    'Transfer students must take ECON 100A, 100B, 113, the DC course, and at least two upper-division economics electives at UC Santa Cruz — the app does not track where a course was taken.',
    'The language, area study and study abroad should all relate to the same region of the world.',
  ],
  evaluate(h) {
    // "The Economics Department allows classes toward major requirements taken for the Pass/No Pass (P/NP) grade notification."
    h.policy = undefined

    const PETITION = new Set(['MATH11A', 'MATH11B', 'MATH23A'])
    const math = h.options(
      'math',
      'Mathematics content',
      ['Plus one of the following mathematics content options:', PETITION_QUOTE],
      [
        ['AM 11A', 'AM 11B'],
        ['MATH 19A', 'MATH 19B', 'AM 30'],
        ['MATH 19A', 'AM 11B'],
        ['MATH 11A', 'MATH 11B', 'MATH 22'],
        ['MATH 19A', 'MATH 19B', 'MATH 23A'],
        ['MATH 11A', 'AM 11B'],
      ],
    )
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('econ-intro', 'ECON 1 and ECON 2', 'Take the following courses:', ['ECON 1', 'ECON 2']),
      math,
      h.all('stats', 'STAT 17 and STAT 17L', 'Plus the following statistics courses:', ['STAT 17', 'STAT 17L']),
      language(h),
    ])

    const list = codes(...GLOBAL_LIST)
    // "any additional 5-credit economics elective course numbered 100-189 or CRWN 152".
    // ECON 100A/100M and 100B/100N are no-credit-for-both pairs (catalog),
    // so the unused partner of a core course is never an elective.
    const other = range('ECON', 100, 189).except(['ECON 100A', 'ECON 100M', 'ECON 100B', 'ECON 100N']).minCredits(5).or(codes('CRWN 152'))
    // Cross-listed partner codes (LGST 128 for ECON 128) match through the library.
    const pool = list.or(other).or(codes(...INDEPENDENT))
    const electives = h.take(
      'electives',
      'Four upper-division electives',
      [
        'Students complete four additional upper-division electives as follows:',
        'Students must take three from the following list:',
        'The fourth elective may be any additional 5-credit economics elective course numbered 100-189 or CRWN 152.',
        'No course may satisfy more than one requirement. Either course ECON 195 or ECON 199 may be used to fill one of the four electives.',
      ],
      pool,
      {
        n: 4,
        atLeast: [{ set: list, n: 3, label: 'From the global economics list' }],
        atMost: [{ set: codes(...INDEPENDENT), n: 1, label: 'ECON 195 / ECON 199' }],
        pool: `three of ${GLOBAL_LIST.join(', ')}; plus one more ECON 100–189 (5 credits), CRWN 152, ECON 195 or ECON 199`,
        notes: ['Economics field-study courses do not satisfy upper-division requirements.'],
      },
    )

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('micro', 'Intermediate Microeconomics', 'Choose one of the following courses:', codes('ECON 100A', 'ECON 100M')),
      h.take('macro', 'Intermediate Macroeconomics', 'Plus one of the following courses:', codes('ECON 100B', 'ECON 100N')),
      h.take('econ113', 'ECON 113 Econometrics', 'Plus the following course:', codes('ECON 113')),
      h.take('dc', 'Disciplinary Communication (DC)', [
        'Plus one of the following disciplinary communication (DC) courses:',
        'The DC requirement in economics is satisfied by completing one of the following courses:',
      ], codes('ECON 104', 'ECON 197')),
      electives,
      h.attest('study-abroad'),
    ])
    const areaAt = upper.children!.length - 1

    const C = { min: 'C', pCounts: true }
    const compQuote = 'The comprehensive requirement is satisfied by passing the following intermediate core courses with grades of C/P or better here at UC Santa Cruz:'
    const comprehensive = h.group(
      'comprehensive',
      'Comprehensive Requirement (C/P or better)',
      [
        h.take('comp-micro', 'ECON 100A or 100M, C/P or better', compQuote, codes('ECON 100A', 'ECON 100M'), { exclusive: false, policy: C }),
        h.take('comp-macro', 'ECON 100B or 100N, C/P or better', compQuote, codes('ECON 100B', 'ECON 100N'), { exclusive: false, policy: C }),
        h.take('comp-113', 'ECON 113, C/P or better', compQuote, codes('ECON 113'), { exclusive: false, policy: C }),
      ],
      { quote: compQuote, notes: ['These must be taken at UC Santa Cruz.'] },
    )

    h.solve()
    upper.children!.splice(areaAt, 0, areaStudy(h))
    // Strict reading: ECON 195/199 is the fourth ("any additional") elective.
    // The page says it may fill "one of the four", so if it could only
    // complete the requirement by standing in for a list course, do not say unmet.
    if (electives.status === 'unmet') {
      const mine = new Set((electives.used ?? []).map((e) => e.id))
      const avail = h.taken(pool).filter((e) => !h.used.has(e.id) || mine.has(e.id))
      // One entry per course (a cross-listed partner code is the same course).
      const key = (c: string) => [c, ...h.catalog.equivalents(c)].sort()[0]
      const listN = new Set(avail.filter((e) => list.has(e.code, h.catalog)).map((e) => key(e.code))).size
      const otherN = new Set(avail.filter((e) => other.has(e.code, h.catalog) && !list.has(e.code, h.catalog)).map((e) => key(e.code))).size
      const w = avail.some((e) => INDEPENDENT.includes(e.display)) ? 1 : 0
      if (w && listN + w >= 3 && listN + otherN + w >= 4) {
        electives.status = 'cannot-check'
        electives.detail =
          'Complete only if ECON 195/199 replaces one of the three global-economics list courses (the page says it may fill “one of the four electives”) — confirm with an advisor.'
      }
    }
    if (math.status === 'met' && (math.used ?? []).some((e) => PETITION.has(e.code))) {
      lower.children = lower.children!.map((n) =>
        n === math ? h.group('math-petition-path', 'Mathematics content (by petition)', [math, h.attest('math-petition')], { quote: PETITION_QUOTE }) : n,
      )
    }
    return [lower, upper, comprehensive]
  },
})

/**
 * "completing level 6 of a language course offered at UC Santa Cruz or its
 * equivalent" — a level-6 course in the plan, or (only when none is) an
 * attested equivalent (placement, prior study, a language UCSC does not teach
 * through level 6).
 */
function language(h: HarnessContext): Node {
  const title = 'Foreign language through level 6'
  const got = h.taken(codes(...LEVEL6))
  if (got.length) return h.node('language', title, LANGUAGE_QUOTE, 'met', { used: got.slice(0, 1) })
  return h.either('language', title, LANGUAGE_QUOTE, [
    h.node('language-course', `Level 6 course (${LEVEL6.join(', ')})`, LANGUAGE_QUOTE, 'unmet', { detail: 'No level-6 language course in your plan.', options: codes(...LEVEL6).members }),
    h.attest('language-equivalent'),
  ])
}

/**
 * Two non-economics area-study courses, declared by the student (the approved
 * list is external). Each must be in the plan, outside ECON, distinct, and not
 * used by another requirement; the plan itself needs advisor pre-approval.
 */
function areaStudy(h: HarnessContext): Node {
  const candidates = [...new Set(h.passed.filter((e) => !/^ECON/.test(e.code) && !h.used.has(e.id)).map((e) => e.code))]
  const seen = new Set<string>()
  const kids: Node[] = AREA_KEYS.map((key, i) => {
    const id = `area-study-${i + 1}`
    const title = `Area study course ${i + 1}`
    const code = h.choice(key)
    if (!code) {
      if (!candidates.length)
        return h.node(id, title, AREA_QUOTE, 'unmet', { detail: 'No non-economics course in your plan that could be an area-study course.', choice: key })
      return h.cannotCheck(id, title, AREA_QUOTE, 'Check the Economics Department’s approved area-studies course list (or an approved substitute), then say which of your courses this is.', { choice: key, options: candidates })
    }
    const bad = (detail: string) => h.node(id, title, AREA_QUOTE, 'unmet', { detail, choice: key, options: candidates })
    if (/^ECON/.test(code)) return bad(`${display(code)} is an economics course; area-study courses come from departments other than economics.`)
    const k = [code, ...h.catalog.equivalents(code)].sort()[0]
    if (seen.has(k)) return bad(`${display(code)} is already your other area-study course.`)
    seen.add(k)
    const got = h.taken(codes(code))
    if (!got.length) return bad(`${display(code)} is not in your plan (or was not passed).`)
    const free = got.filter((e) => !h.used.has(e.id))
    if (!free.length) return bad(`${display(code)} already counts toward another requirement ("No course may satisfy more than one requirement.").`)
    return h.node(id, title, AREA_QUOTE, 'met', { used: free.slice(0, 1), choice: key, detail: 'Per your declaration.', options: candidates })
  })
  const declared = AREA_KEYS.every((k) => h.choice(k))
  return h.group('area-study', 'Area study: two courses outside economics', [...kids, declared ? h.attest('area-plan') : null], {
    quote: [AREA_QUOTE, AREA_PLAN_QUOTE],
    notes: ['The courses must focus on the area of your language study and overseas study (the app cannot check this).'],
  })
}
