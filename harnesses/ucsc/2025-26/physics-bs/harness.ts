// Physics B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/physics-bs.md
//
// Two paths (General Major / Quantum Information Science concentration)
// share the calculus + physics lower division; they differ in the
// upper-division list, the electives rule and the comprehensive course.
// Handled in code below:
//  - AP Physics C score of 5 exempts PHYS 5A/5C "and the associated lab
//    courses": an attestation per exam (§1a), offered for the lecture slot
//    only when no PHYS 5A/15A (5C/15C) is in the plan, and for the lab only
//    when the lab is absent and the lecture is absent or term-less credit.
//  - CSE 20 test-out: attestation offered only when no programming course
//    is in the plan (§1a).
//  - "with the approval of the department, one of the elective requirements
//    may be satisfied by an upper-division science or engineering course":
//    at most one such course, asked as an attestation only when the
//    allocator needed it (§1a petition).
//  - MATH 21 + MATH 24 for PHYS 116A; PHYS 116C waiver for math dual majors.
//  - General electives: PHYS 100–180 / ASTR 111–118 (5 credits); exclusive
//    allocation keeps required courses out (the PHYS 110B/139B not used for
//    "one of these two" may count as an elective).
import { anyOf, codes, defineHarness, range, subject } from '@harness'
import type { HarnessContext, Node } from '@harness'

const Q_116A = 'Completing both MATH 21 and MATH 24 can substitute for PHYS 116A.'
const Q_116C_GEN = 'PHYS 116C is waived for students who are pursuing a dual major in physics and a mathematics B.A. or B.S., and take MATH 107 in fall 2017 or later.'
// The QIS section's sentence says "applied physics" (apparently copied from the
// applied physics page); it is the rule printed for this concentration.
const Q_116C_QIS = 'PHYS 116C is waived for students who are pursuing a dual major in applied physics and a mathematics B.A. or B.S. and take MATH 107 in the year 2017 or later.'
const Q_AP =
  'Students with a score of 5 on the AP Physics C Mechanics and AP Physics C Electricity and Magnetism examinations are exempt from taking PHYS 5A and PHYS 5C respectively, and the associated lab courses.'

const Q_CSE20 = 'A test-out option is available for CSE 20.'
const Q_PETITION = 'In some cases, with the approval of the department, one of the elective requirements may be satisfied by an upper-division science or engineering course.'

// Elective pool: PHYS 100–180 or ASTR 111–118, 5 credits (cross-listed codes
// such as AM 107 / PHYS 107 match through the library).
const ELECTIVE_POOL = range('PHYS', 100, 180).or(range('ASTR', 111, 118)).minCredits(5)
// Department-approved substitute: any other upper-division science or engineering course.
const SCI_ENG = ['AM', 'ASTR', 'BIOC', 'BIOE', 'BIOL', 'BME', 'CHEM', 'CSE', 'EART', 'ECE', 'MATH', 'METX', 'OCEA', 'PHYS', 'STAT']
const PETITION_POOL = anyOf(...SCI_ENG.map((s) => subject(s, 'upper')))
  .except(ELECTIVE_POOL)
  .except(['PHYS 182', 'PHYS 195A', 'PHYS 195B']) // the DC courses are not "additional"
  // .where (not .minCredits): a cross-listed partner code missing from the catalog
  // (ASTR 135A for the 3-credit PHYS 135A) must not pass as "credits unknown".
  .where((c) => c.credits >= 5, '5+ credits')
const PROGRAMMING = codes('ASTR 119', 'CSE 20', 'ASTR 19')

