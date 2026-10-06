// Ecology and Evolution B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/ecology-and-evolution-bs.md
//
// Shape: lower-division science core; eleven upper-division courses =
// 3 core + 1 physiology + 1 organism + 3 topical + 3 general electives (one
// exclusive allocation: "Courses appearing in more than one requirement group
// can fulfill only one"). Overlays on top: two lab/field courses, the DC (two
// courses) and the comprehensive ("may also fulfill a lab/field requirement
// and/or a DC").
//
// Lecture/lab rules:
//  - "For 5-credit lecture courses with required, concurrent 2-credit labs,
//    successful completion of both the lab and lecture is required and counts
//    as one course". Which labs are required-concurrent comes from the
//    catalog (coreqs): BIOE 112, 114, 117, 120, 122, 124, 127, 133, 134, 135,
//    137, 163 (and EART 100/101, ENVS 104A/104L, 130A/130L).
//  - BIOE 131L is optional everywhere; BIOE 129L is optional for the topical
//    and general electives but required for the Organism slot and the DC.
//  - ENVS 115L is not a concurrent corequisite in the catalog ("Previous or
//    concurrent enrollment in ENVS 115L ..., or permission of instructor"), so
//    ENVS 115A counts alone, like an optional lab.
//  - Optional 2-credit labs are left out of the elective sets (a 2-credit lab
//    cannot count as a course by itself), so the lecture alone counts.
//  - 5-credit labs (BIOE 145L, 150L, 155L, 161L, METX 100L) are courses of
//    their own; the combination rule is about 2-credit labs ("Lecture and
//    2-credit lab combinations count as a single course").
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268
const SPRING_2023 = 2232

// Required, concurrent 2-credit labs (catalog coreqs).
const REQUIRED_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'],
  ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'],
  ['BIOE 135', 'BIOE 135L'], ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
]
const OTHER_REQUIRED_PAIRS: [string, string][] = [
  ['EART 100', 'EART 100L'], ['EART 101', 'EART 101L'], ['ENVS 104A', 'ENVS 104L'],
  ['ENVS 130A', 'ENVS 130L'],
]
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

const PHYSIOLOGY = ['BIOE 131', 'BIOE 131L', 'BIOE 133', 'BIOE 133L', 'BIOE 134', 'BIOE 134L', 'BIOE 135', 'BIOE 135L', 'BIOE 136']
const ORGANISM = [
  'BIOE 112', 'BIOE 112L', 'BIOE 114', 'BIOE 114L', 'BIOE 117', 'BIOE 117L', 'BIOE 120', 'BIOE 120L',
  'BIOE 122', 'BIOE 122L', 'BIOE 124', 'BIOE 124L', 'BIOE 127', 'BIOE 127L', 'BIOE 129', 'BIOE 129L',
  'METX 100', 'METX 100L',
]
const TOPICAL = [
  'BIOE 108', 'BIOE 112', 'BIOE 112L', 'BIOE 114', 'BIOE 114L', 'BIOE 117', 'BIOE 117L', 'BIOE 118',
  'BIOE 119L', 'BIOE 120', 'BIOE 120L', 'BIOE 121', 'BIOE 122', 'BIOE 122L', 'BIOE 124', 'BIOE 124L',
  'BIOE 125', 'BIOE 126', 'BIOE 127', 'BIOE 127L', 'BIOE 128L', 'BIOE 129', 'BIOE 129L', 'BIOE 131',
  'BIOE 131L', 'BIOE 133', 'BIOE 133L', 'BIOE 134', 'BIOE 134L', 'BIOE 135', 'BIOE 135L', 'BIOE 136',
  'BIOE 137', 'BIOE 137L', 'BIOE 138', 'BIOE 139', 'BIOE 140', 'BIOE 141L', 'BIOE 142L', 'BIOE 145',
  'BIOE 145L', 'BIOE 146', 'BIOE 147', 'BIOE 149', 'BIOE 150', 'BIOE 150L', 'BIOE 151A', 'BIOE 151B',
  'BIOE 151C', 'BIOE 151D', 'BIOE 153A', 'BIOE 153B', 'BIOE 153C', 'BIOE 155', 'BIOE 155L', 'BIOE 158L',
  'BIOE 159A', 'BIOE 159B', 'BIOE 159C', 'BIOE 159D', 'BIOE 159E', 'BIOE 159F', 'BIOE 161', 'BIOE 161L',
  'BIOE 163', 'BIOE 163L', 'BIOE 165', 'BIOE 172', 'BIOE 173', 'BIOE 174', 'BIOE 175', 'BIOE 176',
  'BIOL 100', 'BIOL 101', 'OCEA 118', 'METX 100L',
]
// General electives: explicit lists (BIOE 100–179 handled by a range).
const GENERAL_LISTED = [
  'BIOL 100', 'BIOL 101',
  'EART 100', 'EART 100L', 'EART 101', 'EART 101L', 'EART 102', 'EART 105',
  'ECON 166A', 'ECON 166B',
  'ENVS 104A', 'ENVS 104L', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'ENVS 115A', 'ENVS 115L',
  'ENVS 120', 'ENVS 122', 'ENVS 123', 'ENVS 130A', 'ENVS 130L', 'ENVS 130B', 'ENVS 131', 'ENVS 160',
  'ENVS 161A', 'ENVS 162', 'ENVS 163', 'ENVS 167', 'ENVS 168',
  'METX 100', 'METX 100L', 'METX 115', 'METX 133', 'METX 150',
  'OCEA 118', 'OCEA 122', 'OCEA 130',
  'PSYC 123',
]
const RESEARCH = ['BIOE 183W', 'BIOE 183L', 'BIOE 193', 'BIOE 193F', 'BIOE 195']
const ONE_EXTRA = [...RESEARCH, 'ENVS 183']

