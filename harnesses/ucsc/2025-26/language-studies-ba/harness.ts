// Language Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/language-studies-ba.md
//
// One language of concentration (Chinese, French, German, Italian, Japanese, Spanish)
// shapes the Level 6 course, the advanced language course(s) and which
// electives align. Upper division is one allocation: advanced language course,
// LING 100, LING 101, LING 111/112, five electives (for Chinese/Japanese the
// second advanced language course is one of the five). Cultural context
// courses come from an external list: the student declares which of their
// courses are on it (choice); undeclared upper-division courses join the
// elective pool as wildcards and a fill that needs one is cannot-check. The
// comprehensive and DC are overlays on those courses.
import { anyOf, canon, codes, defineHarness, display, range, series } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Lang = 'chinese' | 'french' | 'german' | 'italian' | 'japanese' | 'spanish'

const LANGS: Record<Lang, { label: string; level6: string[]; advanced: CourseSet; lit: CourseSet; subjects: string[]; quote: string }> = {
  chinese: { label: 'Chinese', level6: ['CHIN 6'], advanced: range('CHIN', 100, 199), lit: codes(), subjects: ['CHIN'], quote: 'Chinese: CHIN 100-199' },
  french: { label: 'French', level6: ['FREN 6'], advanced: range('FREN', 100, 199), lit: series('LIT', 182), subjects: ['FREN'], quote: 'French: FREN 100-199 or from the LIT 182 series' },
  // 2025-26 offers a German concentration, but the Level 6 list has no German
  // course: Level 6 German can only be shown "or its equivalent" (attestation).
  german: { label: 'German', level6: [], advanced: range('GERM', 100, 199), lit: series('LIT', 183), subjects: ['GERM'], quote: 'German: GERM 100-199 or from the LIT 183 series' },
  italian: { label: 'Italian', level6: ['ITAL 6'], advanced: range('ITAL', 100, 199).except(['ITAL 101']), lit: series('LIT', 185), subjects: ['ITAL'], quote: 'Italian: ITAL 100-199 (excluding ITAL 101) or from the LIT 185 series' },
  japanese: { label: 'Japanese', level6: ['JAPN 6'], advanced: range('JAPN', 100, 199), lit: codes(), subjects: ['JAPN'], quote: 'Japanese: JAPN 100-199' },
  spanish: { label: 'Spanish', level6: ['SPAN 6', 'SPHS 6'], advanced: range('SPAN', 100, 199).or(range('SPHS', 100, 199)), lit: series('LIT', 188).or(series('LIT', 189)), subjects: ['SPAN', 'SPHS'], quote: 'Spanish: SPAN 100-199, SPHS 100-199, or from the LIT 188 or 189 series' },
}
const LANG_KEYS = Object.keys(LANGS) as Lang[]

const SYNTAX = codes('LING 111', 'LING 112')
const LING195 = codes('LING 195')
const LING199 = codes('LING 199')
const GRAD = range('LING', 200, 289).minCredits(5)
// "LING 102-189 (excluding LING 111 and LING 112)" / "LING 200-289"; LING 190
// is 2 credits and is not one of the five 5-credit electives.
const LING_ELECTIVES = range('LING', 102, 189).minCredits(5).except(SYNTAX).or(GRAD)
// The capstone's associated course: one of the upper-division linguistics
// electives (LING 102-189 except 111/112, or 200-289) in the same quarter.
const CAPSTONE_PARTNER = LING_ELECTIVES

const LIT_NOTE =
  'Note: The LIT courses listed above may only be used to fulfill the Advanced Language requirement if a student has completed or tested out of Level 6 of the corresponding lower-division language prior to taking the class.'

const CC_QUOTE = 'The [list of approved cultural context courses](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/humanities-division/linguistics/language-studies-cultural-context-electives-course-list)'

/** Free-form course list: "HIS 155, POLI 140A" → canonical, comma-joined. */
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
  return LANG_KEYS.find((k) => n.includes(k) || n.includes(norm(LANGS[k].label))) ?? (n.includes('sphs') || n.includes('heritage') ? 'spanish' : undefined)
}

