// Italian Studies Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/italian-studies-minor.md
//
// ITAL 1-6 (or equivalent; ITAL 1A+1B = ITAL 1-3), then five upper-division
// courses — one culture course (ITAL 101 or ITAL 106), two literature, one
// history, one art history — of which three must be taught substantially in
// Italian (an overlay on the five). For the literature, history and art
// history categories the page defers to an external Italian studies course
// list: the student declares which of their courses the list puts in each
// category (choice); undeclared upper-division courses join each category as
// last-choice wildcards and a fill that needs one is cannot-check.
//
// 2025-26 differs from 2026-27: the culture course is a closed two-course
// list; LIT 102 is simply on the literature list (no LIT 102 substitution or
// in-Italian confirmation); THREE of the five must be taught substantially in
// Italian, from a closed list (not "all LIT 185 series").
import { canon, codes, defineHarness, display, series } from '@harness'
import type { ChoiceDef, CourseSet, Enrollment, HarnessContext, Node } from '@harness'

// Level index per course: ITAL 1A is level 1; "ITAL 1A and ITAL 1B ... equate
// to ITAL 1-ITAL 3", so ITAL 1B completes level 3.
const LEVELS: string[][] = [['ITAL 1', 'ITAL 1A'], ['ITAL 2'], ['ITAL 3', 'ITAL 1B'], ['ITAL 4'], ['ITAL 5'], ['ITAL 6']]

const CULTURE = codes('ITAL 101', 'ITAL 106')
const HISTORY = codes('SOCY 117E')
const LIT185 = series('LIT', 185).minCredits(5)
const LITERATURE = codes('LIT 102', 'LIT 114A', 'LIT 114C', 'LIT 114E', 'LIT 114F', 'LIT 121G', 'LIT 130D', 'LIT 141A', 'LIT 155D', 'LIT 164G', 'LIT 166C', 'LIT 190A').or(LIT185)
const ART = codes('HAVC 154', 'HAVC 155', 'HAVC 157B', 'HAVC 157C', 'HAVC 157D', 'HAVC 191N')
// "Courses Taught Substantially in Italian" (closed list in 2025-26). Other
// LIT 185-series courses carry Italian titles but are not listed: possibly
// taught in Italian, so a count that needs one is cannot-check.
const IN_ITALIAN = codes('LIT 185B', 'LIT 185J', 'LIT 185L', 'LIT 185P', 'LIT 185Q', 'LIT 185S', 'ITAL 100', 'ITAL 106')
const MAYBE_ITALIAN = LIT185.except(IN_ITALIAN)
const KNOWN = CULTURE.or(HISTORY).or(LITERATURE).or(ART)

const LIST_QUOTE = 'Students can consult [Italian studies course offerings](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/humanities-division/literature/italian-studies-course-list) for each of the above categories.'

/** Free-form course list: "HIS 150, HAVC 157A" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(s))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}
// External list → the student declares which courses it puts in each category (§1a).
const CATS = [
  { key: 'history_courses', label: 'Italian history' },
  { key: 'literature_courses', label: 'Italian literature' },
  { key: 'art_courses', label: 'Italian art history' },
]
const listChoices: ChoiceDef[] = CATS.map((c) => ({ key: c.key, label: `Your courses on the Italian studies course list for ${c.label}`, quote: LIST_QUOTE, options: [], free: true, parse: parseList }))

export default defineHarness({
  program: 'italian-studies-minor',
  edition: '2025-26',
  title: 'Italian Studies Minor',
  choices: listChoices,
  attestations: [
    {
      id: 'equivalent-proficiency',
      label: 'Equivalent proficiency (placed beyond ITAL 6)',
      quote: 'Each student must complete the lower-division language sequence (ITAL 1–ITAL 6), or equivalent.',
      aliases: ['equivalent', 'placement', 'proficiency'],
    },
  ],
  coverage: {
    ignore: {
      HAVC152: 'listed under "Courses Featuring Italy in a European or Global Context" with no category stated; as an unlisted upper-division course it is a wildcard candidate (cannot-check)',
    },
  },
  notes: [
    'Three of the five upper-division courses must be completed at UC Santa Cruz, and at most two may come from EAP — the app assumes your courses are UCSC courses.',
    'Literature, history and art history membership beyond the courses on this page comes from the Italian studies course list, which the app does not have.',
    'Students should complete ITAL 1–6 (or equivalent) before taking Italian literature courses.',
    'A course featuring the work of Dante (LIT 185Q or LIT 114C) is recommended.',
  ],
  evaluate(h) {
    h.policy = undefined // no grade rule on the page

    const lower = h.group('lower', 'Lower-Division Courses', [italianSequence(h)])

    const all = wildcards(h)
    const declared = (key: string) => new Set((h.choice(key) ?? '').split(',').filter(Boolean))
    const anyDeclared = new Set(CATS.flatMap((c) => [...declared(c.key)]))
    // Undeclared candidates: a fill that needs one is cannot-check.
    const wild = new Set(all.filter((c) => !anyDeclared.has(c)))
    const pool = (s: CourseSet, key: string) => {
      const mine = all.filter((c) => declared(key).has(c))
      const extra = [...mine, ...wild]
      return extra.length ? s.or(codes(...extra)) : s
    }
    const prefer = (c: string) => (wild.has(c) ? 3 : all.includes(c) ? 1 : 0)
    const plus = 'Students complete four courses as follows. Consult the course lists below for options.'
    // "One of the following courses:" ITAL 101, ITAL 106 — a closed list.
    const culture = h.take('culture', 'Italian culture: ITAL 101 or ITAL 106', 'One of the following courses:', CULTURE)
    const literature = h.take('literature', 'Two Italian literature courses', [plus, 'Two Italian literature courses (Each student should complete the lower-division language sequence (ITAL 1–ITAL 6), or equivalent prior to taking the Italian literature courses).', 'Any course in the LIT 185 series or from the following list:', LIST_QUOTE], pool(LITERATURE, 'literature_courses'), {
      n: 2,
      prefer,
      pool: 'LIT 185 series (5 credits) or the listed LIT courses',
    })
    const history = h.take('history', 'One Italian history course', ['One course in Italian history', 'SOCY 117E — Migrant Europe (5)', LIST_QUOTE], pool(HISTORY, 'history_courses'), { prefer })
    const art = h.take('art', 'One Italian art history course', ['One course in Italian art history.', 'Italian History of Art and Visual Culture Courses', LIST_QUOTE], pool(ART, 'art_courses'), { prefer })
    h.solve()
    const cats = [history, literature, art]
    cats.forEach((n, i) => flag(n, wild, CATS[i].key))
    const five = [culture, ...cats]

    const italian = taughtInItalian(h, five)
    const upper = h.group('upper', 'Upper-Division Courses', [culture, literature, history, art, italian], {
      quote: 'Students must complete five upper-division courses in Italian studies as follows.',
    })
    return [lower, upper]
  },
})

/**
 * ITAL 1-6 "or equivalent". The sequence counts when ITAL 6 is passed (lower
 * levels skipped by placement are implied). Equivalent proficiency without
 * ITAL 6 is a confirmation, offered only when no lower-division Italian is in
 * the plan (a student who started the sequence and stopped has not shown it).
 */
