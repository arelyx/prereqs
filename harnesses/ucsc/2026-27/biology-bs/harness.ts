// Biology B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/biology-bs.md
//
// Unusual bits handled in code below:
//  - CHEM 3B/3C taken before fall 2026 (term < 2268) need CHEM 3BL/3CL too.
//  - Elective list: a lab that follows its lecture in the list must be passed
//    with it (explicit pairs); lecture/lab counts as one course.
//  - DC: two BIOE courses (2-credit labs taken concurrently with their
//    lecture count only together) OR one 5-credit BIOL-option lab; overlaps
//    with the elective and lab requirements.
//  - Comprehensive = the "additional laboratory or field course".
import { codes, defineHarness, policyFailure, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const LAB1 = ['BIOL 101L', 'BIOL 102L', 'BIOL 107L', 'BIOL 122K', 'CHEM 160K', 'CHEM 161K', 'METX 100L']

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
  'CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'

export default defineHarness({
  program: 'biology-bs',
  edition: '2026-27',
  title: 'Biology B.S.',
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
  ],
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken for a letter grade."
    h.policy = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('bio-intro', 'Introductory biology', 'All of the following:', ['BIOL 20A', 'BIOL 20L', 'BIOE 20B', 'BIOE 20C'], {
        notes: ['BIOL 20L is not required for students who completed BIOL 20A and BIOE 20B at California community colleges (transfer screening note).'],
      }),
      generalChem(h),
      h.all('orgo', 'Organic chemistry', 'Plus all of the following:', ['CHEM 8A', 'CHEM 8L', 'CHEM 8B']),
      h.options(
        'calc',
        'Calculus',
        ['Plus one of the following:', 'Students may transition between the MATH 11 and MATH 19 series per the'],
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
      statistics(h),
      h.all('physics', 'Introductory physics', 'Plus all of the following:', ['PHYS 6A', 'PHYS 6B', 'PHYS 6C']),
      h.take('physics-lab', 'One physics lab', 'Plus one of the following:', codes('PHYS 6L', 'PHYS 6M', 'PHYS 6N')),
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
      h.take('lab1', 'One laboratory course', 'Plus one of the following laboratory courses:', codes(...LAB1)),
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

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Plus one of the following:', Q_CHEM_NOTE]
  // Package A
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
  // Package B
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

/** STAT 7 + 7L, or the advisor waiver for a STAT 5 articulated course taken before UCSC. */
function statistics(h: HarnessContext): Node {
  const stat5 = h.taken(codes('STAT 5'))
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
