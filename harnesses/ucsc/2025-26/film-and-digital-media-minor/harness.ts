// Film and Digital Media Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/film-and-digital-media-minor.md
//
// FILM 20A + 20B or 20C; one course from each of three core groups; three
// 5-credit critical-studies electives (FILM 100-149, 152-169, 180-189, 194
// series; never production studios). Electives may not reuse core courses
// (exclusive slots), so a second core-group course can be an elective.
import { codes, defineHarness, range, series } from '@harness'

const G1 = ['FILM 130', 'FILM 132A', 'FILM 132B']
const G2 = ['FILM 134A', 'FILM 134B']
const G3 = ['FILM 136A', 'FILM 136B', 'FILM 136C', 'FILM 136D']

// "Production studio courses (FILM 150, FILM 151, and FILM 170A through FILM 179B) may not be used to satisfy this requirement."
const ELECTIVES = range('FILM', 100, 149)
  .or(range('FILM', 152, 169))
  .or(range('FILM', 180, 189))
  .or(series('FILM', 194))
  .minCredits(5)

export default defineHarness({
  program: 'film-and-digital-media-minor',
  edition: '2025-26',
  title: 'Film and Digital Media Minor',
  notes: [
    'Courses may be completed for a letter grade or pass/no pass.',
    'One elective may be substituted from another department or institution with Film and Digital Media approval — add it only once approved.',
  ],
  evaluate(h) {
    // "Courses may be completed for a letter grade or pass/no pass."
    h.policy = undefined
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('film20a', 'FILM 20A Introduction to Film Studies', 'Complete the following course:', codes('FILM 20A')),
      h.take('film20bc', 'FILM 20B or FILM 20C', 'Plus one of the following courses:', codes('FILM 20B', 'FILM 20C')),
    ])
    const core = h.group(
      'core',
      'One course from each of three groups',
      [
        h.take('core-g1', 'Group 1', 'Choose one of the following courses:', codes(...G1)),
        h.take('core-g2', 'Group 2', 'Plus one of the following courses:', codes(...G2)),
        h.take('core-g3', 'Group 3', 'Plus one of the following courses:', codes(...G3)),
      ],
      { quote: 'One course from each of the following three groups:' },
    )
    const electives = h.take(
      'electives',
      'Three critical studies electives',
      [
        'Students take three additional 5-credit, upper-division film and digital media critical studies courses numbered FILM 100-149, FILM 152-169, FILM 180-189, or from the FILM 194 series. Production studio courses (FILM 150, FILM 151, and FILM 170A through FILM 179B) may not be used to satisfy this requirement.',
        'Courses used to satisfy other requirements of the minor may not count toward the electives.',
      ],
      ELECTIVES,
      {
        n: 3,
        pool: 'FILM 100–149, 152–169, 180–189 or 194 series (5 credits); not FILM 150, 151, 170A–179B',
        notes: ['One elective may be substituted from another department or institution with department approval.'],
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [core, electives], {
      quote: 'Students in the minor must complete the following upper-division core curriculum.',
    })
    return [lower, upper]
  },
})
