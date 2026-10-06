// Linguistics B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/linguistics-ba.md
//
// LING 50/53; a foreign-language OR mathematics/computer-science competency;
// seven named upper-division LING courses; three electives; DC and
// comprehensive as overlays. Outside elective substitutions come from an
// external pre-approved list: the student declares which of their courses are
// on it (choice); undeclared upper-division courses join the elective pool as
// wildcards, and a fill that needs one is cannot-check. At most three outside
// courses (LING 195/199 and every non-LING course) count.
import { anyOf, canon, codes, defineHarness, display, range, series, subject } from '@harness'
import type { ChoiceDef, Enrollment, HarnessContext, Node } from '@harness'

const SYNTAX = codes('LING 111', 'LING 112')
const LING195 = codes('LING 195')
const LING199 = codes('LING 199')
const GRAD = range('LING', 200, 289).minCredits(5)
// "three five-credit courses chosen from LING 102-189 (excluding LING 111,
// LING 112, and LING 171) and/or LING 200-289"; LING 195 (two quarters) or
// LING 199 (one) by the course substitution policy.
const ELECTIVES = range('LING', 102, 189).minCredits(5).except(['LING 111', 'LING 112', 'LING 171']).or(GRAD).or(LING195).or(LING199)
// The capstone's associated course: "one of the upper-division electives"
// (LING 102-189 except 111/112/171, or 200-289) in the same quarter. LING 171
// is a required course, excluded from the electives.
const CAPSTONE_PARTNER = range('LING', 102, 189).minCredits(5).except(['LING 111', 'LING 112', 'LING 171']).or(GRAD)

