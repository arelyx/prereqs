// Neuroscience B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/neuroscience-bs.md
//
// Modelled on biology-bs / MCD biology (same department). Unusual bits:
//  - No BIOE 20C; PHYS 6N is the required physics lab.
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too.
//  - BIOL 129L is required and is also the DC and the comprehensive course
//    (overlays on the same course).
//  - One elective; "Lecture/lab combinations count as one course" (BIOE 131
//    + 131L merge into one unit). The page does not say whether BIOE 131L
//    alone counts, so a lone BIOE 131L is cannot-check, not unmet.
import { codes, defineHarness, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const LAB1 = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K']

const ELECTIVES = [
  'BIOE 131', 'BIOL 110', 'BIOL 114', 'BIOL 115', 'BIOL 118', 'BME 110', 'BME 130', 'BME 160',
  'PHYS 180', 'PSYC 121', 'PSYC 123',
]

const Q_CHEM_NOTE =
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'

export default defineHarness({
  program: 'neuroscience-bs',
  edition: '2026-27',
  title: 'Neuroscience B.S.',
  attestations: [
    {
      id: 'stat5-waiver',
      label: 'STAT 7/7L waived by an advisor (STAT 5 articulated course taken before UCSC)',
      quote: 'If, prior to enrolling at UCSC, a student takes a course articulated to STAT 5, they will have this requirement waived if they contact an advisor for the major.',
      aliases: ['stat 5', 'stat5', 'waiver'],
    },
  ],
  notes: [
    'All courses used for any major requirement must be taken for a letter grade.',
    'At least half of the upper-division courses must be taken at UC Santa Cruz (the plan does not record where a course was taken).',
    'Once matriculated, BIOL 20A, BIOL 100, BIOL 105, BIOL 101 or BIOL 110 taken at another institution needs department permission.',
  ],
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
      (bioCore = h.all('bio-intro', 'Introductory biology', 'All of the following:', ['BIOL 20A', 'BIOL 20L', 'BIOE 20B'], {
        notes: ['BIOL 20L is not required for students who completed BIOL 20A and BIOE 20B at California community colleges.'],
      })),
      generalChem(h),
      h.all('orgo', 'Organic chemistry', 'Plus all of the following:', ['CHEM 8A', 'CHEM 8B', 'CHEM 8L']),
      h.options(
        'calc',
        'Calculus',
        ['Plus one of the following:', 'Students may transition between the MATH 11 and MATH 19 series per the'],
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
      statistics(h),
      h.all('physics', 'Introductory physics with lab', 'Plus all of the following:', ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6N']),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.all('ud-core', 'Core upper-division courses', 'All of the following:', ['BIOL 100', 'BIOL 101', 'BIOL 105', 'BIOL 125', 'BIOL 126', 'BIOL 128']),
      h.take('lab1', 'One laboratory course', 'Plus one of the following:', codes(...LAB1)),
      h.take('advanced-topics', 'One advanced neuroscience topics course', 'Plus one of the following:', codes('BIOL 129A', 'BIOL 129B', 'BIOL 129C')),
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

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Plus one of the following:', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      // completed with no term: we cannot tell whether it was before fall 2026
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)

  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  if (missingA.length === 0 && !undated) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', 'General chemistry', quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', 'General chemistry', quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', 'General chemistry', quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}

/**
 * STAT 7 + 7L, or the advisor waiver for a STAT 5 articulated course taken
 * before UCSC: "If, prior to enrolling at UCSC, a student takes a course
 * articulated to STAT 5, ...". Only term-less STAT 5 credit (transfer/exam,
 * i.e. before UCSC) opens the waiver; a STAT 5 taken in a UCSC term does not.
 */
function statistics(h: HarnessContext): Node {
  const stat5 = h.taken(codes('STAT 5')).filter((e) => e.term == null)
  return h.either('stats', 'Statistics', 'Plus all of the following:', [
    h.all('stat7', 'STAT 7 and STAT 7L', 'Plus all of the following:', ['STAT 7', 'STAT 7L']),
    stat5.length
      ? h.group('stat5', 'STAT 5 articulated course + advisor waiver', [
          h.node('stat5-course', 'Course articulated to STAT 5 (before UCSC)', 'If, prior to enrolling at UCSC, a student takes a course articulated to STAT 5, they will have this requirement waived if they contact an advisor for the major.', 'met', { used: stat5 }),
          h.attest('stat5-waiver'),
        ])
      : null,
  ].filter((x): x is Node => !!x))
}

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
