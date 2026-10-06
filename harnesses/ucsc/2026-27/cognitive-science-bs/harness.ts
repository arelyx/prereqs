// Cognitive Science B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/cognitive-science-bs.md
//
// Fifteen courses: four lower-division, PSYC 100, three of the four core
// areas, three cognitive psychology electives (one senior seminar + two from
// the list) and four interdisciplinary electives — one shared allocation so
// every course counts once. Unusual bits:
//  - Cognitive electives: at most one of PSYC 193/193I/193S/194A/194B/195A;
//    PSYC 204–252 by petition (attestation when actually used).
//  - Interdisciplinary: at least one upper-division, or — if all four are
//    lower-division — an additional upper-division PSYC course not otherwise
//    used. PHIL 190 counts by petition only (attestation when used).
//    Lecture/lab combinations count as one; only the lecture is required.
//  - DC = PSYC 100 + a seminar; comprehensive = passing a senior seminar
//    (overlays on the courses above).
//  - No letter-grade rule for completion (only for declaration).
import { codes, defineHarness, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const CORE = ['PSYC 121', 'PSYC 123', 'PSYC 125', 'PSYC 129']
const COG_LIST = [
  'PSYC 103', 'PSYC 104', 'PSYC 105', 'PSYC 109', 'PSYC 112', 'PSYC 116', 'PSYC 120', 'PSYC 120D', 'PSYC 121',
  'PSYC 122', 'PSYC 123', 'PSYC 124', 'PSYC 125', 'PSYC 126', 'PSYC 129', 'PSYC 130', 'PSYC 133', 'PSYC 138',
  'PSYC 138M', 'PSYC 140F', 'PSYC 147A', 'PSYC 160', 'PSYC 178', 'PSYC 181', 'PSYC 182', 'PSYC 193', 'PSYC 193I',
  'PSYC 193S', 'PSYC 194A', 'PSYC 194B', 'PSYC 195A',
]
const FIELD = codes('PSYC 193', 'PSYC 193I', 'PSYC 193S', 'PSYC 194A', 'PSYC 194B', 'PSYC 195A')
const GRAD = range('PSYC', 204, 252)
const INTERDISCIPLINARY = [
  'ANTH 1', 'ANTH 100', 'ANTH 101', 'ANTH 104', 'ANTH 105', 'ANTH 106', 'ANTH 112', 'ANTH 139', 'ANTH 173', 'ANTH 174',
  'ANTH 184', 'ANTH 194B', 'ANTH 194H', 'BIOE 20C', 'BIOE 109', 'BIOE 124', 'BIOE 124L', 'BIOE 129', 'BIOE 129L',
  'BIOE 140', 'BIOE 141L', 'BIOE 147', 'BIOE 172', 'BIOL 105', 'BIOL 120', 'BIOL 125', 'METX 41', 'METX 135',
  'PHIL 127', 'PHIL 190', 'ARTG 80G', 'ARTG 80H', 'CMPM 25', 'CMPM 26', 'CMPM 35', 'CMPM 80A', 'CMPM 80H', 'CMPM 80I',
  'CMPM 80K', 'CMPM 125', 'CMPM 131', 'CMPM 146', 'CMPM 148', 'CMPM 177', 'CMPM 178', 'CSE 80A', 'CSE 107', 'ECE 8',
  'ECE 9', 'ECE 167', 'MUSC 80L', 'STAT 131', 'APLX 102', 'APLX 116', 'LING 50', 'LING 53', 'LING 80C', 'LING 80D',
  'LING 80K', 'LING 101', 'LING 102', 'LING 105', 'LING 111', 'LING 112', 'LING 113', 'LING 116', 'LING 117',
  'LING 124', 'LING 125', 'LING 140', 'LING 151', 'LING 152', 'LING 155', 'LING 171', 'LING 172', 'LING 174',
  'PHIL 7', 'PHIL 9', 'PHIL 11', 'PHIL 23', 'PHIL 80S', 'PHIL 100B', 'PHIL 100C', 'PHIL 121', 'PHIL 123', 'PHIL 125',
  'PHIL 133', 'PHIL 135',
]
const INTER_SET = codes(...INTERDISCIPLINARY)
const INTER_LABS: [string, string][] = [['BIOE 124', 'BIOE 124L'], ['BIOE 129', 'BIOE 129L']]
const UD_INTER = INTER_SET.where((c) => c.division === 'upper', 'upper-division')
const UD_PSYC = range('PSYC', 100, 199)

const SEMINAR = range('PSYC', 119, 119).or(range('PSYC', 139, 139)).or(range('PSYC', 159, 159)).or(range('PSYC', 179, 179))
const Q_SEMINAR = 'These are any courses from the PSYC 119, PSYC 139, PSYC 159, or PSYC 179 series. Only one seminar will count toward fulfilling these elective requirements.'
const Q_FIELD = 'PSYC 193, PSYC 193I, PSYC 193S*, PSYC 194A, PSYC 194B, and PSYC 195A may satisfy only one elective requirement.'
const Q_GRAD = 'PSYC 204-PSYC 252, graduate cognitive courses, may be substituted by petition.'
const Q_INTER =
  'Complete four interdisciplinary electives from the list of courses pre-approved by the Psychology Department, at least one of which should be upper-division. If four lower-division interdisciplinary electives are taken, students can use an additional upper-division PSYC course to count toward the upper-division requirement.'
const Q_LABS = 'Lecture and lab combinations count as a single course. For courses with a required concurrently enrolled lab, only successful completion of the lecture is required for the major.'

export default defineHarness({
  program: 'cognitive-science-bs',
  edition: '2026-27',
  title: 'Cognitive Science B.S.',
  attestations: [
    { id: 'grad-petition', label: 'Petition approved for a PSYC 204–252 graduate course as an elective', quote: Q_GRAD, aliases: ['graduate petition', 'grad petition'] },
    { id: 'phil190-petition', label: 'Petition approved for PHIL 190 as an interdisciplinary elective', quote: 'PHIL 190 satisfies this requirement by petition only.', aliases: ['phil 190', 'phil190'] },
  ],
  notes: [
    'PSYC 100 and the senior seminar must be taken at UC Santa Cruz (the plan does not record where a course was taken).',
    'Up to three Global Learning courses may be approved for the major.',
    'Major qualification: lower-division courses passed with C or better and a 2.8 GPA across them (declaration only).',
  ],
  evaluate(h) {
    h.policy = undefined // letter grades are a declaration rule; a P is accepted

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('psyc20', 'PSYC 20 Introduction to Cognition', 'PSYC 20 — Cognition: Fundamental Theories (5)', codes('PSYC 20')),
      h.options('stats', 'Statistics', ['Choose one of the following courses:', 'Lecture and lab combinations count as a single course.'], [['PSYC 2'], ['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.take('calc', 'Calculus', 'Choose one of the following courses:', codes('AM 11A', 'MATH 11A', 'MATH 16A', 'MATH 19A', 'MATH 20A')),
      h.take('programming', 'Computer Programming', 'Choose one of the following courses:', codes('CSE 13S', 'CSE 20', 'CSE 30', 'ECE 13'), {
        notes: ['CSE 20 may be satisfied by passing the CSE 20 Test Out Exam — if you did, ask an advisor to record it.'],
      }),
    ])

    const psyc100 = h.take('psyc100', 'PSYC 100 Research Methods', 'PSYC 100 — Research Methods in Psychology (7)', codes('PSYC 100'))
    const core = h.take('core', 'Core: three of Perception, Neuroscience, Language, Memory', 'Students must complete a course from three of the four following areas:', codes(...CORE), { n: 3 })
    const upper = h.group('upper', 'Upper-Division Courses', [psyc100, core])

    const seminar = h.take('seminar', 'One Senior Seminar', ['Seminar courses are psychology courses identified within the General Catalog by their course descriptions containing the phrase “satisfies seminar requirement.”', Q_SEMINAR], SEMINAR, {
      pool: 'PSYC 119, 139, 159 or 179 series',
    })
    const cogTwo = h.take('cog-two', 'Two additional cognitive psychology courses', ['Plus two additional courses from the following list:', Q_FIELD, 'One of these electives may be replaced by a core course that was not used to satisfy the core courses requirement.', Q_GRAD], codes(...COG_LIST).or(GRAD), {
      n: 2,
      atMost: [
        { set: FIELD, n: 1, label: 'PSYC 193/193I/193S/194A/194B/195A' },
        { set: GRAD, n: 1, label: 'graduate courses (by petition)' },
      ],
      prefer: (c) => (GRAD.has(c) ? 1 : 0),
      pool: `${COG_LIST.join(', ')}; or PSYC 204–252 by petition`,
    })
    const inter = h.take('interdisciplinary', 'Four interdisciplinary electives', [Q_INTER, Q_LABS, 'PHIL 190 satisfies this requirement by petition only.'], INTER_SET, {
      n: 4,
      atLeast: [{ set: UD_INTER, n: 1, label: 'upper-division interdisciplinary electives' }],
      labs: { pairs: INTER_LABS, mode: 'merge' },
      prefer: (c) => (c === 'PHIL190' ? 1 : 0),
      notes: ['LING 111 was formerly LING 55; LING 112 was formerly LING 52.', 'The upper-division School of Engineering courses in this section have additional prerequisites that are not listed here.'],
    })
    const electives = h.group('electives', 'Electives', [
      h.group('cog-electives', 'Cognitive Psychology Electives', [seminar, cogTwo], { quote: 'Students must complete three additional upper-division psychology courses as follows:' }),
      inter,
    ], { quote: 'Students complete seven electives; three cognitive psychology electives, and four interdisciplinary electives.' })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-psyc100', 'PSYC 100', 'The DC requirement in cognitive science is satisfied by completing PSYC 100 (Research Methods in Psychology) and one of the seminar courses offered by the department (listed above)', codes('PSYC 100'), { exclusive: false }),
      h.take('dc-seminar', 'A seminar', 'The DC requirement in cognitive science is satisfied by completing PSYC 100 (Research Methods in Psychology) and one of the seminar courses offered by the department (listed above)', SEMINAR, { exclusive: false, pool: 'PSYC 119, 139, 159 or 179 series' }),
    ])
    const comprehensive = h.take('comprehensive', 'Comprehensive: pass a senior seminar', 'Cognitive science students will satisfy this requirement by receiving a passing grade in a senior seminar, which is also part of the DC requirement (see above).', SEMINAR, {
      exclusive: false,
      pool: 'PSYC 119, 139, 159 or 179 series',
    })
    h.solve()

    // Four lower-division interdisciplinary electives + an additional UD PSYC course.
    if (inter.status === 'unmet') {
      const mine = new Set((inter.used ?? []).map((e) => e.id))
      const free = (e: Enrollment) => !h.used.has(e.id) || mine.has(e.id)
      const ld = new Set(h.passed.filter((e) => INTER_SET.has(e.code) && free(e) && h.catalog.get(e.code)?.division === 'lower').map((e) => e.code))
      const spare = h.passed.find((e) => UD_PSYC.has(e.code) && !h.used.has(e.id) && !SEMINAR.has(e.code) && h.catalog.get(e.code)?.division === 'upper')
      if (ld.size >= 4 && spare) {
        inter.status = 'met'
        inter.detail = `Four lower-division electives; ${spare.display} counts toward the upper-division requirement.`
        const four = [...ld].map((c) => h.passed.find((e) => e.code === c && free(e))!).slice(0, 4)
        inter.used = [...four, spare]
        inter.progress = { have: 4, need: 4 }
      }
    }
    petition(h, cogTwo, (c) => GRAD.has(c), 'grad-petition')
    petition(h, inter, (c) => c === 'PHIL190', 'phil190-petition')

    return [lower, upper, electives, dc, comprehensive]
  },
})

function petition(h: HarnessContext, node: Node, needs: (code: string) => boolean, id: string) {
  const hit = (node.used ?? []).find((e) => needs(e.code))
  if (hit && node.status === 'met' && !h.attested(id)) {
    node.status = 'needs-attestation'
    node.attest = h.attestations.find((a) => a.id === id)
    node.detail = `${hit.display} counts only by petition.`
  }
}
