// Biology B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/biology-bs.md
//
// Unusual bits handled in code below:
//  - 2025-26: general chemistry always includes CHEM 3BL/3CL (no fall-2026
//    rule in this edition); the pre-2023 CHEM 1A/1B/1C + 1N series also counts.
//  - 2025-26: STAT 5 is a listed option (no advisor waiver); METX 100L is not
//    a first-lab option.
//  - Elective list: a lab that follows its lecture in the list must be passed
//    with it (explicit pairs); lecture/lab counts as one course.
//  - DC: two BIOE courses (2-credit labs taken concurrently with their
//    lecture count only together) OR one 5-credit BIOL-option lab; overlaps
//    with the elective and lab requirements.
//  - Comprehensive = the "additional laboratory or field course".
import { codes, defineHarness, range } from '@harness'
import type { Enrollment } from '@harness'

const LAB1 = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']

// Elective list in page order; [lecture, lab] where the lab follows its lecture.
const ELECTIVES = [
  'BIOL 110', 'BIOL 111A', 'BIOL 111B', 'BIOL 112', 'BIOL 114', 'BIOL 115', 'BIOL 118', 'BIOL 120',
  'BIOL 125', 'BIOL 130', 'BIOE 108', 'BIOE 112', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122',
  'BIOE 124', 'BIOE 125', 'BIOE 126', 'BIOE 127', 'BIOE 129', 'BIOE 131', 'BIOE 133', 'BIOE 134',
  'BIOE 135', 'BIOE 137', 'BIOE 139', 'BIOE 140', 'BIOE 141L', 'BIOE 142L', 'BIOE 145', 'BIOE 147',
  'BIOE 149', 'BIOE 155', 'BIOE 157A', 'BIOE 157B', 'BIOE 161', 'BIOE 163', 'BIOE 165', 'BIOE 172',
  'BIOE 173', 'BIOE 174', 'BIOE 175', 'METX 100', 'METX 133', 'METX 135', 'METX 140', 'METX 150',
]
const ELECTIVE_PAIRS: [string, string][] = [
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'],
  ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 133', 'BIOE 133L'], ['BIOE 134', 'BIOE 134L'],
  ['BIOE 135', 'BIOE 135L'], ['BIOE 137', 'BIOE 137L'], ['BIOE 163', 'BIOE 163L'],
  ['METX 135', 'METX 135L'],
]

// DC, BIOE option (page order). 2-credit labs pair with the 5-credit lecture.
const DC_BIOE = [
  'BIOE 108', 'BIOE 114', 'BIOE 117', 'BIOE 120', 'BIOE 122', 'BIOE 127', 'BIOE 128L', 'BIOE 129',
  'BIOE 137', 'BIOE 141L', 'BIOE 145', 'BIOE 145L', 'BIOE 150L', 'BIOE 151B', 'BIOE 153C', 'BIOE 158L',
  'BIOE 159A', 'BIOE 161L', 'BIOE 171', 'BIOE 172', 'BIOE 174',
]
// "BIOE 117 and BIOE 137 require concurrent enrollment in 2-credit labs, BIOE
// 117L and BIOE 137L, but these are not part of the DC requirement." → unpaired.
const DC_BIOE_PAIRS: [string, string][] = [
  ['BIOE 114', 'BIOE 114L'], ['BIOE 120', 'BIOE 120L'], ['BIOE 122', 'BIOE 122L'],
  ['BIOE 127', 'BIOE 127L'], ['BIOE 129', 'BIOE 129L'],
]
const DC_BIOL = [
  'BIOL 103L', 'BIOL 104B', 'BIOL 105L', 'BIOL 106L', 'BIOL 108L', 'BIOL 109L', 'BIOL 115L', 'BIOL 120L',
  'BIOL 121L', 'BIOL 122L', 'BIOL 129L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L', 'METX 100L',
]

const Q_CHEM_NOTE =
  'This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, CHEM 1C, and CHEM 1N or equivalent.'

