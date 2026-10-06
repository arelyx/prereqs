// Sustainability Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/sustainability-studies-minor.md
//
// Unusual bits handled in code below:
//  - CRSN 55 twice; CRSN 152 three times (repeatable courses).
//  - Capstone: Option 1 (CRSN 152 ×3) or Option 2 (one upper-division Breadth
//    Elective + one more upper-division Breadth Elective or CRSN elective).
//    Option 2 shares one allocation with the upper-division elective ("does
//    not count toward the Breadth Capstone requirement"); when Option 1 is
//    already complete, Option 2 is not allocated at all so it cannot take
//    courses away from the elective.
//  - A repeated CRSN 151C may be the CRSN course of the Breadth Capstone only
//    "if the repeated course is on a different topic" (attestation).
//  - The breadth list "is updated regularly" and links to a newer list: an
//    unmet elective/capstone with an unclassified upper-division course in the
//    plan is cannot-check, not unmet. HAVC 48 and SOCY 30A are on the list but
//    lower-division: they cannot fill the "upper-division" capstone, and for the
//    elective they are treated the same way (ask the program).
//  - At least 25 upper-division credits across the courses counted.
import { codes, defineHarness, display } from '@harness'
import type { Enrollment, Node } from '@harness'

const CRSN_ELECTIVES = ['CRSN 151C', 'CRSN 155S', 'CRSN 161']
// Breadth list in page order; cross-listed partners ([/X]) follow their course.
const BREADTH = [
  'ANTH 110E', 'ANTH 110K', 'ANTH 111', 'ANTH 135A', 'ANTH 137', 'ANTH 146', 'ANTH 147', 'ANTH 160',
  'ANTH 161', 'ART 125', 'BIOE 107', 'BIOE 108', 'BIOE 145', 'BIOE 147', 'BIOE 155', 'CMMU 133',
  'CMMU 149', 'CMMU 156', 'CMMU 162', 'CMMU 186', 'EART 116', 'EART 121', 'EART 142', 'EART 146',
  'EART 191', 'ECE 175', 'ECE 176', 'ECE 177', 'ECE 180J', 'ECON 170', 'ECON 171', 'ECON 175',
  'ENVS 110', 'ENVS 120', 'ENVS 130A', 'ENVS 130C', 'ENVS 135', 'ENVS 140', 'LGST 140E', 'ENVS 142',
  'ENVS 143', 'ENVS 144', 'POLI 179', 'ENVS 145', 'ENVS 149', 'LGST 149', 'ENVS 151', 'LGST 151A',
  'ENVS 152', 'POLI 170', 'ENVS 165', 'LGST 165A', 'ENVS 166', 'FMST 124', 'FMST 131', 'FMST 133',
  'HAVC 48', 'HAVC 141K', 'HAVC 143B', 'HIS 101C', 'HIS 101F', 'HIS 151', 'HIS 196F', 'LALS 152',
  'LALS 163', 'LGST 137', 'LGST 159', 'METX 101', 'OCEA 101', 'OCEA 102', 'POLI 132', 'LGST 132',
  'POLI 174', 'PSYC 159E', 'SOCY 30A', 'SOCY 119', 'SOCY 125', 'SOCY 130', 'SOCY 132', 'SOCY 167',
  'SOCY 173', 'SOCY 177E', 'SOCY 177G', 'SOCY 179', 'ANTH 110IG', 'ANTH 110I',
]
// "Labs are required only when required by the lecture." The catalog requires
// concurrent enrollment in these labs for each ECE lecture.
const BREADTH_LABS: [string, string][] = [
  ['ECE 175', 'ECE 175L'],
  ['ECE 176', 'ECE 176L'],
  ['ECE 177', 'ECE 177L'],
]
const LOWER_LISTED = ['HAVC 48', 'SOCY 30A']
const UD_BREADTH = BREADTH.filter((c) => !LOWER_LISTED.includes(c))
const KNOWN_CRSN = new Set(['CRSN151A', 'CRSN151B', 'CRSN152'])
const ALL_LISTED = new Set([...BREADTH, ...CRSN_ELECTIVES, ...BREADTH_LABS.map((p) => p[1])].map((c) => c.replace(' ', '')))

