// Environmental Studies/Earth Sciences Combined Major B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/environmental-studiesearth-sciences-combined-major-ba.md
//
// Discontinued for new students (2024-25); kept for continuing students.
//  - No letter-grade policy except the comprehensive (letter grade).
//  - Lists are followed literally (e.g. the chemistry series is CHEM 3A + 3B +
//    3BL + 3C, or CHEM 4A + 4AL + 4B + 4BL, exactly as printed in 2025-26).
//  - Electives: three ENVS 101–179 (≥1 from the social-science list; no
//    internship / individual study / substitution) and three EART 100–191C.
//    "lecture/lab combinations count as a single elective" → labs merge into
//    their lecture; a lab alone is not an elective.
//  - DC = ENVS 100 + 100L plus one option (overlay: reuses ENVS 100/100L).
//  - Comprehensive = the ENVS B.A. options or the Earth Sciences B.S. options,
//    ONE exclusive slot (the Earth Sciences options may not also be electives).
import { codes, defineHarness, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext } from '@harness'

const SOCIAL = [
  'ENVS 110', 'ENVS 130B', 'ENVS 140', 'ENVS 141', 'ENVS 143', 'ENVS 145', 'ENVS 147', 'ENVS 149', 'ENVS 150',
  'ENVS 151', 'ENVS 152', 'ENVS 154', 'ENVS 158', 'ENVS 165', 'ENVS 172', 'ENVS 173', 'ENVS 174', 'ENVS 176',
  'ENVS 178',
]
// Cross-listed partners ("ENVS 149 [/LGST 149]") are one course in the library.
const SOCIAL_SET = codes(...SOCIAL)
const ENVS_POOL = range('ENVS', 101, 179)
// ENVS lecture/lab combinations in ENVS 101–179 (catalog).
const ENVS_LABS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 115A', 'ENVS 115L'],
  ['ENVS 130A', 'ENVS 130L'], ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]
// "Earth and Planetary Sciences courses numbered EART 100-EART 191C"; a
// laboratory course alone is not an elective (it merges into its lecture).
const EART_POOL = range('EART', 100, 190)
  .or(codes('EART 191', 'EART 191B', 'EART 191C'))
  .where((c) => !/Laboratory/i.test(c.title), 'not a laboratory on its own')
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function eartLabPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

const pkg = (a: string, b: string) => (avail: Enrollment[]): Enrollment[][] => {
  const x = avail.find((e) => e.code === a)
  const y = avail.find((e) => e.code === b)
  return x && y ? [[x, y]] : []
}
// "Students with advanced skills in one of the graduate focal areas may also
// take a graduate seminar by invitation from the instructor." — an ENVS
// graduate seminar counts for the comprehensive only with that invitation
// (attestation asked only when the allocator needed the seminar).
const GRAD_SEMINAR = range('ENVS', 200, 296).where((c) => !/Laborator/i.test(c.title), 'not a laboratory')
const Q_GRAD = 'Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor.'
const COMP_PACKAGES = [pkg('ENVS183A', 'ENVS183B'), pkg('ENVS195A', 'ENVS195B'), pkg('EART189A', 'EART189B')]