export default defineHarness({
  program: 'biology-bs',
  edition: '2025-26',
  title: 'Biology B.S.',
  notes: [
    'All courses used for any major requirement must be taken for a letter grade.',
    'At least half of the upper-division courses must be taken at UC Santa Cruz (the plan does not record where a course was taken).',
  ],
  coverage: { unknownOk: { 'CHEM 1B': 'pre-2023 general chemistry, retired from the catalog' } },
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken for a letter grade."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('bio-intro', 'Introductory biology', 'All of the following courses', ['BIOL 20A', 'BIOL 20L', 'BIOE 20B', 'BIOE 20C'], {
        notes: ['BIOL 20L is not required for students who completed BIOL 20A and BIOE 20B at California community colleges (transfer screening note).'],
      }),
      // 2025-26 lists CHEM 3BL/3CL as rows of the 3-series package; the note adds
      // the pre-July-2023 series (CHEM 1A/1B/1C with lab 1N).
      h.options('gen-chem', 'General chemistry', ['Plus one of these groups', Q_CHEM_NOTE], [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
        ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'],
      ], { notes: ['A transfer course equivalent to the CHEM 1 series counts — add it to your plan under the CHEM 1A/1B/1C/1N codes.'] }),
      h.all('orgo', 'Organic chemistry', 'Plus all of these courses', ['CHEM 8A', 'CHEM 8L', 'CHEM 8B']),
      h.options(
        'calc',
        'Calculus',
        ['Plus one of the following options:', 'Students may transition between the MATH 11 and MATH 19 series per the'],
        [
          ['MATH 11A', 'MATH 11B'],
          ['MATH 16A', 'MATH 16B'],
          ['MATH 19A', 'MATH 19B'],
          // Transitions between the 11 and 19 series are explicitly allowed
          // (details in an external policy not in the source).
          ['MATH 19A', 'MATH 11B'],
          ['MATH 11A', 'MATH 19B'],
        ],
        { notes: ['Mixed MATH 11/19 sequences follow the campus Calculus Series Transition Policy (external).'] },
      ),
      // 2025-26: "Either this course: STAT 5 — or these courses: STAT 7, STAT 7L".
      h.options('stats', 'Statistics', 'Plus one of the following options:', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.all('physics', 'Introductory physics', 'Plus all of the following courses:', ['PHYS 6A', 'PHYS 6B', 'PHYS 6C']),
      h.take('physics-lab', 'One physics lab', 'One of these courses', codes('PHYS 6L', 'PHYS 6M', 'PHYS 6N')),
    ])

    const lab2Set = range('BIOL', 100, 199)
      .or(range('BIOE', 100, 199))
      .where((c) => c.suffix.endsWith('L'), 'identified with an “L”')
      .or(codes('BIOL 104B', 'CHEM 160L', 'CHEM 161L'))

    const lab2 = h.take(
      'lab2',
      'One additional laboratory or field course',
      'Students choose one upper-division BIOE or BIOL course identified with an "L" (i.e. BIOL 103L, BIOE 128L, etc) or BIOL 104B, CHEM 160L or CHEM 161L.',
      lab2Set,
      { pool: 'any upper-division BIOE/BIOL course ending in “L”, or BIOL 104B, CHEM 160L, CHEM 161L (not the same course as your first lab)' },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['BIOL 100', 'BIOL 101', 'BIOL 105', 'BIOE 107', 'BIOE 109']),
      h.take('lab1', 'One laboratory course', ['Students must complete two upper-division courses that include regular laboratory or fieldwork:', 'Choose one of the following courses:'], codes(...LAB1)),
      lab2,
    ])

    const electives = h.take(
      'electives',
      'Three upper-division electives',
      [
        'Students must complete three additional upper-division electives (5-7 credits each) chosen from the list below.',
        'Note: Lecture/lab combinations count as one course. Students must pass both the lecture and associated lab if the lab follows the lecture in the list below.',
      ],
      codes(...ELECTIVES),
      { n: 3, labs: { pairs: ELECTIVE_PAIRS, mode: 'required' } },
    )

    // DC overlay: may reuse courses counted as electives or labs.
    const sameTermPairs = (chosen: Enrollment[]) => {
      for (const [lec, lab] of DC_BIOE_PAIRS) {
        const a = chosen.find((e) => e.code === lec.replace(' ', ''))
        const b = chosen.find((e) => e.code === lab.replace(' ', ''))
        if (a && b && a.term !== b.term) return `${a.display} and ${b.display} must be taken concurrently`
      }
      return null
    }
    const dc = h.either('dc', 'Disciplinary Communication (DC)', 'The DC requirement in the biology B.S. degree can be satisfied either by completing two BIOE courses or by completing one 5-credit BIOL lab.', [
      h.take('dc-bioe', 'Two BIOE courses from the DC group', [
        'For the BIOE option, choose two Ecology and Evolutionary Biology courses from this group:',
        'For 2-credit BIOE lab courses listed above that are taken concurrently with 5-credit lectures, both courses must be passed to receive one half of the DC requirement.',
      ], codes(...DC_BIOE), { n: 2, exclusive: false, labs: { pairs: DC_BIOE_PAIRS, mode: 'required' }, check: sameTermPairs }),
      h.take('dc-biol', 'One BIOL-option lab', 'For the BIOL option, choose one course from this group:', codes(...DC_BIOL), { exclusive: false }),
    ])

    h.solve()
    const comprehensive = h.node(
      'comprehensive',
      'Comprehensive Requirement',
      'For the Biology B.S., this requirement is satisfied via the completion of the above laboratory or field course requirement.',
      lab2.status === 'met' ? 'met' : 'unmet',
      {
        detail: lab2.status === 'met' ? `Satisfied by ${lab2.used?.map((e) => e.display).join(', ')}` : 'Satisfied when the additional laboratory or field course is complete.',
        used: lab2.used,
      },
    )
    return [lower, upper, electives, dc, comprehensive]
  },
})
