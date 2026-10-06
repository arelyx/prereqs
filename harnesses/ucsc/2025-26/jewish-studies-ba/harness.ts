// Jewish Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/jewish-studies-ba.md
//
// Three Jewish-language courses; one of HIS 74/74A/74B/LIT 61J plus one of
// HIS 75/76; four upper-division core; four electives (elective list, or
// extra language / core courses; three 5-credit upper-division); an exit
// seminar or the JWST 195A+195B thesis (comprehensive + DC, letter grade).
// The classical chronological distribution is an overlay: every course on
// its list also sits in another requirement. Up to two P/NP, never the
// comprehensive.
import { codes, defineHarness, isPass } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const LANGUAGE = ['HEBR 1', 'HEBR 2', 'HEBR 3', 'HEBR 4', 'HEBR 80', 'YIDD 1', 'YIDD 2', 'YIDD 3']
const CORE_A = ['HIS 74', 'HIS 74A', 'HIS 74B', 'LIT 61J']
const CORE_B = ['HIS 75', 'HIS 76']
const UD_CORE = [
  'HIS 155', 'HIS 163B', 'HIS 172A', 'HIS 172B', 'HIS 178E', 'HIS 185C', 'HIS 185I', 'HIS 185J', 'HIS 185K', 'HIS 185L', 'HIS 185M', 'HIS 185O',
  'HAVC 135E', 'LGST 114', 'LGST 115', 'LIT 118A', 'LIT 164A', 'LIT 164B', 'LIT 164C', 'LIT 164D', 'LIT 164G', 'LIT 164H', 'LIT 164J',
  'LIT 181A', 'PHIL 148', 'LIT 181B',
]
const ELECTIVES = [
  'HIS 2A', 'HIS 2B', 'HIS 5C', 'HIS 70A', 'HIS 70B', 'HIS 78', 'HIS 167A', 'HIS 167B', 'HIS 169', 'HIS 172C', 'HIS 174', 'HIS 176',
  'HIS 178A', 'HIS 178B', 'HIS 178C', 'HIS 184B', 'JWST 199', 'LIT 112I', 'LIT 160U', 'MUSC 80I', 'MUSC 80T', 'MUSC 80Y', 'MUSC 81P',
]
const SEMINARS = ['HIS 190G', 'HIS 194L', 'HIS 194V', 'HIS 196E', 'HIS 196G', 'HIS 196M', 'HIS 196N', 'HIS 196S', 'LIT 190Y']
const CLASSICAL = ['HEBR 80', 'HIS 74', 'HIS 74A', 'HIS 163B', 'LIT 61J', 'LIT 118A', 'LIT 181A', 'LIT 181B']

// "students may also satisfy the elective requirement by taking additional
// language, lower-division core, or upper-division core courses"
const ELECTIVE_POOL = codes(...ELECTIVES, ...LANGUAGE, ...CORE_A, ...CORE_B, ...UD_CORE)
const UD5 = ELECTIVE_POOL.where((c) => c.division === 'upper' && !(c.credits < 5), '5-credit upper-division')
const ALL = codes(...ELECTIVES, ...LANGUAGE, ...CORE_A, ...CORE_B, ...UD_CORE, ...SEMINARS, 'JWST 195A', 'JWST 195B')

