// Anthropology Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/anthropology-minor.md
//
// The four upper-division categories are defined by an external "Courses in
// Anthropology by Category" list that is NOT in the committed source. Rather
// than guess categories from course titles, the student assigns one of their
// courses to each category (a declared choice, validated here: it must be an
// upper-division ANTH course in the plan, distinct per category). Until they
// do, the category is cannot-check — never silently "met".
import { canon, defineHarness, display, range } from '@harness'
import type { ChoiceDef, Node } from '@harness'

const CATEGORIES: { key: string; label: string; quote: string }[] = [
  { key: 'regional', label: 'Regional specialization', quote: 'one course in regional specialization' },
  { key: 'sociocultural', label: 'Sociocultural anthropology', quote: 'one course in sociocultural anthropology' },
  { key: 'archaeology', label: 'Archaeology', quote: 'one course in archaeology' },
  { key: 'biological', label: 'Biological, medical, or environmental anthropology', quote: 'one course in biological, medical, or environmental anthropology' },
]

// "Independent study courses cannot count toward the minor requirements."
// From the catalog: ANTH 197/197F (Laboratory Tutorial), 198/198F/198G
// (Independent Field Study), 199/199F (Tutorial).
const UD_ANTH = range('ANTH', 100, 199).except(range('ANTH', 197, 199)).minCredits(5)

const parseCode = (raw: string) => (/^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(raw.trim()) ? canon(raw) : undefined)

export default defineHarness({
  program: 'anthropology-minor',
  edition: '2025-26',
  title: 'Anthropology Minor',
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
    'Category membership comes from the department’s “Courses in Anthropology by Category” list, which the app does not have: tell the dashboard which of your courses covers each category.',
    'Up to two upper-division courses from other four-year universities, EAP or approved field study may count by petition (add them as completed courses once approved).',
    'Courses may be taken P/NP (campus 25% P/NP limit applies).',
  ],
  evaluate(h) {
    // "Anthropology students can choose to take courses required for the minor for a Pass/No Pass (P/NP) grading option."
    h.policy = undefined

    const lower = h.all('lower', 'Lower-Division Courses', 'three lower-division and seven upper-division courses', ['ANTH 1', 'ANTH 2', 'ANTH 3'])

    const seven = h.take(
      'upper-seven',
      'Seven upper-division anthropology courses',
      ['The minor in anthropology has a total of 10 courses required: three lower-division and seven upper-division courses.', 'Independent study courses cannot count toward the minor requirements.'],
      UD_ANTH,
      {
        n: 7,
        pool: 'upper-division ANTH courses (5+ credits), excluding independent study (ANTH 197–199)',
        notes: ['2-credit practica and readings courses are not counted as one of the seven; ask an advisor if you plan to use one.'],
      },
    )

    const eligible = h.taken(UD_ANTH)
    const candidates = [...new Set(eligible.map((e) => e.code))]
    const assigned = new Map<string, string>() // code -> category label
    const catNodes: Node[] = CATEGORIES.map((c) => {
      const code = h.choice(c.key)
      const title = c.label
      if (!code) {
        const free = eligible.filter((e) => !assigned.has(e.code))
        if (!free.length)
          return h.node(`cat-${c.key}`, title, c.quote, 'unmet', { detail: 'No upper-division anthropology course in your plan yet.', choice: c.key, pool: UD_ANTH.describe })
        return h.cannotCheck(`cat-${c.key}`, title, c.quote, 'Check the department’s category list, then pick which of your courses covers this category.', {
          choice: c.key,
          options: [...new Set(free.map((e) => e.code))],
        })
      }
      if (!UD_ANTH.has(code, h.catalog))
        return h.node(`cat-${c.key}`, title, c.quote, 'unmet', { detail: `${display(code)} is not an upper-division anthropology course that counts.`, choice: c.key, options: candidates })
      const dup = assigned.get(code)
      if (dup)
        return h.node(`cat-${c.key}`, title, c.quote, 'unmet', { detail: `${display(code)} is already assigned to ${dup}; each category needs its own course.`, choice: c.key, options: candidates })
      assigned.set(code, c.label)
      const got = eligible.filter((e) => e.code === code)
      return got.length
        ? h.node(`cat-${c.key}`, title, c.quote, 'met', { used: got.slice(0, 1), choice: c.key, detail: 'Per your category assignment.', options: candidates })
        : h.node(`cat-${c.key}`, title, c.quote, 'unmet', { detail: `${display(code)} is not in your plan (or was not passed).`, choice: c.key, options: candidates })
    })

    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        seven,
        h.group('categories', 'Category requirements (four of the seven)', catNodes, {
          quote: 'three additional anthropology courses from the [Courses in Anthropology by Category](https://catalog.ucsc.edu/en/2025-2026/general-catalog/academic-units/social-sciences-division/anthropology/anthropology-course-list) List',
        }),
      ],
    )
    return [lower, upper]
  },
})