const Q_LIST_NOTE =
  'The list of breadth elective courses applies to all of the upper-division options above. This list is updated regularly, but course offerings change.'
const Q_151C = 'Topics taught in CRSN 151C vary by quarter. It may be repeated for additional upper-division credit or as a capstone option if the repeated course is on a different topic.'

const partner = 'cross-listed partner named in [/X] in the source; the catalog files the course under the other code'

export default defineHarness({
  program: 'sustainability-studies-minor',
  edition: '2026-27',
  title: 'Sustainability Studies Minor',
  attestations: [
    {
      id: 'crsn151c-topic',
      label: 'Repeated CRSN 151C was on a different topic',
      quote: Q_151C,
      aliases: ['151c', 'different topic'],
    },
  ],
  coverage: {
    unknownOk: Object.fromEntries(['LGST 140E', 'POLI 179', 'LGST 149', 'LGST 151A', 'POLI 170', 'LGST 165A', 'LGST 132'].map((c) => [c.replace(' ', ''), partner])),
  },
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'Substitutes for any of the required courses must be approved by the program director (add an approved substitute only once it is approved).',
    'The breadth elective list is updated regularly — the newest list is at rachelcarson.ucsc.edu (Minor → breadth electives). Courses not on the catalog list are shown as “check yourself”.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const intro = h.take('crsn55', 'CRSN 55 (twice)', 'Take this course twice:', codes('CRSN 55'), { n: 2, repeatable: true })
    const core = h.all('core', 'Upper-Division Core Courses', 'Take all of the following courses:', ['CRSN 151A', 'CRSN 151B', 'CRSN 151C'])

    const listQuote = 'The following courses fulfill the upper-division Elective requirement and Breadth Capstone requirement.'
    const elective = h.take(
      'ud-elective',
      'Upper-Division Elective (one 5-credit course)',
      [
        'All students must take one 5-credit course from the CRSN or Breadth Electives lists below. The upper-division elective does not count toward the Breadth Capstone requirement. While not required, students are encouraged to take a CRSN course to fulfill this elective.',
        listQuote,
      ],
      codes(...CRSN_ELECTIVES, ...UD_BREADTH).minCredits(5),
      { labs: { pairs: BREADTH_LABS, mode: 'required' } },
    )

    // Option 1: CRSN 152 three times (overlay: CRSN 152 counts nowhere else).
    const opt1 = h.take('cap-ideass', 'Option 1: IDEASS Capstone (CRSN 152 three times)', 'Take the following course three times (9 credits total):', codes('CRSN 152'), {
      n: 3,
      repeatable: true,
      exclusive: false,
    })
    const opt1Done = h.taken(codes('CRSN 152')).length >= 3
    const crsnOrBreadth = codes(...CRSN_ELECTIVES, ...UD_BREADTH)
    const opt2 = opt1Done
      ? null
      : h.take(
          'cap-breadth',
          'Option 2: Breadth Capstone',
          [
            'Students fulfill the Breadth Capstone by taking one upper-division Breadth Elective and either an upper-division CRSN or additional upper-division Breadth Elective course from the lists below.',
            listQuote,
          ],
          crsnOrBreadth,
          {
            n: 2,
            labs: { pairs: BREADTH_LABS, mode: 'required' },
            atLeast: [{ set: codes(...UD_BREADTH), n: 1, label: 'at least one upper-division Breadth Elective' }],
          },
        )

    h.solve()

    const used = [intro, core, elective, opt1Done ? opt1 : opt2].flatMap((n) => collectUsed(n))
    const usedIds = new Set(used.map((e) => e.id))
    // Candidates the catalog list may not know about (the list "is updated regularly").
    const unclassified = h.passed.filter(
      (e) => !usedIds.has(e.id) && !ALL_LISTED.has(e.code) && !KNOWN_CRSN.has(e.code) && h.catalog.get(e.code)?.division === 'upper',
    )
    const listedLower = h.passed.filter((e) => LOWER_LISTED.some((c) => c.replace(' ', '') === e.code))
    const softenElective = (n: Node) => {
      if (n.status !== 'unmet') return n
      const cand = [...unclassified, ...listedLower]
      if (!cand.length) return n
      n.status = 'cannot-check'
      n.detail = `${n.detail ? n.detail + ' · ' : ''}Check whether ${cand.map((e) => e.display).join(', ')} is on the current breadth electives list (HAVC 48 / SOCY 30A are listed but lower-division) — ask the program.`
      return n
    }

    const electiveNode = softenElective(elective)

    let capstone: Node
    if (opt1Done) {
      capstone = h.either('capstone', 'Capstone', 'Students choose from one of the following options:', [opt1])
    } else {
      const o2 = opt2!
      // A listed lower-division course could be the elective (freeing a breadth
      // course for the capstone) if the program accepts it.
      const cand = [...unclassified, ...(elective.status === 'met' ? listedLower : [])]
      if (o2.status === 'unmet' && cand.length) {
        o2.status = 'cannot-check'
        o2.detail = `${o2.detail ? o2.detail + ' · ' : ''}Check whether ${cand.map((e) => e.display).join(', ')} is on the current breadth electives list (HAVC 48 / SOCY 30A are listed but lower-division) — ask the program.`
      }
      // A second CRSN 151C counted here needs a different topic.
      const repeat151c = (o2.used ?? []).some((e) => e.code === 'CRSN151C')
      const opt2Node = repeat151c
        ? h.group('cap-breadth-group', 'Option 2: Breadth Capstone (with a repeated CRSN 151C)', [o2, h.attest('crsn151c-topic')], { quote: Q_151C })
        : o2
      capstone = h.either('capstone', 'Capstone', 'Students choose from one of the following options:', [opt1, opt2Node])
    }

    // "A minimum of 25 upper-division credits are required to complete the minor."
    const ud = used.filter((e) => h.catalog.get(e.code)?.division === 'upper')
    const unknown = ud.filter((e) => Number.isNaN(h.catalog.get(e.code)?.credits ?? NaN))
    const sum = ud.reduce((s, e) => s + (Number.isNaN(h.catalog.get(e.code)?.credits ?? NaN) ? 0 : h.catalog.get(e.code)!.credits), 0)
    const qCredits = 'A minimum of 25 upper-division credits are required to complete the minor.'
    const credits =
      sum >= 25
        ? h.node('ud-credits', '25 upper-division credits', qCredits, 'met', { progress: { have: sum, need: 25, unit: 'credits' } })
        : unknown.length || [electiveNode, opt1Done ? opt1 : opt2].some((n) => n?.status === 'cannot-check')
          ? h.cannotCheck('ud-credits', '25 upper-division credits', qCredits, `${sum} credits counted${unknown.length ? `; credits unknown for ${unknown.map((e) => display(e.code)).join(', ')}` : ''}; depends on the courses still to be checked.`, { progress: { have: sum, need: 25, unit: 'credits' } })
          : h.node('ud-credits', '25 upper-division credits', qCredits, 'unmet', {
              progress: { have: sum, need: 25, unit: 'credits' },
              detail: `${sum} upper-division credits counted toward the minor so far.`,
            })

    return [
      credits,
      h.group('intro', 'Introductory Courses', [intro]),
      core,
      electiveNode,
      capstone,
      h.info('breadth-list', 'Breadth elective list', Q_LIST_NOTE, 'The list on the catalog page is used; the program’s website has the most current list.'),
    ]
  },
})

function collectUsed(n: Node | null): Enrollment[] {
  if (!n) return []
  return [...(n.used ?? []), ...(n.children ?? []).flatMap((c) => collectUsed(c))]
}
