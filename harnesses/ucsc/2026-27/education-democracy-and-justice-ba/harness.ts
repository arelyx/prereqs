// Education, Democracy, and Justice B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/education-democracy-and-justice-ba.md
//
// 10 courses: EDUC 10, EDUC 60, EDUC 110 or 180, EDUC 190, six electives from
// EDUC 102-187 (or the listed outside electives). One allocation, so a second
// of EDUC 110/180 becomes an elective. DC and comprehensive are overlays on
// the foundational courses.
//
// Outside Electives (EDUC 194, ENVS 177, PSYC 108, SOCY 148) "may count as
// electives with department approval, and count toward the program's course
// substitution policy" (up to two): at most two, EDUC 194 once, and an
// attestation for the department approval whenever one is used. The two topic
// lists (emphases) are recommendations, not requirements: they are all inside
// EDUC 102-187 except CRES 121 [/EDUC 121] and EDUC 178's KRSG 178 partner.
import { codes, defineHarness, range } from '@harness'

const OUTSIDE = codes('EDUC 194', 'ENVS 177', 'PSYC 108', 'SOCY 148')
const ELECTIVES = range('EDUC', 102, 187).minCredits(5).or(codes('CRES 121', 'KRSG 178')).or(OUTSIDE)
const FOUNDATION = codes('EDUC 110', 'EDUC 180')
// Topic-area lists (guidance only; every course is already in the elective pool).
const SOCIAL_CONTEXTS = [
  'EDUC 102', 'EDUC 128', 'EDUC 135', 'EDUC 141', 'EDUC 164', 'EDUC 166', 'EDUC 160', 'EDUC 173', 'EDUC 174',
  'EDUC 178', 'EDUC 181', 'CRES 121',
]
const LEARNING_TEACHING = [
  'EDUC 104', 'EDUC 115', 'EDUC 120', 'EDUC 125', 'EDUC 126', 'EDUC 140', 'EDUC 177', 'EDUC 187', 'EDUC 183',
  'EDUC 182', 'EDUC 166', 'EDUC 173', 'EDUC 141', 'EDUC 185B', 'EDUC 185C', 'EDUC 178', 'CRES 121',
]

export default defineHarness({
  program: 'education-democracy-and-justice-ba',
  edition: '2026-27',
  title: 'Education, Democracy, and Justice B.A.',
  attestations: [
    {
      id: 'outside-elective-approval',
      label: 'Department approval for the outside elective(s) used',
      quote: 'The Outside Electives list includes courses which may count as electives with department approval, and count toward the program\'s course substitution policy, outlined in the Information and Policies section.',
      aliases: ['outside elective', 'department approval', 'petition'],
    },
  ],
  coverage: {
    unknownOk: { KRSG178: 'cross-listed partner of EDUC 178 ([/KRSG 178] in the source); the catalog files it under EDUC' },
  },
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Up to two electives may be substituted by petition with upper-division courses from other departments, individual study, education abroad or other four-year institutions — only the listed outside electives are counted here.',
  ],
  evaluate(h) {
    // "Any requirement of the major, including major qualification, may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.all('lower', 'EDUC 10 and EDUC 60', 'Both of the following', ['EDUC 10', 'EDUC 60'])

    const foundation = h.take('foundation', 'EDUC 110 or EDUC 180', ['One of the following:', 'Students may take both EDUC 110 and EDUC 180. One course will count as the required upper-division course and the other will count toward the six upper-division electives.'], FOUNDATION)
    const capstone = h.take('educ190', 'EDUC 190 Senior Seminar Capstone', 'Plus the following course:', codes('EDUC 190'))
    const upper = h.group('upper', 'Upper-Division Courses', [foundation, capstone], {
      quote: 'The upper-division requirements consist of two foundational courses which satisfy the disciplinary communication and comprehensive requirements, and six electives.',
    })

    const six = h.take(
      'electives-six',
      'Six electives (EDUC 102–187)',
      ['Beyond the two foundational required courses above, students take six, 5-credit electives from EDUC 102–187.', 'The following courses may also be counted toward the six electives:', 'EDUC 194 can only count once toward the six electives'],
      ELECTIVES,
      {
        n: 6,
        repeatable: 'catalog',
        atMost: [
          { set: OUTSIDE, n: 2, label: 'outside electives (course substitution limit)' },
          { set: codes('EDUC 194'), n: 1, label: 'EDUC 194' },
        ],
        prefer: (c) => (OUTSIDE.has(c) ? 1 : 0),
        pool: 'EDUC 102–187 (5 credits; incl. CRES 121 [/EDUC 121]); or, with department approval, up to two of EDUC 194 (once), ENVS 177, PSYC 108, SOCY 148',
      },
    )
    const emphasis = h.info(
      'emphasis',
      'Topic areas (recommended emphases)',
      'The course lists below separate these education courses by topic area.',
      `EDUC 110 is recommended for the Social Contexts and Educational Foundations emphasis (${SOCIAL_CONTEXTS.join(', ')}), EDUC 180 for Learning and Teaching (${LEARNING_TEACHING.join(', ')}). The topic lists are guidance; any EDUC 102–187 course counts.`,
    )
    const electives = h.group('electives', 'Electives', [six, emphasis])

    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      [
        h.take('dc-foundation', 'EDUC 110 or EDUC 180', 'The DC requirement in Education, Democracy, and Justice B.A. is satisfied by completing EDUC 110 or EDUC 180, and EDUC 190.', FOUNDATION, { exclusive: false }),
        h.take('dc-190', 'EDUC 190', 'The DC requirement in Education, Democracy, and Justice B.A. is satisfied by completing EDUC 110 or EDUC 180, and EDUC 190.', codes('EDUC 190'), { exclusive: false }),
      ],
      { quote: 'The DC requirement in Education, Democracy, and Justice B.A. is satisfied by completing EDUC 110 or EDUC 180, and EDUC 190.' },
    )
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive: EDUC 190',
      'EDUC 190 (5 credits) will satisfy the senior capstone requirement with a focus on advanced topics in education, emphasizing at least one of the following: critical and analytical thinking, field research, advanced research methods (qualitative or quantitative), or advanced theory.',
      codes('EDUC 190'),
      { exclusive: false },
    )

    h.solve()
    if ((six.used ?? []).some((e) => OUTSIDE.has(e.code))) electives.children!.splice(1, 0, h.attest('outside-elective-approval'))
    return [lower, upper, electives, dc, comprehensive]
  },
})
