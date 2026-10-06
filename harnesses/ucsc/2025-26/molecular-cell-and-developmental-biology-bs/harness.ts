// Molecular, Cell, and Developmental Biology B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/molecular-cell-and-developmental-biology-bs.md
//
// Modelled on biology-bs (same department, same lower-division core minus
// nothing: BIOE 20C is required here too). Unusual bits:
//  - 2025-26: general chemistry always includes CHEM 3BL/3CL (no fall-2026
//    rule in this edition); the pre-2023 CHEM 1A/1B/1C + 1N series also counts.
//  - 2025-26: STAT 5 is a listed option (no advisor waiver); BIOL 120 is a
//    required core course (no BIOL 128/BME 178 choice); BME 178 is an elective.
//  - Two electives, at least one a BIOL course, plus one lab course from a
//    separate list; that lab also satisfies DC and the comprehensive
//    requirement (overlays on the same list).
import { codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const LAB1 = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']

const ELECTIVES = [
  'BIOL 111A', 'BIOL 111B', 'BIOL 112', 'BIOL 114', 'BIOL 115', 'BIOL 117', 'BIOL 118', 'BIOL 124',
  'BIOL 125', 'BIOL 127', 'BIOL 130', 'BIOE 109', 'BME 130', 'BME 160', 'BME 178', 'PHYS 180',
]

// "One of the following laboratory courses" (elective lab), in page order.
const ELECTIVE_LABS = [
  'BIOL 100L', 'BIOL 105L', 'BIOL 103L', 'BIOL 104B', 'BIOL 106L', 'BIOL 108L', 'BIOL 109L', 'BIOL 115L',
  'BIOL 120L', 'BIOL 121L', 'BIOL 122L', 'BIOL 129L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L',
]
// DC list (page order) — same members as the elective-lab list.
const DC_LIST = [
  'BIOL 100L', 'BIOL 103L', 'BIOL 104B', 'BIOL 105L', 'BIOL 106L', 'BIOL 108L', 'BIOL 109L', 'BIOL 115L',
  'BIOL 120L', 'BIOL 121L', 'BIOL 122L', 'BIOL 129L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L',
]
// Comprehensive list (page order) — same members again.
const COMP_LIST = [
  'BIOL 100L', 'BIOL 103L', 'BIOL 104B', 'BIOL 105L', 'BIOL 106L', 'BIOL 108L', 'BIOL 109L', 'BIOL 115L',
  'BIOL 120L', 'BIOL 122L', 'BIOL 121L', 'BIOL 129L', 'BIOL 186L', 'CHEM 160L', 'CHEM 161L',
]

const Q_CHEM_NOTE =
  'This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, CHEM 1C, and CHEM 1N, or equivalent.'

export default defineHarness({
  program: 'molecular-cell-and-developmental-biology-bs',
  edition: '2025-26',
  title: 'Molecular, Cell, and Developmental Biology B.S.',
  notes: [
    'All courses used for any major requirement must be taken for a letter grade.',
    'At least half of the upper-division courses must be taken at UC Santa Cruz (the plan does not record where a course was taken).',
    'Once matriculated, BIOL 20A, BIOL 100, BIOL 105, BIOL 101 or BIOL 110 taken at another institution needs department permission.',
  ],
  coverage: { unknownOk: { 'CHEM 1B': 'pre-2023 general chemistry, retired from the catalog' } },
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken for a letter grade."
    h.policy = { letter: true }

    const qualification = h.info(
      'qualification',
      'Major qualification (C or better)',
      'To qualify for any of these majors, students must pass (with a grade of C or better) the following courses or their equivalents:',
      'Calculus A, general chemistry, CHEM 8A, BIOL 20A, BIOL 20L and BIOE 20B with C or better gate declaration of the major; this does not affect completion.',
    )

    let bioCore: Node
    const lower = h.group('lower', 'Lower-Division Courses', [
      (bioCore = h.all('bio-chem-core', 'Introductory biology and organic chemistry', 'All of the following courses:', [
        'BIOL 20A', 'BIOL 20L', 'BIOE 20B', 'BIOE 20C', 'CHEM 8A', 'CHEM 8B', 'CHEM 8L',
      ], {
        notes: ['BIOL 20L is not required for students who completed BIOL 20A and BIOE 20B at California community colleges.'],
      })),
      // 2025-26 lists CHEM 3BL/3CL as rows of the 3-series package; the note adds
      // the pre-July-2023 series (CHEM 1A/1B/1C with lab 1N).
      h.options('gen-chem', 'General chemistry', ['Plus one of the following options:', Q_CHEM_NOTE], [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
        ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'],
      ], { notes: ['A transfer course equivalent to the CHEM 1 series counts — add it to your plan under the CHEM 1A/1B/1C/1N codes.'] }),
      h.options(
        'calc',
        'Calculus',
        ['Plus one of the following options:', 'Students may transition between the MATH 11 and MATH 19 series per the'],
        [
          ['MATH 11A', 'MATH 11B'],
          ['MATH 16A', 'MATH 16B'],
          ['MATH 19A', 'MATH 19B'],
          // Transitions between the 11 and 19 series are explicitly allowed.
          ['MATH 19A', 'MATH 11B'],
          ['MATH 11A', 'MATH 19B'],
        ],
        { notes: ['Mixed MATH 11/19 sequences follow the campus Calculus Series Transition Policy (external).'] },
      ),
      // 2025-26: "Either this course: STAT 5 — or these courses: STAT 7, STAT 7L".
      h.options('stats', 'Statistics', 'Plus one of the following options', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.all('physics', 'Introductory physics', 'Plus all of the following courses:', ['PHYS 6A', 'PHYS 6B', 'PHYS 6C']),
      h.take('physics-lab', 'One physics lab', 'Either one of these courses', codes('PHYS 6L', 'PHYS 6M', 'PHYS 6N')),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      // 2025-26: BIOL 120 is in the required list (2026-27 offers BIOL 120/128/BME 178).
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['BIOL 100', 'BIOL 101', 'BIOL 105', 'BIOL 110', 'BIOL 120']),
      h.take('bioinformatics', 'One bioinformatics course', 'Plus one of the following courses:', codes('BIOL 104A', 'BIOL 104L', 'BME 110')),
      h.take('lab1', 'One laboratory course', 'Plus one of the following courses:', codes(...LAB1)),
    ])

    const elecLab = h.take(
      'elective-lab',
      'One laboratory course',
      ['One of the following laboratory courses:', 'This course will satisfy the disciplinary communication (DC) and comprehensive requirement.'],
      codes(...ELECTIVE_LABS),
    )
    const electives = h.group('electives', 'Electives', [
      h.take(
        'electives-two',
        'Two electives (at least one BIOL)',
        'At least two elective courses from the following list, at least one of which must be a BIOL course.',
        codes(...ELECTIVES),
        { n: 2, atLeast: [{ set: range('BIOL', 1, 299), n: 1, label: 'BIOL courses' }] },
      ),
      elecLab,
    ], { quote: 'At least two elective courses from the following list, at least one of which must be a BIOL course.' })

    // DC and comprehensive: overlays (the elective lab satisfies both).
    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      "The DC requirement in molecular, cell, and developmental biology is satisfied by completing one of the following courses:",
      codes(...DC_LIST),
      { exclusive: false },
    )
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive Requirement',
      'For the MCD Biology B.S., this requirement can be satisfied by receiving a passing grade in an independent research laboratory:',
      codes(...COMP_LIST),
      { exclusive: false },
    )
    h.solve()
    biol20lTransfer(h, bioCore)
    return [qualification, lower, upper, electives, dc, comprehensive]
  },
})

/**
 * "BIOL 20L is not required for students who have completed BIOL 20A and BIOE
 * 20B at California community colleges." The plan does not record where a
 * course was taken: for a transfer student whose BIOL 20A and BIOE 20B are
 * term-less (transfer credit), a missing BIOL 20L is cannot-check, not unmet.
 * Call after h.solve().
 */
function biol20lTransfer(h: HarnessContext, group: Node): void {
  const slot = group.children?.find((c) => c.id === `${group.id}/BIOL20L`)
  if (!slot || slot.status === 'met' || h.entry !== 'transfer') return
  const transferred = (code: string) => h.taken(codes(code)).some((e) => e.term == null)
  if (!transferred('BIOL 20A') || !transferred('BIOE 20B')) return
  slot.status = 'cannot-check'
  slot.detail = 'Not required if you completed BIOL 20A and BIOE 20B at a California community college — check with MCD Advising.'
  slot.quote = 'BIOL 20L is not required for students who have completed BIOL 20A and BIOE 20B at California community colleges.'
}
