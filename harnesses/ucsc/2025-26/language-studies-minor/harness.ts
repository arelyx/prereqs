// Language Studies Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/language-studies-minor.md
//
// LING 50, Level 6 in the language of concentration (or its equivalent),
// LING 100 plus LING 111 or LING 112, one advanced language course in that language, two
// electives. Cultural context courses come from an external list the app does
// not have: the student declares which of their courses are on it (choice);
// an elective shortfall that undeclared upper-division courses could cover is
// cannot-check, never unmet.
import { anyOf, canon, codes, defineHarness, display, range, series } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Lang = 'chinese' | 'french' | 'german' | 'italian' | 'japanese' | 'spanish'

const LANGS: Record<Lang, { label: string; level6: string[]; advanced: CourseSet; lit: CourseSet; subjects: string[]; quote: string }> = {
  chinese: { label: 'Chinese', level6: ['CHIN 6'], advanced: range('CHIN', 100, 199), lit: codes(), subjects: ['CHIN'], quote: 'Chinese: CHIN 100-199' },
  french: { label: 'French', level6: ['FREN 6'], advanced: range('FREN', 100, 199), lit: series('LIT', 182), subjects: ['FREN'], quote: 'French: FREN 100-199 or from the LIT 182 series' },
  // 2025-26 lists German as an Advanced Language option, but the Level 6 list
  // has no German course: Level 6 German can only be shown "or its
  // equivalent" (attestation).
  german: { label: 'German', level6: [], advanced: range('GERM', 100, 199), lit: series('LIT', 183), subjects: ['GERM'], quote: 'German: GERM 100-199 or from the LIT 183 series' },
  italian: { label: 'Italian', level6: ['ITAL 6'], advanced: range('ITAL', 100, 199).except(['ITAL 101']), lit: series('LIT', 185), subjects: ['ITAL'], quote: 'Italian: ITAL 100-199 (excluding ITAL 101) or from the LIT 185 series' },
  japanese: { label: 'Japanese', level6: ['JAPN 6'], advanced: range('JAPN', 100, 199), lit: codes(), subjects: ['JAPN'], quote: 'Japanese: JAPN 100-199' },
  spanish: { label: 'Spanish', level6: ['SPAN 6', 'SPHS 6'], advanced: range('SPAN', 100, 199).or(range('SPHS', 100, 199)), lit: series('LIT', 188).or(series('LIT', 189)), subjects: ['SPAN', 'SPHS'], quote: 'Spanish: SPAN 100-199, SPHS 100-199, or from the LIT 188 or 189 series' },
}
const LANG_KEYS = Object.keys(LANGS) as Lang[]

const SYNTAX = codes('LING 111', 'LING 112')
const LIT_NOTE =
  'Note: The LIT courses listed above may only be used to fulfill the Advanced Language requirement if a student has completed or tested out of Level 6 of the corresponding lower-division language prior to taking the class.'

