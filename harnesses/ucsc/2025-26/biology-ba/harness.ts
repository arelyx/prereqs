// Biology B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/biology-ba.md
//
// Unusual bits handled in code below:
//  - General chemistry: CHEM 3A + 3B + 3BL, or CHEM 4A + 4AL, or the pre-2023
//    series CHEM 1A + 1B + 1C + 1N (page note). The 2026-27 fall-2026 CHEM 3B
//    rule does not exist on this page.
//  - Eight upper-division courses = 3 core + 1 anatomy/physiology + 4
//    electives, one exclusive allocation. Unlike 2026-27, the 2025-26 page has
//    no lab/field requirement. DC and comprehensive are overlays (the planner:
//    "Two of the upper-division course options must satisfy DC requirements.").
//  - Catalog "cannot receive credit for both" pairs (BIOE 151A-D vs BIOE
//    150/150L) count once in electives and DC.
//  - One elective short with an unused research/graduate course → cannot-check
//    ("Only one upper-division course requirement may be met with …").
//  - Lecture + required concurrent 2-credit lab = one course, both needed.
//    Which labs are required comes from the catalog ("Concurrent enrollment
//    in BIOE 112L is required" etc.); BIOE 129L and 131L are optional.
//  - "5-credit lectures with 5-credit labs count as two courses" (BIOE
//    145/145L, METX 100/100L …): each counts as its own elective.
//  - DC: BIOE 129 needs BIOE 129L — lectures with optional labs count alone
//    "(except for DC requirements)", and BIOE 129L is in the DC list.
//  - Letter grades, "except for approved courses which are ONLY offered as
//    Pass/No Pass": the app does not know which courses are P/NP-only, so a P
//    in a comprehensive candidate gives cannot-check, not unmet.
import { codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const SPRING_2023 = 2232

// Lectures whose catalog entry requires a concurrent 2-credit (3 for METX 135) lab.
const REQUIRED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'],
  ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'],
  ['BIOE 135', 'BIOE 135L'], ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
  ['METX 135', 'METX 135L'],
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
// BIOE 129 (optional lab) needs 129L for DC: "only the lecture must be
// successfully completed to count as one course (except for DC requirements)".
// BIOE 117L/137L "are not part of the DC requirement" → unpaired here.
const DC_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
]
// "NRS/XBIO 188/XENV 188 … taken spring 2023 or later, will satisfy 1/2 DC credit."
const CA_ECOLOGY = ['NRS 188', 'XBIO 188', 'XENV 188']
const CA_ECOLOGY_C = new Set(CA_ECOLOGY.map((c) => c.replace(' ', '')))

