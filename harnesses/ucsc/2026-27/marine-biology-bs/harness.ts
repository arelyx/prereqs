// Marine Biology B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/marine-biology-bs.md
//
// Unusual bits handled in code below:
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too.
//  - Upper division = eleven courses in one exclusive allocation ("Courses
//    appearing in more than one requirement group can fulfill only one"); the
//    lab/field rule ("two must include laboratory or fieldwork"), DC and
//    comprehensive are overlays.
//  - Lecture/lab: a 5-credit lecture whose 2-credit lab is a required
//    concurrent course (per the catalog's corequisites) counts only with that
//    lab, and the pair is one course. Optional labs (BIOE 129L, BIOE 131L,
//    ENVS 115L) are not needed; taken with a counted lecture, they make that
//    course "include laboratory" for the lab/field rule.
//  - One general elective may be "any 5 credits of undergraduate research"
//    (BIOE 183W/183L/193/193F/195) or ENVS 183 — a composite unit.
//  - Catalog "Students cannot receive credit for this course and ..." pairs
//    among the listed courses (BIOE 165 / ENVS 120; BIOE 150 / ENVS 104A;
//    BIOE 151A-D / BIOE 150, 150L, ENVS 104A): only the earlier-taken one
//    counts toward the electives and the DC.
//  - Lab/field: the page has no list. Known lab/field courses count; a counted
//    course whose catalog description mentions lab or field work (e.g. EART
//    105 "Laboratory: 3 hours") makes the rule cannot-check, never unmet.
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

// [lecture, lab] pairs; REQUIRED = the catalog lists the lab as a required
// concurrent course of the lecture.
const LAB_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 120', 'BIOE 120L'],
  ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'], ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
  ['BIOE 131', 'BIOE 131L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'], ['BIOE 135', 'BIOE 135L'],
  ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
  ['EART 100', 'EART 100L'], ['EART 101', 'EART 101L'],
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 115A', 'ENVS 115L'], ['ENVS 130A', 'ENVS 130L'],
]
const OPTIONAL_LAB = new Set(['BIOE129', 'BIOE131', 'ENVS115A'])
const canonPair = ([a, b]: [string, string]): [string, string] => [a.replace(' ', ''), b.replace(' ', '')]
const REQUIRED_PAIRS = LAB_PAIRS.filter(([a]) => !OPTIONAL_LAB.has(a.replace(' ', '')))
const OPTIONAL_LAB_OF = new Map(LAB_PAIRS.map(canonPair).filter(([a]) => OPTIONAL_LAB.has(a)))
// Required labs: the lecture counts only with its lab, as one course.
// Optional labs are not needed (and not counted as a separate course).
const LABS = { pairs: REQUIRED_PAIRS, mode: 'required' as const }

const MARINE = ['BIOE 120', 'BIOE 122', 'BIOE 126', 'BIOE 127', 'BIOE 129']

const TOPICAL = [
  'BIOE 108', 'BIOE 120', 'BIOE 122', 'BIOE 126', 'BIOE 127', 'BIOE 128L', 'BIOE 129', 'BIOE 136',
  'BIOE 155', 'BIOE 155L', 'BIOE 158L', 'BIOE 159A', 'BIOE 159B', 'BIOE 159C', 'BIOE 159D', 'BIOE 159E',
  'BIOE 159F', 'BIOE 161', 'BIOE 161L', 'BIOE 163', 'BIOE 165', 'EART 102', 'EART 105', 'OCEA 118',
  'OCEA 122', 'OCEA 130',
]

const GENERAL_LISTED = [
  'BIOL 100', 'BIOL 101',
  'EART 100', 'EART 101', 'EART 102', 'EART 105',
  'ECON 166A', 'ECON 166B',
  'ENVS 104A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'ENVS 115A', 'ENVS 120', 'ENVS 122',
  'ENVS 123', 'ENVS 130A', 'ENVS 130B', 'ENVS 131', 'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163',
  'ENVS 167', 'ENVS 168',
  'METX 100', 'METX 100L', 'METX 115', 'METX 133', 'METX 150',
  'OCEA 118', 'OCEA 122', 'OCEA 130',
  'PSYC 123',
]
// Catalog "cannot receive credit for both" pairs among the listed courses.
const NOT_BOTH: [string, string][] = [
  ['BIOE 165', 'ENVS 120'], ['BIOE 150', 'ENVS 104A'],
  ...['BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D'].flatMap((s) =>
    ['BIOE 150', 'BIOE 150L', 'ENVS 104A'].map((o) => [o, s] as [string, string]),
  ),
]
// A counted course whose description mentions lab or field work may include it.
const MAYBE_LABFIELD = /laborator|\blab\b|field (trip|work|stud|research|project|course|quarter|method|exercise)|fieldwork/i