const OUTSIDE_QUOTE = 'Students may substitute up to three outside courses for the upper-division electives requirement.'
/** Free-form course list: "PHIL 123, PSYC 140C" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(s))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}
const outsideChoice: ChoiceDef = { key: 'outside_courses', label: 'Your courses on the pre-approved outside electives list', quote: OUTSIDE_QUOTE, options: [], free: true, parse: parseList }

// --- Foreign language ------------------------------------------------------
// Option 1: level 5 of one language, "or its equivalent" — the level-6 course
// (and SPAN 5M, which the Spanish programs accept for SPAN 5) shows the same.
const LEVEL5 = ['CHIN 5', 'FREN 5', 'ITAL 5', 'JAPN 5', 'SPAN 5', 'SPHS 5']
const LEVEL5_EQUIV = ['CHIN 6', 'FREN 6', 'ITAL 6', 'JAPN 6', 'SPAN 6', 'SPHS 6', 'SPAN 5M']
// Option 2: level 3 of Arabic/Hebrew/Punjabi/Yiddish + level 3 of a second
// language. A higher lower-division level of the same language shows level 3;
// ITAL 1B completes the ITAL 1-3 sequence (catalog).
const LEVEL3: Record<string, string[]> = {
  arabic: ['ARBC 3', 'ARBC 4'],
  hebrew: ['HEBR 3', 'HEBR 4'],
  punjabi: ['PUNJ 3'],
  yiddish: ['YIDD 3'],
  chinese: ['CHIN 3', 'CHIN 4', 'CHIN 5', 'CHIN 6'],
  french: ['FREN 3', 'FREN 4', 'FREN 5', 'FREN 6'],
  italian: ['ITAL 3', 'ITAL 1B', 'ITAL 4', 'ITAL 5', 'ITAL 6'],
  japanese: ['JAPN 3', 'JAPN 4', 'JAPN 5', 'JAPN 6'],
  spanish: ['SPAN 3', 'SPAN 4', 'SPAN 5', 'SPAN 5M', 'SPAN 6', 'SPHS 4', 'SPHS 5', 'SPHS 6'],
}
const NOT_TO_5 = ['arabic', 'hebrew', 'punjabi', 'yiddish']
const LANG_SUBJECTS = ['ARBC', 'CHIN', 'FREN', 'GREE', 'HEBR', 'ITAL', 'JAPN', 'LATN', 'PUNJ', 'SPAN', 'SPHS', 'YIDD']

// --- Mathematics / computer science -----------------------------------------
const MATHCS = [
  'CSE 5J', 'CSE 10', 'CSE 12', 'CSE 13S', 'CSE 16', 'CSE 20', 'CSE 30', 'CSE 140', 'ECON 22P', 'MATH 100',
  'MATH 160', 'MATH 161', 'PHIL 9', 'PHIL 108', 'PHIL 123', 'PSYC 100', 'STAT 5', 'STAT 7', 'STAT 131',
]
// "PSYC 2 or SOCY 3B may substitute for STAT 5 in this requirement."
const STAT5_GROUP = codes('STAT 5', 'PSYC 2', 'SOCY 3B')
// "Any course which has one of the courses listed above as a prerequisite may
// also be used": every catalog course (2026-27 data-committed/ucsc/courses)
// whose parsed prerequisites name one of MATHCS. Regenerate when the catalog
// changes.
const HAS_LISTED_PREREQ = new Set(
  (
  'AM115 AM129 AM148 AM160 AM170A ASTR136A ASTR136B ASTR136C ASTR136D ASTR136E ASTR136G ASTR136H BIOL113 BIOL118 ' +
  'BIOL129L BME118 BME163 BME205 CMPM120 CMPM35 CRWN102 CRWN155 CSE100 CSE100L CSE101 CSE101P CSE107 CSE110A ' +
  'CSE111 CSE113 CSE120 CSE121 CSE130 CSE142 CSE143 CSE145 CSE146 CSE150 CSE165 CSE167 CSE182 CSE185E CSE249 ' +
  'CSE290F CSE40 ECE118 ECE121 ECE13 ECE151 ECE163 ECE180J ECE8 ECON165 ECON166A ECON188 ENVS100 LING164 MATH101 ' +
  'MATH103A MATH105A MATH106 MATH107 MATH110 MATH111A MATH111T MATH115 MATH116 MATH117 MATH121A MATH124 MATH128A ' +
  'MATH129 MATH134 MATH139 MATH140 MATH145 MATH148 MATH152 MATH162 PHIL100A PHIL100B PHIL100C PHIL100D PHIL190 ' +
  'PHYS105 PHYS130 PHYS133 PHYS137 PHYS152 PSYC10 PSYC102 PSYC103 PSYC104 PSYC105 PSYC106 PSYC107 PSYC108 PSYC109 ' +
  'PSYC111 PSYC112 PSYC114 PSYC115 PSYC116 PSYC118C PSYC119A PSYC119D PSYC119E PSYC119H PSYC119I PSYC119K ' +
  'PSYC119M PSYC119N PSYC119P PSYC119Q PSYC119R PSYC119T PSYC119V PSYC120 PSYC120D PSYC121 PSYC122 PSYC123 ' +
  'PSYC124 PSYC125 PSYC126 PSYC129 PSYC130 PSYC130D PSYC133 PSYC138 PSYC138M PSYC139B PSYC139C PSYC139E PSYC139G ' +
  'PSYC139H PSYC139J PSYC139K PSYC139L PSYC139M PSYC139N PSYC139P PSYC139Q PSYC139R PSYC139S PSYC139T PSYC139Z ' +
  'PSYC140B PSYC140C PSYC140F PSYC140G PSYC140H PSYC140L PSYC140M PSYC140Q PSYC140T PSYC141 PSYC142 PSYC143 ' +
  'PSYC144 PSYC145 PSYC145D PSYC146 PSYC147A PSYC148 PSYC149 PSYC150 PSYC153 PSYC159A PSYC159C PSYC159D PSYC159E ' +
  'PSYC159G PSYC159H PSYC159I PSYC159L PSYC159P PSYC159R PSYC159S PSYC159X PSYC160 PSYC165 PSYC166 PSYC167 ' +
  'PSYC168 PSYC169 PSYC170 PSYC171 PSYC172 PSYC175 PSYC178 PSYC179A PSYC179E PSYC181 PSYC182 PSYC183 PSYC193I ' +
  'PSYC193S STAT132 STAT205 STAT206 STAT243 TIM147 TIM173'
  ).split(' '),
)
const DERIVED = anyOf(...[...new Set([...HAS_LISTED_PREREQ].map((c) => c.match(/^[A-Z]+/)![0]))].map((sub) => subject(sub))).where(
  (c) => HAS_LISTED_PREREQ.has(c.code),
  'a course that has one of the listed courses as a prerequisite',
)
const MATHCS_SET = codes(...MATHCS, 'PSYC 2', 'SOCY 3B').or(DERIVED)

const MATH_NOTE =
  'NOTE: CSE 20 has a test-out option which will be accepted for one of the two required courses.STAT 7 has a required lab, STAT 7L. The linguistics major requires successful completion of the lecture, STAT 7. Successful completion of the lab, STAT 7L will count as credits toward total degree requirements.Any course which has one of the courses listed above as a prerequisite may also be used toward the mathematics/computer science competency requirement.PSYC 2 or SOCY 3B may substitute for STAT 5 in this requirement.'

export default defineHarness({
  program: 'linguistics-ba',
  edition: '2026-27',
  title: 'Linguistics B.A.',
  choices: [
    {
      key: 'competency',
      label: 'Competency option',
      quote: 'Linguistics majors are required to demonstrate competency in either foreign language or mathematics/computer science. Choose one of the following options:',
      options: [
        { value: 'foreign-language', label: 'Foreign Language', aliases: ['language', 'fl'] },
        { value: 'math-cs', label: 'Mathematics/Computer Science', aliases: ['math', 'mathematics', 'computer science', 'cs'] },
      ],
    },
    // External list → the student declares which courses are on it (§1a).
    outsideChoice,
  ],
  attestations: [
    {
      id: 'cse20-test-out',
      label: 'Passed the CSE 20 test-out',
      quote: 'NOTE: CSE 20 has a test-out option which will be accepted for one of the two required courses.',
      aliases: ['cse 20 test-out', 'cse 20 testout', 'test-out', 'testout'],
    },
    {
      id: 'language-equivalent',
      label: 'Language proficiency by placement / equivalent',
      quote: 'Demonstrate level 5 proficiency of a single language by completing one of the following courses or its equivalent',
      aliases: ['placement', 'equivalent', 'proficiency'],
    },
    {
      id: 'thesis-approval',
      label: 'Senior thesis proposal approved by the department faculty',
      quote: 'The proposal for a senior thesis must be submitted for approval by the department faculty at least three quarters prior to the quarter of graduation.',
      aliases: ['thesis proposal', 'thesis approval', 'senior thesis'],
    },
    {
      id: 'grad-exception',
      label: 'Graduate course accepted as the senior comprehensive (by exception)',
      quote: 'By exception, students in their senior year may enroll in a graduate-level class, by permission of instructor.',
      aliases: ['graduate course', 'graduate-level', 'by exception', 'instructor permission'],
    },
  ],
  notes: [
    'Courses may be taken P/NP except the two major-qualification courses (C+ or better, letter grade).',
    'Up to three outside courses (LING 195/199, other departments, other institutions) may substitute for electives — see the department’s pre-approved outside courses list.',
    'You may not double major or major/minor in linguistics and language studies.',
  ],
  coverage: {
    ignore: {
      STAT7L: 'named only to say the lab is NOT required for this requirement',
    },
  },
  evaluate(h) {
    // "All other courses used toward major requirements may be taken for a
    // letter grade or pass/no pass." (the C+ rule is for qualification only)
    h.policy = undefined

    // --- lower division ----------------------------------------------------
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('lower-ling', 'LING 50 and LING 53', 'Take the following courses', ['LING 50', 'LING 53']),
      competency(h),
      h.info(
        'qualification',
        'Major qualification (gateway courses)',
        'In order to qualify for the linguistics major, a student must pass two gateway courses, with a grade of C+ or better in each:',
        'Any two of LING 50, 53, 101, 112 and 171, each C+ or better for a letter grade. This gates declaration, not completion.',
      ),
    ])

    // --- upper division ----------------------------------------------------
    const named = h.group('named', 'Seven named linguistics courses', [
      h.all('core', 'LING 100, LING 101, LING 171', 'Take the following courses:', ['LING 100', 'LING 101', 'LING 171']),
      h.take('syntax', 'LING 111 or LING 112', 'Plus one of the following courses:', SYNTAX),
      h.take('three', 'Three advanced courses', 'And three of the following courses:', codes('LING 102', 'LING 113', 'LING 116', 'LING 151', 'LING 172'), { n: 3 }),
    ])
    const outside = wildcards(h)
    const declared = new Set((h.choice('outside_courses') ?? '').split(',').filter(Boolean))
    const listed = outside.filter((c) => declared.has(c))
    const wild = new Set(outside.filter((c) => !declared.has(c)))
    // "These courses include Senior Thesis (LING 195), Independent Study (LING
    // 199), courses from other UC Santa Cruz departments, and courses from
    // other institutions." — every non-LING course is an outside course.
    const OUTSIDE = outside.length ? LING195.or(LING199).or(codes(...outside)) : LING195.or(LING199)
    const electives = h.take(
      'electives',
      'Three upper-division electives',
      [
        'The major requires three five-credit courses chosen from LING 102-189 (excluding LING 111, LING 112, and LING 171) and/or LING 200-289 (one of which could satisfy the Senior Comprehensive).',
        'Students may substitute up to three outside courses for the upper-division electives requirement.',
        'Students may apply up to two quarters of LING 195 or one quarter of LING 199, but not both.',
      ],
      outside.length ? ELECTIVES.or(codes(...outside)) : ELECTIVES,
      {
        n: 3,
        repeatable: 'catalog',
        prefer: (c) => (wild.has(c) ? 3 : LING195.has(c) || LING199.has(c) ? 2 : listed.includes(c) ? 1 : 0),
        atMost: [
          { set: OUTSIDE, n: 3, label: 'outside courses (LING 195/199, other departments, other institutions)' },
          { set: LING195, n: 2, label: 'LING 195' },
          { set: LING199, n: 1, label: 'LING 199' },
        ],
        check: (chosen) => (chosen.some((e) => LING195.has(e.code)) && chosen.some((e) => LING199.has(e.code)) ? 'LING 195 and LING 199 cannot both count' : null),
        pool: 'LING 102–189 (not 111/112/171) or LING 200–289, 5 credits; up to two LING 195 or one LING 199; approved outside courses',
        notes: ['Graduate courses need instructor permission.'],
      },
    )
    h.solve()
    flagWild(electives, wild)

    const upper = h.group('upper', 'Upper-Division Courses', [named, electives], {
      quote: 'Students in the linguistics major are required to complete a minimum of 10 upper-division courses (50 upper-division credits) in linguistics and related disciplines, including seven named courses in linguistics:',
    })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc/ling101', 'LING 101', 'The DC requirement in linguistics is satisfied by completing:', codes('LING 101'), { exclusive: false }),
      h.take('dc/syntax', 'LING 111 or LING 112', 'Plus one of the following courses:', SYNTAX, { exclusive: false }),
    ])
    return [lower, upper, dc, comprehensiveNode(h)]
  },
})

/**
 * Foreign language (options 1-3) or mathematics/computer science. All
 * overlays: these courses compete with nothing else in the major. The
 * "or its equivalent" path (placement) is a confirmation, offered only when
 * the record suggests placement (see below) — never as a silent pass for a
 * mathematics-only record or a sequence stopped short.
 */
