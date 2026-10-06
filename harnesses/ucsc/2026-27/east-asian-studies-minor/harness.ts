// East Asian Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/east-asian-studies-minor.md
//
// Six courses: one core survey (HIS 40A/40B/80C/81), two upper-division
// language courses in ONE language (Chinese or Japanese), three more listed
// upper-division courses (one may be a topically appropriate individual
// study). The lower-division language sequence is preparation, not one of
// the six ("Additional lower-division coursework … may be needed"), and
// students with prior knowledge place past it, so it is shown as info.
import { anyOf, canon, codes, defineHarness, display, isPass, range } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const CHIN_UD = ['CHIN 103', 'CHIN 104', 'CHIN 105', 'CHIN 107', 'CHIN 108']
const JAPN_UD = ['JAPN 103', 'JAPN 104', 'JAPN 105', 'JAPN 109']
const LD_LANG = ['CHIN 1', 'CHIN 2', 'CHIN 3', 'CHIN 4', 'CHIN 5', 'CHIN 6', 'JAPN 1', 'JAPN 2', 'JAPN 3', 'JAPN 4', 'JAPN 5', 'JAPN 6']
const CORE = ['HIS 40A', 'HIS 40B', 'HIS 80C', 'HIS 81']
const ELECTIVES = [
  'ANTH 130C', 'ANTH 130G', ...CHIN_UD, 'CHIN 199', 'ECON 149',
  'HAVC 122A', 'HAVC 122B', 'HAVC 122C', 'HAVC 122D', 'HAVC 122E', 'HAVC 122F', 'HAVC 127A', 'HAVC 127B', 'HAVC 190D', 'HAVC 190F', 'HAVC 190G',
  'HIS 101D', 'HIS 101F', 'HIS 106B', 'HIS 140B', 'HIS 140C', 'HIS 140D', 'HIS 140E',
  'HIS 150A', 'HIS 150B', 'HIS 150C', 'HIS 150D', 'HIS 150E', 'HIS 150F', 'HIS 150G', 'HIS 190G',
  'HIS 194C', 'HIS 194E', 'HIS 194M', 'HIS 194U', 'HIS 194Y',
  ...JAPN_UD, 'JAPN 199',
  'LIT 133F', 'LIT 133E', 'LIT 133G', 'LIT 133H', 'LIT 133I', 'LIT 141B', 'LIT 141C', 'LIT 149C', 'LIT 162B',
  'POLI 140D', 'POLI 141', 'POLI 161', 'POLI 190T',
  'SOCY 128', 'THEA 161D', 'SOCY 128J',
]
// Membership goes through the catalog so a cross-listed partner code
// (LGST 126 for SOCY 128, HIS 141A for LIT 141B) counts as listed.
const LISTED = codes(...ELECTIVES)
// "one of which may be a topically appropriate individual study: CHIN 199,
// HIS 199, JAPN 199, LIT 199, etc." — any 5-credit 199 may be the one, but
// whether one outside the list is topically appropriate is the program's call.
// The subjects the page names as East Asian studies fields ("anthropology,
// economics, education, feminist studies, film and digital media, history,
// history of art and visual culture, languages, linguistics, literature,
// music, politics, sociology, and theater arts").
const IND_SUBJECTS = ['ANTH', 'ECON', 'EDUC', 'FMST', 'FILM', 'HIS', 'HAVC', 'CHIN', 'JAPN', 'LING', 'LIT', 'MUSC', 'POLI', 'SOCY', 'THEA']
const IND = anyOf(...IND_SUBJECTS.map((s) => range(s, 199, 199)))
const isInd = (code: string) => /^[A-Z]+199[A-Z]*$/.test(canon(code))
const ELECTIVE_SET = codes(...ELECTIVES).or(IND)
const ALL = codes(...CORE, ...CHIN_UD, ...JAPN_UD, ...ELECTIVES)

