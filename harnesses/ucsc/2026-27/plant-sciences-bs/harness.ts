// Plant Sciences B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/plant-sciences-bs.md
//
// Unusual bits handled in code below:
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too.
//  - Eleven upper-division courses = 2 core + ecology + plant physiology +
//    botany + 3 topical + 3 general electives, all one exclusive allocation
//    ("Courses appearing in more than one requirement group can fulfill only
//    one"). Lab/field (two of them) and DC are overlays.
//  - Lecture + required concurrent 2-credit lab = one course. Which labs are
//    required comes from the catalog's corequisites (e.g. BIOE 117 "Must be
//    taken concurrently with BIOE 117L"); optional labs (BIOE 129L, BIOE 131L,
//    ENVS 115L) never count as a course on their own.
//  - "Any 5 credits of undergraduate research" (or ENVS 183) may be ONE
//    general elective: a composite unit.
//  - Letter grades are required except for courses offered only P/NP; the
//    catalog does not record grading mode, so a P in a research course is
//    cannot-check where it decides the outcome.
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const SPRING_2023 = 2232

// Required concurrent lecture/lab pairs (catalog corequisites), lab ≤ 3 credits.
const REQUIRED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 120', 'BIOE 120L'],
  ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'], ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'],
  ['BIOE 134', 'BIOE 134L'], ['BIOE 135', 'BIOE 135L'], ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
  // ENVS 104A (2 credits) and ENVS 104L (5) must be taken concurrently: one unit.
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 130A', 'ENVS 130L'],
  ['EART 100', 'EART 100L'], ['EART 101', 'EART 101L'],
]
// Optional labs: the lecture counts alone; the lab never counts as a course by itself.
const OPTIONAL_LABS = ['BIOE 129L', 'BIOE 131L', 'ENVS 115L']

// Catalog "Students cannot receive credit for this course and ..." among the
// listed courses (BIOE 165 / ENVS 120; BIOE 150 / ENVS 104A; BIOE 151A-D /
// BIOE 150, 150L, ENVS 104A): only the earlier-taken one counts.
const NOT_BOTH: [string, string][] = [
  ['BIOE 165', 'ENVS 120'], ['BIOE 150', 'ENVS 104A'],
  ...['BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D'].flatMap((s) =>
    ['BIOE 150', 'BIOE 150L', 'ENVS 104A'].map((o) => [o, s] as [string, string]),
  ),
]

const TOPICAL = [
  'BIOE 117', 'BIOE 118', 'BIOE 119L', 'BIOE 120', 'BIOE 121', 'BIOE 125', 'BIOE 135', 'BIOE 137',
  'BIOE 138', 'BIOE 139', 'BIOE 145', 'BIOE 145L', 'BIOE 149', 'BIOE 151A', 'BIOE 151B', 'BIOE 151C',
  'BIOE 151D', 'BIOE 153A', 'BIOE 153B', 'BIOE 153C', 'BIOE 161', 'BIOE 161L',
  'BIOL 100', 'BIOL 101',
  'ENVS 104A', 'ENVS 130A', 'ENVS 130B', 'ENVS 131', 'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163',
  'SCIC 160',
]
const GENERAL_LIST = [
  'BIOL 100', 'BIOL 101',
  'EART 100', 'EART 101', 'EART 102', 'EART 105',
  'ECON 166A', 'ECON 166B',
  'ENVS 104A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'ENVS 115A', 'ENVS 120', 'ENVS 122',
  'ENVS 123', 'ENVS 130A', 'ENVS 130B', 'ENVS 131', 'ENVS 160', 'ENVS 161A', 'ENVS 162',
  'ENVS 163', 'ENVS 167', 'ENVS 168',
  'METX 100', 'METX 100L', 'METX 115', 'METX 133', 'METX 150',
  'OCEA 118', 'OCEA 122', 'OCEA 130',
  'PSYC 123',
]
// "Any 5 credits of undergraduate research" (small courses combine) or a 5-credit course.
const RESEARCH_SMALL = ['BIOE 183W', 'BIOE 183L', 'BIOE 193F']
const RESEARCH_FULL = ['BIOE 193', 'BIOE 195', 'ENVS 183']
const RESEARCH = codes(...RESEARCH_SMALL, ...RESEARCH_FULL)

const DC_LIST = [
  'BIOE 108', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 125', 'BIOE 126', 'BIOE 127',
  'BIOE 128L', 'BIOE 129', 'BIOE 137', 'BIOE 141L', 'BIOE 145', 'BIOE 145L', 'BIOE 150L', 'BIOE 151B',
  'BIOE 153C', 'BIOE 157B', 'BIOE 158L', 'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172', 'BIOE 174',
]
// "BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs ... but
// these are not part of the DC requirement. To receive DC credit for BIOE 129,
// BIOE 129L must be successfully completed."
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

