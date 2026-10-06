// History B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/history-ba.md
//
// General (12 courses) and Intensive (15 courses) majors, each built on one
// of three regions of concentration. Which region an upper-division course
// belongs to — and whether it is set before 600 C.E. or before 1800 C.E. —
// comes from the department's History Course List, a separate page the app
// does not have. Only the lower-division survey lists on this page carry a
// region. So, like anthropology-minor's categories, the student lists which
// of their courses the History Course List places in each region and which
// are pre-600 / pre-1800 (free-form choices); until they do, every rule that needs that
// fact is cannot-check — never silently met.
//
// Allocation (a course counts once):
//   phase 1  survey · four more region courses (≥3 UD) · comprehensive
//            (a research seminar in the region, or HIS 195A+195B) · HIS 100
//   phase 2  breadth (2 + 2 from the other regions; ≥1 UD, ≥2 UD if two
//            lower-division courses went to the region) · elective(s)
// Overlays: chronological distribution (2025-26: one pre-600 + two more
// pre-1800), advanced research (intensive), language
// (intensive), P/NP limit, unique-course count.
import { anyOf, canon, codes, defineHarness, display, isPass, range, series } from '@harness'
import type { ChoiceDef, CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Region = 'americas' | 'asia' | 'europe'
const REGIONS: Region[] = ['americas', 'asia', 'europe']
const REGION_LABEL: Record<Region, string> = {
  americas: 'The Americas and Africa',
  asia: 'Asia and the Pacific',
  europe: 'Europe and the Mediterranean World',
}

// Lower-division survey lists (identical in both tracks). 2025-26: HIS 31A is
// on neither list (2026-27 adds it to Americas/Africa and Europe).
const SURVEY: Record<Region, string[]> = {
  americas: ['HIS 10A', 'HIS 10B', 'HIS 11A', 'HIS 11B', 'HIS 12'],
  asia: ['HIS 40A', 'HIS 40B', 'HIS 44'],
  europe: ['HIS 41', 'HIS 58', 'HIS 65B', 'HIS 70A', 'HIS 70B', 'HIS 74', 'HIS 74A', 'HIS 74B'],
}
const SURVEY_QUOTE: Record<Region, string> = {
  americas: 'HIS 10A — United States History to 1877 (5)',
  asia: 'HIS 40A — Early Modern East Asia (5)',
  europe: 'HIS 65B — Plagues, Peasants, and Pirates: Late Medieval Europe, 1000-1500 (5)',
}

const SEMINARS = anyOf(series('HIS', 190), series('HIS', 194), series('HIS', 196))
const THESIS = ['HIS 195A', 'HIS 195B']
const INDEPENDENT = range('HIS', 198, 199)
// Advanced research names "independent studies (HIS 199)" only — not HIS 198 field study.
const ADV_INDEPENDENT = codes('HIS 199')
const UD5 = (c: { division: string; credits: number }) => c.division === 'upper' && !(c.credits < 5)
const UPPER5 = range('HIS', 100, 199).minCredits(5)
// Courses that never need a region (methods, thesis).
const NO_REGION = new Set(['HIS100', 'HIS195A', 'HIS195B'])

// Languages offered at UCSC; "(e.g. SPAN 1–SPAN 3, ITAL 2–ITAL 4, etc.)" —
// the numbered first- and second-year sequences, plus courses that continue
// a language past them: Biblical Hebrew (HEBR 80, LIT 181A/B), Greek and
// Latin literature read in the original (LIT 184/186 series), advanced
// Chinese and Japanese. Anything else goes through the attestation.
const LANG_SUBJECTS = ['ARBC', 'CHIN', 'FREN', 'GREE', 'HEBR', 'ITAL', 'JAPN', 'LATN', 'PUNJ', 'SPAN', 'SPHS', 'YIDD']
const LANGUAGE = anyOf(
  ...LANG_SUBJECTS.map((s) => range(s, 1, 6)),
  codes('HEBR 80', 'LIT 181A', 'LIT 181B', 'CHIN 103', 'CHIN 104', 'CHIN 105', 'JAPN 103', 'JAPN 104', 'JAPN 105', 'JAPN 106'),
  series('LIT', 184),
  series('LIT', 186),
)
const languageOf = (code: string) => {
  if (/^LIT184/.test(code)) return 'GREE'
  if (/^LIT186/.test(code)) return 'LATN'
  if (/^LIT181/.test(code)) return 'HEBR'
  const s = code.match(/^[A-Z]+/)?.[0] ?? code
  return s === 'SPHS' ? 'SPAN' : s
}

const LIST_QUOTE = 'Students are encouraged to reference the [History Course List](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/humanities-division/history/history-course-list) to determine how history courses may apply to the different geographic regions of concentration and the chronological distribution requirements.'
// 2025-26: three courses — one before 600 C.E. and two (more) before 1800 C.E.
// (2026-27 asks only for two pre-1800 courses). Planners: "one must be set
// before 600 C.E., and two more must be set in periods prior to the year 1800 C.E."
const CHRONO_QUOTE = {
  general: 'Distribution requirements. Among the 12 courses required for the major, at least three must meet chronological distribution requirements. One must be set before 600 C.E., and two must be set in periods prior to the year 1800 C.E.',
  intensive: 'Distribution requirements. Among the 15 courses required for the intensive major, at least three must meet chronological distribution requirements. One must be set before 600 C.E., and two must be set in periods prior to the year 1800 C.E.',
}
const CHRONO_PLANNER = 'Of the 12 courses listed, one must be set before 600 C.E., and two more must be set in periods prior to the year 1800 C.E.'

/** Free-form course list: "HIS 160A, HIS 172A; HIS 194L" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(s))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}

const listChoice = (key: string, label: string): ChoiceDef => ({ key, label, quote: LIST_QUOTE, options: [], free: true, parse: parseList })

export default defineHarness({
  program: 'history-ba',
  edition: '2025-26',
  title: 'History B.A.',
  choices: [
    {
      key: 'track',
      label: 'Major track',
      quote: 'All history majors are eligible to declare the intensive track, including junior transfers.',
      options: [
        { value: 'general', label: 'General History Major', aliases: ['general', 'standard', 'general history'] },
        { value: 'intensive', label: 'Intensive History Major', aliases: ['intensive', 'intensive history', 'intensive track'] },
      ],
      default: 'general',
    },
    {
      key: 'region',
      label: 'Region of concentration',
      quote: 'Each history major identifies one of three geographic regions of concentration as their primary area of focus:',
      options: [
        { value: 'americas', label: REGION_LABEL.americas, aliases: ['americas', 'africa', 'americas/africa', 'americas and africa', 'americas africa'] },
        { value: 'asia', label: REGION_LABEL.asia, aliases: ['asia', 'pacific', 'asia/pacific', 'asia and the pacific', 'asia pacific'] },
        { value: 'europe', label: REGION_LABEL.europe, aliases: ['europe', 'mediterranean', 'europe/mediterranean world', 'europe and the mediterranean', 'europe mediterranean'] },
      ],
    },
    listChoice('americas_courses', 'Your courses the History Course List places in The Americas and Africa'),
    listChoice('asia_courses', 'Your courses the History Course List places in Asia and the Pacific'),
    listChoice('europe_courses', 'Your courses the History Course List places in Europe and the Mediterranean World'),
    listChoice('pre600_courses', 'Your courses the History Course List marks as set before 600 C.E.'),
    listChoice('pre1800_courses', 'Your courses the History Course List marks as set before 1800 (pre-600 courses count here too)'),
  ],
  attestations: [
    {
      id: 'senior-check-in',
      label: 'Senior check-in submitted',
      quote: 'In addition to all coursework, history majors must complete a senior check-in during the first quarter of their senior year.',
      aliases: ['check-in', 'check in', 'senior check'],
    },
    {
      id: 'thesis-exception',
      label: 'Petition granted: thesis without a prior research seminar',
      quote: 'In extraordinary circumstances, students may petition the History Department for an exception to this requirement.',
      aliases: ['thesis exception', 'seminar exception'],
    },
    {
      id: 'independent-study-petition',
      label: 'Petition approved: independent/field study applied to the major',
      quote: 'For information and instructions on how to petition courses from the above categories, visit the [History Department webpage on course substitutions](https://history.ucsc.edu/undergraduate/undergraduate-advising/course-substitution.html).',
      aliases: ['independent study petition', 'his 199 petition', 'field study petition'],
    },
    {
      id: 'language-alternative',
      label: 'Language requirement met another way (placement, approved study abroad, or petition)',
      quote: 'With prior approval by the undergraduate director, the language training requirement may be satisfied by at least one quarter study abroad with foreign language instruction.',
      aliases: ['language placement', 'placement exam', 'study abroad language', 'language petition', 'language equivalent'],
    },
  ],
  notes: [
    'Region, pre-600 and pre-1800 membership come from the department’s History Course List: list your courses under each region (and the pre-600 / pre-1800 ones) so the dashboard can check the region, breadth and chronological rules.',
    'Up to two major courses may be Pass/No Pass, never the comprehensive requirement.',
    'Transfer (up to three), EAP (up to three), UCDC/UC Sacramento (up to two), one interdisciplinary course from another department and one independent/field study may count by petition — add them once approved. At least five regularly scheduled courses (eight for intensive) plus the comprehensive must be taught by UCSC history faculty.',
    'Frosh are expected to finish HIS 100 by the end of their second year; transfers by their second term.',
  ],
  evaluate(h) {
    // P/NP is limited by count (below); the comprehensive slot is letter-only.
    h.policy = undefined
    const ask = h.needChoice('region')
    if (ask) return [ask]
    const region = h.choice('region') as Region
    const intensive = h.choice('track') === 'intensive'
    const others = REGIONS.filter((r) => r !== region)
    // Courses on the student's pre-600 / pre-1800 lists are tried first (they
    // also serve the chronological distribution), after the UD preference.
    // Lists are matched through the catalog, so a course listed under one
    // cross-listed code (HIS 159M) matches the partner on the transcript (LIT 159M).
    const pre = codes(...listOf(h, 'pre600_courses'), ...listOf(h, 'pre1800_courses'))
    const preRank = (c: string) => (pre.has(c, h.catalog) ? 0 : 1)
    const udFirst = (c: string) => (h.catalog.get(c)?.division === 'upper' ? 0 : 2) + preRank(c)

    const declared: Record<Region, Set<string>> = {
      americas: new Set((h.choice('americas_courses') ?? '').split(',').filter(Boolean)),
      asia: new Set((h.choice('asia_courses') ?? '').split(',').filter(Boolean)),
      europe: new Set((h.choice('europe_courses') ?? '').split(',').filter(Boolean)),
    }
    const inRegion: Record<Region, Set<string>> = {
      americas: new Set([...SURVEY.americas.map(canon), ...declared.americas]),
      asia: new Set([...SURVEY.asia.map(canon), ...declared.asia]),
      europe: new Set([...SURVEY.europe.map(canon), ...declared.europe]),
    }
    const regionAny: Record<Region, CourseSet> = { americas: codes(...inRegion.americas), asia: codes(...inRegion.asia), europe: codes(...inRegion.europe) }
    const inR = (r: Region, code: string) => regionAny[r].has(code, h.catalog)
    const regionSet = (r: Region): CourseSet => regionAny[r].minCredits(5)
    const known = (code: string) => REGIONS.some((r) => inR(r, code))
    // History courses (or their cross-listed partners, e.g. LIT 159M = HIS 159M)
    // in the plan whose region the app cannot know yet.
    const isHistory = (code: string) => [code, ...h.catalog.equivalents(code)].some((c) => /^HIS\d/.test(c))
    const unknown = h.passed.filter((e) => isHistory(e.code) && !NO_REGION.has(e.code) && !known(e.code) && (h.catalog.get(e.code)?.credits ?? 5) >= 5)
    const unknownNote = (what: string) =>
      `${unknown.map((e) => e.display).join(', ')} ${unknown.length > 1 ? 'have' : 'has'} no region yet — check the History Course List and list ${unknown.length > 1 ? 'them' : 'it'} under ${what}.`

    // --- phase 1: region of concentration + HIS 100 -----------------------------
    const survey = h.take('survey', `Lower-division survey: ${REGION_LABEL[region]}`, ['At least one lower-division survey course within their chosen region of concentration. The survey course is one of the four allowed lower-divisions.', SURVEY_QUOTE[region]], codes(...SURVEY[region]), {
      prefer: preRank,
      notes: ['Transfer coursework may or may not apply toward the survey course requirement; consult the history undergraduate program coordinator.'],
    })
    const ud5 = regionSet(region).where(UD5, '5-credit upper-division')
    const conc = h.take('concentration', `Four more courses in ${REGION_LABEL[region]}`, 'Four additional courses in the region of concentration, at least three of which must be 5-credit upper-division courses.', regionSet(region), {
      n: 4,
      atLeast: [{ set: ud5, n: 3, label: '5-credit upper-division' }],
      prefer: udFirst,
      pool: `courses you listed under ${REGION_LABEL[region]} (plus that region’s survey courses)`,
    })
    const regionSeminars = [...new Set(h.passed.filter((e) => SEMINARS.has(e.code, h.catalog) && inR(region, e.code)).map((e) => e.code))]
    const comp = h.options('comprehensive', 'Comprehensive: research seminar in your region, or senior thesis', ['One comprehensive requirement: All students must complete either a research seminar (HIS 190 series, HIS 194 series, or HIS 196 series), or a senior thesis (HIS 195A and HIS 195B) in their area of concentration.', "Seminars must be taken in the student's chosen area of concentration to qualify as their comprehensive requirement.", 'History majors may take up to two of their history major courses Pass/No Pass, with the exception of the Senior Comprehensive Requirement'], [...regionSeminars.map((s) => [s]), THESIS], {
      policy: { letter: true },
    })
    const his100 = h.take('his100', 'HIS 100 Historical Skills and Methods', 'HIS 100 — Historical Skills and Methods (5)', codes('HIS 100'))
    h.solve()

    // --- phase 2: breadth + elective(s) -----------------------------------------
    const concLD = 1 + (conc.used ?? []).filter((e) => h.catalog.get(e.code)?.division !== 'upper').length
    const needUD = concLD >= 2 ? 2 : 1
    const [rb, rc] = others
    const breadthCheck = (chosen: Enrollment[]) => {
      const b = chosen.filter((e) => inR(rb, e.code) && !inR(rc, e.code)).length
      const c = chosen.filter((e) => inR(rc, e.code) && !inR(rb, e.code)).length
      if (b > 2 || c > 2) return `two courses from each of ${REGION_LABEL[rb]} and ${REGION_LABEL[rc]}`
      const ud = chosen.filter((e) => { const k = h.catalog.get(e.code); return !!k && UD5(k) }).length
      if (ud < needUD) return `${needUD === 2 ? 'two lower-division courses went to your region, so at least two' : 'at least one'} of the four must be 5-credit upper-division (${ud} now)`
      return null
    }
    const breadth = h.take('breadth', `Breadth: two from ${REGION_LABEL[rb]}, two from ${REGION_LABEL[rc]}`, ['Two courses from each of the remaining two regions of concentration.', 'At least one of the four breadth courses must be a 5-credit upper-division course. If two lower-division courses (including the survey) are applied to the region of concentration, then at least two of the four breadth courses must be 5-credit upper-division courses.'], regionSet(rb).or(regionSet(rc)), {
      n: 4,
      check: breadthCheck,
      prefer: udFirst,
      pool: `courses you listed under ${REGION_LABEL[rb]} or ${REGION_LABEL[rc]} (plus their survey courses)`,
    })
    const advanced = (code: string) => SEMINARS.has(code) || ADV_INDEPENDENT.has(code) || THESIS.map(canon).includes(code)
    const electives = intensive
      ? h.take('electives', 'Four upper-division history electives', 'Four 5-credit upper-division history courses from any of the three regions of concentration.', UPPER5, {
          n: 4,
          atMost: [{ set: INDEPENDENT, n: 1, label: 'independent/field study (limit of one)' }],
          // Advanced-research courses first: they also serve that requirement.
          prefer: (c) => (advanced(c) ? 0 : 2) + preRank(c),
          pool: 'HIS 100–199, 5 credits',
        })
      : h.take('electives', 'One upper-division history elective', 'One 5-credit upper-division history course from any of the three regions of concentration.', UPPER5, {
          prefer: preRank,
          atMost: [{ set: INDEPENDENT, n: 1, label: 'independent/field study (limit of one)' }],
          pool: 'HIS 100–199, 5 credits',
        })
    h.solve()

    // --- unknown regions → cannot-check, never unmet ---------------------------
    if (conc.status === 'unmet' && unknown.length) {
      conc.status = 'cannot-check'
      conc.detail = unknownNote(REGION_LABEL[region])
    }
    if (breadth.status === 'unmet') {
      const phase1 = [...(conc.used ?? []), ...(comp.used ?? []), ...(survey.used ?? [])]
      const shared = phase1.filter((e) => inR(rb, e.code) || inR(rc, e.code))
      if (unknown.length) {
        breadth.status = 'cannot-check'
        breadth.detail = unknownNote(`${REGION_LABEL[rb]} or ${REGION_LABEL[rc]}`)
      } else if (shared.length) {
        breadth.status = 'cannot-check'
        breadth.detail = `${shared.map((e) => e.display).join(', ')} is listed in more than one region and is counted in your concentration; ask an advisor where it should count.`
      }
    }
    const unknownSeminars = unknown.filter((e) => SEMINARS.has(e.code, h.catalog))
    if (comp.status === 'unmet' && unknownSeminars.length) {
      comp.status = 'cannot-check'
      comp.detail = `${unknownSeminars.map((e) => e.display).join(', ')}: list it under ${REGION_LABEL[region]} if the History Course List places it there.`
    }

    // Thesis path: "Before undertaking an independent thesis, students must
    // complete one research seminar in their region of concentration."
    const thesisUsed = (comp.used ?? []).some((e) => e.code === 'HIS195A')
    let thesisNode: Node | null = null
    if (thesisUsed) {
      const q = 'Before undertaking an independent thesis, students must complete one research seminar in their region of concentration.'
      const sem = h.passed.filter((e) => SEMINARS.has(e.code, h.catalog) && inR(region, e.code))
      if (sem.length) thesisNode = h.node('thesis-seminar', 'A research seminar in your region before the thesis', q, 'met', { used: sem.slice(0, 1) })
      else if (h.attested('thesis-exception')) thesisNode = h.attest('thesis-exception')
      else if (unknownSeminars.length) thesisNode = h.cannotCheck('thesis-seminar', 'A research seminar in your region before the thesis', q, `${unknownSeminars.map((e) => e.display).join(', ')}: list it under ${REGION_LABEL[region]} if the History Course List places it there (or confirm a petitioned exception).`)
      else thesisNode = h.attest('thesis-exception', 'A research seminar in your region before the thesis (or a petitioned exception)', { quote: [q, 'In extraordinary circumstances, students may petition the History Department for an exception to this requirement.'] })
    }

    const counted = [survey, conc, comp, his100, breadth, electives]
    const countedUsed = counted.flatMap((n) => n.used ?? [])
    // "Independent and field studies (limit of one)" is one of the Course
    // Substitution categories applied by petition: asked only when a HIS
    // 198/199 was actually counted.
    const indUsed = countedUsed.filter((e) => INDEPENDENT.has(e.code, h.catalog))
    const indNode = indUsed.length
      ? h.attest('independent-study-petition', 'Independent/field study applied to the major by petition', {
          quote: ['Independent and field studies (limit of one)', 'For information and instructions on how to petition courses from the above categories, visit the [History Department webpage on course substitutions](https://history.ucsc.edu/undergraduate/undergraduate-advising/course-substitution.html).'],
          detail: `${indUsed.map((e) => e.display).join(', ')} is counted toward the major.`,
        })
      : null

    const dc = h.node('dc', 'Disciplinary Communication (DC)', 'History students fulfill the upper-division disciplinary communication (DC) requirement by completing a comprehensive requirement in their region of concentration.', comp.status === 'met' ? 'met' : comp.status === 'cannot-check' ? 'cannot-check' : 'unmet', {
      detail: 'Satisfied by your comprehensive seminar or thesis.',
      used: comp.used,
    })

    const extra: Node[] = []
    if (intensive) {
      extra.push(advancedResearch(h, countedUsed))
      const langCourses = h.take('language/courses', 'Three quarters in a single language', 'Intensive majors must pursue training in a second language by completing three quarters of college-level language study (or equivalent) in a single, non-English modern or ancient language (e.g. SPAN 1–SPAN 3, ITAL 2–ITAL 4, etc.).', LANGUAGE, {
        n: 3,
        exclusive: false,
        check: (chosen) => (new Set(chosen.map((e) => languageOf(e.code))).size > 1 ? 'all three in one language' : null),
        pool: 'first- and second-year courses (1–6) in one language; HEBR 80 / LIT 181A–B (Biblical Hebrew); LIT 184 / 186 series (Greek / Latin); CHIN 103–105, JAPN 103–106',
      })
      h.solve()
      // The placement / approved-abroad / petition alternative is asked only
      // when three quarters of one language are not in the plan.
      extra.push(h.either('language', 'Three quarters of one language', 'Intensive majors must pursue training in a second language by completing three quarters of college-level language study (or equivalent) in a single, non-English modern or ancient language (e.g. SPAN 1–SPAN 3, ITAL 2–ITAL 4, etc.).', langCourses.status === 'met' ? [langCourses] : [langCourses, h.attest('language-alternative')]))
    }

    const total = intensive ? 15 : 12
    const regionGroup = h.group('region', `Region of Concentration: ${REGION_LABEL[region]}`, [survey, conc, comp, thesisNode])
    return [
      h.group('requirements', intensive ? 'Intensive History Major' : 'General History Major', [
        regionGroup,
        h.group('breadth-group', 'Breadth Requirements (4 Courses)', [breadth]),
        h.group('skills', 'Historical Skills and Methods (1 Course)', [his100]),
        h.group('electives-group', intensive ? 'Electives (4 Courses)' : 'Elective (1 Course)', [electives]),
        ...(indNode ? [indNode] : []),
        ...extra,
        chronological(h, countedUsed, intensive),
        uniqueCount(h, countedUsed, total, intensive),
        dc,
        pnpLimit(h, [survey, conc, his100, breadth, electives]),
        h.attest('senior-check-in'),
      ]),
    ]
  },
})

const listOf = (h: HarnessContext, key: string) => (h.choice(key) ?? '').split(',').filter(Boolean)

/**
 * 2025-26 chronological distribution: among the counted courses, three
 * distinct ones — one set before 600 C.E. and two more set before 1800 C.E.
 * A pre-600 course is also pre-1800, so the rule is met when at least one
 * counted course is on the pre-600 list and at least three are on either list.
 * Membership comes from the student's lists (History Course List).
 */
function chronological(h: HarnessContext, used: Enrollment[], intensive: boolean): Node {
  const title = 'Chronological distribution: one course before 600 C.E. and two more before 1800 C.E.'
  const quote = [intensive ? CHRONO_QUOTE.intensive : CHRONO_QUOTE.general, CHRONO_PLANNER]
  const l600 = listOf(h, 'pre600_courses')
  const l1800 = listOf(h, 'pre1800_courses')
  const set600 = codes(...l600)
  const setAny = codes(...l600, ...l1800)
  const uniq = (es: Enrollment[]) => [...new Map(es.map((e) => [e.code, e])).values()]
  const hit600 = uniq(used.filter((e) => set600.has(e.code, h.catalog)))
  const hitAny = uniq(used.filter((e) => setAny.has(e.code, h.catalog)))
  const ok600 = hit600.length >= 1
  const okAny = hitAny.length >= 3
  if (ok600 && okAny) {
    const first = hit600[0]
    const rest = hitAny.filter((e) => e.code !== first.code).slice(0, 2)
    return h.node('pre1800', title, quote, 'met', { used: [first, ...rest], progress: { have: 3, need: 3 } })
  }
  if (!l600.length && !l1800.length) {
    if (uniq(used).length < 3) return h.node('pre1800', title, quote, 'unmet', { detail: 'Not enough history courses yet.', choice: 'pre1800_courses' })
    return h.cannotCheck('pre1800', title, quote, 'Check the History Course List and list which of your courses are set before 600 C.E. and which before 1800.', {
      choice: 'pre600_courses',
      options: [...new Set(used.map((e) => e.code))],
    })
  }
  const missing = [!ok600 && 'one course set before 600 C.E.', !okAny && 'three courses set before 1800 C.E. (including the pre-600 one)'].filter(Boolean).join(' and ')
  // A list the student has not filled in yet: the rule cannot be decided.
  if ((!ok600 && !l600.length) || (!okAny && !l1800.length))
    return h.cannotCheck('pre1800', title, quote, `Needs ${missing}. List your courses the History Course List sets ${!ok600 && !l600.length ? 'before 600 C.E.' : 'before 1800'}.`, {
      choice: !ok600 && !l600.length ? 'pre600_courses' : 'pre1800_courses',
    })
  const spare = h.passed.filter((e) => setAny.has(e.code, h.catalog) && !used.some((u) => h.courseKey(u) === h.courseKey(e)) && (ok600 || set600.has(e.code, h.catalog)))
  if (spare.length)
    return h.cannotCheck('pre1800', title, quote, `${spare.map((e) => e.display).join(', ')} is on your pre-600/pre-1800 list but not counted toward the major — an advisor may be able to count it in place of another course.`, { choice: 'pre1800_courses' })
  return h.node('pre1800', title, quote, 'unmet', {
    used: hitAny,
    progress: { have: Math.min(hitAny.length, 3), need: 3 },
    detail: `Needs ${missing}; ${hit600.length} counted course(s) on your pre-600 list, ${hitAny.length} on your pre-600/pre-1800 lists.`,
    choice: ok600 ? 'pre1800_courses' : 'pre600_courses',
  })
}

/** "A minimum of 12 (15) unique courses": the same course may not fill two slots. */
function uniqueCount(h: HarnessContext, used: Enrollment[], total: number, intensive: boolean): Node {
  const title = `${total} unique courses`
  const quote = intensive
    ? 'A minimum of 15 unique courses are required for the intensive history major, of which no more than four may be lower-division.'
    : 'A minimum of 12 unique courses are required for the major, of which no more than four may be lower-division.'
  const codesUsed = used.map((e) => e.code)
  const dup = [...new Set(codesUsed.filter((c, i) => codesUsed.indexOf(c) !== i))]
  if (!dup.length) return h.node('unique', title, quote, 'met', { minor: true, detail: 'No more than four lower-division courses follows from the region and breadth rules.' })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && UPPER5.has(e.code, h.catalog))
  const detail = `${dup.map(display).join(', ')} is counted twice; each course counts once.`
  // A catalog-repeatable topics course (HIS 196G, HIS 199) taken twice may be
  // two different courses; whether both are "unique" is the department's call.
  if (dup.every((c) => h.catalog.get(c)?.repeatable))
    return h.cannotCheck('unique', title, quote, `${dup.map(display).join(', ')} is counted twice; it is repeatable for credit — confirm with an advisor that both offerings count as unique courses.`)
  return spare.length ? h.cannotCheck('unique', title, quote, `${detail} ${spare.map((e) => e.display).join(', ')} may be able to replace it — ask an advisor.`) : h.node('unique', title, quote, 'unmet', { detail })
}