const RESEARCH = ['BIOE 183W', 'BIOE 183L', 'BIOE 193', 'BIOE 193F', 'BIOE 195', 'ENVS 183']
const RESEARCH_SET = codes(...RESEARCH)

const DC_LIST = [
  'BIOE 108', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 125', 'BIOE 126', 'BIOE 127',
  'BIOE 128L', 'BIOE 129', 'BIOE 137', 'BIOE 141L', 'BIOE 145', 'BIOE 145L', 'BIOE 150L', 'BIOE 151B',
  'BIOE 153C', 'BIOE 157B', 'BIOE 158L', 'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172', 'BIOE 174',
]
// "Lecture and 2-credit lab combinations count as a single course." "BIOE 117
// and BIOE 137 require concurrent enrollment in 2-credit labs ... but these
// are not part of the DC requirement." "To receive DC credit for BIOE 129,
// BIOE 129L must also be successfully completed." → required pairs.
const DC_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
]

const COMP_EEB = [
  'BIOE 112L', 'BIOE 114L', 'BIOE 117L', 'BIOE 119L', 'BIOE 120L', 'BIOE 122L', 'BIOE 124L', 'BIOE 127L',
  'BIOE 128L', 'BIOE 129L', 'BIOE 131L', 'BIOE 133L', 'BIOE 134L', 'BIOE 135L', 'BIOE 137L', 'BIOE 141L',
  'BIOE 142L', 'BIOE 145L', 'BIOE 150L', 'BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'BIOE 153A',
  'BIOE 153B', 'BIOE 153C', 'BIOE 155L', 'BIOE 157A', 'BIOE 157B', 'BIOE 158L', 'BIOE 159A', 'BIOE 159B',
  'BIOE 159C', 'BIOE 159D', 'BIOE 159E', 'BIOE 159F', 'BIOE 161L', 'BIOE 163L', 'BIOE 183W',
]
const COMP_OTHER = ['METX 100L', 'CRSN 152']
// "receiving a passing grade in an independent research course ... completing a senior thesis."
const COMP_RESEARCH = ['BIOE 183L', 'BIOE 193', 'BIOE 193F', 'BIOE 195']
const COMP_SET = codes(...COMP_EEB, ...COMP_OTHER, ...COMP_RESEARCH)

// Courses that "include laboratory or fieldwork": the page's own field/lab
// list (comprehensive), any upper-division lab ("…L"), or a catalog title
// naming field work (e.g. ENVS 107A–C Natural History Field Quarter).
const LAB_FIELD_LIST = new Set([...COMP_EEB, ...COMP_OTHER].map((c) => c.replace(' ', '')))
const LAB_OF = new Map(LAB_PAIRS.map(([a, b]) => [b.replace(' ', ''), a.replace(' ', '')]))
// Try known lab/field courses (and lectures with a lab) first in the elective
// pools, so the lab/field overlay does not depend on which candidates the
// allocator happened to pick.
const WITH_LAB = new Set(LAB_PAIRS.map(([a]) => a.replace(' ', '')))
const labFirst = (code: string) => (LAB_FIELD_LIST.has(code) || WITH_LAB.has(code) || code.endsWith('L') ? 0 : 1)

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_UD =
  'A total of eleven (11) upper-division courses, including relevant electives; two must include laboratory or fieldwork; two must apply to the Disciplinary Communication requirement.'
const Q_LECLAB =
  'For 5-credit lecture courses with required, concurrent 2-credit labs, successful completion of both the lab and lecture is required and counts as one course for major requirements.'