function competency(h: HarnessContext): Node {
  const opt1 = h.take('fl/level5', 'Option 1: Level 5 of one language', 'Demonstrate level 5 proficiency of a single language by completing one of the following courses or its equivalent: CHIN 5, FREN 5, ITAL 5, JAPN 5, SPAN 5, SPHS 5.', codes(...LEVEL5, ...LEVEL5_EQUIV), {
    exclusive: false,
  })
  const opt2 = levelThreePair(h)
  const opt3 = h.either('fl/classical', 'Option 3: Greek or Latin', 'Demonstrate proficiency in Greek or Latin by completing either GREE 1, GREE 2, and one course from the LIT 184 series OR LATN 1, LATN 2, and one course from the LIT 186 series', [
    h.group('fl/greek', 'GREE 1, GREE 2 and a LIT 184-series course', [
      h.all('fl/greek/lang', 'GREE 1 and GREE 2', 'GREE 1, GREE 2, and one course from the LIT 184 series', ['GREE 1', 'GREE 2'], { exclusive: false }),
      h.take('fl/greek/lit', 'A LIT 184-series course', 'GREE 1, GREE 2, and one course from the LIT 184 series', series('LIT', 184), { exclusive: false }),
    ]),
    h.group('fl/latin', 'LATN 1, LATN 2 and a LIT 186-series course', [
      h.all('fl/latin/lang', 'LATN 1 and LATN 2', 'LATN 1, LATN 2, and one course from the LIT 186 series', ['LATN 1', 'LATN 2'], { exclusive: false }),
      h.take('fl/latin/lit', 'A LIT 186-series course', 'LATN 1, LATN 2, and one course from the LIT 186 series', series('LIT', 186), { exclusive: false }),
    ]),
  ])
  const fl: Node[] = [opt1, opt2, opt3]
  // Placement path: offered when the student chose the language option or has
  // upper-division language courses, and has NOT started a lower-division
  // sequence (a student who stopped short of level 5 has not shown it).
  const langCourses = h.passed.filter((e) => LANG_SUBJECTS.some((s) => e.code.startsWith(s)))
  const startedLD = langCourses.some((e) => (h.catalog.get(e.code)?.division ?? 'lower') === 'lower')
  const hasUD = langCourses.some((e) => h.catalog.get(e.code)?.division === 'upper')
  if (!startedLD && (h.choice('competency') === 'foreign-language' || hasUD)) fl.push(h.attest('language-equivalent'))
  const flNode = h.either('fl', 'Foreign Language', 'Students opting to complete this requirement using foreign language may do so in one of the following three ways:', fl)

  const mathOpts = (n: number, notes?: string[]) => ({
    n,
    exclusive: false,
    atMost: [{ set: STAT5_GROUP, n: 1, label: 'STAT 5 and its substitutes PSYC 2 / SOCY 3B' }],
    pool: 'the listed courses (PSYC 2 or SOCY 3B for STAT 5), or any course with a listed course as a prerequisite',
    notes,
  })
  const mathQuote = ['This requirement is satisfied by passing two courses chosen from the following list:', MATH_NOTE]
  // "CSE 20 has a test-out option which will be accepted for one of the two
  // required courses": attestation offered only when CSE 20 is not in the plan.
  const hasCse20 = h.enrollments.some((e) => e.code === 'CSE20')
  const testedOut = !hasCse20 && h.attested('cse20-test-out')
  const math = h.take('math-cs', testedOut ? 'Mathematics/Computer Science: CSE 20 by test-out + one course' : 'Mathematics/Computer Science: two courses', mathQuote, MATHCS_SET, mathOpts(testedOut ? 1 : 2, testedOut ? ['CSE 20 by test-out counts as one of the two courses.'] : undefined))
  const mathNode =
    hasCse20 || testedOut
      ? math
      : h.either('math', 'Mathematics/Computer Science', 'NOTE: CSE 20 has a test-out option which will be accepted for one of the two required courses.', [
          math,
          h.group('math/test-out', 'CSE 20 test-out + one course', [h.take('math-cs/one', 'One more course', mathQuote, MATHCS_SET, mathOpts(1)), h.attest('cse20-test-out')]),
        ])
  return h.either('competency', 'Foreign Language/Mathematics/Computer Science Requirement', 'Linguistics majors are required to demonstrate competency in either foreign language or mathematics/computer science.', [flNode, mathNode])
}