export default defineHarness({
  program: 'jewish-studies-ba',
  edition: '2025-26',
  title: 'Jewish Studies B.A.',
  attestations: [
    {
      id: 'language-placement',
      label: 'Placed past (some of) the Hebrew/Yiddish language courses on the placement exam',
      quote: 'Students with prior knowledge of Hebrew or Yiddish are advised to complete a language placement exam to determine if they have satisfied any of the elementary language course requirements.',
      aliases: ['placement exam', 'language placement', 'hebrew placement', 'yiddish placement', 'language equivalent'],
    },
  ],
  notes: [
    'Plan the major with a Jewish studies faculty advisor.',
    'Up to two major requirements may be taken Pass/No Pass; the comprehensive requirement needs a letter grade.',
    'Transfer (up to three), EAP (up to three), related unlisted courses (up to two) and independent studies (up to one) may count by petition — add them once approved. At least five regularly scheduled courses plus the comprehensive must be taught by UC Santa Cruz Jewish studies faculty.',
  ],
  evaluate(h) {
    // P/NP for up to two requirements (counted below); the comprehensive slot is letter-only.
    h.policy = undefined

    const lang = h.take('language', 'Three quarters of Hebrew or Yiddish', 'Three quarters of lower-division instruction (or equivalent) in a Jewish language in any combination of the student’s choosing:', codes(...LANGUAGE), { n: 3 })
    const coreA = h.take('core-intro', 'One introductory core course', 'Choose one of the following courses:', codes(...CORE_A))
    const coreB = h.take('core-holocaust', 'One Holocaust core course (HIS 75 or HIS 76)', 'Plus one of the following courses:', codes(...CORE_B))
    const ud = h.take('ud-core', 'Four upper-division core courses', 'Four 5-credit upper-division Jewish studies core courses:', codes(...UD_CORE), { n: 4 })
    const el = h.take('electives', 'Four electives', ["Four additional Jewish studies courses of the student's choice, three of which must be 5-credit upper-division courses.", 'Students may satisfy their Jewish studies elective requirements by taking additional language, lower-division core, and upper-division core courses from the Jewish studies curriculum.'], ELECTIVE_POOL, {
      n: 4,
      atLeast: [{ set: UD5, n: 3, label: '5-credit upper-division' }],
      // "Independent and field studies (limit of one)"
      atMost: [{ set: codes('JWST 199'), n: 1, label: 'independent study (limit of one)' }],
      repeatable: 'catalog',
    })
    // "with the exception of their comprehensive requirement" → letter grade.
    const comp = h.options('comprehensive', 'Exit seminar or senior thesis', ['Students may satisfy the Jewish studies comprehensive exit requirement by completing an approved exit seminar or senior thesis:', 'Students are allowed to complete up to two of their Jewish studies major requirements for Pass/No Pass, with the exception of their comprehensive requirement.'], [...SEMINARS.map((s) => [s]), ['JWST 195A', 'JWST 195B']], {
      policy: { letter: true },
      labels: [...SEMINARS, 'Thesis: JWST 195A + JWST 195B'],
    })
    const classical = h.take('classical', 'Classical chronological distribution', 'One course from the following:', codes(...CLASSICAL), { exclusive: false })
    h.solve()

    const dc = h.node('dc', 'Disciplinary Communication (DC)', "The DC requirement in Jewish studies is satisfied by completing an exit seminar or thesis:", comp.status === 'met' ? 'met' : 'unmet', {
      detail: 'Satisfied by your exit seminar or thesis (the comprehensive requirement).',
      used: comp.used,
    })

    // "(or equivalent)" + the placement exam that may satisfy "any of the
    // elementary language course requirements": asked only when the three
    // quarters are not in the plan.
    const langNode = lang.status === 'met'
      ? lang
      : h.either('language-or-placement', 'Three quarters of Hebrew or Yiddish (or placement)', 'Students with prior knowledge of Hebrew or Yiddish are advised to complete a language placement exam to determine if they have satisfied any of the elementary language course requirements.', [lang, h.attest('language-placement')])

    return [
      h.group('lower', 'Lower-Division Courses', [langNode, h.group('ld-core', 'Lower-Division Core Courses', [coreA, coreB])]),
      h.group('upper', 'Upper-Division Courses', [ud]),
      h.group('electives-group', 'Electives', [el]),
      h.group('dc-group', 'Disciplinary Communication (DC) Requirement', [dc]),
      h.group('comprehensive-group', 'Comprehensive Requirement', [comp]),
      h.group('classical-group', 'Classical Chronological Distribution Requirement', [classical]),
      pnpLimit(h, [lang, coreA, coreB, ud, el], ALL, 'Students are allowed to complete up to two of their Jewish studies major requirements for Pass/No Pass, with the exception of their comprehensive requirement.'),
    ]
  },
})

/** "Up to two … Pass/No Pass": count P grades among the courses counted. */
function pnpLimit(h: HarnessContext, counted: Node[], pool: CourseSet, quote: string): Node {
  const used = [...new Map(counted.flatMap((n) => n.used ?? []).map((e) => [e.id, e])).values()]
  const pnp = used.filter((e) => isPass(e.grade))
  if (pnp.length <= 2)
    return h.node('pnp-limit', 'At most two requirements taken Pass/No Pass', quote, 'met', { progress: { have: pnp.length, need: 2, unit: 'P/NP max' }, minor: true })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && !isPass(e.grade) && pool.has(e.code, h.catalog))
  const detail = `${pnp.map((e) => e.display).join(', ')} are P/NP — only two may be.`
  return spare.length
    ? h.cannotCheck('pnp-limit', 'At most two requirements taken Pass/No Pass', quote, `${detail} A letter-graded course you also took (${spare.map((e) => e.display).join(', ')}) may be able to replace one — check with an advisor.`)
    : h.node('pnp-limit', 'At most two requirements taken Pass/No Pass', quote, 'unmet', { detail, used: pnp })
}
