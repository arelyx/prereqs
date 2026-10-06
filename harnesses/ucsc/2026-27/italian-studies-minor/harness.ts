// Italian Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/italian-studies-minor.md
//
// ITAL 1-6 (or equivalent; ITAL 1A+1B = ITAL 1-3), then five upper-division
// courses — culture, history, two literature, art — of which two must be
// taught substantially in Italian (an overlay on the five). The page defers to
// an external Italian studies course list and allows case-by-case additions:
// other upper-division courses join each category as last-choice wildcards and
// a fill that needs one is cannot-check. LIT 102 may replace one literature,
// history or art course after consulting the advisor (a confirmation).
import { codes, defineHarness, display, series } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

// Level index per course: ITAL 1A is level 1; "ITAL 1A and ITAL 1B ... equate
// to ITAL 1-ITAL 3", so ITAL 1B completes level 3.
const LEVELS: string[][] = [['ITAL 1', 'ITAL 1A'], ['ITAL 2'], ['ITAL 3', 'ITAL 1B'], ['ITAL 4'], ['ITAL 5'], ['ITAL 6']]

const CULTURE = codes('ITAL 101', 'ITAL 106')
const HISTORY = codes('SOCY 117E')
const LIT185 = series('LIT', 185).minCredits(5)
const LITERATURE = codes('LIT 114A', 'LIT 114C', 'LIT 114E', 'LIT 114F', 'LIT 121G', 'LIT 130D', 'LIT 141A', 'LIT 155D', 'LIT 164G', 'LIT 166C', 'LIT 190A').or(LIT185)
const ART = codes('HAVC 154', 'HAVC 155', 'HAVC 157B', 'HAVC 157C', 'HAVC 157D', 'HAVC 191N')
// "All LIT 185 series courses count toward this requirement" + the list.
const IN_ITALIAN = codes('ITAL 100', 'ITAL 106', 'LIT 184B', 'LIT 185H', 'LIT 185I', 'LIT 185J', 'LIT 185L', 'LIT 185M', 'LIT 185N', 'LIT 185O', 'LIT 185P', 'LIT 185Q', 'LIT 185S', 'LIT 185Z').or(series('LIT', 185))
const LIT102 = codes('LIT 102')
const KNOWN = CULTURE.or(HISTORY).or(LITERATURE).or(ART).or(LIT102)