export default defineHarness({
  program: 'east-asian-studies-minor',
  edition: '2026-27',
  title: 'East Asian Studies Minor',
  notes: [
    'Up to two of the minor courses may be taken Pass/No Pass.',
    'Chinese or Japanese courses taken abroad require a language placement exam on return; add them once the program accepts them.',
  ],
  evaluate(h) {
    // P/NP for up to two courses (counted below).
    h.policy = undefined

    const taken = LD_LANG.filter((c) => h.has(c))
    const langInfo = h.info('ld-language', 'Chinese or Japanese language preparation (CHIN/JAPN 1–6)', ['All East Asian studies minors are expected to gain proficiency in Chinese or Japanese language.', 'Additional lower-division coursework in Chinese or Japanese language may be needed in order to gain the proficiency necessary to take the upper-division Chinese or Japanese language courses required for this minor (see below).'], taken.length ? `In your plan: ${taken.map(display).join(', ')}. ` + 'These prepare you for the upper-division language courses; they are not among the six courses.' : 'Take CHIN 1–6 or JAPN 1–6 as needed (or place out with the placement exam) to reach the upper-division language courses.')
    const core = h.take('core', 'Core course', 'Choose one of the following courses:', codes(...CORE))
    const lang = h.take('ud-language', 'Two upper-division courses in one language', 'All East Asian studies minors are required to complete two 5-credit upper-division courses in Chinese language instruction or two 5-credit upper-division courses in Japanese language instruction.', codes(...CHIN_UD, ...JAPN_UD), {
      n: 2,
      check: (chosen) => (new Set(chosen.map((e) => e.code.slice(0, 4))).size > 1 ? 'both courses must be in the same language' : null),
    })
    const electives = h.take('electives', 'Three upper-division electives', ['Three additional 5-credit upper-division courses from the East Asian studies curriculum, one of which may be a topically appropriate individual study: CHIN 199, HIS 199, JAPN 199, LIT 199, etc.', 'Additional upper-division courses in Chinese or Japanese language may be applied to the upper-division electives requirements (see below).'], ELECTIVE_SET.minCredits(5), {
      n: 3,
      repeatable: 'catalog',
      // At most one individual study (199) among the three.
      check: (chosen) => (chosen.filter((e) => isInd(e.code)).length > 1 ? 'only one may be an individual study' : null),
      // Listed courses first; a listed 199 (CHIN/JAPN 199) before an off-list one.
      prefer: (c) => (!LISTED.has(c, h.catalog) ? 2 : isInd(c) ? 1 : 0),
    })
    h.solve()

    // An individual study outside the list (HIS 199, LIT 199, …) is the
    // program's judgement ("topically appropriate").
    const offList = (electives.used ?? []).filter((e) => !LISTED.has(e.code, h.catalog))
    if (electives.status === 'met' && offList.length) {
      electives.status = 'cannot-check'
      electives.detail = `${offList.map((e) => e.display).join(', ')} counts only if it is a topically appropriate East Asian individual study — confirm with the program.`
    }

    return [
      h.group('lower', 'Lower-Division Courses', [langInfo, core]),
      h.group('upper', 'Upper-Division Courses', [lang, electives]),
      pnpLimit(h, [core, lang, electives], ALL, 'Students are allowed to complete up to two of their minor courses for pass/no pass grades.'),
    ]
  },
})

/** "Up to two … pass/no pass": count P grades among the courses counted. */
function pnpLimit(h: HarnessContext, counted: Node[], pool: CourseSet, quote: string): Node {
  const used = [...new Map(counted.flatMap((n) => n.used ?? []).map((e) => [e.id, e])).values()]
  const pnp = used.filter((e) => isPass(e.grade))
  if (pnp.length <= 2)
    return h.node('pnp-limit', 'At most two courses taken Pass/No Pass', quote, 'met', { progress: { have: pnp.length, need: 2, unit: 'P/NP max' }, minor: true })
  const spare = h.passed.filter((e) => !h.used.has(e.id) && !isPass(e.grade) && pool.has(e.code, h.catalog))
  const detail = `${pnp.map((e) => e.display).join(', ')} are P/NP — only two may be.`
  return spare.length
    ? h.cannotCheck('pnp-limit', 'At most two courses taken Pass/No Pass', quote, `${detail} A letter-graded course you also took (${spare.map((e) => e.display).join(', ')}) may be able to replace one — check with an advisor.`)
    : h.node('pnp-limit', 'At most two courses taken Pass/No Pass', quote, 'unmet', { detail, used: pnp })
}