// Courses known to be laboratory or fieldwork (the page has no explicit list
// for the "two must include laboratory or fieldwork" rule): the comprehensive
// field/lab list plus the labs and field courses in the elective lists.
const KNOWN_LAB_FIELD = new Set(
  [...COMP_EEB, ...COMP_OTHER, 'ENVS 104A', 'ENVS 104L', 'ENVS 130L', 'ENVS 115L', 'EART 100L', 'EART 101L', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C'].map((c) => c.replace(' ', '')),
)
// A counted course whose catalog description mentions lab or field work may
// include it; without any such candidate the rule is unmet.
const MAYBE_LABFIELD = /laborator|\blab\b|field (trip|work|stud|research|project|course|quarter|method|exercise)|fieldwork/i

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_UPPER =
  'A total of eleven (11) upper-division courses, including relevant electives; two must include laboratory or fieldwork; two must apply to the Disciplinary Communication requirement.'
const Q_OVERLAP =
  'Courses appearing in more than one requirement group can fulfill only one, but, if appropriate, may also fulfill a lab/field requirement and/or a DC.'
const Q_LECLAB =
  'For 5-credit lecture courses with required, concurrent 2-credit labs, successful completion of both the lab and lecture is required and counts as one course for major requirements.'
const Q_LETTER =
  'All courses used to satisfy any major requirement must be taken for a letter grade, except for approved courses which are ONLY offered as Pass/No Pass (P/NP).'

// Electives try lab/field courses first, so the eleven include them when possible
// ("two must include laboratory or fieldwork").
const WITH_LAB = new Set(REQUIRED_PAIRS.map(([lec]) => lec.replace(' ', '')))
const labFirst = (code: string) => (KNOWN_LAB_FIELD.has(code) || WITH_LAB.has(code) ? 0 : 1)

const LETTER = { letter: true }
const isP = (e: Enrollment) => e.grade === 'P' || e.grade === 'S'

export default defineHarness({
  program: 'plant-sciences-bs',
  edition: '2026-27',
  title: 'Plant Sciences B.S.',
  catalogNeeds: { descriptions: ['BIOE', 'BIOL', 'EART', 'ENVS', 'METX', 'OCEA', 'ECON', 'PSYC', 'SCIC'] },
  notes: [
    'All courses used for any major requirement must be taken for a letter grade, except approved courses offered only P/NP.',
    'At least half of the upper-division courses (BIOE 100–179) must be taken in EEB at UC Santa Cruz (the plan does not record where a course was taken).',
    'Only one upper-division requirement may be met with research-based independent study or a graduate-level UCSC biology course.',
    'Double majors must complete the DC and comprehensive requirements for each major.',
  ],
  evaluate(h) {
    // "All courses used to satisfy any major requirement must be taken for a letter grade, ..."
    h.policy = LETTER
    const drop = creditOnce(h)

    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'The following qualification courses, or their equivalents, must be completed with a grade of C (2.0) or better before the declaration deadline arrives.',
      'BIOL 20A, BIOE 20B, BIOE 20C; CHEM 3A + 3B or CHEM 4A; MATH 11A, 16A or 19A — each with C or better to declare. This gates declaration; it is not a graduation requirement.',
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('intro-bio', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B', 'BIOE 20C']),
      generalChem(h),
      h.options('math', 'Mathematics', 'Choose one of the following options:', [
        ['MATH 16A', 'MATH 16B'],
        ['MATH 11A', 'MATH 11B'],
        ['MATH 19A', 'MATH 19B'],
      ], { notes: ['MATH 16A/16B is the recommended series.'] }),
      statistics(h),
      h.options('physics', 'Physics', 'Physics:', [
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6B'],
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6C'],
      ]),
    ])

    const req = { pairs: REQUIRED_PAIRS, mode: 'required' as const }
    const core = h.group('core', 'Two core courses', [
      h.take('genetics', 'Genetics: BIOE 106 or BIOL 105', 'Two core courses:', codes('BIOE 106', 'BIOL 105'), {
        notes: ['BIOE 106 is the recommended genetics course for EEB-sponsored majors.'],
      }),
      h.take('evolution', 'BIOE 109 Evolution', 'Two core courses:', codes('BIOE 109')),
    ])
    const ecology = h.take('ecology', 'One ecology course', 'One Ecology Course:', codes('BIOE 107', 'BIOE 145'))
    const plantPhys = h.take(
      'plant-physiology',
      'One plant physiology course',
      ['One plant physiology course from the following:', Q_LECLAB],
      codes('BIOE 135', 'ENVS 162'),
      { labs: req },
    )
    const botany = h.take(
      'botany',
      'One botany course',
      ['One botany course from the following:', Q_LECLAB],
      codes('BIOE 117', 'BIOE 120'),
      { labs: req },
    )

    const topical = h.take(
      'topical',
      'Three topical electives',
      ['Three topical electives chosen from the following:', Q_LECLAB],
      codes(...TOPICAL).except(drop),
      { n: 3, labs: req, prefer: labFirst, notes: ['Environmental Studies courses: enrollment by permission of instructor.'] },
    )

    const researchUnits = (avail: Enrollment[]): Enrollment[][] => {
      const out: Enrollment[][] = []
      for (const e of avail) if (RESEARCH_FULL.some((c) => c.replace(' ', '') === e.code)) out.push([e])
      const small = avail.filter((e) => RESEARCH_SMALL.some((c) => c.replace(' ', '') === e.code))
      const credits = small.reduce((s, e) => s + (h.catalog.get(e.code)?.credits || 0), 0)
      if (credits >= 5) out.push(small)
      return out
    }
    const general = h.take(
      'general',
      'Three general electives',
      [
        'Three general electives chosen from the following:',
        'Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more credits that is not required to fulfill a different requirement group.',
        'One of the following may also be used as an upper-division general elective:',
        Q_LECLAB,
      ],
      range('BIOE', 100, 179).minCredits(5).or(codes(...GENERAL_LIST)).except([...OPTIONAL_LABS, ...drop]),
      {
        n: 3,
        labs: req,
        composite: { eligible: RESEARCH, build: researchUnits },
        prefer: labFirst,
        atMost: [{ set: RESEARCH, n: 1, label: 'undergraduate research / ENVS 183' }],
        pool: 'any BIOE 100–179 (5+ credits) not used elsewhere, or the listed BIOL/EART/ECON/ENVS/METX/OCEA/PSYC courses; at most one of: 5 credits of undergraduate research (BIOE 183W/183L/193/193F/195) or ENVS 183',
        notes: [
          'Environmental Studies courses: enrollment by permission of instructor.',
          ...(drop.length ? [`Not counted (the catalog gives no credit for both it and a course taken earlier): ${drop.join(', ')}`] : []),
        ],
      },
    )

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      [
        'The DC requirement in plant sciences is satisfied by completing two of the following ecology and evolutionary biology courses:',
        'BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs, BIOE 117L and BIOE 137L, but these are not part of the DC requirement. To receive DC credit for BIOE 129, BIOE 129L must be successfully completed.',
      ],
      codes(...DC_LIST).except(drop),
      { n: 2, exclusive: false, labs: { pairs: DC_PAIRS, mode: 'required' } },
    )

    const comp = h.take(
      'comprehensive',
      'Comprehensive Requirement',
      [
        'receiving a passing grade in an independent research course, or field/laboratory course listed below.',
        'completing a senior thesis.',
      ],
      codes(...COMP_EEB, ...COMP_OTHER, ...COMP_RESEARCH).except(drop),
      { exclusive: false, notes: ['Lab courses may have associated prerequisite or corequisite lecture courses.'] },
    )

    h.solve()

    // Math: the page lists only whole series; a mixed MATH 11/19 sequence is not addressed here.
    const mathNode = lower.children!.find((n) => n.id === 'math')!
    if (mathNode.status === 'unmet') {
      const has = (c: string) => h.taken(codes(c)).length > 0
      if ((has('MATH 11A') && has('MATH 19B')) || (has('MATH 19A') && has('MATH 11B'))) {
        mathNode.status = 'cannot-check'
        mathNode.detail = 'Mixed MATH 11/19 sequence: this page lists only complete series — confirm with an EEB advisor.'
      }
    }

    // P grades in research courses that may be offered only P/NP.
    const pResearch = h.enrollments.filter((e) => isP(e) && RESEARCH.has(e.code))
    for (const n of [general, comp]) {
      const oneShort = (n.progress?.have ?? 0) >= (n.progress?.need ?? 1) - 1
      if (n.status === 'unmet' && pResearch.length && oneShort) {
        n.status = 'cannot-check'
        n.detail = `${pResearch.map((e) => e.display).join(', ')} taken P/NP: it counts only if the course is offered only P/NP — check with an EEB advisor.`
        n.quote = [...(Array.isArray(n.quote) ? n.quote : [n.quote]), Q_LETTER]
      }
    }

    // Comprehensive: other departments' independent research courses are not listed.
    if (comp.status === 'unmet') {
      const other = h.taken(range('BIOL', 193, 199).or(range('ENVS', 193, 199)).or(range('METX', 193, 199)))
      if (other.length) {
        comp.status = 'cannot-check'
        comp.detail = `${other.map((e) => e.display).join(', ')}: ask an EEB advisor whether this independent research course satisfies the comprehensive requirement.`
      }
    }

    // DC: "NRS/BIOL 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit."
    if (dc.status === 'unmet' && (dc.progress?.have ?? 0) >= 1) {
      const b188 = h.taken(codes('BIOL 188')).filter((e) => e.term == null || Number(e.term) >= SPRING_2023)
      if (b188.length) {
        dc.status = 'cannot-check'
        dc.detail = 'BIOL 188 counts for half the DC only if it was the NRS/BIOL 188 California Ecology and Conservation course (spring 2023 or later) — the current catalog BIOL 188 is a different course.'
        dc.quote = [...(dc.quote as string[]), 'NRS/BIOL 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit.']
      }
    }

    const labField = labFieldNode(h, [core.children![0], core.children![1], ecology, plantPhys, botany, topical, general])

    const upper = h.group('upper', 'Upper-Division Courses', [core, ecology, plantPhys, botany, labField], {
      quote: [Q_UPPER, Q_OVERLAP],
    })
    const electives = h.group('electives', 'Electives', [topical, general])
    return [qualification, lower, upper, electives, dc, comp]
  },
})

