// Biology B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biology-ba.md
//
// Unusual bits handled in code below:
//  - CHEM 3B taken before fall 2026 (term < 2268) needs CHEM 3BL too.
//  - Eight upper-division courses = 3 core + 1 anatomy/physiology + 4
//    electives, one exclusive allocation ("Courses appearing in more than one
//    requirement group can only fulfill one"). The lab/field requirement, DC
//    and comprehensive are overlays ("may also fulfill a lab/field
//    requirement and/or a DC"). Every DC course is itself elective-eligible,
//    so "two must apply to the DC requirement" holds whenever the overlay is
//    met (a DC course can always be swapped into the four electives).
//  - Lecture + required concurrent 2-credit lab = one course, both needed.
//    Which labs are required comes from the catalog ("Concurrent enrollment
//    in BIOE 112L is required" etc.); BIOE 129L and 131L are optional.
//  - A 5-credit lecture + 5-credit lab (BIOE 145/145L, METX 100/100L…): the
//    2026-27 page no longer says whether these count as one or two courses
//    ("Lecture/lab combinations count as a single course"). Counted as one;
//    if counting them as two would complete the electives → cannot-check.
//  - Letter grades, "except for approved courses which are ONLY offered as
//    Pass/No Pass": the app does not know which courses are P/NP-only, so a P
//    in a comprehensive/lab-field candidate gives cannot-check, not unmet.
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const SPRING_2023 = 2232

// Lectures whose catalog entry requires a concurrent 2-credit (3 for METX 135) lab.
const REQUIRED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'],
  ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'],
  ['BIOE 135', 'BIOE 135L'], ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
  ['METX 135', 'METX 135L'],
]
// 5-credit lecture + 5-credit lab in the elective pool.
const FIVE_PAIRS: [string, string][] = [
  ['BIOE 145', 'BIOE 145L'], ['BIOE 150', 'BIOE 150L'], ['BIOE 155', 'BIOE 155L'],
  ['BIOE 161', 'BIOE 161L'], ['METX 100', 'METX 100L'],
]

const ANAT = ['BIOE 131', 'BIOE 133', 'BIOE 134', 'BIOE 135', 'BIOE 136', 'METX 135']
// Optional labs of the anatomy list (BIOE 131L) are referenced here for coverage.
const ANAT_LABS = ['BIOE 131L', 'BIOE 133L', 'BIOE 134L', 'BIOE 135L', 'METX 135L']

const ELECTIVE_LIST = ['BIOL 100', 'BIOL 101', 'METX 100', 'METX 100L', 'METX 115', 'METX 133', 'METX 150']

// DC list, page order (lectures; their 2-credit labs are paired below).
const DC_LIST = [
  'BIOE 108', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 125', 'BIOE 126', 'BIOE 127',
  'BIOE 128L', 'BIOE 129', 'BIOE 137', 'BIOE 141L', 'BIOE 145', 'BIOE 145L', 'BIOE 150L', 'BIOE 151B',
  'BIOE 153C', 'BIOE 157B', 'BIOE 158L', 'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172', 'BIOE 174',
]
// "To receive DC credit for BIOE 129, BIOE 129L must be successfully completed."
// BIOE 117L/137L "are not part of the DC requirement" → unpaired here.
const DC_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
]
// "NRS/XBIO 188/XENV 188 … taken spring 2023 or later, will satisfy 1/2 DC credit."
const CA_ECOLOGY = ['NRS 188', 'XBIO 188', 'XENV 188']
const CA_ECOLOGY_C = new Set(CA_ECOLOGY.map((c) => c.replace(' ', '')))

const COMP_EEB = [
  'BIOE 112L', 'BIOE 114L', 'BIOE 117L', 'BIOE 119L', 'BIOE 120L', 'BIOE 122L', 'BIOE 124L', 'BIOE 127L',
  'BIOE 128L', 'BIOE 129L', 'BIOE 131L', 'BIOE 133L', 'BIOE 134L', 'BIOE 135L', 'BIOE 137L', 'BIOE 141L',
  'BIOE 142L', 'BIOE 145L', 'BIOE 150L', 'BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'BIOE 153A',
  'BIOE 153B', 'BIOE 153C', 'BIOE 155L', 'BIOE 157A', 'BIOE 157B', 'BIOE 158L', 'BIOE 159A', 'BIOE 159B',
  'BIOE 159C', 'BIOE 159D', 'BIOE 159E', 'BIOE 159F', 'BIOE 161L', 'BIOE 163L', 'BIOE 183W',
]
const COMP_OTHER = ['METX 100L', 'METX 135L', 'CRSN 152']
// "receiving a passing grade in an independent research course … or completing
// a senior thesis": EEB's own research/thesis courses per catalog titles
// (Undergraduate Research in EEB, Independent Research in EEB, Summer
// Intensive Research in EEB, Senior Thesis).
const EEB_RESEARCH = ['BIOE 183L', 'BIOE 193', 'BIOE 193F', 'BIOE 197', 'BIOE 195']
// Other research/thesis/independent-study courses: may or may not count → cannot-check.
const MAYBE_RESEARCH = range('BIOE', 180, 199)
  .or(range('BIOL', 186, 199))
  .or(range('METX', 190, 199))
  .except(codes(...COMP_EEB, ...EEB_RESEARCH))