export default defineHarness({
  program: 'italian-studies-minor',
  edition: '2026-27',
  title: 'Italian Studies Minor',
  attestations: [
    {
      id: 'equivalent-proficiency',
      label: 'Equivalent proficiency (placed beyond ITAL 6)',
      quote: 'Complete the lower-division Italian language sequence (ITAL 1–ITAL 6), or equivalent.',
      aliases: ['equivalent', 'placement', 'proficiency'],
    },
    {
      id: 'lit102-substitute',
      label: 'LIT 102 substitution approved by the Literature advisor',
      quote: 'LIT 102 can substitute for one of the Italian literature, history, or art history requirements after consulting with the Literature advisor.',
      aliases: ['lit 102 substitution', 'literature advisor', 'lit102'],
    },
    {
      id: 'lit102-italian',
      label: 'LIT 102 accepted as a course taught substantially in Italian',
      quote: 'In some cases, LIT 102 can also count as a course taught substantially in Italian.',
      aliases: ['lit 102 in italian', 'taught in italian'],
    },
  ],
  notes: [
    'Three of the five upper-division courses must be completed at UC Santa Cruz, and at most two may come from a UC Education Abroad Program — the app assumes your courses are UCSC courses.',
    'Category membership beyond the courses on this page comes from the Italian studies course list, which the app does not have; additional courses may apply case by case.',
    'Students should complete ITAL 1–6 before taking Italian literature courses.',
  ],
  evaluate(h) {
    h.policy = undefined // no grade rule on the page

    const lower = h.group('lower', 'Lower-Division Courses', [italianSequence(h)])

    const wild = new Set(wildcards(h))
    const w = codes(...wild)
    const pool = (s: CourseSet, lit102: boolean) => {
      let p = s
      if (lit102) p = p.or(LIT102)
      return wild.size ? p.or(w) : p
    }
    const prefer = (c: string) => (wild.has(c) ? 2 : c === 'LIT102' ? 1 : 0)
    const culture = h.take('culture', 'Italian Culture', ['Italian Culture', 'Take one of the following:'], pool(CULTURE, false), { prefer })
    const history = h.take('history', 'Italian History: SOCY 117E', 'SOCY 117E — Migrant Europe (5)', pool(HISTORY, true), { prefer })
    const literature = h.take('literature', 'Two Italian Literature courses', 'Take two courses from the LIT 185 series or the following list.', pool(LITERATURE, true), {
      n: 2,
      prefer,
      pool: 'LIT 185 series (5 credits) or the listed LIT courses',
    })
    const art = h.take('art', 'Italian History of Art and Visual Culture', ['Italian History of Art and Visual Culture Courses', 'Take one of the following:'], pool(ART, true), { prefer })
    h.solve()
    const five = [culture, history, literature, art]
    for (const n of five) flag(h, n, wild)

    const italian = taughtInItalian(h, five)
    const upper = h.group('upper', 'Upper-Division Courses', [culture, history, literature, art, italian], {
      quote: 'Students complete five upper-division courses: One in Italian culture, one in Italian history, two in Italian literature, and one in Italian art.',
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
  const quote = ['Complete the lower-division Italian language sequence (ITAL 1–ITAL 6), or equivalent.', 'NOTE: Italian has an accelerated language track of ITAL 1A and ITAL 1B. These two courses taken together equate to ITAL 1-ITAL 3.']
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

function flag(h: HarnessContext, node: Node, wild: Set<string>) {
  if (node.status !== 'met') return
  const used = node.used ?? []
  const wl = used.filter((e) => wild.has(e.code))
  if (wl.length) {
    node.status = 'cannot-check'
    node.detail = `Counts only if ${wl.map((e) => display(e.code)).join(', ')} ${wl.length > 1 ? 'are' : 'is'} accepted for this category (Italian studies course list or the Literature advisor) — check it.`
    return
  }
  if (used.some((e) => LIT102.has(e.code))) {
    node.detail = 'LIT 102 substitutes here after consulting the Literature advisor.'
    if (!h.attested('lit102-substitute')) {
      node.status = 'needs-attestation'
      node.attest = h.attestations.find((a) => a.id === 'lit102-substitute')
    }
  }
}

/**
 * "Two courses must have at least a discussion section in Italian." Counted
 * among the five. If only courses outside the five bring the count to two,
 * whether they count is unclear (the five may be the only upper-division
 * courses) — cannot-check.
 */
function taughtInItalian(h: HarnessContext, five: Node[]): Node {
  const fiveUsed = five.flatMap((n) => n.used ?? [])
  const lit102Ok = h.attested('lit102-italian')
  const isIt = (e: Enrollment) => IN_ITALIAN.has(e.code) || (lit102Ok && LIT102.has(e.code))
  const inFive = fiveUsed.filter(isIt)
  const ids = new Set(fiveUsed.map((e) => e.id))
  const extra = h.passed.filter((e) => !ids.has(e.id) && isIt(e))
  const quote = ['Two courses must have at least a discussion section in Italian.', 'Take two courses that are taught substantially in Italian or have a discussion section taught in Italian.']
  const base = { options: IN_ITALIAN.members, progress: { have: Math.min(inFive.length, 2), need: 2 } }
  if (inFive.length >= 2) return h.node('in-italian', 'Two courses taught substantially in Italian', quote, 'met', { ...base, used: inFive.slice(0, 2) })
  if (inFive.length + extra.length >= 2)
    return h.cannotCheck('in-italian', 'Two courses taught substantially in Italian', quote, `${extra.map((e) => e.display).join(', ')} ${extra.length > 1 ? 'are' : 'is'} taught in Italian but not one of your five category courses — ask the Literature advisor whether it counts.`, { ...base, used: [...inFive, ...extra] })
  const lit102 = fiveUsed.some((e) => LIT102.has(e.code)) && !lit102Ok && inFive.length >= 1
  return h.node('in-italian', 'Two courses taught substantially in Italian', quote, lit102 ? 'needs-attestation' : 'unmet', {
    ...base,
    used: inFive,
    attest: lit102 ? h.attestations.find((a) => a.id === 'lit102-italian') : undefined,
    detail: `${inFive.length} of 2 among your five courses.`,
  })
}
