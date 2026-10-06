// Ancient Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/ancient-studies-ba.md
//
// GREE 1+2 or LATN 1+2; one lower-division survey; three LIT 184/186-series
// courses; six more listed upper-division electives (the list repeats the
// LIT 184/186 courses, so extras count there); CLST 197F (renumbered ANCS
// 197F in the committed catalog; either code counts); a comprehensive
// exam (attestation). DC = two of LIT 184B–E / 186B–D, an overlay on courses
// already counted. Up to two requirements may be P/NP.
import { anyOf, codes, defineHarness, isPass, series } from '@harness'
import type { CourseSet, HarnessContext, Node } from '@harness'

const SURVEY = [
  'HIS 5B', 'HIS 5C', 'HIS 50', 'HIS 51', 'HIS 61', 'HIS 62A', 'HIS 62B',
  'HAVC 50', 'HAVC 51', 'HAVC 55',
  'LIT 61M', 'LIT 61P', 'LIT 61S', 'LIT 61X', 'LIT 80T', 'LIT 80W', 'LIT 81A', 'LIT 81D',
  'THEA 61A',
]
// "Three 5-credit upper-division courses in Greek (LIT 184A-LIT 184Z) and/or
// Latin literature (LIT 186A-LIT 186Z)" — the whole lettered series counts,
// not only the courses listed under it.
const GREEK_LATIN = anyOf(series('LIT', 184), series('LIT', 186)).minCredits(5)
const LISTED_GL = ['LIT 184A', 'LIT 184B', 'LIT 184C', 'LIT 184D', 'LIT 184E', 'LIT 186A', 'LIT 186B', 'LIT 186C', 'LIT 186D']
const ELECTIVES = [
  'HIS 147A', 'HIS 150A', 'HIS 159A', 'HIS 159B', 'HIS 159C', 'HIS 159D', 'HIS 160A', 'HIS 160C', 'HIS 161B', 'HIS 163B', 'HIS 194S', 'HIS 196S',
  'HAVC 135F', 'HAVC 151', 'HAVC 152', 'HAVC 154', 'HAVC 155', 'HAVC 190C',
  // 2025-26: no LIT 116C (added in 2026-27); LIT 190T is listed (dropped in 2026-27).
  'LIT 116I', 'LIT 117A', 'LIT 118A', 'LIT 121A', 'LIT 125A', 'LIT 130A', 'LIT 154B', 'LIT 159M',
  ...LISTED_GL,
  'LIT 181A', 'LIT 181B', 'LIT 181D', 'LIT 181E', 'LIT 181F', 'LIT 190T',
  'PHIL 100A', 'PHIL 118', 'POLI 105A',
]
// 2025-26 names the seminar CLST 197F; the committed catalog (2026-27) has it
// as ANCS 197F. A 2025-26 student may hold either code — the same course.
const SEMINAR = codes('CLST 197F', 'ANCS 197F')
const DC = ['LIT 184B', 'LIT 184C', 'LIT 184D', 'LIT 184E', 'LIT 186B', 'LIT 186C', 'LIT 186D']
const ALL = anyOf(codes('GREE 1', 'GREE 2', 'LATN 1', 'LATN 2', ...SURVEY, ...ELECTIVES), GREEK_LATIN, SEMINAR)

