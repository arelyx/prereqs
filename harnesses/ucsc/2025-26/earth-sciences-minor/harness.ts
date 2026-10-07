// Earth Sciences Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/earth-sciences-minor.md
//
//  - Intro geology: one lecture with its own lab (EART 5+5L, 10+10L or 20+20L);
//    unlike 2026-27 there is no note making lectures and labs interchangeable.
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
// whose labs are EART 110M/110N. EART 146L is newer than this edition (the
// 2025-26 Earth Sciences B.S. page lists EART 146 alone; the current catalog
// adds EART 146L as a corequisite), so EART 146 needs no lab here.
const NO_LAB_2025 = new Set(['EART146'])
const ODD_LABS: [string, string][] = [['EART 110B', 'EART 110M'], ['EART 110C', 'EART 110N']]
function labPairs(h: HarnessContext, inRange: CourseSet): [string, string][] {
  const out: [string, string][] = [...ODD_LABS]
  for (const code of new Set(h.enrollments.map((e) => e.code))) {
    if (code.endsWith('L') || NO_LAB_2025.has(code) || !inRange.has(code, h.catalog)) continue
    if (h.catalog.has(code + 'L')) out.push([code, code + 'L'])
  }
  return out
}

export default defineHarness({
  program: 'earth-sciences-minor',
  edition: '2025-26',
  title: 'Earth Sciences Minor',
  notes: [
    'All courses for the minor must be taken for a letter grade, except EART 195, EART 198, EART 199 and OCEA 199 (P/NP allowed).',
    'The Earth Sciences minor cannot be combined with the Earth Sciences B.S. (see that major’s page).',
  ],
  evaluate(h) {
    // "All courses used to satisfy requirements for the Earth sciences minor must be taken for a letter grade with the exception of ..."
    h.policy = { letter: true }
    // 2025-26 has no "interchangeable" note: the lecture and its own lab are
    // one package ("Either these courses ... or these courses").
    const Q = 'Choose one of the following options:'
    const lower = h.options('lower', 'Lower-Division Courses', Q, [
      ['EART 5', 'EART 5L'],
      ['EART 10', 'EART 10L'],
      ['EART 20', 'EART 20L'],
    ])
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