export default defineHarness({
  program: 'language-studies-ba',
  edition: '2025-26',
  title: 'Language Studies B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Language of concentration',
      quote: 'Currently, majors may choose a concentration in Chinese, French, German, Italian, Japanese, or Spanish.',
      options: LANG_KEYS.map((k) => ({ value: k, label: LANGS[k].label, aliases: [LANGS[k].subjects[0].toLowerCase()] })),
      parse: parseLang,
    },
    // External list → the student declares which courses are on it (§1a).
    { key: 'cultural_context_courses', label: 'Your courses on the approved cultural context list', quote: CC_QUOTE, options: [], free: true, parse: parseList },
  ],
  attestations: [
    {
      id: 'level6-equivalent',
      label: 'Level 6 proficiency by placement / tested out (equivalent)',
      quote: 'This is accomplished by completing one of the Level 6 language courses below, or its equivalent.',
      aliases: ['level 6', 'placement', 'tested out', 'equivalent', 'proficiency'],
    },
    {
      id: 'thesis-approval',
      label: 'Senior thesis proposal approved by the department faculty',
      quote: 'The proposal for a senior thesis must be submitted for the approval of the department faculty at least three quarters prior to the quarter of graduation.',
      aliases: ['thesis proposal', 'thesis approval', 'senior thesis'],
    },
    {
      id: 'grad-exception',
      label: 'Graduate course accepted as the senior comprehensive (by exception)',
      quote: 'By exception, students in their senior year may enroll in a graduate-level linguistics class, by permission of the instructor.',
      aliases: ['graduate course', 'graduate-level', 'by exception', 'instructor permission'],
    },
  ],
  notes: [
    'Courses may be taken P/NP except the two major-qualification courses (C+ or better, letter grade).',
    'At most three outside courses (courses from other institutions, study abroad, LING 195/199 substitutions) may count toward the major; courses abroad need approval by the undergraduate program director — add them once approved.',
    'Cultural context courses come from the department’s list of approved cultural context courses, which the app does not have; they must align with your language of concentration.',
    'You may not double major or major/minor in linguistics and language studies.',
  ],
  coverage: {
    ignore: {
      LING171: 'named only as a major-qualification gateway course (info); as a course it is in the LING 102-189 elective range',
    },
  },
  evaluate(h) {
    // "All other courses used toward major requirements may be taken for a
    // letter grade or pass/no pass." (the C+ rule is for qualification only)
    h.policy = undefined
    const lang = concentration(h)
    if (!lang) return [h.needChoice('concentration')!]
    const L = LANGS[lang]
    const twoAdvanced = lang === 'chinese' || lang === 'japanese'

    // --- lower division ----------------------------------------------------
    // "or its equivalent": placement is an attestation offered only when no
    // Level 6 course is in the plan (§1a test-out convention).
    const l6Set = codes(...L.level6)
    const l6Title = `Level 6 course (${L.level6.join(' or ')})`
    const l6Quote = 'This is accomplished by completing one of the Level 6 language courses below, or its equivalent.'
    const level6 = !L.level6.length
      ? h.attested('level6-equivalent')
        ? h.node('level6', `Level 6 ${L.label}`, l6Quote, 'met', { detail: 'By placement / equivalent proficiency (attested).' })
        : h.group('level6', `Level 6 ${L.label}`, [h.attest('level6-equivalent')], { quote: 'Students must demonstrate a level of competency in the language of concentration.' })
      : h.enrollments.some((e) => l6Set.has(e.code))
      ? h.group('level6', `Level 6 ${L.label}`, [h.take('level6/course', l6Title, l6Quote, l6Set, { exclusive: false })])
      : h.attested('level6-equivalent')
        ? h.node('level6', `Level 6 ${L.label}`, l6Quote, 'met', { detail: 'By placement / equivalent proficiency (attested).' })
        : h.either('level6', `Level 6 ${L.label}`, 'Students must demonstrate a level of competency in the language of concentration.', [
            h.take('level6/course', l6Title, l6Quote, l6Set, { exclusive: false }),
            h.attest('level6-equivalent'),
          ])
    const lower = h.group('lower', 'Lower-Division', [
      h.group('lower-language', 'Lower-Division Language Requirements', [level6]),
      h.all('lower-ling', 'Lower-Division Linguistics Requirements', 'LING 50 — Introduction to Linguistics (5)', ['LING 50', 'LING 53']),
      h.info(
        'qualification',
        'Major qualification (gateway courses)',
        'In order to qualify for the language studies major, a student must pass two gateway courses with a grade of C+ or better in each:',
        'LING 50 plus one of LING 53, 101, 112 or 171, each C+ or better for a letter grade. This gates declaration, not completion.',
      ),
    ])

    // --- upper division ----------------------------------------------------
    const advPool = L.advanced.or(L.lit).minCredits(5)
    const litOk = litTiming(h, L)
    const advQuote = [
      twoAdvanced
        ? 'For students concentrating in Chinese or Japanese, two 5-credit advanced language courses are required, the second of which counts toward the upper-division electives requirement.'
        : 'For students concentrating in French, German, Italian, or Spanish, one 5-credit advanced language course is required.',
      'Courses must be within the language of concentration and can be chosen from the following:',
      L.quote,
      ...(twoAdvanced ? [] : [LIT_NOTE]),
    ]
    const advanced = h.take('advanced', `Advanced ${L.label} language course`, advQuote, advPool, {
      check: (chosen) => chosen.map(litOk).find((x) => x) ?? null,
      prefer: (c) => (L.lit.has(c) ? 1 : 0),
      pool: L.quote,
    })

    const lingReq = h.group('ling-required', 'Upper-Division Linguistics Requirements', [
      h.all('ling-100-101', 'LING 100 and LING 101', 'LING 100 — Sounds of the World\'s Languages: Phonetics I (5)', ['LING 100', 'LING 101']),
      h.take('syntax', 'LING 111 or LING 112', 'One of the following courses:', SYNTAX),
    ])

    // Electives. Known pool + wildcards (possible cultural context courses).
    const known = LING_ELECTIVES.or(advPool).or(LING195).or(LING199)
    const otherLangs = LANG_KEYS.filter((k) => k !== lang).flatMap((k) => [...LANGS[k].subjects.map((s) => range(s, 1, 299)), LANGS[k].lit])
    const outside = wildcards(h, anyOf(known, SYNTAX, range('LING', 1, 299), ...otherLangs))
    const declared = new Set((h.choice('cultural_context_courses') ?? '').split(',').filter(Boolean))
    const cc = outside.filter((c) => declared.has(c))
    const wild = new Set(outside.filter((c) => !declared.has(c)))
    const pool = [...cc, ...wild]
    const nElect = twoAdvanced ? 4 : 5
    const secondAdv = twoAdvanced
      ? h.take('second-advanced', `Second advanced ${L.label} language course (one of the five electives)`, 'For students concentrating in Chinese or Japanese, two 5-credit advanced language courses are required, the second of which counts toward the upper-division electives requirement.', L.advanced.minCredits(5), { pool: L.quote })
      : null
    const electives = h.take(
      'electives',
      twoAdvanced ? 'Four more upper-division electives' : 'Five upper-division electives',
      [
        'The major requires five 5-credit upper-division elective courses. Courses may be chosen from:',
        'LING 102-189 (excluding LING 111 and LING 112)',
        'LING 200-289 (one of which could satisfy the senior comprehensive)',
        CC_QUOTE,
        'Additional advanced language courses listed above',
        'Cultural context courses and advanced language courses must align with the language of concentration.',
        'Students may apply up to two quarters of LING 195 or one quarter of LING 199, but not both.',
      ],
      pool.length ? known.or(codes(...pool)) : known,
      {
        n: nElect,
        repeatable: 'catalog',
        prefer: (c) => (wild.has(c) ? 3 : LING195.has(c) || LING199.has(c) ? 2 : cc.includes(c) ? 1 : 0),
        atMost: [
          { set: LING195, n: 2, label: 'LING 195' },
          { set: LING199, n: 1, label: 'LING 199' },
        ],
        check: (chosen) => (chosen.some((e) => LING195.has(e.code)) && chosen.some((e) => LING199.has(e.code)) ? 'LING 195 and LING 199 cannot both count' : null),
        pool: `LING 102–189 (not 111/112) or 200–289, 5 credits; ${L.label} advanced language courses; approved cultural context courses; up to two LING 195 or one LING 199`,
        notes: ['If Level 6 was not completed before a LIT course, that LIT course can still count here.', 'Graduate courses need instructor permission.'],
      },
    )
    h.solve()
    flagWild(electives, wild)
    // A LIT course with no term next to a dated Level 6: order unknown, so
    // do not call the advanced course unmet (rule 3).
    if (advanced.status === 'unmet' && h.taken(codes(...L.level6)).some((e) => e.term != null)) {
      const undated = h.passed.filter((e) => e.term == null && L.lit.has(e.code))
      if (undated.length) {
        advanced.status = 'cannot-check'
        advanced.detail = `${undated.map((e) => e.display).join(', ')} has no term — it counts here only if taken after Level 6.`
      }
    }

    // --- DC (overlay) ------------------------------------------------------
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc/ling101', 'LING 101', 'The DC requirement in language studies is satisfied by completing:', codes('LING 101'), { exclusive: false }),
      h.take('dc/syntax', 'LING 111 or LING 112', 'Plus one of the following courses:', SYNTAX, { exclusive: false }),
    ])
    h.solve()

    const comprehensive = comprehensiveNode(h)
    const count = upperCount(h, [advanced, ...lingReq.children!.flatMap((c) => c.children ?? [c]), secondAdv, electives].filter((n): n is Node => !!n), comprehensive, known)

    const upper = h.group('upper', 'Upper-Division', [
      h.group('advanced-group', 'Advanced Language Course', [advanced]),
      lingReq,
      h.group('electives-group', 'Electives', [secondAdv, electives]),
      comprehensive,
      count,
    ])
    return [lower, upper, dc]
  },
})