const LAB_FIELD = codes(...COMP_EEB, ...COMP_OTHER).or(
  range('BIOE', 100, 199)
    .or(range('BIOL', 100, 199))
    .or(range('METX', 100, 199))
    .where((c) => c.suffix.endsWith('L'), 'upper-division lab ending in “L”'),
)

const Q_CHEM_NOTE =
  'CHEM 3B taken fall 2026 or later will satisfy this requirement as it is inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL.'
const Q_UPPER =
  'A total of eight (8) upper-division biology courses, including relevant electives: one must include laboratory or fieldwork; two must apply to the Disciplinary Communications requirement.'
const Q_OVERLAP =
  'Courses appearing in more than one requirement group can only fulfill one, but, if appropriate, may also fulfill a lab/field requirement and/or a DC.'
const Q_COMBO =
  'For 5-credit lecture courses with required, concurrent 2-credit labs, successful completion of both the lab and lecture is required and counts as one course for major requirements. For 5-credit lectures with optional labs, only the lecture must be successfully completed to count as one course.'

export default defineHarness({
  program: 'biology-ba',
  edition: '2026-27',
  title: 'Biology B.A.',
  coverage: {
    unknownOk: {
      'NRS 188': 'California Ecology and Conservation (NRS/XBIO/XENV 188) is a UC Natural Reserve System course, not in the UCSC catalog',
      'XBIO 188': 'same course, alternate listing',
      'XENV 188': 'same course, alternate listing',
    },
  },
  notes: [
    'All courses used for the major must be taken for a letter grade, except approved courses offered only Pass/No Pass.',
    'At least half of the upper-division courses (BIOE 100–179) must be taken in EEB at UC Santa Cruz (the plan does not record where a course was taken).',
    'Only one upper-division requirement may be met with a research-based independent study or a graduate-level UCSC biology course (by advisor approval).',
  ],
  evaluate(h) {
    // "All courses used to satisfy any major requirement must be taken for a letter grade, except for approved courses which are ONLY offered as Pass/No Pass (P/NP)."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('intro-bio', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B', 'BIOE 20C']),
      generalChem(h),
      h.options('stats', 'Statistics', 'Statistics:', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      // Three single-course options; PHYS 1A and 1B alternate years, so either one counts.
      h.take('physics', 'Physics', ['Physics:', 'Choose one of the following options.'], codes('PHYS 1A', 'PHYS 1B', 'PHYS 6A')),
    ])

    const labs = { pairs: REQUIRED_PAIRS, mode: 'required' as const }
    const core = h.group(
      'core',
      'Three core courses',
      [
        h.options('genetics', 'Genetics', 'Three core courses:', [['BIOE 106'], ['BIOL 105']], {
          notes: ['BIOE 106 is the recommended genetics course for EEB-sponsored majors.'],
        }),
        h.all('core-eco-evo', 'Ecology and Evolution', 'Three core courses:', ['BIOE 107', 'BIOE 109']),
      ],
      { quote: 'Three core courses:' },
    )
    const anat = h.take(
      'anat-phys',
      'One anatomy or physiology course',
      ['One of the following anatomy or physiology courses:', Q_COMBO],
      codes(...ANAT),
      { labs, notes: [`Labs: ${ANAT_LABS.join(', ')}. BIOE 131L is optional; the others are required with their lecture and count as one course with it.`] },
    )
    const electivePool = range('BIOE', 100, 179).minCredits(5).or(codes(...ELECTIVE_LIST))
    const electives = h.take(
      'electives',
      'Four electives',
      ['Four additional BIOE courses numbered 100 - 179 of 5 or more credits, or the following courses:', Q_COMBO],
      electivePool,
      {
        n: 4,
        labs,
        atMost: FIVE_PAIRS.map(([a, b]) => ({ set: codes(a, b), n: 1, label: `${a}/${b} as one course` })),
        pool: `any BIOE 100–179 course of 5+ credits, or ${ELECTIVE_LIST.join(', ')} (not a course used above)`,
      },
    )

    const labField = h.take(
      'lab-field',
      'One course with laboratory or fieldwork',
      Q_UPPER,
      LAB_FIELD,
      { exclusive: false, pool: 'a field/laboratory course from the comprehensive lists, or any upper-division BIOE/BIOL/METX lab (“L”)' },
    )

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC): two courses',
      [
        'The DC requirement in the biology bachelor of arts degree is satisfied by completing two of the following Ecology and Evolutionary Biology courses:',
        'Note: Lecture and 2-credit lab combinations count as a single course.',
        'NRS/XBIO 188/XENV 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit.',
      ],
      codes(...DC_LIST, ...CA_ECOLOGY),
      {
        n: 2,
        exclusive: false,
        labs: { pairs: DC_PAIRS, mode: 'required' },
        check: (chosen) => {
          const early = chosen.find((e) => CA_ECOLOGY_C.has(e.code) && e.term != null && Number(e.term) < SPRING_2023)
          return early ? `${early.display} counts for DC only if taken spring 2023 or later` : null
        },
        notes: ['BIOE 129 counts for DC only with BIOE 129L; BIOE 117 and 137 count without their labs.'],
      },
    )

    const comp = h.take(
      'comprehensive',
      'Comprehensive Requirement',
      [
        'receiving a passing grade in an independent research course, or field/laboratory course listed below; or',
        'completing a senior thesis.',
      ],
      codes(...COMP_EEB, ...COMP_OTHER, ...EEB_RESEARCH),
      { exclusive: false, pool: 'a listed field/laboratory course, EEB independent research (BIOE 183L, 193, 193F, 197) or senior thesis (BIOE 195)' },
    )

    h.solve()

    // 5-credit lecture/lab pairs: counting them as two might complete the electives.
    if (electives.status === 'unmet') {
      const used = new Set(electives.used?.map((e) => e.code))
      const extra = FIVE_PAIRS.filter(([a, b]) => {
        const [ca, cb] = [a.replace(' ', ''), b.replace(' ', '')]
        const other = used.has(ca) ? cb : used.has(cb) ? ca : null
        return other && h.enrollments.some((e) => e.code === other && !h.used.has(e.id) && policyFailure(e, h.policy) == null)
      }).length
      if ((electives.progress?.have ?? 0) + extra >= 4) {
        electives.status = 'cannot-check'
        electives.detail = 'Complete only if a 5-credit lecture and its 5-credit lab (e.g. BIOE 145 and 145L) count as two electives — the page says lecture/lab combinations count as one; ask an EEB advisor.'
      }
    }

    // NRS/XBIO/XENV 188 with no term: cannot tell whether it was spring 2023 or later.
    if (dc.status === 'met' && dc.used?.some((e) => CA_ECOLOGY_C.has(e.code) && e.term == null)) {
      dc.status = 'cannot-check'
      dc.detail = 'California Ecology and Conservation (188) counts only if taken spring 2023 or later — check the term.'
    }

    pOnly(labField)
    pOnly(comp)
    if (comp.status === 'unmet') {
      const maybe = h.taken(MAYBE_RESEARCH, {})
      if (maybe.length) {
        comp.status = 'cannot-check'
        comp.detail = `Ask an EEB advisor whether ${maybe.map((e) => e.display).join(', ')} counts as an independent research course or senior thesis.`
      }
    }
    if (labField.status === 'unmet') {
      const research = h.taken(codes(...EEB_RESEARCH).or(MAYBE_RESEARCH), {})
      if (research.length) {
        labField.status = 'cannot-check'
        labField.detail = `None of your courses is a listed lab/field course; ask an EEB advisor whether ${research.map((e) => e.display).join(', ')} includes laboratory or fieldwork.`
      }
    }

    const upper = h.group('upper', 'Upper-Division Courses', [core, anat, labField], { quote: [Q_UPPER, Q_OVERLAP] })
    return [lower, upper, electives, dc, comp]
  },
})

