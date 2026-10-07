// Psychology B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/psychology-ba.md
//
// General (13 courses) and Intensive (16 courses). The upper-division courses
// are one allocation so every course counts once: PSYC 100, one per core
// subfield, three more from three DIFFERENT subfields, one related course
// outside psychology (+ intensive: PSYC 181/182 and two quarters of
// independent study). The seminar, DC and comprehensive are overlays on those.
import { codes, defineHarness, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

export const SUBFIELDS: { key: string; label: string; set: CourseSet }[] = [
  { key: 'dev', label: 'Developmental', set: range('PSYC', 101, 119) },
  { key: 'cog', label: 'Cognitive', set: range('PSYC', 120, 139) },
  { key: 'soc', label: 'Social', set: range('PSYC', 140, 159) },
  { key: 'clin', label: 'Clinical-Personality', set: range('PSYC', 160, 179) },
  { key: 'meth', label: 'Methods', set: range('PSYC', 180, 189) },
  { key: 'indep', label: 'Independent Study', set: range('PSYC', 193, 199) },
]
const subfieldOf = (code: string) => SUBFIELDS.find((s) => s.set.has(code))?.key

const MATH = ['AM 3', 'AM 6', 'AM 11A', 'MATH 3', 'MATH 4', 'MATH 11A', 'MATH 16A', 'MATH 19A']

// "Anthropology, Community Studies, Critical Race and Ethnic Studies, Ecology
// and Evolutionary Biology, Economics, Education, Environmental Studies,
// Feminist Studies, History of Consciousness, Latin American and Latino
// Studies, Legal Studies, Linguistics, Philosophy, Politics, Sociology"
const OUTSIDE_SUBJECTS = ['ANTH', 'CMMU', 'CRES', 'BIOE', 'ECON', 'EDUC', 'ENVS', 'FMST', 'HISC', 'LALS', 'LGST', 'LING', 'PHIL', 'POLI', 'SOCY']
const OUTSIDE_LIST = [
  'APLX 102', 'APLX 116', 'CMPM 146', 'CMPM 148', 'CSE 104', 'CSE 140', 'HAVC 141F', 'HAVC 141K',
  'HAVC 141O', 'HAVC 185', 'HAVC 186', 'METX 108', 'METX 135', 'STAT 131', 'STAT 132',
]

// 2025-26: the list has no PSYC 193S (added in 2026-27).
const INDEPENDENT = ['PSYC 193', 'PSYC 194A', 'PSYC 194B', 'PSYC 194C', 'PSYC 194D', 'PSYC 195A', 'PSYC 195B', 'PSYC 195C']

const SEMINAR_QUOTE = 'These are any course in the PSYC 119, 139, 159, or 179 series.'
const seminar = range('PSYC', 119, 119).or(range('PSYC', 139, 139)).or(range('PSYC', 159, 159)).or(range('PSYC', 179, 179))

export default defineHarness({
  program: 'psychology-ba',
  edition: '2025-26',
  title: 'Psychology B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Major',
      quote: 'Students intending to pursue the Intensive concentration should declare this on their proposed study plan during the junior year',
      options: [
        { value: 'general', label: 'General Psychology Major', aliases: ['general psychology'] },
        { value: 'intensive', label: 'Intensive Psychology Major', aliases: ['intensive psychology'] },
      ],
    },
  ],
  catalogNeeds: { descriptions: ['PSYC'] },
  notes: [
    'PSYC 100 and the senior seminar must be taken at UC Santa Cruz, and at least four upper-division PSYC courses must be UCSC courses — the app assumes your planned courses are UCSC courses.',
    'The outside-psychology course must not be taught by psychology faculty — check the instructor; the app cannot.',
    // 2025-26 (2026-27 says "may or may not"): "Upper-division courses from other departments taken to fulfill the psychology elective requirement may not count toward another major or minor"
    'The outside-psychology course may not also count toward another major or minor (2025-26 rule) — the app checks one program at a time.',
  ],
  evaluate(h) {
    h.policy = undefined // no letter-grade rule for completion (only for declaration)
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    const intensive = h.choice('concentration') === 'intensive'

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('psyc1', 'PSYC 1 Introduction to Psychology', 'Take this course:', codes('PSYC 1')),
      h.options('stats', 'Statistics', 'Plus one of the following options:', [['PSYC 2'], ['STAT 5'], ['STAT 7', 'STAT 7L']]),
      h.take('psyc10', 'PSYC 10 Developmental Psychology', 'PSYC 10 — Introduction to Developmental Psychology (5)', codes('PSYC 10')),
      h.take('psyc20', 'PSYC 20 Cognition', 'PSYC 20 — Cognition: Fundamental Theories (5)', codes('PSYC 20')),
      h.take('math', 'Mathematics', 'Plus one of the following courses:', codes(...MATH), {
        notes: ['May also be satisfied with a score of 300 or higher on the ALEKS Mathematics Placement — if so, ask an advisor to record it.'],
      }),
      h.info(
        'qualification-grades',
        'Declaration grades (B- or better)',
        'PSYC 1 and the statistics (major qualification) requirement must be taken for a letter grade.',
        'A B- or higher in PSYC 1 (or PSYC 10/20) and in statistics is needed to declare the major; it gates declaration, not completion.',
      ),
    ])

    const upperChildren: (Node | null)[] = [
      h.take('psyc100', 'PSYC 100 Research Methods', 'Research Methods:', codes('PSYC 100')),
      h.group(
        'core-subfields',
        'One course in each core subfield',
        SUBFIELDS.slice(0, 3).map((s) =>
          h.take(`core-${s.key}`, s.label, 'One course in each of the following subfields (three courses):', s.set, {
            pool: `${s.label}: ${s.set.describe}`,
          }),
        ),
        { quote: 'One course in each of the following subfields (three courses):' },
      ),
      h.take(
        'additional-subfields',
        'Three more, each from a different subfield',
        'One additional 5-credit upper-division course from THREE of the subfields listed below (i.e., a total of three courses, each from a separate subfield):',
        SUBFIELDS.map((s) => s.set).reduce((a, b) => a.or(b)).minCredits(5),
        {
          n: 3,
          check: (chosen) => distinctSubfields(chosen),
          pool: 'PSYC 101–119 Developmental, 120–139 Cognitive, 140–159 Social, 160–179 Clinical-Personality, 180–189 Methods, 193–199 Independent Study (5+ credits; three different subfields)',
        },
      ),
    ]
    if (intensive) {
      upperChildren.push(
        h.take('advanced-methods', 'Advanced research course', 'One of the following:', codes('PSYC 181', 'PSYC 182')),
        independentStudy(h),
      )
    }
    upperChildren.push(outside(h))
    const upper = h.group('upper', 'Upper-Division Courses', upperChildren, {
      quote: intensive
        ? 'Eleven upper-division courses are required for the intensive major:'
        : 'Eight upper-division courses are required for the general major.',
    })

    const sem = (id: string, title: string, quote: string | string[]) =>
      h.take(id, title, quote, seminar, { exclusive: false, pool: 'PSYC 119, 139, 159 or 179 series (“satisfies seminar requirement”)' })

    const seminarNode = sem('seminar', 'Upper-division seminar', [
      'One of the upper-division courses must be an upper-division seminar',
      SEMINAR_QUOTE,
    ])
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-psyc100', 'PSYC 100', 'The DC requirement in Psychology is satisfied by completing PSYC 100 and a seminar.', codes('PSYC 100'), { exclusive: false }),
      sem('dc-seminar', 'A seminar', 'The DC requirement in Psychology is satisfied by completing PSYC 100 and a seminar.'),
    ])
    const comprehensive = sem(
      'comprehensive',
      'Comprehensive: pass a psychology seminar',
      intensive
        ? 'Psychology students will satisfy this requirement by receiving a passing grade in a Psychology seminar, which is also part of the DC requirement (see above).'
        : 'Psychology students will satisfy this requirement by receiving a passing grade in a Psychology seminar which is also part of the DC requirement (see above).',
    )
    return [lower, upper, seminarNode, dc, comprehensive]
  },
})