/** Declared language, else the only concentration language the plan has courses in. */
function concentration(h: HarnessContext): Lang | undefined {
  const v = (h.choice('concentration') as Lang | undefined) ?? parseLang(h.rawChoices.language)
  if (v) return v
  const hits = LANG_KEYS.filter((k) => h.passed.some((e) => LANGS[k].subjects.some((s) => e.code.startsWith(s)) || LANGS[k].lit.has(e.code)))
  return hits.length === 1 ? hits[0] : undefined
}

/** LIT courses count as the advanced course only when Level 6 came first. */
function litTiming(h: HarnessContext, L: (typeof LANGS)[Lang]): (e: Enrollment) => string | null {
  const l6 = h.taken(codes(...L.level6))
  const terms = l6.map((e) => (e.term == null ? -1 : Number(e.term)))
  const first = terms.length ? Math.min(...terms) : null
  const testedOut = h.attested('level6-equivalent')
  return (e) => {
    if (!L.lit.has(e.code)) return null
    if (first == null) return testedOut ? null : `${e.display}: Level 6 not completed before the class`
    if (first === -1) return null
    if (e.term != null && Number(e.term) > first) return null
    return `${e.display}: taken before Level 6 was completed — it may count as an elective instead`
  }
}

const termNo = (e: Enrollment) => (e.term == null ? -1 : Number(e.term))