const DC_LIST = [
  'BIOE 108', 'BIOE 114', 'BIOE 114L', 'BIOE 117', 'BIOE 120', 'BIOE 120L', 'BIOE 122', 'BIOE 122L',
  'BIOE 125', 'BIOE 126', 'BIOE 127', 'BIOE 127L', 'BIOE 128L', 'BIOE 129', 'BIOE 129L', 'BIOE 137',
  'BIOE 141L', 'BIOE 145', 'BIOE 145L', 'BIOE 150L', 'BIOE 151B', 'BIOE 153C', 'BIOE 157B', 'BIOE 158L',
  'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172', 'BIOE 174',
]
// "BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs ...
// but these are not part of the DC requirement." "To receive DC credit for
// BIOE 129, BIOE 129L must be successfully completed."
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

// Courses the page itself presents as lab/field courses (the comprehensive
// "field/laboratory course" list), every lab ("L") course, and the ENVS
// natural-history field quarter.
const LABFIELD = new Set(
  [...COMP_EEB, ...COMP_OTHER, 'ENVS 107A', 'ENVS 107B', 'ENVS 107C'].map((c) => c.replace(' ', '')),
)
const isLabField = (code: string) => LABFIELD.has(code) || /^[A-Z]+1\d\dL$/.test(code)
// Electives try lab/field courses (and lectures whose lab is required) first,
// so the eleven include them when possible ("two must include laboratory or fieldwork").
const WITH_LAB = new Set([...REQUIRED_PAIRS, ...OTHER_REQUIRED_PAIRS].map(([lec]) => lec.replace(' ', '')))
const labFirst = (code: string) => (isLabField(code) || WITH_LAB.has(code) ? 0 : 1)
const MAYBE_LABFIELD = /laborator|\blab\b|field (trip|work|stud|research|project|course|quarter|method|exercise)|fieldwork/i

// lecture → its 2-credit (or smaller) lab
const SMALL_LAB_OF = new Map(
  [...REQUIRED_PAIRS, ...OTHER_REQUIRED_PAIRS, ['BIOE 129', 'BIOE 129L'] as [string, string], ['BIOE 131', 'BIOE 131L'] as [string, string], ['ENVS 115A', 'ENVS 115L'] as [string, string]].map(([a, b]) => [
    a.replace(' ', ''),
    b.replace(' ', ''),
  ]),
)

const LECTURE_OF = new Map([...SMALL_LAB_OF].map(([a, b]) => [b, a]))

const strip = (l: string[]) => l.filter((c) => !OPTIONAL_LABS.includes(c))

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_UPPER =
  'A total of eleven (11) upper-division courses, including relevant electives; two must include laboratory or fieldwork; two must apply to the Disciplinary Communication requirement.'
const Q_OVERLAP =
  'Courses appearing in more than one requirement group can fulfill only one, but, if appropriate, may also fulfill a lab/field requirement and/or a DC.'
const Q_LETTER =
  'All courses used to satisfy any major requirement must be taken for a letter grade, except for approved courses which are ONLY offered as Pass/No Pass (P/NP).'
const RESEARCH_SET = codes('BIOE 183W', 'BIOE 183L', 'BIOE 193', 'BIOE 193F', 'BIOE 195', 'ENVS 183')
const Q_LECLAB =
  'For 5-credit lecture courses with required, concurrent 2-credit labs, successful completion of both the lab and lecture is required and counts as one course for major requirements. For 5-credit lectures with optional labs, only the lecture must be successfully completed to count as one course.'