/** Option 2: level 3 of Arabic/Hebrew/Punjabi/Yiddish plus level 3 of a different language. */
function levelThreePair(h: HarnessContext): Node {
  const has = (lang: string) => h.taken(codes(...LEVEL3[lang]))
  const first = NOT_TO_5.filter((l) => has(l).length)
  let used: Enrollment[] = []
  let ok = false
  for (const a of first) {
    const b = Object.keys(LEVEL3).find((l) => l !== a && has(l).length)
    if (b) {
      ok = true
      used = [has(a)[0], has(b)[0]]
      break
    }
  }
  if (!ok && first.length) used = [has(first[0])[0]]
  return h.node(
    'fl/level3-pair',
    'Option 2: Level 3 of Arabic, Hebrew, Punjabi or Yiddish + Level 3 of a second language',
    'For languages at UCSC which are not offered through level 5 (Arabic, Hebrew, Punjabi, or Yiddish), demonstrate level 3 proficiency by completing one of the following courses (or equivalent): ARBC 3, HEBR 3, PUNJ 3, YIDD 3. In addition, students must complete level 3 of a second language. Level 3 of any language mentioned in options 1 or 2 are allowable for the second language.',
    ok ? 'met' : 'unmet',
    {
      used,
      progress: { have: ok ? 2 : used.length, need: 2 },
      options: ['ARBC3', 'HEBR3', 'PUNJ3', 'YIDD3'],
      detail: ok ? undefined : first.length ? 'Needs level 3 of a second language.' : undefined,
    },
  )
}