function italianSequence(h: HarnessContext): Node {
  const got = LEVELS.map((alts) => h.taken(codes(...alts))[0] as Enrollment | undefined)
  const top = got.reduce((t, e, i) => (e ? i : t), -1)
  const ok = top === LEVELS.length - 1
  const quote = ['Each student must complete the lower-division language sequence (ITAL 1–ITAL 6), or equivalent.', 'NOTE: Italian has an accelerated language track of ITAL 1A and ITAL 1B. These two courses taken together equate to ITAL 1-ITAL 3.']
  const seq = h.node('sequence', 'ITAL 1–6 (or ITAL 1A/1B + ITAL 4–6)', quote, ok ? 'met' : 'unmet', {
    used: got.filter((e): e is Enrollment => !!e),
    progress: { have: top + 1, need: LEVELS.length },
    options: LEVELS.flat().map((c) => c.replace(' ', '')),
    detail: ok ? undefined : top >= 0 ? `Still needs ${LEVELS.slice(top + 1).map((a) => a[0]).join(', ')}.` : undefined,
  })
  if (ok || top >= 0) return seq
  return h.either('sequence-or-equivalent', 'Italian language sequence (or equivalent)', quote, [seq, h.attest('equivalent-proficiency')])
}

/** Upper-division (5+ credit) courses in the plan outside every listed category. */
function wildcards(h: HarnessContext): string[] {
  const out = new Set<string>()
  for (const e of h.passed) {
    if (KNOWN.has(e.code, h.catalog)) continue
    const c = h.catalog.get(e.code)
    if (c && c.division !== 'upper') continue
    if (c && c.credits < 5) continue
    out.add(e.code)
  }
  return [...out]
}

function flag(node: Node, wild: Set<string>, choice: string) {
  if (node.status !== 'met') return
  const wl = (node.used ?? []).filter((e) => wild.has(e.code))
  if (!wl.length) return
  node.status = 'cannot-check'
  node.choice = choice
  node.detail = `Counts only if ${wl.map((e) => display(e.code)).join(', ')} ${wl.length > 1 ? 'are' : 'is'} on the Italian studies course list for this category (declare ${wl.length > 1 ? 'them' : 'it'}) — check the list.`
}

/**
 * "three must be taught substantially in Italian" — counted among the five.
 * A count that needs an unlisted LIT 185-series course, or a course outside
 * the five, is cannot-check (whether it counts is not settled by the page).
 */
function taughtInItalian(h: HarnessContext, five: Node[]): Node {
  const fiveUsed = five.flatMap((n) => n.used ?? [])
  const inFive = fiveUsed.filter((e) => IN_ITALIAN.has(e.code))
  const maybe = fiveUsed.filter((e) => MAYBE_ITALIAN.has(e.code, h.catalog))
  const ids = new Set(fiveUsed.map((e) => e.id))
  const extra = h.passed.filter((e) => !ids.has(e.id) && (IN_ITALIAN.has(e.code) || MAYBE_ITALIAN.has(e.code, h.catalog)))
  const quote = ['Three of the five upper-division courses must be completed at UC Santa Cruz; three must be taught substantially in Italian.', 'Courses Taught Substantially in Italian']
  const title = 'Three courses taught substantially in Italian'
  const base = { options: IN_ITALIAN.members, progress: { have: Math.min(inFive.length, 3), need: 3 } }
  if (inFive.length >= 3) return h.node('in-italian', title, quote, 'met', { ...base, used: inFive.slice(0, 3) })
  if (inFive.length + maybe.length + extra.length >= 3) {
    const names = [...maybe, ...extra].map((e) => e.display).join(', ')
    return h.cannotCheck('in-italian', title, quote, `${names}: not on the page's list of courses taught substantially in Italian among your five category courses — ask the Literature advisor whether it counts.`, { ...base, used: [...inFive, ...maybe, ...extra] })
  }
  return h.node('in-italian', title, quote, 'unmet', { ...base, used: inFive, detail: `${inFive.length} of 3 among your five courses.` })
}