export default defineHarness({
  program: 'physics-bs',
  edition: '2025-26',
  title: 'Physics B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Path',
      quote: 'Quantum Information Science Concentration',
      default: 'general',
      options: [
        { value: 'general', label: 'General Major', aliases: ['general', 'none', 'physics', 'standard'] },
        { value: 'qis', label: 'Quantum Information Science Concentration', aliases: ['quantum information science', 'quantum', 'qis'] },
      ],
    },
  ],
  attestations: [
    { id: 'math-double-major', label: 'Pursuing a dual major with a Mathematics B.A. or B.S.', quote: Q_116C_GEN, aliases: ['math double major', 'dual major', 'mathematics'] },
    { id: 'ap-mech', label: 'Score of 5 on the AP Physics C Mechanics exam', quote: Q_AP, aliases: ['ap physics c mechanics', 'ap mechanics'] },
    { id: 'ap-em', label: 'Score of 5 on the AP Physics C Electricity and Magnetism exam', quote: Q_AP, aliases: ['ap physics c electricity', 'ap e&m', 'ap electricity'] },
    { id: 'cse20-testout', label: 'Passed the CSE 20 test-out', quote: Q_CSE20, aliases: ['cse 20 test-out', 'cse 20 testout', 'test-out', 'testout'] },
    { id: 'elective-approval', label: 'Department approved an upper-division science or engineering course as a physics elective', quote: Q_PETITION, aliases: ['elective approval', 'department approval', 'approved elective'] },
  ],
  notes: [
    'All courses used to satisfy the physics major requirements must be taken for a letter grade.',
    'If you also complete the astrophysics minor, courses used for the minor cannot count as electives for this major.',
  ],
  evaluate(h) {
    // "All courses used to satisfy the physics major requirements must be taken for a letter grade."
    h.policy = { letter: true }
    const qis = h.choice('concentration') === 'qis'

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      apLecture(h, 'phys-a', 'PHYS 5A or 15A', codes('PHYS 5A', 'PHYS 15A'), 'ap-mech'),
      apLecture(h, 'phys-c', 'PHYS 5C or 15C', codes('PHYS 5C', 'PHYS 15C'), 'ap-em'),
      h.group('phys-core', 'PHYS 5B, 5D and labs 5L/5M/5N', [
        apLab(h, 'PHYS 5L', ['PHYS5A', 'PHYS15A'], 'ap-mech'),
        h.take('phys-5m', 'PHYS 5M', 'Plus all of the following courses:', codes('PHYS 5M'), { minor: true }),
        h.take('phys-5b', 'PHYS 5B', 'Plus all of the following courses:', codes('PHYS 5B'), { minor: true }),
        apLab(h, 'PHYS 5N', ['PHYS5C', 'PHYS15C'], 'ap-em'),
        h.take('phys-5d', 'PHYS 5D', 'Plus all of the following courses:', codes('PHYS 5D'), { minor: true }),
      ], { quote: 'Plus all of the following courses:' }),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
      programming(h, qis),
    ])

    const uq = qis ? 'All of the following courses' : 'All of the following courses:'
    const upper = qis
      ? h.group('upper', 'Upper-Division Courses', [
          h.take('phys102', 'PHYS 102', uq, codes('PHYS 102')),
          h.take('phys133', 'PHYS 133', uq, codes('PHYS 133')),
          h.options('phys116a', 'PHYS 116A (or MATH 21 + MATH 24)', [uq, Q_116A], [['PHYS 116A'], ['MATH 21', 'MATH 24']]),
          phys116c(h, uq, Q_116C_QIS),
          h.take('phys105', 'PHYS 105', uq, codes('PHYS 105')),
          h.take('phys110a', 'PHYS 110A', uq, codes('PHYS 110A')),
          h.take('phys112', 'PHYS 112', uq, codes('PHYS 112')),
          h.take('phys150', 'PHYS 150 [/CSE 109]', uq, codes('PHYS 150')),
          h.take('phys139a', 'PHYS 139A', uq, codes('PHYS 139A')),
          h.take('phys139b', 'PHYS 139B', uq, codes('PHYS 139B')),
          h.take('phys138', 'PHYS 138', uq, codes('PHYS 138')),
          h.take('materials', 'PHYS 156 or PHYS 157', 'Plus one of the following courses:', codes('PHYS 156', 'PHYS 157')),
        ])
      : h.group('upper', 'Upper-Division Courses', [
          h.take('phys102', 'PHYS 102', uq, codes('PHYS 102')),
          h.options('phys116a', 'PHYS 116A (or MATH 21 + MATH 24)', [uq, Q_116A], [['PHYS 116A'], ['MATH 21', 'MATH 24']]),
          phys116c(h, uq, Q_116C_GEN),
          h.take('phys105', 'PHYS 105', uq, codes('PHYS 105')),
          h.take('phys110a', 'PHYS 110A', uq, codes('PHYS 110A')),
          h.take('phys112', 'PHYS 112', uq, codes('PHYS 112')),
          h.take('phys133', 'PHYS 133', uq, codes('PHYS 133')),
          h.take('phys134', 'PHYS 134', uq, codes('PHYS 134')),
          h.take('phys139a', 'PHYS 139A', uq, codes('PHYS 139A')),
          h.take('phys110b-139b', 'PHYS 110B or PHYS 139B', 'And one of these two courses:', codes('PHYS 110B', 'PHYS 139B'), {
            notes: ['Students going on to graduate school in physics are recommended to complete both.'],
          }),
        ])

    const electives = qis
      ? h.take(
          'electives',
          'One physics elective',
          'One additional 5-credit physics course that has not been used to satisfy any other requirement for the major, chosen from PHYS 100 - PHYS 180.',
          range('PHYS', 100, 180).minCredits(5),
          { pool: 'PHYS 100–180 (5 credits), not used for another requirement' },
        )
      : h.take(
          'electives',
          'Three electives',
          'Three additional 5-credit courses chosen from PHYS 100 - PHYS 180 or ASTR 111 - ASTR 118.',
          ELECTIVE_POOL.or(PETITION_POOL),
          {
            n: 3,
            atMost: [{ set: PETITION_POOL, n: 1, label: 'department-approved science/engineering substitute' }],
            prefer: (c) => (ELECTIVE_POOL.has(c, h.catalog) ? 0 : 1),
            pool: 'PHYS 100–180 or ASTR 111–118 (5 credits), not used for another requirement; one upper-division science or engineering course with department approval',
          },
        )

    // Every exclusive slot exists now: allocate, then ask for department
    // approval only if an elective actually rests on a substitute course.
    h.solve()
    const petitioned = qis ? [] : (electives.used ?? []).filter((e) => !ELECTIVE_POOL.has(e.code, h.catalog))
    const electivesNode = petitioned.length
      ? h.group('electives-approved', 'Three electives', [electives, h.attest('elective-approval', `Department approval for ${petitioned.map((e) => e.display).join(', ')} as an elective`)], { quote: Q_PETITION })
      : electives

    const dcQ = 'Students in the physics major satisfy the DC requirement by completing one of the following options:'
    const dc = h.either('dc', 'Disciplinary Communication (DC)', dcQ, [
      h.take('dc-182', 'PHYS 182', qis ? 'Either this course:' : dcQ, codes('PHYS 182'), { exclusive: false }),
      h.all('dc-thesis', 'PHYS 195A and 195B (senior thesis)', qis ? 'Or these courses:' : dcQ, ['PHYS 195A', 'PHYS 195B'], { exclusive: false }),
    ])

    const comprehensive = qis
      ? h.take('comprehensive', 'Comprehensive Requirement: PHYS 138', 'The comprehensive requirement is satisfied by completing the following course:', codes('PHYS 138'), { exclusive: false })
      : h.take('comprehensive', 'Comprehensive Requirement: PHYS 134', 'The comprehensive requirement is satisfied by completing the following course:', codes('PHYS 134'), { exclusive: false })

    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'To qualify to declare the physics major, students must achieve a cumulative grade point average (GPA) of 2.70 or greater in the following courses, or their equivalents:',
      'A GPA of 2.70 in PHYS 5A/15A, 5B and 5C/15C gates declaration; it is not a graduation requirement.',
    )

    return [qualification, lower, upper, electivesNode, dc, comprehensive]
  },
})

