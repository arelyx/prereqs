// Art B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/art-ba.md
//
// Nine lower-division courses (all three foundations, three ART 20s, ART 80T,
// two HAVC regional courses), seven upper-division studios + ART 190A (DC), and
// a comprehensive = ART 190A plus one of three options. Only ART 190B is a
// course; the exhibition / portfolio review are non-course conditions (one
// attestation). 2025-26 differs from 2026-27: all three ART 10 foundations
// (not two), and no "additional project in an upper-division studio" option. ART 190B counts as a studio AND
// the comprehensive option, so the comprehensive nodes are overlays. The
// portfolio review (transfer) and the AP Art History exam are waiver
// attestations offered only when no course fills the slot (§1a).
import { codes, defineHarness, range } from '@harness'
import type { HarnessContext, Node } from '@harness'

const FOUNDATION = ['ART 10D', 'ART 10E', 'ART 10F']
const INTRO = ['ART 20G', 'ART 20H', 'ART 20I', 'ART 20J', 'ART 20K', 'ART 20L']

// "One course from Europe and the Americas: HAVC courses numbered 30-49 or 130-149"
const EUROPE_AMERICAS = range('HAVC', 30, 49).or(range('HAVC', 130, 149))
// "One course from Africa, Asia, Mediterranean, Native Americas, or Oceania:
//  HAVC courses numbered 10-29, 50-80, 110-129, or 150-179."
const OTHER_REGIONS = range('HAVC', 10, 29).or(range('HAVC', 50, 80)).or(range('HAVC', 110, 129)).or(range('HAVC', 150, 179))

// "These include courses numbered ART 101—ART 189, ART 190B, ART 194, ART 196, ART 198, and ART 199."
const STUDIO = range('ART', 101, 189).or(codes('ART 190B', 'ART 194', 'ART 196', 'ART 198', 'ART 199'))

// "Students must receive a C/P or higher for an art course to be applied toward the major."
// Judgement: applied to every course counted toward the major (incl. HAVC).
const POLICY = { min: 'C', pCounts: true }

export default defineHarness({
  program: 'art-ba',
  edition: '2025-26',
  title: 'Art B.A.',
  attestations: [
    {
      id: 'portfolio-review',
      label: 'Passed the art portfolio review (transfer students: waives two of the foundation courses)',
      quote: 'The portfolio review waives the two required foundation courses.',
      aliases: ['portfolio review', 'portfolio'],
    },
    {
      // §1a: an AP score that satisfies a listed requirement is an attestation
      // named after the exam, offered only when no course fills the slot.
      id: 'ap-art-history',
      label: 'Scored 3 or higher on the AP Art History exam',
      quote: 'Note: A score of 3 or higher on the Advanced Placement (AP) Art History exam will satisfy the Europe and the Americas requirement.',
      aliases: ['ap art history', 'art history exam', 'ap art'],
    },
    {
      id: 'comprehensive-review',
      label: 'Comprehensive option completed: faculty review of an exhibition or portfolio',
      quote: 'Presenting an exhibition and, by appointment, meeting with a faculty member for review and critique of the exhibition; or',
      aliases: ['exhibition', 'faculty review', 'comprehensive review', 'senior comprehensive', 'comprehensive'],
    },
  ],
  notes: [
    'Art courses need a C or better, or a P, to count toward the major.',
    'Credit for ART 20L is granted for an AP Drawing score of 4 or higher — add ART 20L to the plan as exam credit.',
    'At most three courses from outside the Art Department (including UC EAP) may substitute for art courses, with a major advisor’s approval — add them only once approved.',
  ],
  evaluate(h) {
    h.policy = POLICY
    const lower = h.group('lower', 'Lower-Division Courses', [
      foundation(h),
      h.take('intro', 'Introduction to Contemporary Art Practice (three ART 20 courses)', 'Three of the following (junior transfers should complete them at a community college):', codes(...INTRO), { n: 3 }),
      h.take('art80t', 'ART 80T Digital Tools for Contemporary Art Practice', 'Students must take:', codes('ART 80T')),
      havc(h),
    ])

    const studios = h.take(
      'studios',
      'Seven upper-division studio courses',
      ['Students take seven upper-division studio courses. These include courses numbered ART 101—ART 189, ART 190B, ART 194, ART 196, ART 198, and ART 199.', 'ART 190B satisfies both an upper-division studio as well as the comprehensive requirement.'],
      STUDIO,
      {
        n: 7,
        // Repeatable-for-credit studios (most ART 1xx) may count more than once.
        repeatable: 'catalog',
        pool: 'ART 101–189, ART 190B, 194, 196, 198, 199',
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [studios], { quote: 'Students complete eight courses as follows:' })

    // ART 190A: the eighth upper-division course; DC and part of the comprehensive.
    const dc = h.take('dc', 'Disciplinary Communication: ART 190A Writing for Artists', 'The DC requirement in art is satisfied by completing:', codes('ART 190A'))

    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [
      h.take('comp-190a', 'ART 190A Writing for Artists', 'All art majors satisfy the capstone/comprehensive requirement with the following:', codes('ART 190A'), { exclusive: false }),
      h.either('comp-option', 'Plus one of the three options', 'Plus one of the following options:', [
        // Overlay: "Students utilizing ART 190B, Senior Project, for their
        // comprehensive requirement may use this as one of their seven upper-division studios."
        h.take('comp-190b', 'ART 190B Senior Project', ['Completing the following course:', 'Students utilizing ART 190B, Senior Project, for their comprehensive requirement may use this as one of their seven upper-division studios.'], codes('ART 190B'), { exclusive: false }),
        h.attest('comprehensive-review', 'Exhibition review or portfolio review'),
      ]),
    ])
    return [lower, upper, dc, comprehensive]
  },
})