const COMP_EEB = [
  'BIOE 112L', 'BIOE 114L', 'BIOE 117L', 'BIOE 120L', 'BIOE 122L', 'BIOE 124L', 'BIOE 127L',
  'BIOE 128L', 'BIOE 129L', 'BIOE 131L', 'BIOE 133L', 'BIOE 134L', 'BIOE 135L', 'BIOE 137L', 'BIOE 141L',
  'BIOE 142L', 'BIOE 145L', 'BIOE 150L', 'BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'BIOE 153A',
  'BIOE 153B', 'BIOE 153C', 'BIOE 155L', 'BIOE 158L', 'BIOE 159A', 'BIOE 159B',
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

// Catalog: BIOE 151A-D "Students cannot receive credit for this course and
// BIOE 150 , BIOE 150L , ENVS 104A or ENVS 196A." → never both in one count.
const NO_BOTH: [string, string][] = ['BIOE 151A', 'BIOE 151B', 'BIOE 151C', 'BIOE 151D'].flatMap(
  (x): [string, string][] => [[x, 'BIOE 150'], [x, 'BIOE 150L']],
)
const NO_BOTH_LIMITS = NO_BOTH.map(([a, b]) => ({ set: codes(a, b), n: 1, label: `no credit for both ${a} and ${b}` }))
// "Only one upper-division course requirement may be met with a
// research-based independent study or graduate-level UC Santa Cruz biology course."
// Full (5+ credit) research/thesis courses per catalog titles, or graduate courses.
const GRAD = range('BIOE', 200, 299).or(range('BIOL', 200, 299)).or(range('METX', 200, 299))
const RESEARCH_SUB = codes(
  'BIOE 193', 'BIOE 195', 'BIOE 197', 'BIOE 199', 'BIOL 186L', 'BIOL 186R', 'BIOL 195', 'BIOL 198', 'BIOL 199',
  'METX 195', 'METX 198', 'METX 199',
).or(GRAD.minCredits(5))
const Q_CHEM_NOTE =
  'Note: This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, CHEM 1C, and CHEM 1N or equivalent.'
const Q_UPPER = 'A total of eight (8) upper-division biology courses, including electives, as follows:'
const Q_QUAL =
  "The following qualification courses, or their equivalents, must be completed with a grade of C (2.0) or better."
const Q_RESEARCH =
  'Only one upper-division course requirement may be met with a research-based independent study or graduate-level UC Santa Cruz biology course.'
const Q_COMBO =
  'For 5-credit lectures with required, concurrent 2-credit labs, successful completion of both the lab and lecture is required and counts as one course. For 5-credit lectures with optional labs, only the lecture must be successfully completed to count as one course (except for DC requirements).'
const Q_TWO = '5-credit lectures with 5-credit labs count as two courses. 7-credit labs count as one course.'

export default defineHarness({
  program: 'biology-ba',
  edition: '2025-26',
  title: 'Biology B.A.',
  coverage: {
    unknownOk: {
      'NRS 188': 'California Ecology and Conservation (NRS/XBIO/XENV 188) is a UC Natural Reserve System course, not in the UCSC catalog',
      'XBIO 188': 'same course, alternate listing',
      'XENV 188': 'same course, alternate listing',
      'CHEM 1B': 'pre-2023 general chemistry, retired from the catalog',
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
      h.take('physics', 'Physics', ['Physics:', 'Choose one of the following options.'], codes('PHYS 1A', 'PHYS 1B', 'PHYS 6A'), {
        notes: ['Enrollment in PHYS 6A requires concurrent enrollment in the PHYS 6L laboratory (an enrollment rule; PHYS 6L is not itself listed).'],
      }),
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
      ['Four additional BIOE courses numbered 100 - 179 of 5 or more credits, or the following courses:', Q_COMBO, Q_TWO],
      electivePool,
      {
        n: 4,
        labs,
        atMost: NO_BOTH_LIMITS,
        pool: `any BIOE 100–179 course of 5+ credits, or ${ELECTIVE_LIST.join(', ')} (not a course used above)`,
      },
    )

    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC): two courses',
      [
        'The DC requirement in the biology bachelor of arts degree is satisfied by completing two of the following Ecology and Evolutionary Biology courses:',
        'Note: Lecture and 2-credit lab combinations count as a single course.',
        'Two of the upper-division course options must satisfy DC requirements.',
        'NRS/XBIO 188/XENV 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit.',
      ],
      codes(...DC_LIST, ...CA_ECOLOGY),
      {
        n: 2,
        exclusive: false,
        labs: { pairs: DC_PAIRS, mode: 'required' },
        atMost: NO_BOTH_LIMITS,
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
        'receiving a passing grade in an independent research course, or field/laboratory course listed below.',
        'completing a senior thesis.',
      ],
      codes(...COMP_EEB, ...COMP_OTHER, ...EEB_RESEARCH),
      { exclusive: false, pool: 'a listed field/laboratory course, EEB independent research (BIOE 183L, 193, 193F, 197) or senior thesis (BIOE 195)' },
    )

    h.solve()

    // One elective short, with an unused research or graduate-level biology course.
    if (electives.status === 'unmet' && (electives.progress?.have ?? 0) === 3) {
      const sub = h.taken(RESEARCH_SUB).filter((e) => !h.used.has(e.id))
      if (sub.length) {
        electives.status = 'cannot-check'
        electives.detail = `${Q_RESEARCH} Ask an EEB advisor whether ${sub.map((e) => e.display).join(', ')} can count as your fourth elective.`
      }
    }

    // NRS/XBIO/XENV 188 with no term: cannot tell whether it was spring 2023 or later.
    if (dc.status === 'met' && dc.used?.some((e) => CA_ECOLOGY_C.has(e.code) && e.term == null)) {
      dc.status = 'cannot-check'
      dc.detail = 'California Ecology and Conservation (188) counts only if taken spring 2023 or later — check the term.'
    }

    pOnly(comp)
    if (comp.status === 'unmet') {
      const maybe = h.taken(MAYBE_RESEARCH, {})
      if (maybe.length) {
        comp.status = 'cannot-check'
        comp.detail = `Ask an EEB advisor whether ${maybe.map((e) => e.display).join(', ')} counts as an independent research course or senior thesis.`
      }
    }

    const upper = h.group('upper', 'Upper-Division Courses', [core, anat], { quote: Q_UPPER })
    // Qualification gates declaration, not completion.
    const qual = h.info(
      'qualification',
      'Major qualification (to declare)',
      Q_QUAL,
      'BIOL 20A, BIOE 20B, BIOE 20C and CHEM 3A+3B or CHEM 4A (or CHEM 1A-1C, 1M, 1N) with C (2.0) or better; not checked here.',
    )
    return [qual, lower, upper, electives, dc, comp]
  },
})

/** Unmet only because a candidate was taken P/NP: it counts if that course is offered only P/NP. */
function pOnly(node: Node): void {
  if (node.status !== 'unmet') return
  if (!node.detail?.includes('taken P/NP')) return
  node.status = 'cannot-check'
  node.detail += ' — it still counts if the course is offered only Pass/No Pass; check the course listing.'
}

/** CHEM 3A + 3B + 3BL, CHEM 4A + 4AL, or (note) CHEM 1A + 1B + 1C + 1N. */
function generalChem(h: HarnessContext): Node {
  return h.options(
    'gen-chem',
    'General Chemistry',
    ['General Chemistry:', 'Choose one of the following options:', Q_CHEM_NOTE],
    [
      ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL'],
      ['CHEM 4A', 'CHEM 4AL'],
      ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'],
    ],
    { notes: ['A transfer series equivalent to CHEM 1A-1C/1N also counts: add it to your plan as those courses.'] },
  )
}