/** Unmet only because a candidate was taken P/NP: it counts if that course is offered only P/NP. */
function pOnly(node: Node): void {
  if (node.status !== 'unmet') return
  if (!node.detail?.includes('taken P/NP')) return
  node.status = 'cannot-check'
  node.detail += ' — it still counts if the course is offered only Pass/No Pass; check the course listing.'
}

/** CHEM 3A + 3B (+3BL when 3B was taken before fall 2026) or CHEM 4A + 4AL. */
function generalChem(h: HarnessContext): Node {
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const quote = ['General Chemistry:', 'Choose one of the following options:', Q_CHEM_NOTE]
  const options = ['CHEM3A', 'CHEM3B', 'CHEM3BL', 'CHEM4A', 'CHEM4AL']
  const a3 = first('CHEM3A')
  const b3 = first('CHEM3B')
  const bl = first('CHEM3BL')
  const missingA = [!a3 && 'CHEM 3A', !b3 && 'CHEM 3B'].filter((x): x is string => !!x)
  let undated = false
  if (b3 && !bl) {
    if (b3.term == null) undated = true
    else if (Number(b3.term) < FALL_2026) missingA.push('CHEM 3BL')
  }
  const usedA = [a3, b3, bl].filter((x): x is Enrollment => !!x)
  const a4 = first('CHEM4A')
  const l4 = first('CHEM4AL')
  const usedB = [a4, l4].filter((x): x is Enrollment => !!x)
  const missingB = [!a4 && 'CHEM 4A', !l4 && 'CHEM 4AL'].filter((x): x is string => !!x)

  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General Chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General Chemistry', quote, 'CHEM 3B has no term: if taken before fall 2026 you also need CHEM 3BL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General Chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
  })
}
