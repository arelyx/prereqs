// Literature B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/literature-ba.md
//
// Three concentrations reshape the whole major. Distribution membership is
// read from each LIT course's catalog description ("Distribution
// requirement(s): Pre-1750, Global, Poetry, Research") — the official
// Distribution Requirements Course List is a separate page the app does not
// have, so a course without such a line is never assumed to qualify.
import { anyOf, codes, combinations, defineHarness, range, series } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

type Conc = 'general' | 'language' | 'creative-writing'
type Tag = 'Pre-1750' | 'Global' | 'Poetry' | 'Research'

const DIST: { tag: Tag; n: number; title: string; quote: string }[] = [
  { tag: 'Pre-1750', n: 2, title: 'Literature written before 1750 (two)', quote: 'Two courses on literature written before 1750' },
  { tag: 'Global', n: 1, title: 'Non-Western / global perspective', quote: 'One course on non-Western literature or literature from a global perspective' },
  { tag: 'Poetry', n: 1, title: 'Poetry and poetics', quote: 'One course on poetry and poetics' },
  { tag: 'Research', n: 1, title: 'Research tools and methodologies', quote: 'One course introducing research tools and methodologies' },
]

const LEVEL3 = ['ARBC 3', 'CHIN 3', 'FREN 3', 'GREE 2', 'HEBR 3', 'ITAL 3', 'JAPN 3', 'LATN 2', 'PUNJ 3', 'SPAN 3', 'YIDD 3']
// "Completion of GERM 1B is equivalent to GERM 3. Completion of ITAL 1B is equivalent to ITAL 3."
const LEVEL3_EQUIV = ['GERM 3', 'GERM 1B', 'ITAL 1B']
const CW_ONLY = ['LIT 179A', 'LIT 179B', 'LIT 190V', 'LIT 190W', 'LIT 195C']

/** Language-of-concentration course pools (Language Literature). */
const LANGS: Record<string, { label: string; set: CourseSet; quote: string; subject?: string }> = {
  ancient: { label: 'Ancient Literature', set: anyOf(series('LIT', 181), series('LIT', 184), series('LIT', 186)), quote: 'Ancient Literature (courses in the LIT 181, LIT 184, and 186 series)' },
  french: { label: 'French Literature', set: series('LIT', 182), quote: 'French Literature (courses in the LIT 182 series)', subject: 'FREN' },
  german: { label: 'German Literature', set: series('LIT', 183), quote: 'German Literature (courses in the LIT 183 series)', subject: 'GERM' },
  greek: { label: 'Greek Literature', set: series('LIT', 184), quote: 'Greek Literature (courses in the LIT 184 series)', subject: 'GREE' },
  italian: { label: 'Italian Literature', set: series('LIT', 185), quote: 'Italian Literature (courses in the LIT 185 series)', subject: 'ITAL' },
  latin: { label: 'Latin Literature', set: series('LIT', 186), quote: 'Latin Literature (courses in the LIT 186 series)', subject: 'LATN' },
  spanish: { label: 'Spanish/Latin American/Latino Literatures', set: anyOf(series('LIT', 188), series('LIT', 189), codes('LIT 190X')), quote: 'Spanish/Latin American/Latino Literatures (courses in the LIT 188-LIT 189 series, LIT 190X)', subject: 'SPAN' },
}
const NON_ENGLISH = anyOf(series('LIT', 181), series('LIT', 182), series('LIT', 183), series('LIT', 184), series('LIT', 185), series('LIT', 186), series('LIT', 188), series('LIT', 189), codes('LIT 190X'))

export function distributionTags(h: HarnessContext, code: string): Tag[] {
  const d = h.catalog.get(code)?.description ?? ''
  const m = d.match(/Distribution requirements?(?:\(s\))?:\s*([^.]*)\./)
  if (!m) return []
  return m[1]
    .split(',')
    .map((t) => t.replace(/\s+/g, '')) // "Pre- 1750" → "Pre-1750"
    .filter((t): t is Tag => ['Pre-1750', 'Global', 'Poetry', 'Research'].includes(t))
}