export default defineHarness({
  program: 'marine-biology-bs',
  edition: '2026-27',
  title: 'Marine Biology B.S.',
  catalogNeeds: { descriptions: ['BIOE', 'BIOL', 'EART', 'ENVS', 'METX', 'OCEA', 'ECON', 'PSYC'] },
  notes: [
    'All courses used for any major requirement must be taken for a letter grade, except approved courses offered only Pass/No Pass — the app treats a P as not counting except where noted; ask an EEB advisor if your course is offered only P/NP.',
    'At least half of the upper-division courses (BIOE 100–179) must be taken in EEB at UC Santa Cruz (the plan does not record where a course was taken).',
    'Only one upper-division requirement may be met with research-based independent study or a graduate-level UCSC biology course (graduate substitutions need an EEB advisor).',
    'Environmental Studies general electives require permission of the instructor to enroll.',
  ],
  evaluate(h) {
    // "All courses used to satisfy any major requirement must be taken for a letter grade, except for approved courses which are ONLY offered as Pass/No Pass (P/NP)."
    h.policy = { letter: true }
    const drop = creditOnce(h)
    const dropNote = drop.length ? [`Not counted (the catalog gives no credit for both it and a course taken earlier): ${drop.join(', ')}`] : []

    // ---- Lower division -------------------------------------------------
    const intro = h.all('intro-bio', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B', 'BIOE 20C'])
    const chem = generalChem(h)
    const calc = h.options('math', 'Mathematics', ['Mathematics:', 'Choose one of the following options:'], [
      ['MATH 16A', 'MATH 16B'],
      ['MATH 11A', 'MATH 11B'],
      ['MATH 19A', 'MATH 19B'],
    ], { notes: ['MATH 16A/16B is the recommended series.'] })
    const stats = h.options('biostat', 'Biostatistics', 'Biostatistics:', [['STAT 7', 'STAT 7L']])
    const physics = h.options('physics', 'Physics', 'Physics:', [
      ['PHYS 6A', 'PHYS 6L', 'PHYS 6B'],
      ['PHYS 6A', 'PHYS 6L', 'PHYS 6C'],
    ])

    // ---- Upper division (one allocation) ----------------------------------
    const genetics = h.take('core-genetics', 'Genetics (BIOE 106 or BIOL 105)', 'Two core courses:', codes('BIOE 106', 'BIOL 105'), {
      notes: ['BIOE 106 is the recommended genetics course for EEB majors.'],
    })
    const evolution = h.take('core-evolution', 'BIOE 109 Evolution', 'Two core courses:', codes('BIOE 109'))
    const ecology = h.take('ecology', 'One ecology course', 'One ecology course:', codes('BIOE 107', 'BIOE 108'))
    const marineEnv = h.take('marine-env', 'One marine-environment course', 'One marine-environment course:', codes('OCEA 101', 'OCEA 130'))
    const marine = h.take(
      'marine',
      'One marine course',
      ['One marine course:', 'Note: Lecture/lab combinations count as a single course. See note under "Upper-Division Courses" for more details.', 'BIOE 129/BIOE 129L: Laboratory optional to satisfy the requirement (concurrent enrollment not required).', Q_LECLAB],
      codes(...MARINE),
      { labs: LABS },
    )
    const topical = h.take(
      'topical',
      'Three topical electives',
      ['Three topical electives chosen from the following:', 'Note: Lecture/lab combinations count as a single course. See note under "Upper-Division Courses" for more details.', Q_LECLAB],
      codes(...TOPICAL).except(drop),
      { n: 3, labs: LABS, prefer: labFirst, notes: dropNote },
    )
    const general = h.take(
      'general',
      'Three general electives',
      [
        'Three general electives chosen from the following:',
        'Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more credits that is not required to fulfill a different requirement group.',
        'One of the following may also be used as an upper-division general elective:',
        'Any 5 credits of undergraduate research',
        Q_LECLAB,
      ],
      range('BIOE', 100, 179).minCredits(5).or(codes(...GENERAL_LISTED)).except(drop),
      {
        n: 3,
        labs: LABS,
        prefer: labFirst,
        composite: { eligible: RESEARCH_SET, build: (avail) => researchUnits(h, avail) },
        atMost: [{ set: RESEARCH_SET, n: 1, label: 'undergraduate research (at most one)' }],
        pool: 'any BIOE 100–179 (5+ credits) not used elsewhere; BIOL 100, 101; listed EART, ECON, ENVS, METX, OCEA, PSYC courses; or one 5-credit block of undergraduate research (BIOE 183W/183L/193/193F/195) or ENVS 183',
        notes: ['Some electives have prerequisites outside the major; see an EEB advisor.', ...dropNote],
      },
    )

    // ---- DC overlay ------------------------------------------------------
    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC): two courses',
      [
        'The DC requirement in marine biology is satisfied by completing two of the following ecology and evolutionary biology courses:',
        'Note: Lecture and 2-credit lab combinations count as a single course. BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs, BIOE 117L and BIOE 137L, but these are not part of the DC requirement. To receive DC credit for BIOE 129, BIOE 129L must also be successfully completed.',
      ],
      codes(...DC_LIST).except(drop),
      { n: 2, exclusive: false, labs: { pairs: DC_PAIRS, mode: 'required' }, notes: dropNote },
    )

    h.solve()

    // Mixed MATH 11/19 sequences are not offered as an option on this page;
    // a campus transition policy may allow them → ask, never guess.
    if (calc.status === 'unmet') {
      const p = (c: string) => h.taken(codes(c)).length > 0
      if ((p('MATH 11A') && p('MATH 19B')) || (p('MATH 19A') && p('MATH 11B')))
        Object.assign(calc, { status: 'cannot-check', detail: 'A mixed MATH 11/19 sequence is not one of the listed options — ask an EEB advisor whether it is accepted.' })
    }
    // "Plus one of the following statistics options: STAT 5 — Statistics (5)" is only
    // recommended transfer preparation; the major requirement lists STAT 7/7L. A transfer
    // student's STAT 5 may be accepted → cannot-check (never met on a guess), as in
    // ecology-and-evolution-bs and plant-sciences-bs. A frosh STAT 5 is not listed → unmet.
    if (stats.status === 'unmet' && h.entry === 'transfer' && h.taken(codes('STAT 5')).length) {
      Object.assign(stats, {
        status: 'cannot-check',
        used: h.taken(codes('STAT 5')),
        detail: 'The transfer-preparation list names STAT 5 as a statistics option, but the major requirements list only STAT 7/7L — confirm with an EEB advisor that your STAT 5 counts.',
        quote: ['Biostatistics:', 'Plus one of the following statistics options:'],
      })
    }
    // NRS/BIOL 188 (spring 2023 or later) = half of the DC.
    if (dc.status === 'unmet' && (dc.progress?.have ?? 0) === 1) {
      const b188 = h.taken(codes('BIOL 188')).filter((e) => e.term == null || Number(e.term) >= 2232)
      if (b188.length)
        Object.assign(dc, {
          status: 'cannot-check',
          used: [...(dc.used ?? []), ...b188],
          detail: 'BIOL 188 counts as half the DC only if it is the California Ecology and Conservation course (NRS/BIOL 188) — confirm with EEB advising.',
          quote: [...(dc.quote as string[]), 'NRS/BIOL 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit.'],
        })
    }

    const udSlots = [genetics, evolution, ecology, marineEnv, marine, topical, general]
    const labField = labFieldNode(h, udSlots)

    const lower = h.group('lower', 'Lower-Division Courses', [intro, chem, calc, stats, physics])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('core', 'Two core courses', [genetics, evolution]),
      ecology,
      marineEnv,
      marine,
      labField,
    ], { quote: Q_UD })
    const electives = h.group('electives', 'Electives', [topical, general])
    return [lower, upper, electives, dc, comprehensive(h)]
  },
})