/** "two must include laboratory or fieldwork" — overlay on the eleven upper-division courses. */
function labFieldNode(h: HarnessContext, slots: Node[]): Node {
  const quote = [Q_UPPER, Q_OVERLAP]
  const usedCodes = new Set(slots.flatMap((s) => (s.used ?? []).map((e) => e.code)))
  // A unit includes lab/fieldwork if a used course is a known lab/field course,
  // or an optional lab was taken with a used lecture.
  const hits: Enrollment[] = []
  const seen = new Set<string>()
  for (const s of slots) for (const e of s.used ?? []) {
    if (KNOWN_LAB_FIELD.has(e.code) && !seen.has(e.code)) {
      seen.add(e.code)
      hits.push(e)
    }
  }
  for (const lab of OPTIONAL_LABS.map((c) => c.replace(' ', ''))) {
    const lec = lab.slice(0, -1)
    const le = h.taken(codes(lab))[0]
    if (le && usedCodes.has(lec) && !seen.has(lab)) {
      seen.add(lab)
      hits.push(le)
    }
  }
  // Paired lab + lecture count as one unit: count units, not courses.
  const unitKey = (code: string) => {
    const p = [...REQUIRED_PAIRS].find(([a, b]) => a.replace(' ', '') === code || b.replace(' ', '') === code)
    return p ? p[0] : code.endsWith('L') && OPTIONAL_LABS.some((x) => x.replace(' ', '') === code) ? code.slice(0, -1) : code
  }
  const hitUnits = new Set(hits.map((e) => unitKey(e.code)))
  const units = hitUnits.size
  if (units >= 2)
    return h.node('lab-field', 'Two courses with laboratory or fieldwork', quote, 'met', { used: hits, progress: { have: 2, need: 2 } })
  // Other counted courses whose description mentions lab or field work.
  const unsure = new Set<string>()
  for (const s of slots) for (const e of s.used ?? []) {
    const k = unitKey(e.code)
    if (!hitUnits.has(k) && MAYBE_LABFIELD.test(h.catalog.get(e.code)?.description ?? '')) unsure.add(e.display)
  }
  if (units + unsure.size >= 2)
    return h.cannotCheck(
      'lab-field',
      'Two courses with laboratory or fieldwork',
      quote,
      `Found ${units} of your upper-division courses that clearly include laboratory or fieldwork${hits.length ? ` (${hits.map((e) => e.display).join(', ')})` : ''}; check with an EEB advisor whether ${[...unsure].join(', ')} includes laboratory or fieldwork.`,
      { used: hits, progress: { have: units, need: 2 } },
    )
  return h.node('lab-field', 'Two courses with laboratory or fieldwork', quote, 'unmet', {
    used: hits,
    progress: { have: units, need: 2 },
    detail: 'Two of your eleven upper-division courses must include a lab or fieldwork (e.g. a lecture with its lab, or a field/laboratory course from the comprehensive list).',
  })
}

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

/** STAT 7 + 7L. The transfer-preparation list also names STAT 5 as a statistics option. */
function statistics(h: HarnessContext): Node {
  const node = h.all('stats', 'Biostatistics', 'Biostatistics:', ['STAT 7', 'STAT 7L'])
  const stat5 = h.taken(codes('STAT 5'))
  if (!stat5.length || h.entry !== 'transfer') return node
  // Transfer students: "Plus the following statistics options: STAT 5 ⟨OR⟩ STAT 7 + STAT 7L"
  // is listed as recommended preparation, which suggests a transferred STAT 5 is accepted.
  return h.either('stats-or', 'Biostatistics', 'Biostatistics:', [
    node,
    h.cannotCheck(
      'stats-stat5',
      'STAT 5 (transfer preparation option)',
      'Plus the following statistics options:',
      'The transfer-preparation list names STAT 5 as a statistics option, but the major requirements list only STAT 7/7L — confirm with an EEB advisor that your STAT 5 counts.',
      { used: stat5 },
    ),
  ])
}
