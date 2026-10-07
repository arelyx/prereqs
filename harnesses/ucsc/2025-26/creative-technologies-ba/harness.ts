// Creative Technologies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/creative-technologies-ba.md
//
// Ported from the reviewed 2026-27 harness; the 2025-26 page is structured
// differently:
//  - Breadth of Arts electives are LISTED on this page (2026-27 links an
//    external list): three from the list, at least one numbered 100+.
//    "Courses relevant to the requirement, but not listed here ... may be
//    proposed ... via petition": an unlisted Arts Division course (ART, ARTG,
//    DANM, FILM, HAVC, MUSC, THEA, CT) is a candidate only with an approved
//    petition (attestation, asked only when the allocator needed it).
//  - Upper-division core: CT 100, 101, 110, 120, 125, 195 (no CT 151) + one
//    "from the CT 160 series" (listed: CT 160–163).
//  - Several listed codes were "pending approval in the 2024-25 academic
//    cycle" and are not in the catalog (CT 110, CT 160–163). The catalog
//    offers CT 167I "Sensors, Signals, and Interaction" — the same title as
//    CT 110 — so CT 167I is accepted for CT 110 only as cannot-check (confirm
//    with the advisor), never met on a guess. The special-topics rule is
//    "Students choose one course from the CT 160 series": any CT 160–169
//    course (e.g. CT 167N, the catalog's "Narration and Participation") is in
//    that series and counts.
//  - Colloquium: at least three quarters of CT 1 (repeatable, 2 credits).
//  - DC = CT 101 + CT 195; comprehensive = CT 195 (overlays on the core).
//  - No letter-grade rule beyond campus P/NP limits.
import { codes, defineHarness, range } from '@harness'
import type { Node } from '@harness'

const BREADTH = [
  'ART 10D', 'ART 10E', 'ART 10F', 'ART 20L', 'ART 80E', 'ARTG 80G', 'ART 80T', 'ART 101', 'ART 104', 'ART 106O',
  'ART 113', 'ART 125', 'ART 135', 'ART 145', 'ART 172', 'ARTG 80H', 'ARTG 91', 'ARTG 131', 'ARTG 132', 'FILM 80A',
  'FILM 80M', 'FILM 80S', 'FILM 80T', 'FILM 80V', 'FILM 80X', 'MUSC 11C', 'MUSC 11E', 'MUSC 14', 'MUSC 20A',
  'MUSC 20B', 'MUSC 20C', 'MUSC 58', 'MUSC 71', 'MUSC 74', 'MUSC 77', 'MUSC 80C', 'MUSC 80H', 'MUSC 80K', 'MUSC 80L',
  'MUSC 80M', 'MUSC 80N', 'MUSC 80O', 'MUSC 80R', 'MUSC 80V', 'MUSC 81A', 'MUSC 81E', 'MUSC 81J', 'MUSC 81L',
  'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H', 'MUSC 123A', 'THEA 10', 'THEA 14', 'THEA 18C', 'THEA 61A',
  'THEA 80A', 'THEA 80B', 'THEA 80C', 'THEA 80D', 'THEA 80L', 'THEA 80M', 'THEA 80N', 'THEA 80P', 'THEA 80S',
  'THEA 80Q', 'THEA 80R', 'THEA 80U', 'THEA 80X', 'THEA 80Y', 'HAVC 27', 'HAVC 30', 'HAVC 40', 'HAVC 41', 'HAVC 45',
  'HAVC 46', 'HAVC 47', 'HAVC 49', 'HAVC 51', 'HAVC 55', 'HAVC 123A', 'HAVC 137E', 'HAVC 140C', 'HAVC 140F',
  'HAVC 141H', 'HAVC 141N', 'HAVC 141O', 'HAVC 141P', 'HAVC 186', 'HAVC 191G',
]
const BREADTH_SET = codes(...BREADTH)
// Petition candidates; CT 1 (the colloquium) is not an arts elective.
const ARTS = ['ART', 'ARTG', 'DANM', 'FILM', 'HAVC', 'MUSC', 'THEA', 'CT']
  .map((s) => range(s, 1, 299))
  .reduce((a, b) => a.or(b))
  .where((c) => c.code !== 'CT1', 'not the CT 1 colloquium')
const UD = (c: string) => Number(/\d+/.exec(c)?.[0] ?? 0) >= 100

const Q_BREADTH = 'Students must take three Breadth of Arts elective courses. At least one of the three Breadth of Arts elective courses must be upper-division (numbered 100 and above).'
const Q_PETITION = 'Courses relevant to the requirement, but not listed here (including graduate seminars), may be proposed to fulfill this requirement via petition; please contact the undergraduate advisor to learn about the petition process.'
const Q_PENDING = 'Courses marked with an asterisk are pending approval in the 2024-25 academic cycle.'
const Q_UD = 'Students take eight upper-division courses; the Breadth of Arts elective (outlined above), plus the following.'