const CC_QUOTE = 'The [list of approved cultural context courses](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/humanities-division/linguistics/language-studies-cultural-context-electives-course-list)'
// "These courses include independent study (LING 199), …" / "Students may
// apply no more than one quarter of LING 199."
const LING199 = codes('LING 199')

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
  program: 'language-studies-minor',
  edition: '2025-26',
  title: 'Language Studies Minor',
  choices: [
    {
      key: 'concentration',
      label: 'Language of concentration',
      quote: 'Students must demonstrate a level of competency in the language of concentration.',
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
  ],
  notes: [
    'Courses may be taken for a letter grade or P/NP.',
    'Cultural context courses come from the department’s list of approved cultural context courses, which the app does not have; they must align with your language of concentration.',
    'You may not combine this minor with the linguistics major (see the major’s overlap policy).',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const lang = concentration(h)
    if (!lang) return [h.needChoice('concentration')!]
    const L = LANGS[lang]

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
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('ling50', 'LING 50 Introduction to Linguistics', 'LING 50 — Introduction to Linguistics (5)', codes('LING 50')),
      level6,
    ])

    // --- upper division ----------------------------------------------------
    // 2025-26: "Take the following course:" LING 100, "Plus one of the
    // following courses:" LING 111 or LING 112 (2026-27 instead has "two of"
    // LING 100/101/111/112/171).
    const two = h.group('ling-two', 'Required linguistics courses', [
      h.take('ling100', 'LING 100 Phonetics I', "LING 100 — Sounds of the World's Languages: Phonetics I (5)", codes('LING 100')),
      h.take('syntax', 'LING 111 or LING 112', 'Plus one of the following courses:', SYNTAX),
    ], { quote: 'These requirements are comprised of two required linguistics courses, one advanced language course, and two electives, as follows:' })

    const advPool = L.advanced.or(L.lit).minCredits(5)
    const litOk = litTiming(h, L)
    const advanced = h.take('advanced', `Advanced ${L.label} language course`, ['One 5-credit Advanced Language course is required. Courses must be within the language of concentration and can be chosen from the following:', L.quote, LIT_NOTE], advPool, {
      check: (chosen) => chosen.map(litOk).find((x) => x) ?? null,
      prefer: (c) => (L.lit.has(c) ? 1 : 0),
      pool: L.quote,
    })

    // "LING 101-189 (excluding LING 111 and LING 112)" / "LING 200-289".
    const elecPool = range('LING', 101, 189).or(range('LING', 200, 289)).minCredits(5).except(SYNTAX).or(advPool).or(LING199)
    // Courses of the other concentration languages cannot align with this one.
    const otherLangs = LANG_KEYS.filter((k) => k !== lang).flatMap((k) => [...LANGS[k].subjects.map((sub) => range(sub, 1, 299)), LANGS[k].lit])
    const outside = wildcards(h, anyOf(elecPool, SYNTAX, ...otherLangs))
    const declared = new Set((h.choice('cultural_context_courses') ?? '').split(',').filter(Boolean))
    const cc = outside.filter((c) => declared.has(c))
    const wild = new Set(outside.filter((c) => !declared.has(c)))
    const pool = [...cc, ...wild]
    const electives = h.take(
      'electives',
      'Two upper-division electives',
      ['The minor requires two 5-credit upper-division elective courses. Courses may be chosen from:', 'LING 101-189 (excluding LING 111 and LING 112)', 'LING 200-289', CC_QUOTE, 'Additional Advanced Language Courses listed above', 'Students may apply no more than one quarter of LING 199.', 'Cultural context courses and advanced language courses must align with the language of concentration.'],
      pool.length ? elecPool.or(codes(...pool)) : elecPool,
      {
        n: 2,
        repeatable: 'catalog',
        prefer: (c) => (wild.has(c) ? 3 : LING199.has(c) ? 2 : cc.includes(c) ? 1 : 0),
        atMost: [{ set: LING199, n: 1, label: 'LING 199' }],
        pool: `LING 101–189 (not 111/112) or 200–289 (5 credits), ${L.label} advanced language courses, approved cultural context courses, or one LING 199`,
        notes: ['If Level 6 is not yet completed, the LIT courses may count here instead of as the advanced language course.'],
      },
    )
    h.solve()
    flagWild(electives, wild)

    const upper = h.group('upper', 'Upper-Division Courses', [two, advanced, electives], {
      quote: 'The minor requires 25 upper-division credits. These requirements are comprised of two required linguistics courses, one advanced language course, and two electives, as follows:',
    })
    return [lower, upper]
  },
})

/** Declared language, else the only language the plan has courses in. */
function concentration(h: HarnessContext): Lang | undefined {
  const v = (h.choice('concentration') as Lang | undefined) ?? parseLang(h.rawChoices.language)
  if (v) return v
  const hits = LANG_KEYS.filter((k) => h.passed.some((e) => LANGS[k].subjects.some((s) => e.code.startsWith(s)) || LANGS[k].lit.has(e.code)))
  return hits.length === 1 ? hits[0] : undefined
}

/**
 * The LIT courses count as the advanced language course only when Level 6
 * was completed (or tested out of) before the LIT class. Returns a reason when
 * the enrollment does not qualify, else null.
 */
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

/**
 * Upper-division (5+ credit, non-LING) courses in the plan that are not in any
 * listed pool: they might be on the external cultural-context list. They join
 * the elective pool as last-choice wildcards; a fill that needs one is
 * cannot-check, never met.
 */
function wildcards(h: HarnessContext, known: CourseSet): string[] {
  const out = new Set<string>()
  for (const e of h.passed) {
    if (e.code.startsWith('LING') || known.has(e.code, h.catalog)) continue
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