function distinctSubfields(chosen: Enrollment[]): string | null {
  const keys = new Set(chosen.map((e) => subfieldOf(e.code)))
  return keys.size === chosen.length ? null : 'the three courses must come from three different subfields'
}

/** "Two quarters of study from one of the following"; PSYC 193I counts as both. */
function independentStudy(h: HarnessContext): Node {
  const quote = ['Two quarters of study from one of the following:', 'PSYC 193I is equivalent to two quarters of field study and will satisfy the Advanced Requirement in its entirety.']
  if (h.taken(codes('PSYC 193I')).length) {
    return h.take('independent-study', 'Two quarters of independent study', quote, codes('PSYC 193I'))
  }
  return h.take('independent-study', 'Two quarters of independent study', quote, codes(...INDEPENDENT), {
    n: 2,
    repeatable: true,
    notes: ['PSYC 193I (International Field Study) alone counts as both quarters.'],
  })
}

/** One related upper-division course outside psychology. */
function outside(h: HarnessContext): Node {
  const notPsyc = (c: { crossListed: string[] }) => !c.crossListed.some((x) => x.startsWith('PSYC'))
  const areas = OUTSIDE_SUBJECTS.map((s) => range(s, 100, 189))
    .reduce((a, b) => a.or(b))
    .minCredits(5)
  const set = areas.or(codes(...OUTSIDE_LIST)).where((c) => notPsyc(c), 'not cross-listed with psychology')
  return h.take(
    'outside',
    'One upper-division course outside psychology',
    [
      'One upper-division course, numbered 100-189 from one of the following related areas outside of psychology. The course must be 5 credits, and neither cross-listed with psychology nor taught by psychology faculty.',
      'Or a specific course from the list below:',
    ],
    set,
    {
      pool: `ANTH, CMMU, CRES, BIOE (Ecology and Evolutionary Biology), ECON, EDUC, ENVS, FMST, HISC, LALS, LGST, LING, PHIL, POLI, SOCY 100–189 (5 credits), or ${OUTSIDE_LIST.join(', ')}`,
      notes: ['METX 108 will NOT be accepted as a substitution for PSYC 100.'],
    },
  )
}