export default defineHarness({
  program: 'literature-ba',
  edition: '2026-27',
  title: 'Literature B.A.',
  catalogNeeds: { descriptions: ['LIT'] },
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'Students of all three concentrations must demonstrate Level 3 reading proficiency in a non-English language',
      options: [
        { value: 'general', label: 'General Literature', aliases: ['general literature concentration'] },
        { value: 'language', label: 'Language Literature', aliases: ['language literature concentration'] },
        { value: 'creative-writing', label: 'Creative Writing', aliases: ['creative writing concentration', 'cw'] },
      ],
    },
    {
      key: 'language',
      label: 'Language of concentration',
      quote: 'Language Literature Concentration students take five literature courses in their chosen language of concentration.',
      options: Object.entries(LANGS).map(([value, l]) => ({ value, label: l.label, aliases: [value, l.label.split(' ')[0]] })),
      when: (c) => c.concentration === 'language',
    },
    {
      key: 'ancient_language',
      label: 'Ancient language you use for the language requirement',
      quote: 'Students take a minimum of three literature courses in the language they are using to satisfy the language requirement with the remaining two courses in another ancient language or languages.',
      options: [
        { value: '181', label: 'Arabic (LIT 181)', aliases: ['arabic'] },
        { value: '184', label: 'Greek (LIT 184)', aliases: ['greek'] },
        { value: '186', label: 'Latin (LIT 186)', aliases: ['latin'] },
      ],
      when: (c) => c.concentration === 'language' && c.language === 'ancient',
    },
    {
      key: 'track',
      label: 'Creative writing track',
      quote: 'LIT 190V is strongly encouraged for students in the fiction/prose track, and LIT 190W is strongly encouraged for students in the poetry track.',
      options: [
        { value: 'fiction', label: 'Fiction/prose', aliases: ['prose', 'fiction/prose'] },
        { value: 'poetry', label: 'Poetry' },
      ],
      when: (c) => c.concentration === 'creative-writing',
    },
    {
      key: 'intensive',
      label: 'Intensive option',
      quote: 'Students in each concentration may elect to pursue an intensive option.',
      options: [
        { value: 'no', label: 'No', aliases: ['false', 'standard'] },
        { value: 'yes', label: 'Yes — intensive', aliases: ['true', 'intensive'] },
      ],
      default: 'no',
    },
  ],
  attestations: [
    {
      id: 'language-exam',
      label: 'Level 3 reading proficiency by exam or placement',
      quote: 'Pass a literature language proficiency exam',
      aliases: ['proficiency exam', 'placement', 'language proficiency'],
    },
    {
      id: 'two-years-language',
      label: 'Two years of college-level language (or the equivalent)',
      quote: 'completion of two years of college-level language coursework, or the equivalent',
      aliases: ['two years', 'level 6'],
    },
    {
      id: 'cw-admission',
      label: 'Accepted into the creative writing concentration',
      quote: 'Admission to the creative writing concentration is selective.',
      aliases: ['creative writing admission', 'accepted'],
    },
  ],
  notes: [
    'At least seven courses counting toward the upper-division requirements must be taken for a letter grade, and the comprehensive requirement must be letter-graded.',
    'Distribution areas come from each course’s catalog description; the department’s Distribution Requirements Course List is authoritative.',
    'Independent studies, internships and courses from other departments count only with department approval (petition) — add them only once approved.',
  ],
  coverage: {
    ignore: {
      LIT190U: 'listed senior seminar; covered by series(LIT 190) in the comprehensive slot',
      LIT190Y: 'listed senior seminar; covered by series(LIT 190)',
      LIT190AA: 'listed senior seminar; covered by series(LIT 190)',
    },
    unknownOk: { GERM3: 'GERM 3 is named only as the level-3 equivalent of GERM 1B; GERM courses are not in the current catalog' , GERM1B: 'named in the equivalence note; GERM is not in the current catalog' },
  },
  evaluate(h) {
    h.policy = undefined // letter-grade rule is a count, handled below
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    const conc = h.choice('concentration') as Conc
    const intensive = h.choice('intensive') === 'yes'
    const cw = conc === 'creative-writing'

    // --- lower division -----------------------------------------------------
    const level3 = h.either('language-proficiency', 'Language proficiency (Level 3 reading)', 'Students must demonstrate Level 3 reading proficiency in a non-English language.', [
      h.take('language-proficiency/course', 'A level-3 language course', ['Complete one of the following courses:', 'Completion of GERM 1B is equivalent to GERM 3. Completion of ITAL 1B is equivalent to ITAL 3.'], codes(...LEVEL3, ...LEVEL3_EQUIV), { exclusive: false }),
      // A level 4–6 course can only be taken after level 3 or placement into
      // level 4+, so it demonstrates the same proficiency.
      h.take('language-proficiency/higher', 'A level 4–6 course in the same languages', 'Take a Language Placement Assessment and place into level 4 or higher', anyOf(...['ARBC', 'CHIN', 'FREN', 'GERM', 'HEBR', 'ITAL', 'JAPN', 'PUNJ', 'SPAN', 'YIDD'].map((s) => range(s, 4, 6))), { exclusive: false }),
      h.attest('language-exam', 'Proficiency exam or placement into level 4+'),
    ])
    const ld: Node[] = [
      level3,
      h.take('lit1', 'LIT 1 Literary Interpretation', 'LIT 1 — Literary Interpretation (5)', codes('LIT 1')),
      h.take('lit60-80', 'One course from the LIT 60/61 or LIT 80/81 series', ['One course from the LIT 60 or LIT 61-series, or', 'One course from the LIT 80 or LIT 81-series'], anyOf(series('LIT', 60), series('LIT', 61), series('LIT', 80), series('LIT', 81))),
    ]
    if (cw)
      ld.push(
        h.take('cw-workshop', 'Lower-division creative writing workshop', 'Plus at least one of the following', codes('LIT 90', 'LIT 90X', 'LIT 91A', 'LIT 91B', 'LIT 92A', 'LIT 92B'), {
          notes: ['An additional course from among LIT 90, LIT 90X, LIT 91A , LIT 91B, LIT 92A, or LIT 92B is strongly encouraged.'],
        }),
      )
    if (conc === 'language')
      ld.push(
        h.either('two-years', 'Two years of college-level language', 'The language literature concentration of the literature major requires: (1) completion of two years of college-level language coursework, or the equivalent; and (2) 12 courses in literature.', [
          h.take('two-years/course', 'A level-6 (second-year) language course', 'Enrollment in upper-division language literature courses normally requires completion of two years of college-level language coursework, or the equivalent.', anyOf(...['ARBC', 'CHIN', 'FREN', 'GERM', 'HEBR', 'ITAL', 'JAPN', 'PUNJ', 'SPAN', 'YIDD'].map((s) => range(s, 6, 6))), { exclusive: false }),
          h.attest('two-years-language'),
        ]),
      )
    const lower = h.group('lower', 'Lower-Division Requirements', ld)

    // --- upper division -----------------------------------------------------
    const lit101 = h.take('lit101', 'LIT 101 Theory and Interpretation', 'LIT 101 — Theory and Interpretation (5)', codes('LIT 101'))
    // "Students may substitute one upper-division non-English literature course
    // (numbered LIT 182-189) ... for LIT 102. Such a course may not fulfill any
    // other major requirements."  → an exclusive slot that prefers LIT 102.
    const lit102 = h.take('lit102', 'LIT 102 Translation Theory (or a LIT 182–189 substitute)', ['LIT 102 — Translation Theory (5)', 'Students may substitute one upper-division non-English literature course (numbered LIT 182-189) studied in the original language for LIT 102. Such a course may not fulfill any other major requirements.'], codes('LIT 102').or(range('LIT', 182, 189)), {
      prefer: (c) => (c === 'LIT102' ? 0 : 1),
    })

    const lo = conc === 'general' ? 109 : 108
    const electivePool = range('LIT', lo, 189).minCredits(5).except(cw ? [] : CW_ONLY)
    const electiveQuote =
      conc === 'general'
        ? 'Students take seven 5-credit upper-division electives chosen from LIT 109-189, excluding courses LIT 179A and LIT 179B, which are only available to students who have been accepted to the creative writing concentration.'
        : conc === 'language'
          ? 'Students take seven 5-credit upper-division literature electives chosen from LIT 108-189, excluding LIT 179A or LIT 179B, which are only available to students who have been accepted to the creative writing concentration.'
          : 'Students take seven 5-credit upper-division literature electives numbered 108-189.'
    const electives = h.take('electives', 'Seven upper-division literature electives', [electiveQuote, 'One course may fulfill more than one requirement.'], electivePool, {
      n: 7,
      repeatable: 'catalog',
      pool: `LIT ${lo}–189, 5 credits${cw ? '' : ', not LIT 179A/179B'}`,
      notes: ['Independent studies and internships may also count toward this requirement with department approval.'],
    })

    let intensiveNode: Node | null = null
    if (intensive) {
      intensiveNode =
        conc === 'language'
          ? h.take('intensive', 'Intensive option: two more electives', 'Students wishing to complete the intensive option for the Language Literature concentration must take two additional upper-division electives, for a total of nine electives.', electivePool, { n: 2, repeatable: 'catalog' })
          : h.take('intensive', 'Intensive option: two non-English literature electives', [conc === 'general' ? 'Students wishing to complete the intensive option of the general Literature B.A. must take two additional upper-division electives, for a total of nine electives.' : 'Students wishing to complete the intensive option of the [General or Creative Writing] concentration must take two additional upper-division electives, for a total of nine electives.', 'These two courses must be in non-English literature, and may be chosen from any of the following:'], NON_ENGLISH, { n: 2, repeatable: 'catalog' })
    }

    // Comprehensive (letter grade required).
    const comprehensive = cw
      ? h.take('comprehensive', 'Comprehensive: senior seminar (LIT 190V/190W) or senior essay (LIT 195C)', ['The comprehensive requirement is satisfied by one creative project senior seminar (LIT 190V or LIT 190W) or a senior essay (LIT 195C).', 'The Comprehensive Requirement must be taken for a letter grade.'], codes('LIT 190V', 'LIT 190W', 'LIT 195C'), { policy: { letter: true } })
      : h.take('comprehensive', 'Comprehensive: senior seminar (LIT 190 series) or senior thesis (LIT 195A/195B)', ['The comprehensive requirement is satisfied by one senior seminar (LIT 190 series) or a senior thesis (LIT 195A or 195B).', 'The Comprehensive Requirement must be taken for a letter grade.'], series('LIT', 190).except(['LIT 190V', 'LIT 190W']).or(codes('LIT 195A', 'LIT 195B')), { policy: { letter: true } })

    h.solve()
    bestDistributionSeven(h, electives, electivePool)

    // Distribution among the seven electives (catalog tags).
    const sevenUsed = (electives.used ?? []).filter((e) => electivePool.has(e.code, h.catalog))
    // For the bespoke View's matrix: each counted elective's catalog tags.
    electives.data = { tags: Object.fromEntries(sevenUsed.map((e) => [e.id, distributionTags(h, e.code)])) }
    const distNodes = DIST.map((d) => {
      const hits = sevenUsed.filter((e) => distributionTags(h, e.code).includes(d.tag))
      const untagged = sevenUsed.filter((e) => distributionTags(h, e.code).length === 0)
      const ok = hits.length >= d.n
      return h.node(`dist/${d.tag}`, d.title, d.quote, ok ? 'met' : 'unmet', {
        used: hits.slice(0, d.n),
        progress: { have: Math.min(hits.length, d.n), need: d.n },
        detail: ok ? undefined : untagged.length ? `None of your electives is tagged ${d.tag} in the catalog; ${untagged.map((e) => e.display).join(', ')} carry no distribution tag — check the department list.` : `Needs ${d.n - hits.length} more ${d.tag} course${d.n - hits.length > 1 ? 's' : ''} among your electives.`,
        pool: `LIT courses whose catalog description lists “${d.tag}”`,
      })
    })

    const extra: Node[] = []
    if (conc === 'language') extra.push(languageRequirement(h, electives))
    if (cw) {
      const ws = sevenUsed.filter((e) => series('LIT', 179).has(e.code))
      extra.push(
        h.node('cw-advanced', 'Three advanced workshops (LIT 179 series)', 'Creative Writing students take any three courses from the LIT 179 series.', ws.length >= 3 ? 'met' : 'unmet', {
          used: ws,
          progress: { have: Math.min(ws.length, 3), need: 3 },
          options: ['LIT179A', 'LIT179B'],
          detail: ws.length >= 3 ? undefined : `${ws.length} of 3 among your seven electives (courses may be repeated)`,
        }),
        h.attest('cw-admission'),
      )
    }

    const upper = h.group('upper', 'Upper-Division Requirements', [
      lit101,
      lit102,
      h.group('electives-group', 'Upper-Division Literature Electives', [electives, h.group('distribution', 'Distribution Requirements', distNodes), ...extra]),
      intensiveNode,
      comprehensive,
    ])

    const dc = h.node('dc', 'Disciplinary Communication (DC)', 'The DC is satisfied by completing LIT 101 and either a senior seminar or thesis.', lit101.status === 'met' && comprehensive.status === 'met' ? 'met' : 'unmet', {
      detail: 'Satisfied by LIT 101 plus your comprehensive course.',
      used: [...(lit101.used ?? []), ...(comprehensive.used ?? [])],
    })
    const letters = letterGradeCount(h, [lit101, lit102, electives, ...(intensiveNode ? [intensiveNode] : []), comprehensive])
    return [lower, upper, dc, letters]
  },
})