/** Of each catalog "cannot receive credit for both" pair the student took, the later-taken code. */
function creditOnce(h: HarnessContext): string[] {
  const first = (c: string) => Math.min(...h.taken(codes(c)).map((e) => Number(e.term ?? 0)))
  const out: string[] = []
  for (const [a, b] of NOT_BOTH) {
    const ta = first(a)
    const tb = first(b)
    if (Number.isFinite(ta) && Number.isFinite(tb)) out.push(tb >= ta ? b : a)
  }
  return out
}

/** Composite research units: one course of 5+ credits, or 2–3 research enrollments totalling 5+ credits. */
function researchUnits(h: HarnessContext, avail: Enrollment[]): Enrollment[][] {
  const cr = (e: Enrollment) => h.catalog.get(e.code)?.credits ?? 0
  const out: Enrollment[][] = []
  const small: Enrollment[] = []
  for (const e of avail) (cr(e) >= 5 ? out.push([e]) : small.push(e))
  for (let i = 0; i < small.length; i++)
    for (let j = i + 1; j < small.length; j++) {
      if (cr(small[i]) + cr(small[j]) >= 5) out.push([small[i], small[j]])
      else for (let k = j + 1; k < small.length; k++) if (cr(small[i]) + cr(small[j]) + cr(small[k]) >= 5) out.push([small[i], small[j], small[k]])
    }
  return out
}