export default defineHarness({
  program: 'ecology-and-evolution-bs',
  edition: '2026-27',
  title: 'Ecology and Evolution B.S.',
  catalogNeeds: { descriptions: ['BIOE', 'BIOL', 'EART', 'ENVS', 'METX', 'OCEA', 'ECON', 'PSYC'] },
  notes: [
    'All courses used for the major must be taken for a letter grade (except approved courses offered only P/NP).',
    'At least half of the upper-division BIOE 100–179 courses must be taken in EEB at UC Santa Cruz (the plan does not record where a course was taken).',
    'Only one upper-division requirement may be met with a research-based independent study or a graduate-level UCSC biology course (graduate courses need advisor approval; add an approved substitution as a completed course).',
    'MATH 16A/16B is the recommended mathematics series; BIOE 106 is the recommended genetics course.',
  ],
  evaluate(h) {
    // "All courses used to satisfy any major requirement must be taken for a
    // letter grade, except for approved courses which are ONLY offered as
    // Pass/No Pass (P/NP)." No course this page lists is P/NP-only in the catalog.
    h.policy = { letter: true }
    const drop = creditOnce(h)

    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      "The following qualification courses, or their equivalents, must be completed with a grade of C (2.0) or better before the student's declaration deadline arrives.",
      'BIOL 20A, BIOE 20B, BIOE 20C; CHEM 3A + 3B or CHEM 4A; MATH 11A, 16A or 19A — each with C or better to declare. This gates declaration; it is not a graduation requirement.',
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('bio-intro', 'Introductory Biology', 'Introductory Biology:', ['BIOL 20A', 'BIOE 20B', 'BIOE 20C']),
      generalChem(h),
      h.options(
        'math',
        'Mathematics',
        'Choose one of the following options:',
        [['MATH 16A', 'MATH 16B'], ['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']],
        { notes: ['MATH 16A/16B is the recommended series.'] },
      ),
      statistics(h),
      h.options('physics', 'Physics', 'Physics:', [
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6B'],
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6C'],
      ]),
    ])

    const core = h.group('core', 'Three core courses', [
      h.take('genetics', 'Genetics: BIOE 106 or BIOL 105', 'Three core courses:', codes('BIOE 106', 'BIOL 105'), {
        notes: ['BIOE 106 is the recommended genetics course for EEB-sponsored majors.'],
      }),
      h.all('core-ecol-evol', 'BIOE 107 and BIOE 109', 'Three core courses:', ['BIOE 107', 'BIOE 109']),
    ])
    const physiology = h.take(
      'physiology',
      'One physiology course',
      ['One of the following physiology courses:', 'BIOE 131/BIOE 131L: Laboratory optional to satisfy the requirement (concurrent enrollment not required).', Q_LECLAB],
      codes(...strip(PHYSIOLOGY)),
      { labs: { pairs: REQUIRED_PAIRS, mode: 'required' } },
    )
    const organism = h.take(
      'organism',
      'One organism course',
      ['One of the following organism courses:', 'BIOE 129/BIOE 129L: Both lecture and lab are required to satisfy the Organism requirement.', Q_LECLAB],
      codes(...ORGANISM),
      { labs: { pairs: [...REQUIRED_PAIRS, ['BIOE 129', 'BIOE 129L']], mode: 'required' } },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [core, physiology, organism], { quote: [Q_UPPER, Q_OVERLAP] })

    const topical = h.take(
      'topical',
      'Three topical electives',
      [
        'Three topical electives chosen from the following:',
        'BIOE 129 can satisfy a topical elective without BIOE 129L',
        Q_LECLAB,
      ],
      codes(...strip(TOPICAL)).except(drop),
      { n: 3, labs: { pairs: REQUIRED_PAIRS, mode: 'required' }, prefer: labFirst },
    )
    const general = generalElectives(h, drop)
    const electives = h.group('electives', 'Electives', [topical, general])

    h.solve()

    const labField = labFieldNode(h, [core, physiology, organism, topical, general])
    const dc = dcNode(h)
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive Requirement',
      [
        'This requirement can be satisfied in one of the following ways:',
        'receiving a passing grade in an independent research course, or field/laboratory course listed below.',
        'completing a senior thesis.',
      ],
      codes(...COMP_EEB, ...COMP_OTHER, ...COMP_RESEARCH).except(drop),
      { exclusive: false, notes: ['Independent research: BIOE 183L, 193, 193F; senior thesis: BIOE 195.'] },
    )
    h.solve()

    // Math: the page lists only whole series; a mixed MATH 11/19 sequence is not addressed.
    const mathNode = lower.children!.find((n) => n.id === 'math')!
    if (mathNode.status === 'unmet') {
      const has = (c: string) => h.taken(codes(c)).length > 0
      if ((has('MATH 11A') && has('MATH 19B')) || (has('MATH 19A') && has('MATH 11B'))) {
        mathNode.status = 'cannot-check'
        mathNode.detail = 'Mixed MATH 11/19 sequence: this page lists only complete series — confirm with an EEB advisor.'
      }
    }

    // "except for approved courses which are ONLY offered as Pass/No Pass (P/NP)":
    // the catalog does not record grading mode, so a P in a research course is
    // undecided where it would decide the outcome.
    const pResearch = h.enrollments.filter((e) => (e.grade === 'P' || e.grade === 'S') && RESEARCH_SET.has(e.code))
    for (const n of [general, comprehensive]) {
      const oneShort = (n.progress?.have ?? 0) >= (n.progress?.need ?? 1) - 1
      if (n.status === 'unmet' && pResearch.length && oneShort) {
        n.status = 'cannot-check'
        n.detail = `${pResearch.map((e) => e.display).join(', ')} taken P/NP: it counts only if the course is offered only P/NP — check with an EEB advisor.`
        n.quote = [...(Array.isArray(n.quote) ? n.quote : [n.quote]), Q_LETTER]
      }
    }
    // "receiving a passing grade in an independent research course": the page
    // does not limit this to EEB's research courses.
    if (comprehensive.status === 'unmet') {
      const other = h.taken(range('BIOL', 193, 199).or(range('ENVS', 193, 199)).or(range('METX', 193, 199)).or(range('OCEA', 193, 199)))
      if (other.length) {
        comprehensive.status = 'cannot-check'
        comprehensive.detail = `${other.map((e) => e.display).join(', ')}: ask an EEB advisor whether this independent research course satisfies the comprehensive requirement.`
      }
    }
    return [qualification, lower, upper, electives, labField, dc, comprehensive]
  },
})

