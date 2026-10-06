// Neuroscience B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/neuroscience-bs.md
//
// Modelled on biology-bs / MCD biology (same department). Unusual bits:
//  - No BIOE 20C; PHYS 6N is the required physics lab.
//  - 2025-26: general chemistry always includes CHEM 3BL/3CL (no fall-2026
//    rule in this edition); the pre-2023 CHEM 1A/1B/1C + 1N series also counts.
//  - 2025-26: STAT 5 is a listed statistics option (no advisor waiver).
//  - BIOL 129L is required and is also the DC and the comprehensive course
//    (overlays on the same course).
//  - One elective; "Lecture/lab combinations count as one course" (BIOE 131
//    + 131L merge into one unit). The page does not say whether BIOE 131L
//    alone counts, so a lone BIOE 131L is cannot-check, not unmet.
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const LAB1 = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']

const ELECTIVES = [
  'BIOE 131', 'BIOL 110', 'BIOL 114', 'BIOL 115', 'BIOL 118', 'BME 110', 'BME 130', 'BME 160',
  'PHYS 180', 'PSYC 121', 'PSYC 123',
]

const Q_CHEM_NOTE =
  'This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, CHEM 1C, and CHEM 1N or equivalent.'

export default defineHarness({
  program: 'neuroscience-bs',
  edition: '2025-26',
  title: 'Neuroscience B.S.',
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
      (bioCore = h.all('bio-intro', 'Introductory biology', 'All of the following courses', ['BIOL 20A', 'BIOL 20L', 'BIOE 20B'], {
        notes: ['BIOL 20L is not required for students who completed BIOL 20A and BIOE 20B at California community colleges.'],
      })),
      // 2025-26 lists CHEM 3BL/3CL as rows of the 3-series package; the note adds
      // the pre-July-2023 series (CHEM 1A/1B/1C with lab 1N).
      h.options('gen-chem', 'General chemistry', ['Plus one of the following options:', Q_CHEM_NOTE], [
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'],
        ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
        ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'],
      ], { notes: ['A transfer course equivalent to the CHEM 1 series counts — add it to your plan under the CHEM 1A/1B/1C/1N codes.'] }),
      h.all('orgo', 'Organic chemistry', 'Plus all of the following courses', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L']),
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
      h.options('stats', 'Statistics', 'Plus one of the following options:', [['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.all('physics', 'Introductory physics with lab', 'Plus all of the following courses:', ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6N']),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following courses:', ['BIOL 100', 'BIOL 101', 'BIOL 105', 'BIOL 125', 'BIOL 126', 'BIOL 128']),
      h.take('lab1', 'One laboratory course', 'Plus one of the following courses:', codes(...LAB1)),
      h.take('advanced-topics', 'One advanced neuroscience topics course', 'Plus one of the following courses:', codes('BIOL 129A', 'BIOL 129B', 'BIOL 129C')),
      h.take('neuro-lab', 'BIOL 129L Neurobiology Lab', ['Plus the following laboratory course:', 'This course satisfies the disciplinary communication (DC) and comprehensive requirements.'], codes('BIOL 129L')),
    ])

    const elective = h.take(
      'elective',
      'One elective',
      ['One of the following electives:', 'NOTE: Lecture/lab combinations count as one course.'],
      codes(...ELECTIVES),
      { labs: { pairs: [['BIOE 131', 'BIOE 131L']], mode: 'merge' } },
    )

    // DC and comprehensive: overlays on BIOL 129L.
    const dc = h.take(
      'dc',
      'Disciplinary Communication (DC)',
      'The DC requirement in neuroscience is satisfied by completing the following course:',
      codes('BIOL 129L'),
      { exclusive: false },
    )
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive Requirement',
      'For the neuroscience B.S., this requirement can be satisfied by receiving a passing grade in the following laboratory course.',
      codes('BIOL 129L'),
      { exclusive: false },
    )

    h.solve()
    biol20lTransfer(h, bioCore)
    // A lone BIOE 131L (2-credit lab without its lecture): the page lists it as
    // an item but only says lecture/lab combinations count as one course.
    let electiveNode: Node = elective
    if (elective.status === 'unmet' && h.taken(codes('BIOE 131L')).length && !h.taken(codes('BIOE 131')).length) {
      electiveNode = h.cannotCheck(
        'elective',
        'One elective',
        ['One of the following electives:', 'NOTE: Lecture/lab combinations count as one course.'],
        'BIOE 131L is listed, but the page counts lecture/lab combinations as one course; ask MCD Advising whether the lab alone counts as your elective.',
        { used: h.taken(codes('BIOE 131L')), options: codes(...ELECTIVES).members },
      )
    }
    return [qualification, lower, upper, electiveNode, dc, comprehensive]
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