export default defineHarness({
  program: 'creative-technologies-ba',
  edition: '2025-26',
  title: 'Creative Technologies B.A.',
  attestations: [
    {
      id: 'breadth-petition',
      label: 'Petition approved to count an unlisted course as a Breadth of Arts elective',
      quote: Q_PETITION,
      aliases: ['breadth petition', 'petition'],
    },
  ],
  coverage: {
    unknownOk: {
      'CT 110': 'listed as pending approval in 2024-25; not in the catalog (CT 167I has its title)',
      'CT 160': 'listed as pending approval in 2024-25; not in the catalog',
      'CT 161': 'listed on the page; not in the catalog (CT 167N has its title)',
      'CT 162': 'listed as pending approval in 2024-25; not in the catalog',
      'CT 163': 'listed on the page; not in the catalog',
    },
  },
  notes: [
    'Two arts courses (one theory/history, one practice-based) and a personal statement are part of major qualification (declaration), not completion.',
    'No letter-grade rule beyond the campus P/NP limit.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy outside the university's Pass/No Pass limit and minimum grade requirement"
    h.policy = undefined

    const ct1 = h.take('ct1', 'Three quarters of colloquium (CT 1)', ['Students must take at least three quarters of colloquium.', 'CT 1 — Creative Interventions: A Colloquium in Contemporary Media (2)'], codes('CT 1'), {
      n: 3,
      repeatable: true,
    })
    const ldCore = h.all('ld-core', 'CT 10, CT 11, CT 20', 'Students take three lower-division core courses.', ['CT 10', 'CT 11', 'CT 20'])

    const udCore = h.group('ud-core', 'Upper-division CT courses', [
      h.take('ct100', 'CT 100', 'CT 100 - Digital Platforms: Observations and Practices', codes('CT 100'), { notes: ['ART 102 is the same course (cross-listed).'] }),
      h.take('ct101', 'CT 101', 'CT 101 - Persuasion and Resistance: Power in Contemporary Digital Media *', codes('CT 101')),
      h.take('ct110', 'CT 110 Sensors, Signals, and Interaction', ['CT 110 - Sensors, Signals, and Interaction *', Q_PENDING], codes('CT 110', 'CT 167I'), {
        prefer: (c) => (c === 'CT110' ? 0 : 1),
      }),
      h.take('ct120', 'CT 120', 'CT 120 - Intermediate Creative Coding', codes('CT 120')),
      h.take('ct125', 'CT 125', 'CT 125 - Collaborative Production Practicum *', codes('CT 125')),
      h.take('ct195', 'CT 195', 'CT 195 - Creative Technologies Senior Studio *', codes('CT 195')),
    ], { quote: Q_UD })
    const topics = h.take('special-topics', 'One CT 160-series course', ['Students choose one course from the CT 160 series:', 'CT 160 - Fabrication and Production Studio *', 'CT 161 - Narration and Participation: Modes of Representation in Media', 'CT 162 - Immersive Reality Studio *', 'CT 163 - Queer Art'], range('CT', 160, 169), {
      pool: 'CT 160 series (listed: CT 160, CT 161, CT 162, CT 163; the catalog offers CT 167I/N/Q/S/V)',
    })

    // Breadth: three, at least one 100+; unlisted arts courses by petition.
    const breadth = h.take('breadth', 'Three Breadth of Arts electives', [Q_BREADTH, 'Students may choose from the following list of Breadth of Arts elective courses:', Q_PETITION], BREADTH_SET.or(ARTS), {
      n: 3,
      atLeast: [{ set: BREADTH_SET.or(ARTS).where((c) => UD(c.code), 'upper-division'), n: 1, label: 'upper-division (100+) breadth electives' }],
      prefer: (c) => (BREADTH_SET.has(c) ? 0 : 1),
      pool: 'the Breadth of Arts list on this page (or an unlisted Arts Division course by petition); at least one numbered 100+',
      notes: ['Students are encouraged to take courses in their preferred artistic media.'],
    })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-101', 'CT 101', 'The DC requirement in creative technologies is satisfied by completing the following two courses:', codes('CT 101'), { exclusive: false }),
      h.take('dc-195', 'CT 195', 'The DC requirement in creative technologies is satisfied by completing the following two courses:', codes('CT 195'), { exclusive: false }),
    ])
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement', 'Students satisfy the senior comprehensive requirement by completing:', codes('CT 195'), { exclusive: false })
    h.solve()

    // CT 167I for CT 110: same title, but the page names CT 110 — confirm.
    const ct110 = udCore.children!.find((n) => n.id === 'ct110')!
    if (ct110.status === 'met' && (ct110.used ?? []).some((e) => e.code === 'CT167I')) {
      ct110.status = 'cannot-check'
      ct110.detail = 'CT 110 was pending approval; CT 167I has the same title (Sensors, Signals, and Interaction) — confirm with the CT advisor that it fulfills CT 110.'
    }

    // Unlisted breadth courses need an approved petition.
    const petitioned = (breadth.used ?? []).filter((e) => !BREADTH_SET.has(e.code))
    if (petitioned.length && breadth.status === 'met' && !h.attested('breadth-petition')) {
      breadth.status = 'needs-attestation'
      breadth.attest = h.attestations.find((a) => a.id === 'breadth-petition')
      breadth.detail = `${petitioned.map((e) => e.display).join(', ')} counts only with an approved petition (not on the Breadth of Arts list).`
    }

    return [
      h.group('lower', 'Lower-Division Courses', [ct1, ldCore]),
      breadth,
      h.group('upper', 'Upper-Division CT Courses', [udCore, topics] as Node[], { quote: Q_UD }),
      dc,
      comprehensive,
    ]
  },
})