/** Three general electives; at most one "5 credits of undergraduate research" unit or ENVS 183. */
function generalElectives(h: HarnessContext, drop: string[]): Node {
  const research = codes(...RESEARCH)
  const set = range('BIOE', 100, 179).minCredits(5).or(codes(...strip(GENERAL_LISTED))).or(codes('ENVS 183')).except(drop)
  const credits = (e: Enrollment) => {
    const c = h.catalog.get(e.code)?.credits
    return c == null || Number.isNaN(c) ? 0 : c
  }
  return h.take(
    'general',
    'Three general electives',
    [
      'Three general electives chosen from the following:',
      'Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more credits that is not required to fulfill a different requirement group.',
      'One of the following may also be used as an upper-division general elective:',
      'Any 5 credits of undergraduate research from:',
    ],
    set,
    {
      n: 3,
      labs: { pairs: [...REQUIRED_PAIRS, ...OTHER_REQUIRED_PAIRS], mode: 'required' },
      prefer: labFirst,
      atMost: [{ set: codes(...ONE_EXTRA), n: 1, label: 'at most one research unit or ENVS 183' }],
      // "Any 5 credits of undergraduate research": minimal combinations of
      // BIOE 183W/183L/193/193F/195 totalling 5+ credits count as one course.
      composite: {
        eligible: research,
        build: (avail) => {
          const uniq = avail.filter((e, i) => avail.findIndex((x) => x.code === e.code) === i).slice(0, 6)
          const out: Enrollment[][] = []
          for (let mask = 1; mask < 1 << uniq.length; mask++) {
            const pick = uniq.filter((_, i) => mask & (1 << i))
            const tot = pick.reduce((s, e) => s + credits(e), 0)
            if (tot < 5) continue
            if (pick.some((e) => tot - credits(e) >= 5)) continue // not minimal
            out.push(pick)
          }
          return out
        },
      },
      pool: 'BIOE 100–179 (5+ credits); BIOL 100, 101; listed EART, ECON, ENVS, METX, OCEA, PSYC courses; or one 5-credit undergraduate-research unit (BIOE 183W/183L/193/193F/195) or ENVS 183',
      notes: [
        'Environmental Studies courses are by permission of the instructor.',
        ...(drop.length ? [`Not counted (the catalog gives no credit for both it and a course taken earlier): ${drop.join(', ')}`] : []),
      ],
    },
  )
}