/**
 * Intensive: "Three of the 15 courses required for the intensive major must
 * require advanced historical research." Seminars (190/194/196 series),
 * HIS 199 and the thesis count. Whether the two-quarter thesis is one or two
 * of the three is not stated, so it is counted as one and the node is
 * cannot-check when counting it as two would decide it.
 */
function advancedResearch(h: HarnessContext, used: Enrollment[]): Node {
  const title = 'Advanced research: three courses'
  const quote = ['Three of the 15 courses required for the intensive major must require advanced historical research.', 'Advanced research seminars (HIS 190 series, HIS 194 series, or HIS 196 series), the senior thesis (HIS 195A and HIS 195B) and/or independent studies (HIS 199) conducted under faculty supervisor may satisfy this requirement.']
  const sem = used.filter((e) => SEMINARS.has(e.code, h.catalog) || ADV_INDEPENDENT.has(e.code, h.catalog))
  const thesis = used.some((e) => e.code === 'HIS195A') && used.some((e) => e.code === 'HIS195B')
  const have = sem.length + (thesis ? 1 : 0)
  const thesisUsed = used.filter((e) => THESIS.map(canon).includes(e.code))
  if (have >= 3) return h.node('advanced', title, quote, 'met', { used: [...sem, ...thesisUsed], progress: { have: 3, need: 3 } })
  if (thesis && have + 1 >= 3)
    return h.cannotCheck('advanced', title, quote, 'Counting your thesis (HIS 195A + 195B) as two advanced-research courses would meet this; the page does not say whether it counts as one or two — ask an advisor.', { used: [...sem, ...thesisUsed] })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && (SEMINARS.has(e.code, h.catalog) || ADV_INDEPENDENT.has(e.code, h.catalog)) && UPPER5.has(e.code, h.catalog))
  if (spare.length)
    return h.cannotCheck('advanced', title, quote, `${spare.map((e) => e.display).join(', ')} could replace another course to reach three — ask an advisor.`)
  return h.node('advanced', title, quote, 'unmet', { used: [...sem, ...thesisUsed], progress: { have, need: 3 }, detail: `${have} of 3 advanced-research courses among your counted courses.` })
}

/** "up to two of their history major courses Pass/No Pass" (the comprehensive is letter-only). */
function pnpLimit(h: HarnessContext, counted: Node[]): Node {
  const title = 'At most two courses taken Pass/No Pass'
  const quote = 'History majors may take up to two of their history major courses Pass/No Pass, with the exception of the Senior Comprehensive Requirement'
  const used = [...new Map(counted.flatMap((n) => n.used ?? []).map((e) => [e.id, e])).values()]
  const pnp = used.filter((e) => isPass(e.grade))
  if (pnp.length <= 2) return h.node('pnp-limit', title, quote, 'met', { progress: { have: pnp.length, need: 2, unit: 'P/NP max' }, minor: true })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && !isPass(e.grade) && /^HIS\d/.test(e.code))
  const detail = `${pnp.map((e) => e.display).join(', ')} are P/NP — only two may be.`
  return spare.length
    ? h.cannotCheck('pnp-limit', title, quote, `${detail} A letter-graded course you also took (${spare.map((e) => e.display).join(', ')}) may be able to replace one — check with an advisor.`)
    : h.node('pnp-limit', title, quote, 'unmet', { detail, used: pnp })
}