/**
 * A required lab that a score of 5 on the matching AP Physics C exam exempts.
 * The exemption is offered only when the lecture is credit without a term
 * (exam/transfer credit) and the lab is not in the plan.
 */
function apLab(h: HarnessContext, lab: string, lectures: string[], att: string): Node {
  const quote = 'Plus all of the following courses:'
  const slot = h.take(`phys-${lab.slice(-2).toLowerCase()}`, lab, quote, codes(lab), { minor: true })
  const hasLab = h.taken(codes(lab)).length > 0
  const lec = h.taken(codes(...lectures))
  // Exempt only via the exam: lecture absent, or present only as term-less (AP) credit.
  if (hasLab || lec.some((e) => e.term != null)) return slot
  return h.either(`${lab.replace(' ', '').toLowerCase()}-or-ap`, `${lab} (or AP exemption)`, [quote, Q_AP], [slot, apAttest(h, att)])
}

/** PHYS 5A/15A or 5C/15C; the AP exemption is offered only when neither is in the plan. */
function apLecture(h: HarnessContext, id: string, title: string, set: ReturnType<typeof codes>, att: string): Node {
  const quote = 'Plus one of the following courses:'
  const slot = h.take(id, title, quote, set)
  if (h.taken(set).length) return slot
  return h.either(`${id}-or-ap`, `${title} (or AP exemption)`, [quote, Q_AP], [slot, apAttest(h, att)])
}

function apAttest(h: HarnessContext, att: string): Node {
  return h.attested(att) ? h.attest(att, undefined, { detail: 'Met by AP exemption (score of 5, as you confirmed).' }) : h.attest(att)
}

/** Programming course; the CSE 20 test-out is offered only when none is in the plan. */
function programming(h: HarnessContext, qis: boolean): Node {
  const slot = qis
    ? h.take('programming', 'Programming', 'Plus one of the following courses:', PROGRAMMING, { notes: ['ASTR 119 is recommended.'] })
    : h.take('programming', 'Programming', 'Plus one of the following courses or equivalent:', PROGRAMMING, {
        notes: ['ASTR 119 is strongly recommended. “Or equivalent” courses need department confirmation.'],
      })
  if (h.taken(PROGRAMMING).length) return slot
  const testout = h.attested('cse20-testout')
    ? h.attest('cse20-testout', undefined, { detail: 'Met by test-out (as you confirmed).' })
    : h.attest('cse20-testout')
  return h.either('programming-or-testout', 'Programming (or CSE 20 test-out)', Q_CSE20, [slot, testout])
}

/** PHYS 116C, or the waiver: math dual major + MATH 107 (fall 2017 or later). */
function phys116c(h: HarnessContext, upperQuote: string, waiverQuote: string): Node {
  const math107 = h.taken(codes('MATH 107')).filter((e) => e.term == null || Number(e.term) >= 2178)
  const plain = h.take('phys116c-course', 'PHYS 116C', upperQuote, codes('PHYS 116C'))
  if (!math107.length) return h.group('phys116c', 'PHYS 116C', [plain], { quote: upperQuote })
  return h.either('phys116c', 'PHYS 116C (or the math dual-major waiver)', [upperQuote, waiverQuote], [
    plain,
    h.group('phys116c-waiver', 'Waiver: math dual major with MATH 107', [
      h.node('math107', 'MATH 107 (fall 2017 or later)', waiverQuote, 'met', { used: math107 }),
      h.attest('math-double-major'),
    ]),
  ])
}