/**
 * Among all eligible electives not used elsewhere, choose the seven that best
 * cover the distribution areas (the allocation itself only counts courses).
 */
function bestDistributionSeven(h: HarnessContext, electives: Node, pool: CourseSet) {
  const mine = new Set((electives.used ?? []).map((e) => e.id))
  const cands = h.passed.filter((e) => pool.has(e.code, h.catalog) && (mine.has(e.id) || !h.used.has(e.id)))
  if (cands.length <= 7) return
  const score = (set: Enrollment[]) =>
    DIST.reduce((s, d) => s + Math.min(d.n, set.filter((e) => distributionTags(h, e.code).includes(d.tag)).length), 0)
  let best = (electives.used ?? []).slice()
  let bestScore = score(best)
  let tries = 0
  for (const combo of combinations(cands, 7)) {
    if (++tries > 20000) break
    if (combo.some((e, i) => combo.findIndex((x) => x.code === e.code) !== i && !h.catalog.get(e.code)?.repeatable)) continue
    const sc = score(combo)
    if (sc > bestScore) {
      best = combo
      bestScore = sc
    }
  }
  electives.used = best
}

function languageRequirement(h: HarnessContext, electives: Node): Node {
  const lang = h.choice('language')
  const ask = h.needChoice('language')
  if (ask || !lang) return ask!
  const L = LANGS[lang]
  const pool = [...(electives.used ?? []), ...h.taken(codes('LIT 190X'))]
  const inLang = pool.filter((e) => L.set.has(e.code))
  const q = ['Language Literature Concentration students take five literature courses in their chosen language of concentration. These courses can overlap with one or more of the Distribution Requirements above.', L.quote]
  if (lang === 'ancient') {
    const primary = h.choice('ancient_language')
    if (!primary) return h.needChoice('ancient_language')!
    const main = inLang.filter((e) => series('LIT', Number(primary)).has(e.code))
    const other = inLang.filter((e) => !series('LIT', Number(primary)).has(e.code))
    const ok = main.length >= 3 && main.length + other.length >= 5
    return h.node('language-five', `Five courses in ${L.label}`, [...q, 'Students take a minimum of three literature courses in the language they are using to satisfy the language requirement with the remaining two courses in another ancient language or languages.'], ok ? 'met' : 'unmet', {
      used: inLang,
      progress: { have: Math.min(inLang.length, 5), need: 5 },
      detail: ok ? undefined : `${main.length} of at least 3 in LIT ${primary}, ${inLang.length} of 5 ancient-literature courses`,
    })
  }
  const ok = inLang.length >= 5
  return h.node('language-five', `Five courses in ${L.label}`, q, ok ? 'met' : 'unmet', {
    used: inLang,
    progress: { have: Math.min(inLang.length, 5), need: 5 },
    detail: ok ? undefined : `${inLang.length} of 5 among your electives`,
    pool: L.quote,
  })
}

function letterGradeCount(h: HarnessContext, nodes: Node[]): Node {
  const used = nodes.flatMap((n) => n.used ?? [])
  const letter = used.filter((e) => e.grade == null || !['P', 'S'].includes(e.grade))
  const ok = letter.length >= 7
  return h.node('letter-grades', 'Seven upper-division courses for a letter grade', 'Students in all concentrations, including both the intensive and non-intensive options, must take at least seven courses counting toward the upper-division requirements for a letter grade.', ok ? 'met' : 'unmet', {
    progress: { have: Math.min(letter.length, 7), need: 7 },
    detail: ok ? undefined : `${letter.length} of your upper-division courses are letter-graded`,
    minor: true,
  })
}