/** "two must include laboratory or fieldwork" — among the eleven courses counted. */
function labFieldNode(h: HarnessContext, slots: Node[]): Node {
  const quote = [Q_UPPER, Q_OVERLAP]
  const used = slots.flatMap((n) => n.used ?? [])
  const passed = (code: string) => h.enrollments.some((e) => e.code === code && policyFailure(e, h.policy) == null)
  // A counted course "includes laboratory or fieldwork" when it is itself a
  // lab/field course, or is a lecture taken with its lab.
  const counted: Enrollment[] = []
  const unsure: Enrollment[] = []
  for (const e of used) {
    // a lecture and its lab counted together are one course
    const partner = SMALL_LAB_OF.get(e.code) ?? LECTURE_OF.get(e.code)
    if (partner && counted.some((x) => x.code === partner)) continue
    if (isLabField(e.code)) {
      counted.push(e)
    } else if (SMALL_LAB_OF.has(e.code) && passed(SMALL_LAB_OF.get(e.code)!)) {
      counted.push(e)
    } else if (MAYBE_LABFIELD.test(h.catalog.get(e.code)?.description ?? '')) unsure.push(e)
  }
  const label = 'Two courses with laboratory or fieldwork'
  if (counted.length >= 2) return h.node('lab-field', label, quote, 'met', { used: counted, progress: { have: 2, need: 2 } })
  if (counted.length + unsure.length >= 2)
    return h.cannotCheck(
      'lab-field',
      label,
      quote,
      `Counted ${counted.length} clearly; check with an EEB advisor whether ${unsure.map((e) => e.display).join(', ')} includes laboratory or fieldwork.`,
      { used: counted, progress: { have: counted.length, need: 2 } },
    )
  return h.node('lab-field', label, quote, 'unmet', {
    used: counted,
    progress: { have: counted.length, need: 2 },
    detail: 'Two of your eleven upper-division courses must include a lab or fieldwork (e.g. a lecture with its lab, or a field/laboratory course from the comprehensive list).',
  })
}

/** DC: two courses from the list (lecture + 2-credit lab = one); NRS/BIOL 188 (spring 2023+) = one half. */
function dcNode(h: HarnessContext): Node {
  const quote = [
    'The DC requirement in ecology and evolution is satisfied by completing two of the following ecology and evolutionary biology courses:',
    'Lecture and 2-credit lab combinations count as a single course. BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs, BIOE 117L and BIOE 137L, respectively, but these are not part of the DC requirement. To receive DC credit for BIOE 129, BIOE 129L must be successfully completed.',
  ]
  const dc = h.take('dc', 'Disciplinary Communication (DC)', quote, codes(...DC_LIST).except(creditOnce(h)), {
    n: 2,
    exclusive: false,
    labs: { pairs: DC_PAIRS, mode: 'required' },
  })
  h.solve()
  if (dc.status === 'met') return dc
  // "NRS/BIOL 188, California Ecology and Conservation course, taken spring
  // 2023 or later, will satisfy 1/2 DC credit." The current catalog's BIOL 188
  // is a different course, so we cannot tell which one the student took.
  const b188 = h.taken(codes('BIOL 188')).filter((e) => e.term == null || Number(e.term) >= SPRING_2023)
  if (b188.length && (dc.progress?.have ?? 0) >= 1)
    return h.cannotCheck(
      'dc',
      'Disciplinary Communication (DC)',
      [...quote, 'NRS/BIOL 188, California Ecology and Conservation course, taken spring 2023 or later, will satisfy 1/2 DC credit.'],
      'One DC course plus BIOL 188: it counts as half the DC only if it was the NRS “California Ecology and Conservation” course — confirm with an EEB advisor.',
      { used: [...(dc.used ?? []), ...b188] },
    )
  return dc
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

/** STAT 7 + 7L; a transfer student's STAT 5 (named on the transfer-preparation list) is cannot-check. */
function statistics(h: HarnessContext): Node {
  const node = h.all('stats', 'Biostatistics', 'Biostatistics:', ['STAT 7', 'STAT 7L'])
  const stat5 = h.taken(codes('STAT 5'))
  if (!stat5.length || h.entry !== 'transfer') return node
  return h.either('stats-or', 'Biostatistics', 'Biostatistics:', [
    node,
    h.cannotCheck(
      'stats-stat5',
      'STAT 5 (transfer preparation option)',
      'Plus one of the following statistics options:',
      'The transfer-preparation list names STAT 5 as a statistics option, but the major requirements list only STAT 7/7L — confirm with an EEB advisor that your STAT 5 counts.',
      { used: stat5 },
    ),
  ])
}

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Students may choose to complete the Chemistry 3 or 4 series.', Q_CHEM_NOTE]
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