/**
 * 2025-26: all three foundations ("All of the following (junior transfers must
 * complete two at a community college):"). For transfer students "The portfolio
 * review waives the two required foundation courses." Judgement: the review
 * stands for two of the three, so the third is still needed ("All three ART 10
 * series courses are required for junior transfers - two must be taken prior to
 * entering UCSC."). §1a: the waiver is offered only when the courses fall short.
 */
function foundation(h: HarnessContext): Node {
  const courses = h.take('foundation', 'The Foundation (ART 10D, 10E, 10F)', 'All of the following (junior transfers must complete two at a community college):', codes(...FOUNDATION), { n: 3 })
  if (h.entry !== 'transfer') return courses
  h.solve()
  if (courses.status === 'met') return courses
  return h.either('foundation-or-portfolio', 'The Foundation (or the portfolio review plus one foundation, for transfer students)', 'The portfolio review waives the two required foundation courses.', [
    courses,
    h.group('portfolio-path', 'Portfolio review plus one foundation course', [
      h.attest('portfolio-review'),
      h.take('foundation-one', 'One foundation course (ART 10D, 10E, or 10F)', 'All of the following (junior transfers must complete two at a community college):', codes(...FOUNDATION), { exclusive: false }),
    ]),
  ])
}

/** Two HAVC regional courses; the AP Art History exam can stand for Europe and the Americas. */
function havc(h: HarnessContext): Node {
  const europe = h.take('havc-europe', 'Europe and the Americas', 'One course from Europe and the Americas: HAVC courses numbered 30-49 or 130-149', EUROPE_AMERICAS, {
    pool: 'HAVC 30–49 or 130–149',
  })
  const other = h.take('havc-other', 'Africa, Asia, Mediterranean, Native Americas, or Oceania', 'One course from Africa, Asia, Mediterranean, Native Americas, or Oceania: HAVC courses numbered 10-29, 50-80, 110-129, or 150-179.', OTHER_REGIONS, {
    pool: 'HAVC 10–29, 50–80, 110–129, or 150–179',
  })
  h.solve()
  const europeNode =
    europe.status === 'met'
      ? europe
      : h.either('havc-europe-or-ap', 'Europe and the Americas (or AP Art History 3+)', 'Note: A score of 3 or higher on the Advanced Placement (AP) Art History exam will satisfy the Europe and the Americas requirement.', [europe, h.attest('ap-art-history')])
  return h.group('havc', 'Critical Theory and Historical Context (two HAVC courses)', [europeNode, other], {
    quote: 'Students complete two courses from the History of Art and Visual Culture (HAVC) geographic regions:',
  })
}
