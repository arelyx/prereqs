// Earth Sciences/Anthropology Combined Major B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/earth-sciencesanthropology-combined-major-ba.md
//
//  - No program letter-grade policy (campus rules only).
//  - Intro geology: "EART 5, EART 10, EART 20, and the corresponding labs are
//    interchangeable" → any lecture + any lab.
//  - Five lower-division science courses: a lecture that a lab follows counts
//    only with that lab (pair = one course); CHEM 3B/3C before fall 2026 need
//    CHEM 3BL/3CL; CHEM 3 and CHEM 4 series may not both count.
//  - Anthropology electives come from an external course list (categories
//    Archeology / Biological-Medical-Environmental / Laboratory Methods):
//    counted from upper-division ANTH courses, then cannot-check.
//  - Comprehensive = ONE exclusive slot (not also an elective); DC = overlay.
//    The EART 198 internship option also needs the internship director's
//    prior approval (attestation).
import { codes, defineHarness, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const ANTH_SEMINARS = [
  'ANTH 194C', 'ANTH 194H', 'ANTH 194L', 'ANTH 194U', 'ANTH 194V', 'ANTH 194Y',
  'ANTH 196L', 'ANTH 196T', 'ANTH 196U', 'ANTH 196W',
]

const SCIENCE = ['BIOL 20A', 'BIOE 20B', 'BIOE 20C', 'PHYS 6A', 'PHYS 6B', 'CHEM 3A', 'CHEM 3B', 'CHEM 3C', 'CHEM 4A', 'CHEM 4B']
const SCIENCE_LABS: [string, string][] = [
  ['PHYS 6A', 'PHYS 6L'], ['PHYS 6B', 'PHYS 6M'], ['CHEM 4A', 'CHEM 4AL'], ['CHEM 4B', 'CHEM 4BL'],
  ['CHEM 3B', 'CHEM 3BL'], ['CHEM 3C', 'CHEM 3CL'],
]
// Labs that must accompany their lecture always ("Where the lab course follows
// a lecture course, the lab must be taken").
const ALWAYS_LAB: Record<string, string> = { PHYS6A: 'PHYS6L', PHYS6B: 'PHYS6M', CHEM4A: 'CHEM4AL', CHEM4B: 'CHEM4BL' }
// Only before fall 2026 (or when we cannot tell).
const OLD_LAB: Record<string, string> = { CHEM3B: 'CHEM3BL', CHEM3C: 'CHEM3CL' }
const CHEM3 = new Set(['CHEM3A', 'CHEM3B', 'CHEM3C'])
const CHEM4 = new Set(['CHEM4A', 'CHEM4B'])

function scienceCheck(chosen: Enrollment[]): string | null {
  const have = new Set(chosen.map((e) => e.code))
  for (const e of chosen) {
    const lab = ALWAYS_LAB[e.code]
    if (lab && !have.has(lab)) return `${e.display} counts only with its lab`
    const old = OLD_LAB[e.code]
    if (old && (e.term == null || Number(e.term) < FALL_2026) && !have.has(old))
      return `${e.display} taken before fall 2026 needs ${old.replace('CHEM', 'CHEM ')}`
  }
  if (chosen.some((e) => CHEM3.has(e.code)) && chosen.some((e) => CHEM4.has(e.code)))
    return 'courses from the CHEM 3 series and the CHEM 4 series cannot both count'
  return null
}

// "If a lecture has a lab offered (required or optional), the lab must be
// passed": the catalog lab is the lecture code + "L", except EART 110B/110C,
// whose labs are EART 110M/110N.
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function labPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

export default defineHarness({
  program: 'earth-sciencesanthropology-combined-major-ba',
  edition: '2026-27',
  title: 'Earth Sciences/Anthropology Combined Major B.A.',
  attestations: [
    {
      id: 'internship-approval',
      label: 'EART 198 internship approved in advance by the EPS internship director (with a comprehensive final written report)',
      quote: 'Option 5: Satisfactory completion of a 5-credit internship (EART 198) under the guidance of an on-site supervisor, with coordination and prior approval of the Earth and Planetary Science Department’s internship director. The project must include a comprehensive final written report.',
      aliases: ['internship', 'eart 198', 'internship director'],
    },
  ],
  notes: [
    'No program letter-grade policy: campus P/NP rules apply.',
    'Relevant courses taken at UC Santa Cruz or elsewhere may be substituted by approved petition — add a substitute only once approved.',
    'This major cannot be combined with the Earth Sciences minor, the Earth Sciences B.S., or the Environmental Sciences B.S.; double majors complete DC and comprehensive requirements for each major.',
    'Major qualification (EART 5/5L, 10/10L or 20/20L with a C or better) gates declaration and is not tracked here.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy."
    h.policy = undefined

    const Q_GEO = ['Plus one of the following options:', 'NOTE: EART 5, EART 10, EART 20, and the corresponding labs are interchangeable.']
    const Q_SCI = [
      'Students choose five courses from the following list. Where the lab course follows a lecture course, the lab must be taken. The pair of courses counts as a single course.',
      'Students may count courses either from the CHEM 3 series or the CHEM 4 series, but they may not count both. CHEM 3B and CHEM 3C taken fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.',
    ]
    const science = h.take('science', 'Five lower-division science courses', Q_SCI, codes(...SCIENCE), {
      n: 5,
      labs: { pairs: SCIENCE_LABS, mode: 'merge' },
      check: scienceCheck,
    })
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('anth-intro', 'ANTH 1, 2 and 3', 'All of the following courses:', ['ANTH 1', 'ANTH 2', 'ANTH 3']),
      h.group(
        'intro-geology',
        'Introductory geology with lab',
        [
          h.take('intro-lecture', 'EART 5, EART 10 or EART 20', Q_GEO, codes('EART 5', 'EART 10', 'EART 20')),
          h.take('intro-lab', 'EART 5L, EART 10L or EART 20L', Q_GEO, codes('EART 5L', 'EART 10L', 'EART 20L')),
        ],
        { quote: Q_GEO },
      ),
      h.options('calc', 'Calculus', 'Plus one of the following options:', [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']]),
      science,
    ])

    const upper = h.take('eart110a', 'EART 110A Evolution of the Earth', 'Take the following course:', codes('EART 110A'))

    const Q_ELECTIVES = 'Students complete seven electives, three in Earth sciences and four in anthropology, as follows:'
    const eartPool = range('EART', 100, 199).except(['EART 196B', 'EART 198']).minCredits(5)
    const eartElectives = h.take(
      'eart-electives',
      'Three Earth sciences electives',
      'Three upper-division Earth sciences courses of 5 or more credits, chosen from EART 100-199 (excluding EART 196B and EART 198). No more than one quarter of EART 199 may be used as an elective. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.',
      eartPool,
      {
        n: 3,
        labs: { pairs: labPairs(h, eartPool), mode: 'required' },
        atMost: [{ set: codes('EART 199'), n: 1, label: 'at most one quarter of EART 199' }],
        pool: 'EART 100–199 (not 196B or 198), 5+ credits; a lecture counts only with its lab',
      },
    )
    const Q_ANTH =
      'Four 5-credit or more upper-division archeology, biological/medical/environmental anthropology, or laboratory methods courses. Students should consult the [Anthropology Department’s course list](https://catalog.ucsc.edu/current/general-catalog/academic-units/social-sciences-division/anthropology/anthropology-course-list/), and reference courses listed under the Archeology, Biological/Medical/Environmental Anthropology, and Laboratory Methods courses heading.'
    const anthElectives = h.take('anth-electives', 'Four anthropology electives', Q_ANTH, range('ANTH', 100, 199).minCredits(5), {
      n: 4,
      pool: 'upper-division ANTH courses (5+ credits) listed under Archeology, Biological/Medical/Environmental Anthropology, or Laboratory Methods on the department’s course list',
    })

    const dc = h.either('dc', 'Disciplinary Communication (DC)', ['In order to satisfy the DC requirement, students must fulfill one of the two options:', 'Courses may simultaneously satisfy both the DC requirement and the upper-division Earth sciences or anthropology elective requirement.'], [
      h.options('dc-summer-field', 'EART 189A and EART 189B', 'One of the following options:', [['EART 189A', 'EART 189B']], { exclusive: false }),
      h.take('dc-eart', 'One of EART 191, 191C, 191D or 195', 'One of the following options:', codes('EART 191', 'EART 191C', 'EART 191D', 'EART 195'), { exclusive: false }),
      h.take('dc-anth', 'An anthropology senior seminar from the list', ['Or one course from this list:', 'Students may complete one Anthropology 194 or 196 series senior seminar in physical anthropology or archaeology, listed below.'], codes(...ANTH_SEMINARS), { exclusive: false }),
    ])

    const comprehensive = comprehensiveReq(h)
    h.solve()
    fixScience(h, science)
    fixAnth(anthElectives)
    fixInternship(h, comprehensive)

    return [
      lower,
      h.group('upper', 'Upper-Division Courses', [upper]),
      h.group('electives', 'Electives', [eartElectives, anthElectives], { quote: Q_ELECTIVES }),
      dc,
      comprehensive,
      h.info(
        'comp-timing',
        'Before the senior comprehensive',
        'Therefore, prior to completing an activity to satisfy the senior comprehensive requirement, students should have already completed EART 110A, and three other upper-division courses that fulfill major requirements.',
        'Advice on timing, not a completion rule.',
      ),
    ]
  },
})

function comprehensiveReq(h: HarnessContext): Node {
  const quote = [
    'Note: Courses used to satisfy the senior comprehensive requirement cannot also be used to fulfill the upper-division elective requirement.',
    'To satisfy the comprehensive requirement, each student in this major must complete one of the following options:',
    'Option 1: Satisfactory completion of an Anthropology 194 or 196 series senior seminar in physical anthropology or archaeology, listed in the DC section above.',
    'Option 2: Satisfactory completion of EART 189A and EART 189B*, Geographic Information Systems with Applications in Earth Sciences and Summer Field Internship.',
    'Option 3: Satisfactory completion of EART 191 or EART 191D, Earth Sciences Capstone Seminar or Practical Geochemistry.',
    'Option 4: Satisfactory completion of a senior thesis (EART 195) with faculty readers from both departments,',
    'Option 5: Satisfactory completion of a 5-credit internship (EART 198)',
  ]
  const summer = (avail: Enrollment[]): Enrollment[][] => {
    const a = avail.find((e) => e.code === 'EART189A')
    const b = avail.find((e) => e.code === 'EART189B')
    return a && b ? [[a, b]] : []
  }
  return h.take('comprehensive', 'Senior Comprehensive Requirement', quote, codes(...ANTH_SEMINARS, 'EART 191', 'EART 191D', 'EART 195', 'EART 198'), {
    composite: { eligible: codes('EART 189A', 'EART 189B'), build: summer },
    // The internship also needs prior approval: try every other option first.
    prefer: (c) => (c === 'EART198' ? 1 : 0),
    pool: 'a listed ANTH 194/196 seminar, EART 189A + 189B, EART 191 or 191D, EART 195 (thesis), or EART 198 (approved internship)',
    notes: [
      'A senior thesis needs faculty readers from both departments, agreed at least three quarters in advance.',
      'EART 189A and EART 189B have as prerequisites EART 109 and EART 109L, EART 110A, and EART 110B and EART 110M.',
    ],
  })
}

/** CHEM 3B/3C with no term and no lab: we cannot tell whether the lab was needed. */
function fixScience(h: HarnessContext, node: Node): void {
  if (node.status !== 'unmet') return
  const undated = h.passed.some((e) => e.term == null && OLD_LAB[e.code] && !h.passed.some((x) => x.code === OLD_LAB[e.code]))
  if (!undated) return
  node.status = 'cannot-check'
  node.detail = 'CHEM 3B/3C has no term: if taken before fall 2026 it counts only with CHEM 3BL/3CL. ' + (node.detail ?? '')
}

/** Four upper-division ANTH courses found: their category comes from an external list. */
function fixAnth(node: Node): void {
  if (node.status !== 'met') return
  node.status = 'cannot-check'
  node.detail = `Check that ${node.used?.map((e) => e.display).join(', ')} are listed under Archeology, Biological/Medical/Environmental Anthropology, or Laboratory Methods on the Anthropology Department’s course list.`
}

function fixInternship(h: HarnessContext, node: Node): void {
  if (node.status !== 'met' || !node.used?.some((e) => e.code === 'EART198')) return
  if (h.attested('internship-approval')) {
    node.detail = 'EART 198 internship (you confirmed the internship director’s prior approval and final report).'
    return
  }
  node.status = 'needs-attestation'
  node.attest = h.attestations.find((a) => a.id === 'internship-approval')
  node.detail = 'The EART 198 internship counts only with the internship director’s prior approval and a comprehensive final written report — confirm it.'
}