/** "two must include laboratory or fieldwork" — counted over courses used for the eleven. */
function labFieldNode(h: HarnessContext, slots: Node[]): Node {
  const units = new Map<string, Enrollment>()
  const research: Enrollment[] = []
  for (const s of slots)
    for (const e of s.used ?? []) {
      // Undergraduate research may or may not be lab/field work → only "maybe".
      if (RESEARCH_SET.has(e.code)) {
        research.push(e)
        continue
      }
      const c = h.catalog.get(e.code)
      const isLab = LAB_FIELD_LIST.has(e.code) || (c?.suffix.endsWith('L') ?? false) || /\bfield\b/i.test(c?.title ?? '')
      if (!isLab) continue
      const key = LAB_OF.get(e.code) ?? e.code
      if (!units.has(key)) units.set(key, e)
    }
  // An optional lab (e.g. BIOE 129L) taken with its counted lecture makes that course include lab work.
  for (const s of slots)
    for (const e of s.used ?? []) {
      const lab = OPTIONAL_LAB_OF.get(e.code)
      const le = lab ? h.taken(codes(lab))[0] : undefined
      if (le && !units.has(e.code)) units.set(e.code, le)
    }
  const used = [...units.values()]
  const have = used.length
  // Counted courses not known as lab/field whose description mentions lab or field work.
  const unsure: Enrollment[] = []
  if (have < 2)
    for (const s of slots)
      for (const e of s.used ?? []) {
        const key = LAB_OF.get(e.code) ?? e.code
        if (units.has(key) || RESEARCH_SET.has(e.code) || unsure.some((x) => x.code === e.code)) continue
        if (MAYBE_LABFIELD.test(h.catalog.get(e.code)?.description ?? '')) unsure.push(e)
      }
  if (have < 2 && have + unsure.length + research.length >= 2) {
    const ask = [...unsure, ...research].map((e) => e.display).join(', ')
    return h.cannotCheck('lab-field', 'Two courses with laboratory or fieldwork', Q_UD, `${have} known lab/field course${have === 1 ? '' : 's'} found; ask an EEB advisor whether ${ask} counts as laboratory or fieldwork.`, {
      used: [...used, ...unsure, ...research],
      progress: { have, need: 2 },
    })
  }
  return h.node('lab-field', 'Two courses with laboratory or fieldwork', Q_UD, have >= 2 ? 'met' : 'unmet', {
    used,
    progress: { have: Math.min(have, 2), need: 2 },
    detail: have >= 2 ? undefined : `${2 - have} more of your upper-division major courses must include a lab or fieldwork (e.g. a lecture with its lab, or a field/lab course from the comprehensive list).`,
  })
}

/** Comprehensive: a passing grade in a listed field/lab course or independent research, or a senior thesis. */
function comprehensive(h: HarnessContext): Node {
  const quote = [
    'All majors in the biological sciences require completion of a comprehensive requirement. This requirement can be satisfied in one of the following ways:',
    'receiving a passing grade in an independent research course, or field/laboratory course listed below.',
    'completing a senior thesis.',
  ]
  const ok = h.taken(COMP_SET)
  const options = COMP_SET.members
  if (ok.length) return h.node('comprehensive', 'Comprehensive Requirement', quote, 'met', { used: ok.slice(0, 1), options })
  // A P grade counts only if the course is offered only P/NP — the catalog does not say.
  const pOnly = h.taken(COMP_SET, {}).filter((e) => policyFailure(e, h.policy) != null)
  if (pOnly.length)
    return h.cannotCheck('comprehensive', 'Comprehensive Requirement', quote, `${pOnly[0].display} was taken P/NP: it counts only if the course is offered only Pass/No Pass — check with EEB advising.`, { used: pOnly.slice(0, 1), options })
  return h.node('comprehensive', 'Comprehensive Requirement', quote, 'unmet', {
    options,
    detail: 'Pass one listed field/laboratory course, an EEB independent research course, or a senior thesis (BIOE 195).',
  })
}

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['General Chemistry:', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)

  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General Chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General Chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}