export default defineHarness({
  program: 'ancient-studies-ba',
  edition: '2025-26',
  title: 'Ancient Studies B.A.',
  coverage: {
    unknownOk: { CLST197F: 'the 2025-26 page names CLST 197F; the committed catalog has only its renumbered code ANCS 197F' },
  },
  attestations: [
    {
      id: 'language-equivalent',
      label: 'Ancient studies faculty determined my prior Greek/Latin satisfies the elementary language courses',
      quote: 'Students with prior knowledge of ancient Greek or Latin are advised to consult with the ancient studies faculty to determine if they have satisfied any of the elementary language course requirements.',
      aliases: ['prior knowledge', 'language equivalent', 'elementary language waived', 'or equivalent'],
    },
    {
      id: 'comprehensive-exam',
      label: 'Passed the senior comprehensive examination',
      quote: 'Ancient studies majors are required to pass a senior comprehensive examination.',
      aliases: ['comprehensive exam', 'senior comprehensive', 'comprehensive examination', 'senior exam'],
    },
  ],
  notes: [
    'Students with prior knowledge of ancient Greek or Latin should consult the ancient studies faculty about the elementary language courses; transfer/AP credit for GREE/LATN goes in the plan as the course itself.',
    'Up to two major requirements may be taken Pass/No Pass.',
    'Up to three elective requirements may be completed abroad (EAP) — add approved EAP courses once the program accepts them.',
    'CLST 197F (now ANCS 197F) must be taken in the same quarter as the comprehensive examination; the app cannot check the exam quarter.',
  ],
  evaluate(h) {
    // "Students are allowed to complete up to two of their ancient studies major requirements for Pass/No Pass." (counted below)
    h.policy = undefined

    const lang = h.options('language', 'Elementary Greek or Latin (two quarters)', 'The lower-division sequence in elementary ancient Greek or Latin language (or equivalent):', [
      ['GREE 1', 'GREE 2'],
      ['LATN 1', 'LATN 2'],
    ])
    const survey = h.take('survey', 'Ancient studies survey', 'One lower-division survey of ancient history or literature in translation:', codes(...SURVEY))
    const gl = h.take('greek-latin', 'Three Greek and/or Latin literature courses', 'Three 5-credit upper-division courses in Greek (LIT 184A-LIT 184Z) and/or Latin literature (LIT 186A-LIT 186Z):', GREEK_LATIN, {
      n: 3,
      pool: 'LIT 184 series (Greek) or LIT 186 series (Latin), 5 credits',
      repeatable: 'catalog',
    })
    const electives = h.take('electives', 'Six upper-division electives', 'Six additional ancient studies 5-credit upper-division courses:', codes(...ELECTIVES).or(GREEK_LATIN), {
      n: 6,
      repeatable: 'catalog',
    })
    const seminar = h.take('ancs197f', 'CLST 197F comprehensive preparatory seminar (2 credits)', ['an additional two-credit upper-division seminar, CLST 197F, which is taken in the same quarter that the senior comprehensive examination is given', 'Enrollment in a 2-credit comprehensive examination preparatory course, CLST 197F, is required in the same quarter that the senior comprehensive examination will be given.'], SEMINAR, {
      pool: 'CLST 197F (renumbered ANCS 197F)',
    })
    // DC: an overlay — the DC courses are also among the upper-division courses.
    const dc = h.take('dc', 'Two Greek or Latin literature courses beyond the introductions', ['The DC requirement in ancient studies is satisfied by completing two 5-credit upper-division courses in Greek literature or Latin literature from the following list:'], codes(...DC), {
      n: 2,
      exclusive: false,
      repeatable: 'catalog',
    })
    h.solve()

    // "(or equivalent)" + "consult with the ancient studies faculty to determine
    // if they have satisfied any of the elementary language course
    // requirements": a faculty determination, asked only when the sequence is
    // not in the plan.
    const langNode = lang.status === 'met'
      ? lang
      : h.either('language-or-equivalent', 'Elementary Greek or Latin (or equivalent)', 'Students with prior knowledge of ancient Greek or Latin are advised to consult with the ancient studies faculty to determine if they have satisfied any of the elementary language course requirements.', [lang, h.attest('language-equivalent')])

    return [
      h.group('lower', 'Lower-Division Courses', [langNode, survey]),
      h.group('upper', 'Upper-Division Courses', [gl]),
      h.group('electives-group', 'Electives', [electives]),
      h.group('dc-group', 'Disciplinary Communication (DC) Requirement', [dc]),
      h.group('comprehensive', 'Comprehensive Requirement', [h.attest('comprehensive-exam'), seminar]),
      pnpLimit(h, [lang, survey, gl, electives, seminar], ALL, 'Students are allowed to complete up to two of their ancient studies major requirements for Pass/No Pass.'),
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
