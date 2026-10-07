// Anthropology B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/anthropology-ba.md
//
// ANTH 1/2/3, ten upper-division courses (5+ credits; at most one 5-credit
// individual study ANTH 197/198/199), five of which cover the core categories,
// plus a senior seminar (ANTH 194/196 series) or senior thesis for DC and the
// comprehensive.
//
// Judgement call — the ten: "Ten upper-division courses" is followed by "Five
// core requirements" and "Four anthropology electives" (nine), so the tenth is
// read as the senior seminar/thesis required for DC and the comprehensive. The
// harness counts ten 5-credit upper-division ANTH courses in total, and the
// seminar/thesis is an overlay that must be among the courses taken.
//
// The core categories are defined by the external "Courses in Anthropology by
// Category" list (not in the committed source). As in the anthropology minor,
// the student assigns one of their courses to each category (a declared
// choice, validated: an upper-division ANTH course in the plan, distinct per
// category); unassigned ⇒ cannot-check, never silently met.
import { canon, codes, defineHarness, display, range, series } from '@harness'
import type { ChoiceDef, Node } from '@harness'

const CATEGORIES: { key: string; label: string; quote: string }[] = [
  { key: 'theory', label: 'Anthropological theory', quote: 'one course in anthropological theory' },
  { key: 'sociocultural', label: 'Sociocultural anthropology', quote: 'one course in sociocultural anthropology' },
  { key: 'regional', label: 'Regional specialization', quote: 'one course in regional specialization' },
  { key: 'archaeology', label: 'Archaeology', quote: 'one course in archaeology' },
  { key: 'biological', label: 'Biological, medical or environmental anthropology', quote: 'one course in biological, medical or environmental anthropology' },
]

// "Two-credit courses do not count toward the 10 upper-division courses required for the major."
const INDIVIDUAL = range('ANTH', 197, 199)
// "Students who are given permission to take a graduate seminar in anthropology
// may use the course to satisfy an upper division elective." (ANTH 297–299 are
// graduate independent study / thesis research, not seminars.)
const GRAD_SEMINAR = range('ANTH', 200, 296).minCredits(5)
const TEN_POOL = range('ANTH', 100, 199).minCredits(5).or(GRAD_SEMINAR)
// A core course comes from the category list: upper-division, not individual study or graduate.
const CORE_POOL = range('ANTH', 100, 196).minCredits(5)

const SEMINAR = series('ANTH', 194).or(series('ANTH', 196))
const THESIS_SERIES = ['ANTH 195A', 'ANTH 195B', 'ANTH 195C']

const parseCode = (raw: string) => (/^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(raw.trim()) ? canon(raw) : undefined)