const termNo = (e: Enrollment) => (e.term == null ? -1 : Number(e.term))

/**
 * "In their senior year, and after completing the Disciplinary Communication
 * requirement, linguistics majors must satisfy the senior comprehensive
 * requirement in one of three ways". The order is checked only when the DC is
 * complete (otherwise the DC node reports the gap).
 */
function comprehensiveNode(h: HarnessContext): Node {
  const d101 = h.taken(codes('LING 101')).map(termNo)
  const dSyn = h.taken(SYNTAX).map(termNo)
  const dcTerm = d101.length && dSyn.length ? Math.max(Math.min(...d101), Math.min(...dSyn)) : null
  const after = (e: Enrollment) => dcTerm == null || dcTerm === -1 || e.term == null || Number(e.term) > dcTerm
  const orderNote = 'must come after the DC courses (LING 101 and LING 111/112)'

  const l190 = h.taken(codes('LING 190'))
  const partner = (e: Enrollment) => h.passed.find((x) => x.term === e.term && CAPSTONE_PARTNER.has(x.code, h.catalog))
  const pairs = l190.filter((e) => e.term != null && partner(e))
  const noTerm = l190.some((e) => e.term == null) && h.passed.some((x) => x.term == null && CAPSTONE_PARTNER.has(x.code, h.catalog))
  const pairOk = pairs.filter(after)
  const capstone = h.node(
    'comp/capstone',
    'Option 1: LING 190 with its concurrent upper-division elective',
    ['Students must enroll concurrently in an upper-division elective and in the corresponding instance of the following course:', 'LING 190 — Senior Research (2)'],
    pairOk.length ? 'met' : noTerm ? 'cannot-check' : 'unmet',
    {
      used: pairOk.length ? [pairOk[0], partner(pairOk[0])!] : [],
      options: ['LING190'],
      detail: pairOk.length
        ? 'The concurrent elective must be the course this LING 190 instance is attached to.'
        : noTerm
          ? 'LING 190 and an upper-division elective have no term — check that they were taken concurrently.'
          : pairs.length
          ? `LING 190 ${orderNote}.`
          : l190.length
            ? 'LING 190 needs an upper-division linguistics elective in the same quarter.'
            : undefined,
    },
  )

  const thesis = h.taken(LING195)
  const thesisOk = thesis.filter(after)
  const thesisNode = h.group('comp/thesis', 'Option 2: Senior thesis (LING 195)', [
    h.node('comp/thesis/course', 'LING 195 Senior Thesis', 'LING 195 — Senior Thesis (5)', thesisOk.length ? 'met' : 'unmet', {
      used: thesisOk.slice(0, 1),
      options: ['LING195'],
      detail: thesis.length && !thesisOk.length ? `LING 195 ${orderNote}.` : undefined,
    }),
    h.attest('thesis-approval'),
  ])

  const grad = h.taken(GRAD)
  const gradOk = grad.filter(after)
  const gradNode = h.group('comp/graduate', 'Option 3: Graduate-level course', [
    h.node('comp/graduate/course', 'A LING 200–289 course', 'Under these conditions, a graduate-level course may satisfy the senior exit requirement.', gradOk.length ? 'met' : 'unmet', {
      used: gradOk.slice(0, 1),
      pool: 'LING 200–289',
      detail: grad.length && !gradOk.length ? `The graduate course ${orderNote}.` : undefined,
    }),
    h.attest('grad-exception'),
  ])

  return h.either('comprehensive', 'Comprehensive Requirement', 'In their senior year, and after completing the Disciplinary Communication requirement, linguistics majors must satisfy the senior comprehensive requirement in one of three ways:', [capstone, thesisNode, gradNode])
}

/**
 * Upper-division (5+ credit) non-LING courses in the plan: possible outside
 * substitutions from the external pre-approved list.
 */
function wildcards(h: HarnessContext): string[] {
  const out = new Set<string>()
  for (const e of h.passed) {
    if (e.code.startsWith('LING')) continue
    const c = h.catalog.get(e.code)
    if (c && !(c.division === 'upper' || c.division === 'graduate')) continue
    if (c && c.credits < 5) continue
    out.add(e.code)
  }
  return [...out]
}

function flagWild(node: Node, wild: Set<string>) {
  if (node.status !== 'met') return
  const w = (node.used ?? []).filter((e) => wild.has(e.code))
  if (!w.length) return
  node.status = 'cannot-check'
  node.choice = 'outside_courses'
  node.detail = `Counts only if ${w.map((e) => display(e.code)).join(', ')} ${w.length > 1 ? 'are' : 'is'} on the pre-approved outside courses list (declare ${w.length > 1 ? 'them' : 'it'} as yours) or approved by the department — check it.`
}