/**
 * "In their senior year, and after completing the Disciplinary Communication
 * requirement, language studies majors must satisfy the senior comprehensive
 * requirement in one of three ways". The order is checked only when the DC is
 * complete (otherwise the DC node already reports the gap).
 */
function comprehensiveNode(h: HarnessContext): Node {
  const d101 = h.taken(codes('LING 101')).map(termNo)
  const dSyn = h.taken(SYNTAX).map(termNo)
  const dcTerm = d101.length && dSyn.length ? Math.max(Math.min(...d101), Math.min(...dSyn)) : null
  const after = (e: Enrollment) => dcTerm == null || dcTerm === -1 || e.term == null || Number(e.term) > dcTerm
  const orderNote = 'must come after the DC courses (LING 101 and LING 111/112)'

  // Option 1: LING 190 + its concurrent upper-division linguistics elective.
  const l190 = h.taken(codes('LING 190'))
  const noTerm = l190.some((e) => e.term == null) && h.passed.some((x) => x.term == null && CAPSTONE_PARTNER.has(x.code, h.catalog))
  const pairs = l190.filter((e) => e.term != null && h.passed.some((x) => x.term === e.term && CAPSTONE_PARTNER.has(x.code, h.catalog)))
  const pairOk = pairs.filter(after)
  const capstone = h.node(
    'comp/capstone',
    'Option 1: LING 190 with its concurrent upper-division elective',
    ['Students must enroll concurrently in an upper-division elective and in the corresponding instance of the following course:', 'LING 190 — Senior Research (2)'],
    pairOk.length ? 'met' : noTerm ? 'cannot-check' : 'unmet',
    {
      used: pairOk.length ? [pairOk[0], ...h.passed.filter((x) => x.term === pairOk[0].term && CAPSTONE_PARTNER.has(x.code, h.catalog)).slice(0, 1)] : [],
      options: ['LING190'],
      detail: pairOk.length
        ? 'The concurrent elective must be the course this LING 190 instance is attached to.'
        : pairs.length
          ? `LING 190 ${orderNote}.`
          : noTerm
            ? 'LING 190 and an upper-division linguistics elective have no term — check that they were taken concurrently.'
            : l190.length
            ? 'LING 190 needs an upper-division linguistics elective in the same quarter.'
            : undefined,
    },
  )

  // Option 2: senior thesis.
  const thesis = h.taken(LING195)
  const thesisOk = thesis.filter(after)
  const thesisNode = h.group('comp/thesis', 'Option 2: Senior thesis (LING 195)', [
    h.node('comp/thesis/course', 'LING 195 Senior Thesis', 'LING 195 — Senior Thesis (5)', thesisOk.length ? 'met' : 'unmet', {
      used: thesisOk.slice(0, 1),
      options: ['LING195'],
      detail: thesis.length && !thesisOk.length ? `LING 195 ${orderNote}.` : undefined,
    }),
    h.attest('thesis-approval'),
  ])

  // Option 3: graduate-level course (by exception).
  const grad = h.taken(GRAD)
  const gradOk = grad.filter(after)
  const gradNode = h.group('comp/graduate', 'Option 3: Graduate-level linguistics course', [
    h.node('comp/graduate/course', 'A LING 200–289 course', 'Under these conditions, a graduate-level course may may satisfy the senior exit requirement.', gradOk.length ? 'met' : 'unmet', {
      used: gradOk.slice(0, 1),
      pool: 'LING 200–289',
      detail: grad.length && !gradOk.length ? `The graduate course ${orderNote}.` : undefined,
    }),
    h.attest('grad-exception'),
  ])

  return h.either('comprehensive', 'Comprehensive Requirement', 'In their senior year, and after completing the Disciplinary Communication requirement, language studies majors must satisfy the senior comprehensive requirement in one of three ways:', [capstone, thesisNode, gradNode])
}