export default defineHarness({
  program: 'anthropology-ba',
  edition: '2025-26',
  title: 'Anthropology B.A.',
  choices: CATEGORIES.map(
    (c): ChoiceDef => ({
      key: c.key,
      label: `Course for: ${c.label}`,
      quote: c.quote,
      options: [],
      free: true,
      parse: parseCode,
    }),
  ),
  notes: [
    'Core category membership comes from the department’s “Courses in Anthropology by Category” list, which the app does not have: tell the dashboard which of your courses covers each core requirement. A theory-list course may count only for theory or as an elective.',
    'Up to two upper-division courses from other four-year universities, EAP or an approved field school may count as electives by petition (add them as completed courses once approved); core courses cannot be substituted.',
    'Courses may be taken P/NP (campus 25% P/NP limit applies). The senior comprehensive must be completed at UC Santa Cruz.',
  ],
  evaluate(h) {
    // "Anthropology students can choose to take courses required for the major or minor for a Pass/No Pass (P/NP) grading option."
    h.policy = undefined

    const lower = h.all('lower', 'Lower-Division Courses', 'To graduate with an anthropology major, students must successfully complete the following courses:', ['ANTH 1', 'ANTH 2', 'ANTH 3'])

    const ten = h.take(
      'upper-ten',
      'Ten upper-division anthropology courses',
      [
        'Ten upper-division courses',
        'Two-credit courses do not count toward the 10 upper-division courses required for the major. Only one 5-credit individual studies course (ANTH 197, ANTH 198, or ANTH 199) may be counted toward the 10 required upper-division courses.',
        'Students who are given permission to take a graduate seminar in anthropology may use the course to satisfy an upper division elective.',
      ],
      TEN_POOL,
      {
        n: 10,
        atMost: [{ set: INDIVIDUAL, n: 1, label: 'individual study (ANTH 197–199)' }],
        pool: 'upper-division ANTH courses of 5+ credits (at most one ANTH 197/198/199), or a graduate ANTH seminar',
        notes: ['Five core courses, four electives and the senior seminar/thesis make up the ten.'],
      },
    )

    const eligible = h.taken(CORE_POOL)
    const candidates = [...new Set(eligible.map((e) => e.code))]
    // A cross-listed course is one course under either code (ANTH 110Q /
    // CRES 110Q / FMST 110Q): match and de-duplicate assignments by course.
    const course = (code: string) => [canon(code), ...h.catalog.equivalents(code)].sort()[0]
    const assigned = new Map<string, string>() // course -> category label
    const catNodes: Node[] = CATEGORIES.map((c) => {
      const code = h.choice(c.key)
      const id = `core-${c.key}`
      if (!code) {
        const free = eligible.filter((e) => !assigned.has(course(e.code)))
        if (!free.length)
          return h.node(id, c.label, c.quote, 'unmet', { detail: 'No unassigned upper-division anthropology course in your plan.', choice: c.key, pool: CORE_POOL.describe })
        return h.cannotCheck(id, c.label, c.quote, 'Check the department’s category list, then pick which of your courses covers this core requirement.', {
          choice: c.key,
          options: [...new Set(free.map((e) => e.code))],
        })
      }
      if (!CORE_POOL.has(code, h.catalog))
        return h.node(id, c.label, c.quote, 'unmet', { detail: `${display(code)} is not an upper-division anthropology course that can be a core course.`, choice: c.key, options: candidates })
      const dup = assigned.get(course(code))
      if (dup)
        return h.node(id, c.label, c.quote, 'unmet', { detail: `${display(code)} is already assigned to ${dup}; each core requirement needs its own course.`, choice: c.key, options: candidates })
      assigned.set(course(code), c.label)
      const got = eligible.filter((e) => course(e.code) === course(code))
      return got.length
        ? h.node(id, c.label, c.quote, 'met', { used: got.slice(0, 1), choice: c.key, detail: 'Per your category assignment.', options: candidates })
        : h.node(id, c.label, c.quote, 'unmet', { detail: `${display(code)} is not in your plan (or was not passed).`, choice: c.key, options: candidates })
    })

    const upper = h.group('upper', 'Upper-Division Courses', [
      ten,
      h.group('core', 'Five core requirements', catNodes, {
        quote: 'For course offerings, see the section [Courses in Anthropology by Category](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/social-sciences-division/anthropology/anthropology-course-list). Students may not substitute coursework from another program or institution for core courses.',
      }),
    ])

    // Senior seminar or senior thesis — the same courses satisfy DC and the comprehensive.
    const seminarOrThesis = (id: string, title: string, quote: string) =>
      h.either(id, title, quote, [
        h.take(`${id}/seminar`, 'Senior seminar (ANTH 194 or 196 series)', 'Either a course in the ANTH 194 series or a course in the ANTH 196 series.', SEMINAR, { exclusive: false }),
        h.take(`${id}/thesis`, 'Senior thesis ANTH 195S', 'ANTH 195S — Senior Thesis (5)', codes('ANTH 195S'), { exclusive: false }),
        h.options(`${id}/thesis-series`, 'Biological anthropology thesis series ANTH 195A, 195B, 195C', 'ANTH 195A — Biological Anthropology Senior Thesis Series: Research Design (5)', [THESIS_SERIES], { exclusive: false }),
      ])

    const dc = seminarOrThesis('dc', 'Disciplinary Communication (DC)', 'To satisfy the DC requirement students must complete a senior seminar series course or complete an independent senior thesis following the guidelines below.')
    const comprehensive = seminarOrThesis(
      'comprehensive',
      'Comprehensive Requirement',
      'Students can fulfill the senior comprehensive requirement in anthropology either by passing a senior seminar (ANTH 194/ANTH 196-series course) or by writing an acceptable independent senior thesis (ANTH 195S or ANTH 195A, ANTH 195B and ANTH 195C).',
    )
    const qualification = h.info(
      'qualification',
      'Major qualification',
      'In order to qualify for the major, students must have received a "C/P" or better in at least one lower-division anthropology course (ANTH 1, ANTH 2, or ANTH 3)',
      'Gates declaration of the major, not completion.',
    )
    return [lower, upper, dc, comprehensive, qualification]
  },
})
