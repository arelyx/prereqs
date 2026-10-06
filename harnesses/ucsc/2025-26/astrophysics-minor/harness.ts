// Astrophysics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/astrophysics-minor.md
//
// Calculus (19A+19B or 20A+20B), MATH 23A, a physics series (PHYS 5A–5C with
// labs or PHYS 6A–6C with labs, plus PHYS 5D either way; 15A/15C may replace
// 5A/5C), PHYS 102 and four listed electives. P/NP allowed.
import { codes, defineHarness } from '@harness'

const ELECTIVES = [
  'ASTR 111', 'ASTR 112', 'ASTR 113', 'ASTR 117', 'ASTR 118', 'ASTR 119', 'PHYS 129', 'PHYS 133',
  'ASTR 136', 'PHYS 171', 'EART 160', 'EART 162', 'EART 163', 'EART 164', 'AM 107',
]
// AM 107 [/PHYS 107]: the library matches the partner code.

export default defineHarness({
  program: 'astrophysics-minor',
  edition: '2025-26',
  title: 'Astrophysics Minor',
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Some courses may be satisfied via exam credit (add them as completed courses).',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined
    const q5 = ['Choose one of the following options:', 'PHYS 15A can substitute for PHYS 5A, and PHYS 15C for PHYS 5C.']
    const fiveSeries = (a: string, c: string) => [a, 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', c, 'PHYS 5N', 'PHYS 5D']
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.options('calculus', 'Calculus: MATH 19A+19B or 20A+20B', 'Choose one of the following options:', [['MATH 19A', 'MATH 19B'], ['MATH 20A', 'MATH 20B']]),
      h.take('math23a', 'Advanced Calculus: MATH 23A', 'Advanced Calculus:', codes('MATH 23A')),
      h.options('physics', 'Physics: PHYS 5 or PHYS 6 series with labs, plus PHYS 5D', q5, [
        fiveSeries('PHYS 5A', 'PHYS 5C'),
        fiveSeries('PHYS 15A', 'PHYS 5C'),
        fiveSeries('PHYS 5A', 'PHYS 15C'),
        fiveSeries('PHYS 15A', 'PHYS 15C'),
        ['PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M', 'PHYS 6C', 'PHYS 6N', 'PHYS 5D'],
      ]),
    ])
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('phys102', 'Modern Physics: PHYS 102', 'Modern Physics:', codes('PHYS 102')),
      h.take('electives', 'Four astronomy electives', 'Four of the upper-division astronomy electives chosen from the following:', codes(...ELECTIVES), { n: 4 }),
    ])
    return [lower, upper]
  },
})
