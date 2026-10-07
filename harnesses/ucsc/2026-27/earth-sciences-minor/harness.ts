// Earth Sciences Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/earth-sciences-minor.md
//
//  - Intro geology: "EART 5, EART 10, EART 20, and the corresponding labs are
//    interchangeable" → any one lecture plus any one of the three labs.
//  - Five upper-division EART 100–199 (not 196B/198) or OCEA 100–199 courses,
//    5+ credits, at most one quarter of EART 199/OCEA 199, a lecture counts
//    only with its lab when the catalog has one; ENVS 115A + 115L = one.
//  - Letter grades except EART 195, 198, 199 and OCEA 199 (slot check).
import { canon, codes, defineHarness, isPass, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext } from '@harness'

const PNP_OK = new Set(['EART 195', 'EART 198', 'EART 199', 'OCEA 199'].map(canon))
const letterExcept = (chosen: Enrollment[]): string | null => {
  for (const e of chosen) if (isPass(e.grade) && !PNP_OK.has(e.code)) return `${e.display}: taken P/NP, but a letter grade is required`
  return null
}
const POOL = range('EART', 100, 199).except(['EART 196B', 'EART 198']).or(range('OCEA', 100, 199)).minCredits(5)
const ENVS115 = codes('ENVS 115A', 'ENVS 115L')
const envs115Unit = (avail: Enrollment[]): Enrollment[][] => {
  const a = avail.find((e) => e.code === 'ENVS115A')
  const l = avail.find((e) => e.code === 'ENVS115L')
  return a && l ? [[a, l]] : []
}

// "If a lecture has a lab offered (required or optional), the lab must be
// passed": the catalog lab is the lecture code + "L", except EART 110B/110C,
// whose labs are EART 110M/110N.
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function labPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

export default defineHarness({
  program: 'earth-sciences-minor',
  edition: '2026-27',
  title: 'Earth Sciences Minor',
  notes: [
    'All courses for the minor must be taken for a letter grade, except EART 195, EART 198, EART 199 and OCEA 199 (P/NP allowed).',
    'The Earth Sciences minor cannot be combined with the Earth Sciences B.S. (see that major’s page).',
  ],
  evaluate(h) {
    // "All courses used to satisfy requirements for the Earth sciences minor must be taken for a letter grade with the exception of ..."
    h.policy = { letter: true }
    const Q = ['Choose one of the following options:', 'NOTE: EART 5, EART 10, EART 20, and the corresponding labs are interchangeable.']
    const lower = h.group(
      'lower',
      'Lower-Division Courses',
      [
        h.take('intro-lecture', 'EART 5, EART 10 or EART 20', Q, codes('EART 5', 'EART 10', 'EART 20')),
        h.take('intro-lab', 'EART 5L, EART 10L or EART 20L', Q, codes('EART 5L', 'EART 10L', 'EART 20L')),
      ],
      { quote: Q },
    )
    const upper = h.take(
      'upper',
      'Five upper-division Earth or ocean sciences courses',
      [
        'Students take five upper-division Earth sciences or ocean sciences courses of 5 credits or more, chosen from EART 100-199 (excluding EART 196B and EART 198) or OCEA 100-199. No more than one quarter of EART 199 or OCEA 199 may be used as an elective. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.',
        'ENVS 115A and ENVS 115L are open to Earth science students with permission of the instructor, and taken together are approved as one elective.',
      ],
      POOL,
      {
        n: 5,
        policy: {},
        check: letterExcept,
        labs: { pairs: labPairs(h, POOL), mode: 'required' },
        atMost: [{ set: codes('EART 199', 'OCEA 199'), n: 1, label: 'at most one quarter of EART 199 or OCEA 199' }],
        composite: { eligible: ENVS115, build: envs115Unit },
        pool: 'EART 100–199 (not 196B or 198) or OCEA 100–199, 5+ credits; a lecture counts only with its lab; ENVS 115A + 115L together count as one',
      },
    )
    return [lower, upper]
  },
})
