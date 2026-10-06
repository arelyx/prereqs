// Art & Design: Games + Playable Media B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/art-design-games-playable-media-ba.md
//
// Lower division: ARTG 10/40/50 + one of ARTG 20/25/30, one arts elective
// (junior transfers: met by transfer screening), one 5-credit HAVC course.
// Upper division is EIGHT courses — one per topic area, one DC course, four
// electives — so every upper-division slot is exclusive (the topic lists
// overlap; one course fills one slot). The senior comprehensive IS the
// Performance/Portfolio/Exhibition requirement. ARTG 170A and 170B are
// equivalent: when both are taken only the first counts.
import { canon, codes, defineHarness, display, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const LD_ARTS = [
  'ART 10D', 'ART 10E', 'ART 10F', 'ART 20L', 'ART 80T', 'ARTG 91', 'CMPM 25', 'CMPM 26', 'CMPM 80K', 'FILM 80V',
  'MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 6', 'MUSC 8A', 'MUSC 8B', 'MUSC 9', 'MUSC 10',
  'MUSC 80L', 'THEA 10', 'THEA 14', 'THEA 15', 'THEA 17', 'THEA 18C', 'THEA 19', 'THEA 20', 'THEA 21', 'THEA 22',
  'THEA 30', 'THEA 31C', 'THEA 33C', 'THEA 36', 'THEA 37', 'THEA 40', 'THEA 50', 'THEA 80Z',
]
// Cross-listed partners ([/X] in the source). The catalog files each course
// under the first code; the partner code is accepted too.
const XL: Record<string, string> = {
  'THEA 117': 'ART 147T',
  'ARTG 138': 'FMST 138',
  'ARTG 139': 'CRES 139',
  'ARTG 142': 'CRES 142',
  'ARTG 143': 'THEA 143',
  'CMPM 179': 'ARTG 179',
  'DANM 140': 'ART 105',
}
const withXL = (list: string[]) => list.flatMap((c) => (XL[c] ? [c, XL[c]] : [c]))

const CRAFT = [
  'ARTG 118', 'ARTG 120', 'ARTG 131', 'ARTG 132', 'ARTG 136', 'ARTG 137', 'ARTG 140', 'THEA 113', 'THEA 115A',
  'THEA 116A', 'THEA 117', 'THEA 124', 'THEA 126', 'THEA 139', 'THEA 145R', 'THEA 151', 'THEA 151A', 'THEA 157',
]
const SOCIAL = [
  'ARTG 138', 'ARTG 139', 'ARTG 142', 'ARTG 143', 'THEA 100W', 'THEA 104', 'THEA 113', 'THEA 116A', 'THEA 161M',
  'THEA 161P', 'THEA 161Q', 'THEA 161R', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168',
]
const PPE = [
  'ARTG 134', 'ARTG 143', 'ARTG 170A', 'ARTG 170B', 'ARTG 171', 'ARTG 172', 'ARTG 180', 'ARTG 181', 'THEA 139',
  'THEA 151', 'THEA 151A', 'THEA 145R',
]
const DC = ['ARTG 170A', 'ARTG 170B', 'ARTG 180', 'ARTG 181']
const ELECTIVE_LIST = [
  'ART 101', 'ART 104', 'ART 106A', 'ART 106E', 'ART 106G', 'ART 106O', 'ART 108', 'ART 135', 'CMPM 125', 'CMPM 131',
  'CMPM 146', 'CMPM 147', 'CMPM 148', 'CMPM 150', 'CMPM 151', 'CMPM 152', 'CMPM 163', 'CMPM 169', 'CMPM 176',
  'CMPM 177', 'CMPM 178', 'CMPM 179', 'CSE 118', 'CSE 183', 'DANM 140', 'DANM 146', 'DANM 148', 'DANM 219',
  'DANM 220', 'GAME 231', 'GAME 280A', 'FILM 170A', 'FILM 171D', 'FILM 173', 'FILM 177', 'FILM 179A', 'FILM 179B',
  'FILM 189', 'MUSC 123A', 'MUSC 123B', 'MUSC 123C', 'THEA 100W', 'THEA 104', 'THEA 113', 'THEA 114', 'THEA 115A',
  'THEA 116A', 'THEA 117', 'THEA 124', 'THEA 126', 'THEA 131B', 'THEA 131C', 'THEA 135', 'THEA 136', 'THEA 139',
  'THEA 141', 'THEA 145R', 'THEA 151', 'THEA 151A', 'THEA 157', 'THEA 159', 'THEA 161M', 'THEA 161P', 'THEA 161Q',
  'THEA 161R', 'THEA 164', 'THEA 165', 'THEA 166', 'THEA 167', 'THEA 168',
]

export default defineHarness({
  program: 'art-design-games-playable-media-ba',
  edition: '2026-27',
  title: 'Art & Design: Games + Playable Media B.A.',
  attestations: [
    {
      id: 'transfer-screening',
      label: 'Junior transfer who met the AGPM transfer screening requirements',
      quote: 'Junior transfers fulfill the lower-division arts elective requirement as part of the transfer screening requirements.',
      aliases: ['transfer screening', 'screening'],
    },
  ],
  coverage: {
    ignore: Object.fromEntries(
      ['ART20G', 'ART20H', 'ART20I', 'ART20K', 'ARTG80G', 'FILM20P', 'MUSC14', 'MUSC15', 'MUSC20A', 'MUSC30A'].map((c) => [
        c,
        'listed only under Transfer Admission Screening Policy (gates admission, not a completion requirement)',
      ]),
    ),
    unknownOk: Object.fromEntries(
      Object.values(XL).map((c) => [canon(c), 'cross-listed partner ([/X] in the source); the catalog files the course under the first code']),
    ),
  },
  notes: [
    'Major courses may be taken for a letter grade or Pass/No Pass (campus 25% P/NP limit applies).',
    'Other courses can count as electives only through an approved AGPM Course Substitution Petition — add them only once approved.',
    'ARTG 170A and ARTG 170B are equivalent; only one of them counts.',
  ],
  evaluate(h) {
    // "All courses used to satisfy any of the ... major requirements can be taken for a letter grade or as Pass/No Pass."
    h.policy = undefined

    // "ARTG 170A and ARTG 170B are equivalent courses; students cannot receive credit for both."
    const a = h.passed.find((e) => e.code === 'ARTG170A')
    const b = h.passed.find((e) => e.code === 'ARTG170B')
    const dup = a && b ? (Number(b.term ?? -1) >= Number(a.term ?? -1) ? 'ARTG 170B' : 'ARTG 170A') : null
    const no = dup ? [dup] : []
    const list = (l: string[]) => codes(...withXL(l)).except(no)

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.group('foundational', 'Foundational Courses', [
        h.all('foundational-core', 'ARTG 10, ARTG 40 and ARTG 50', 'Complete the following courses:', ['ARTG 10', 'ARTG 40', 'ARTG 50']),
        h.take('games-as', 'One of ARTG 20, 25, 30', 'Plus one of the following:', codes('ARTG 20', 'ARTG 25', 'ARTG 30')),
      ]),
      artsElective(h),
      h.take('havc', 'History of Art and Visual Culture: any 5-credit HAVC course', 'Complete any one 5-credit History of Art and Visual Culture (HAVC) course. This can be either a lower- or upper-division course.', range('HAVC', 1, 199).minCredits(5), {
        pool: 'any 5-credit lower- or upper-division HAVC course',
      }),
    ])

    const craft = h.take('craft', 'Craft Refinement', 'Complete at least one course from the following list:', list(CRAFT))
    const social = h.take('social', 'Social Interventions', 'Complete at least one course from the following list:', list(SOCIAL))
    const ppe = h.take('ppe', 'Performance/Portfolio/Exhibition', ['Complete at least one course from the following list:', 'ARTG 170A and ARTG 170B are equivalent courses; students cannot receive credit for both.'], list(PPE))
    const dc = h.take('dc', 'Disciplinary Communication', ['Students satisfy the DC requirement by completing one additional course from the list below. This course may not satisfy another requirement of the major.'], list(DC))
    const comprehensive = h.node(
      'comprehensive',
      'Senior Comprehensive Requirement',
      'Students satisfy the senior comprehensive requirement by completing the Performance/Portfolio/Exhibition requirement above.',
      'info',
      { detail: 'Satisfied by the Performance/Portfolio/Exhibition course above.' },
    )
    const electivePool = range('ARTG', 100, 189)
      .or(codes(...withXL([...CRAFT, ...SOCIAL, ...PPE, ...ELECTIVE_LIST])))
      .except(no)
    const electives = h.take(
      'electives',
      'Four upper-division electives',
      'Complete four-upper division electives. Electives may be chosen from ARTG 100-189 courses, additional courses from the topic areas above, or from the courses listed below.',
      electivePool,
      {
        n: 4,
        repeatable: 'catalog',
        pool: 'ARTG 100–189, any course from the three topic-area lists, or the listed ART/CMPM/CSE/DANM/GAME/FILM/MUSC/THEA electives',
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [craft, social, ppe, dc, comprehensive, electives], {
      quote: 'The upper-division curriculum consists of eight courses: One from each of the three topic areas (craft refinement, social interventions, and performance/portfolio/exhibition), one disciplinary communication (DC) course, and four upper-division electives.',
    })
    if (dup) upper.notes = [`${display(dup)} does not count toward the major: ARTG 170A and 170B are equivalent.`]
    return [lower, upper]
  },
})

function artsElective(h: HarnessContext): Node {
  const course = h.take('arts-elective', 'Lower-Division Arts Elective', 'Complete one lower-division course from the following:', codes(...LD_ARTS), {
    notes: ['Check with departments and the General Catalog for restrictions or prerequisites.'],
  })
  if (h.entry !== 'transfer') return course
  return h.either('arts-elective-or-screening', 'Lower-Division Arts Elective (or transfer screening)', 'Junior transfers fulfill the lower-division arts elective requirement as part of the transfer screening requirements.', [
    course,
    h.attest('transfer-screening'),
  ])
}