export default defineHarness({
  program: 'environmental-studiesearth-sciences-combined-major-ba',
  edition: '2025-26',
  title: 'Environmental Studies/Earth Sciences Combined Major B.A.',
  attestations: [
    {
      id: 'grad-seminar-invitation',
      label: 'Invited by the instructor to take a graduate seminar for the senior comprehensive',
      quote: Q_GRAD,
      aliases: ['graduate seminar', 'grad seminar'],
    },
  ],
  coverage: {
    ignore: {
      AM3: 'transfer admission screening list only (not a completion requirement)',
      MATH3: 'transfer admission screening list only (not a completion requirement)',
    },
  },
  notes: [
    'This combined major was discontinued as of 2024-25; it applies only to continuing students who proposed or declared it earlier (they follow the catalog of their entry year).',
    'No letter-grade policy, except that the senior comprehensive must be taken for a letter grade.',
    'Upper-division electives cannot be substituted (including courses taken abroad).',
    'Major qualification (ENVS 24 or BIOE 20C, CHEM 3B or 4B, ENVS 25, STAT 7/7L) gates declaration and is not tracked here.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy, except that the comprehensive (senior exit) requirement must be taken for a letter grade."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('stats', 'STAT 7 and STAT 7L', 'Both of the following:', ['STAT 7', 'STAT 7L']),
      h.options('calc', 'Calculus', 'Plus one of the following math options:', [['MATH 11A', 'MATH 11B'], ['MATH 19A', 'MATH 19B']]),
      h.options('chem', 'General chemistry', 'Plus one of the following chemistry series:', [
        // 2025-26 prints the four-course series (with CHEM 3B/3BL and CHEM 4BL).
        ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C'],
        ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'],
      ]),
      h.options('physics', 'Introductory physics', 'Plus one of the following physics options:', [
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M'],
        ['PHYS 5A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M'],
      ]),
      h.options('intro-geology', 'Introductory Earth science with lab', 'Plus one of the following Earth science options:', [
        ['EART 20', 'EART 20L'],
        ['EART 5', 'EART 5L'],
        ['EART 10', 'EART 10L'],
      ]),
      h.take('ecology', 'Ecology', 'Plus one of the following courses:', codes('ENVS 24', 'BIOE 20C')),
      h.take('envs25', 'ENVS 25', 'Plus the following course:', codes('ENVS 25')),
      h.take('society', 'Society, culture or ethics course', 'Plus one of the following courses:', codes('ANTH 2', 'BME 80G', 'PHIL 22', 'PHIL 24', 'PHIL 28', 'SOCY 1', 'SOCY 10', 'SOCY 15')),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.options('eart110', 'EART 110A, or 110B + 110M, or 110C + 110N', 'One of the following options:', [['EART 110A'], ['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]),
      h.all('envs100', 'ENVS 100 and ENVS 100L', 'Plus both of the following:', ['ENVS 100', 'ENVS 100L']),
    ])

    const Q_LABS = 'Please note that lecture/lab combinations count as a single elective.'
    const electives = h.group(
      'electives',
      'Electives',
      [
        h.take(
          'envs-electives',
          'Three upper-division environmental studies courses',
          [
            'Of the three required upper-division environmental studies electives (numbered ENVS 101-ENVS 179), at least one must be taken from the following list of social science electives:',
            'None of the three environmental studies upper-division courses can be an environmental studies internship, individual study or substitution course.',
            Q_LABS,
          ],
          ENVS_POOL,
          {
            n: 3,
            atLeast: [{ set: SOCIAL_SET, n: 1, label: 'at least one social science elective' }],
            labs: { pairs: ENVS_LABS, mode: 'merge' },
            pool: 'ENVS 101–179 (lecture + lab = one), at least one from the social science list',
          },
        ),
        h.take(
          'eart-electives',
          'Three upper-division Earth sciences courses',
          ['Three additional upper-division Earth sciences courses (Earth and Planetary Sciences courses numbered EART 100-EART 191C).', Q_LABS],
          EART_POOL,
          {
            n: 3,
            labs: { pairs: eartLabPairs(h, EART_POOL), mode: 'merge' },
            pool: 'EART 100–191C (lecture + lab = one; a lab alone does not count)',
          },
        ),
      ],
      {
        quote: 'The upper-division courses should be selected in pursuit of a coherent plan of study,',
        notes: ['Plan the electives with faculty from both departments; upper-division electives cannot be substituted.'],
      },
    )

    const dcQuote = 'The DC requirement for the Environmental Studies/Earth Sciences Combined Major is satisfied by completing:'
    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      [
        h.all('dc-envs100', 'ENVS 100 and ENVS 100L', ['The following courses:', dcQuote], ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
        h.either('dc-option', 'One DC option', 'Plus one of the following options:', [
          h.take('dc-course', 'One of BIOE 151B, ENVS 183B, 190, 195B, 196 or EART 195', 'Plus one of the following options:', codes('BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196', 'EART 195'), { exclusive: false }),
          h.options('dc-summer-field', 'EART 189A and EART 189B', 'Plus one of the following options:', [['EART 189A', 'EART 189B']], { exclusive: false }),
        ]),
      ],
      { quote: dcQuote },
    )

    const comprehensive = h.take(
      'comprehensive',
      'Senior Comprehensive Requirement (letter grade)',
      [
        'Students satisfy the senior comprehensive requirement in environmental studies or Earth sciences by completing either:',
        'One of the senior comprehensive options for single environmental studies B.A. majors (see options listed below);',
        'One of the senior comprehensive options for Earth sciences B.S. (see Comprehensive Requirement under the Earth Sciences B.S.).',
        'All courses used to satisfy the senior comprehensive requirement must be taken for a letter grade.',
        Q_GRAD,
      ],
      // ENVS B.A. options listed on this page, plus the Earth Sciences B.S.
      // (general major) options: EART 189A + 189B, EART 195, EART 191/191B/191C/191D
      // (the 2025-26 Earth Sciences B.S. page adds EART 191B).
      codes('BIOE 151B', 'ENVS 190', 'ENVS 196', 'EART 195', 'EART 191', 'EART 191B', 'EART 191C', 'EART 191D').or(GRAD_SEMINAR),
      {
        policy: { letter: true },
        prefer: (c) => (GRAD_SEMINAR.has(c) ? 1 : 0),
        composite: {
          eligible: codes('ENVS 183A', 'ENVS 183B', 'ENVS 195A', 'ENVS 195B', 'EART 189A', 'EART 189B'),
          build: (avail) => COMP_PACKAGES.flatMap((f) => f(avail)),
        },
        pool: 'BIOE 151B; ENVS 183A + 183B; ENVS 190; ENVS 195A + 195B; ENVS 196 — or the Earth Sciences B.S. options: EART 189A + 189B, EART 195, EART 191, 191B, 191C or 191D',
        notes: [
          'The Earth Sciences B.S. options are not printed on this page; they are taken from that major’s general comprehensive list (EART 189A + 189B, EART 195, EART 191, 191B, 191C, 191D). Its “other options by permission of the faculty adviser” need an advisor.',
          'Courses used for an Earth Sciences B.S. comprehensive option are not also counted as electives.',
          'The senior thesis and senior internship need a faculty mentor arranged early and two consecutive quarters (ENVS 195A/183A the quarter before 195B/183B).',
          'An ENVS graduate seminar counts only by invitation from the instructor (you will be asked to confirm it).',
        ],
      },
    )
    h.solve()
    const grad = comprehensive.used?.find((e) => GRAD_SEMINAR.has(e.code, h.catalog))
    if (grad && (comprehensive.status === 'met' || comprehensive.status === 'in-progress') && !h.attested('grad-seminar-invitation')) {
      comprehensive.status = 'needs-attestation'
      comprehensive.attest = h.attestations.find((a) => a.id === 'grad-seminar-invitation')
      comprehensive.detail = `${grad.display} counts for the comprehensive only by invitation from the instructor — confirm it.`
    }
    return [lower, upper, electives, dc, comprehensive]
  },
})
