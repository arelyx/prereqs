// Latin American and Latino Studies/Education, Democracy, and Justice B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/latin-american-and-latino-studieseducation-democracy-and-justice-ba.md
//
// 11 courses + 2 labs: EDUC 60, a LALS intro, LALS 100/100A/100L, EDUC 110 or
// 180, three EDUC 102-187, two LALS 101-190, and the senior seminar + lab
// (comprehensive). One allocation, so EDUC 110 and 180 taken together count
// once each (one required, one elective). The Spanish-taught elective and
// DC are overlays. CRES 121 [/EDUC 121] is in the EDUC range as the same
// course (the library resolves cross-listings).
import { codes, defineHarness, range, series } from '@harness'
import type { Node } from '@harness'

const POLICY = { min: 'C', pCounts: true }
// 2025-26 also lists LALS 129S (not on the 2026-27 list).
const SPANISH = codes('LALS 129S', 'LALS 135', 'LALS 157', 'LALS 183')
const SEMINAR = series('LALS', 194).except(codes('LALS 194L'))
// Courses that could be "pre-approved outside electives ... taught in Spanish":
// Spanish-language courses in other departments.
const SPANISH_ELSEWHERE = range('SPAN', 100, 199).or(range('SPHS', 100, 199)).or(range('LIT', 188, 189))
// LALS 127 and LALS 147 are on the 2025-26 LALS B.A. page's list of "Courses taught
// primarily in Spanish" but not on this page's list (manifest depends_on latin-american-and-latino-studies-ba).
const MAYBE_SPANISH = codes('LALS 127', 'LALS 147')
// "Three 5-credit EDUC courses from 102-187." OAKS 151A/151B [/EDUC 151A/B] are 2- and 3-credit
// courses filed under OAKS; listed so the 5-credit rule also excludes them under their EDUC codes.
const EDUC_ELECTIVES = range('EDUC', 102, 187).minCredits(5).except(['OAKS 151A', 'OAKS 151B'])

const Q_COMP = 'The Comprehensive Requirement is fulfilled by completing one senior seminar (LALS 194 A-Z, excluding L) and a Writing Lab (LALS 194L).'
const Q_DC = 'The DC requirement for the combined LALS and EDJ B.A. is met by completing:'

export default defineHarness({
  program: 'latin-american-and-latino-studieseducation-democracy-and-justice-ba',
  edition: '2025-26',
  title: 'Latin American and Latino Studies/Education, Democracy, and Justice B.A.',
  attestations: [
    {
      id: 'spanish-outside-approved',
      label: 'LALS advisor approved an outside course taught in Spanish for the Spanish-language elective',
      quote: 'Pre-approved outside electives and study abroad courses taught in Spanish may be approved to satisfy the Spanish-language elective requirement.',
      aliases: ['spanish', 'outside spanish', 'spanish approval'],
    },
  ],
  notes: [
    'Major courses need a C or better, or a P.',
    'Up to three elective substitutions are allowed, with department approval, after an education abroad program — add approved courses as completed courses; the app counts only the listed EDUC and LALS ranges.',
  ],
  evaluate(h) {
    // "Major requirements will be met with grades of C or better or Pass"
    h.policy = POLICY

    const lower = h.group('lower', 'Lower-Division Requirements', [
      h.take('educ60', 'EDUC 60 Schooling, Democracy, and Justice', 'Take this course:', codes('EDUC 60')),
      h.take('lals-intro', 'One LALS introductory course', 'Plus one course chosen from:', codes('LALS 1', 'LALS 5', 'LALS 10')),
    ])

    const upper = h.group('upper', 'Upper-Division Requirements', [
      h.all('lals-core', 'LALS 100, 100A and 100L', 'Take the following courses:', ['LALS 100', 'LALS 100A', 'LALS 100L']),
      h.take('educ-foundation', 'EDUC 110 or EDUC 180', 'Plus one course chosen from:', codes('EDUC 110', 'EDUC 180')),
    ])

    const lalsElectives = h.take('lals-electives', 'Two LALS electives (101–190)', 'Two 5-credit LALS electives numbered 101-190.', range('LALS', 101, 190).minCredits(5), {
      n: 2,
      repeatable: 'catalog',
      pool: 'LALS 101–190 (5 credits)',
    })
    const spanish = h.take('spanish', 'One elective taught in Spanish', ['At least one elective must be taught in Spanish.', 'The following LALS courses are taught primarily in Spanish.'], SPANISH, {
      exclusive: false,
    })
    const electives = h.group(
      'electives',
      'Upper-Division Elective Courses',
      [
        h.take('educ-electives', 'Three EDUC courses (102–187)', 'Three 5-credit EDUC courses from 102-187.', EDUC_ELECTIVES, {
          n: 3,
          repeatable: 'catalog',
          pool: 'EDUC 102–187 (5 credits)',
        }),
        lalsElectives,
        spanish,
      ],
      { quote: 'One elective course must be taught in Spanish.' },
    )

    const comprehensive = h.group(
      'comprehensive',
      'Comprehensive Requirement: senior seminar and writing lab',
      [
        h.take('seminar', 'Senior seminar (LALS 194A–Z, not L)', Q_COMP, SEMINAR, { pool: 'LALS 194 A–Z (excluding 194L)' }),
        h.take('seminar-lab', 'LALS 194L writing lab', Q_COMP, codes('LALS 194L')),
      ],
      { quote: Q_COMP },
    )

    const dc = h.group(
      'dc',
      'Disciplinary Communication (DC)',
      ['LALS 100A', 'LALS 100L'].map((c) => h.take(`dc/${c.replace(' ', '')}`, c, Q_DC, codes(c), { exclusive: false, minor: true })),
      { quote: Q_DC },
    )

    h.solve()
    const out: Node[] = [lower, upper, electives, comprehensive, dc]
    if (spanish.status === 'unmet' && h.taken(MAYBE_SPANISH).length) {
      spanish.status = 'cannot-check'
      spanish.detail = `${h.taken(MAYBE_SPANISH).map((e) => e.display).join(', ')} is listed as taught primarily in Spanish on the LALS B.A. page but not on this list — ask the LALS advisor whether it counts.`
    }
    if (spanish.status === 'unmet') {
      const cand = h.taken(SPANISH_ELSEWHERE)
      if (cand.length) {
        // An outside Spanish-taught course may be approved: ask the student to confirm the approval.
        const att = h.attest('spanish-outside-approved', 'Outside Spanish-taught course approved')
        if (att.status === 'met') {
          spanish.status = 'met'
          spanish.used = cand.slice(0, 1)
          spanish.detail = `${cand[0].display}, approved by the LALS advisor (you confirmed).`
          // An approved "outside elective" taught in Spanish takes the place of an elective: a short
          // LALS elective slot may be filled by it, which the page does not settle — check, never unmet.
          if (lalsElectives.status === 'unmet' && lalsElectives.progress && lalsElectives.progress.need - lalsElectives.progress.have === 1 && cand.some((e) => !h.used.has(e.id))) {
            lalsElectives.status = 'cannot-check'
            lalsElectives.detail = `One LALS elective short: ask the LALS advisor whether the approved outside course (${cand[0].display}) also counts as an elective.`
          }
        } else {
          spanish.status = 'needs-attestation'
          spanish.detail = `${cand.map((e) => e.display).join(', ')} counts only if the LALS advisor approved it.`
        }
        electives.children!.push(att)
      }
    }
    return out
  },
})
