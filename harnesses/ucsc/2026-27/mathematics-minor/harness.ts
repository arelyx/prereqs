// Mathematics Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/mathematics-minor.md
import { anyOf, codes, defineHarness, range } from '@harness'

// "Recommended courses for the minor" — all inside MATH 101–190; listed for suggestions.
const RECOMMENDED = [
  'MATH 101', 'MATH 103A', 'MATH 105A', 'MATH 105B', 'MATH 106', 'MATH 107', 'MATH 110', 'MATH 111A',
  'MATH 111B', 'MATH 111T', 'MATH 114', 'MATH 115', 'MATH 116', 'MATH 117', 'MATH 118', 'MATH 120',
  'MATH 121A', 'MATH 124', 'MATH 125', 'MATH 128A', 'MATH 129', 'MATH 130', 'MATH 134', 'MATH 139',
  'MATH 140', 'MATH 145', 'MATH 148', 'MATH 152', 'MATH 160', 'MATH 161', 'MATH 162', 'MATH 181',
]

const Q_ELECTIVES =
  'The remaining four courses are chosen from the list of MATH, AM, or STAT courses numbered 101-190. Courses must be 5 credits or more, and only one of the four courses can be from AM or STAT. Lecture and lab combinations count as a single course. For courses with a required concurrently enrolled lab, only successful completion of the lecture is required for the major.'

export default defineHarness({
  program: 'mathematics-minor',
  edition: '2026-27',
  title: 'Mathematics Minor',
  notes: ['Courses for the minor may be taken for a letter grade or Pass/No Pass.'],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('linalg', 'Linear algebra (MATH 21 or AM 10)', 'Plus one of the following courses:', codes('MATH 21', 'AM 10'), { notes: ['MATH 21 is preferred.'] }),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
    ])

    const amStat = anyOf(range('AM', 101, 190), range('STAT', 101, 190))
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('math100', 'MATH 100', 'Take the following course:', codes('MATH 100')),
      h.take('electives', 'Four upper-division electives', ['Plus four upper-division electives:', Q_ELECTIVES], anyOf(range('MATH', 101, 190), amStat).minCredits(5), {
        n: 4,
        atMost: [
          { set: amStat, n: 1, label: 'at most one AM or STAT course' },
          // Catalog: "Students cannot receive credit for this course and MATH 111T."
          { set: codes('MATH 111A', 'MATH 111T'), n: 1, label: 'MATH 111A / MATH 111T (credit for only one)' },
        ],
        labs: 'catalog-merge',
        pool: 'MATH, AM or STAT 101–190 (5+ credits; at most one AM/STAT)',
        notes: [`Recommended: ${RECOMMENDED.join(', ')}.`],
      }),
    ])

    return [lower, upper]
  },
})