/**
 * "a minimum of 10 upper-division courses (50 upper-division credits)". The
 * itemized requirements add up to nine 5-credit courses plus the comprehensive
 * (LING 190 is 2 credits), so a record with nine is left to the advisor.
 */
function upperCount(h: HarnessContext, slots: Node[], comp: Node, known: CourseSet): Node {
  const ids = new Set<string>()
  const add = (e: Enrollment) => {
    const c = h.catalog.get(e.code)
    if (c && c.credits < 5) return
    ids.add(e.id)
  }
  for (const n of slots) for (const e of n.used ?? []) add(e)
  const walk = (n: Node) => {
    if (n.status === 'met') for (const e of n.used ?? []) add(e)
    n.children?.forEach(walk)
  }
  walk(comp)
  // Spare upper-division courses from the elective pool also count.
  for (const e of h.passed) if (!h.used.has(e.id) && known.has(e.code, h.catalog)) add(e)
  const have = ids.size
  const quote = 'Students in the language studies major are required to complete a minimum of 10 upper-division courses (50 upper-division credits) in linguistics, cultural context, and advanced language study.'
  if (have >= 10) return h.node('upper-count', 'At least 10 upper-division courses (50 credits)', quote, 'met', { progress: { have: 10, need: 10 }, minor: true })
  return h.cannotCheck('upper-count', 'At least 10 upper-division courses (50 credits)', quote, `${have} upper-division courses of 5+ credits count toward the major. The itemized requirements total nine plus the comprehensive — confirm with an advisor whether a tenth is needed.`, {
    progress: { have, need: 10 },
    minor: true,
  })
}

/**
 * Upper-division (5+ credit) courses in the plan outside every listed pool and
 * outside the other concentration languages: they might be on the external
 * cultural-context or pre-approved outside list.
 */
function wildcards(h: HarnessContext, known: CourseSet): string[] {
  const out = new Set<string>()
  for (const e of h.passed) {
    if (known.has(e.code, h.catalog)) continue
    const c = h.catalog.get(e.code)
    if (c && !(c.division === 'upper' || c.division === 'graduate')) continue
    if (c && c.credits < 5) continue
    out.add(e.code)
  }
  return [...out]
}

function flagWild(node: Node, wild: Set<string>) {
  if (node.status !== 'met') return
  const w = (node.used ?? []).filter((e) => wild.has(e.code))
  if (!w.length) return
  node.status = 'cannot-check'
  node.choice = 'cultural_context_courses'
  node.detail = `Counts only if ${w.map((e) => display(e.code)).join(', ')} ${w.length > 1 ? 'are' : 'is'} on the list of approved cultural context courses (declare ${w.length > 1 ? 'them' : 'it'} as yours) or an approved outside elective — check the list.`
}
