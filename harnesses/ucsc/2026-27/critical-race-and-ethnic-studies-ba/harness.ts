// Critical Race and Ethnic Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/critical-race-and-ethnic-studies-ba.md
//
// 10 courses: CRES 10 + one lower-division elective, CRES 100 + 101, five
// upper-division electives and one senior comprehensive seminar, all with P,
// C or better. The upper-division electives and the Transnational / Social
// Movements lists live on the external "CRES B.A. Electives List" page, which
// is not in the committed source. So:
//   - an upper-division CRES course (or one cross-listed with CRES) is taken
//     to be on the General Electives list; any other upper-division course is
//     `cannot-check` (look it up on the list), never silently met;
//   - the student says which of their elective courses covers each of the two
//     Transnational and one Social Movements slots (declared choices,
//     validated here); undeclared ⇒ cannot-check.
import { NONE, anyOf, canon, codes, defineHarness, display, parseCode, range, series, subject } from '@harness'
import type { ChoiceDef, CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const LD_LIST = [
  'CRES 12', 'CRES 14', 'CRES 15', 'CRES 25', 'CRES 45', 'CRES 60E', 'CRES 68', 'CRES 70B', 'CRES 70S',
  'CRES 70U', 'HIS 9C', 'HISC 83',
]

// Comprehensive: any CRES 190-series course ("Any CRES 190 series course that
// is listed in a subsequent General Catalog will also satisfy"), plus the
// listed seminars outside CRES (cross-listed codes are one course).
const COMP_LISTED = [
  'ANTH 196G', 'CRES 190A', 'CRES 190B', 'CRES 190C', 'CRES 190D', 'CRES 190E', 'CRES 190F',
  'CRES 190I', 'CRES 190L', 'CRES 190N', 'CRES 190P', 'CRES 190T', 'CRES 190W', 'CRES 190X', 'CRES 190Y',
  'FMST 194K', 'FMST 194M', 'FMST 194O', 'FMST 194Q', 'CRES 190R',
  'CRES 190U', 'CRES 190V',
]
const COMPREHENSIVE = series('CRES', 190).or(codes(...COMP_LISTED))

// "language study, internships, and individual or group independent studies"
// count only by petition.
const CRES_INDEPENDENT = range('CRES', 192, 199)

const Q_ELECTIVES =
  'Students must complete five upper-division electives. These courses are chosen from the General Electives, Transnational, and Social Movements lists on the [CRES B.A. Electives List page](https://catalog.ucsc.edu/en/current/general-catalog/academic-units/humanities-division/critical-race-and-ethnic-studies/critical-race-and-ethnic-studies-elective-list).'
const Q_COMP_NOT_ELECTIVE = 'The course used to satisfy the senior comprehensive will not count as one of the five upper-division electives, however additional courses taken will.'
const Q_COMP_NOT_BREADTH = 'Senior comprehensive courses do not count toward the transnational or social movements requirements.'
const Q_BOTH = 'One class may count toward both the Transnational and Social Movement requirements, however, a total of five upper-division electives must still be completed.'

const BREADTH: { key: string; label: string; quote: string[] }[] = [
  { key: 'transnational_1', label: 'Transnational list course (1 of 2)', quote: ['Two must be from the Transnational list,'] },
  { key: 'transnational_2', label: 'Transnational list course (2 of 2)', quote: ['Two must be from the Transnational list,'] },
  { key: 'social_movements', label: 'Social Movements list course', quote: ['One must be from the Social Movements list, and', Q_BOTH] },
]

const parseCourse = (raw: string) => (/^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(raw.trim()) ? canon(raw) : undefined)

export default defineHarness({
  program: 'critical-race-and-ethnic-studies-ba',
  edition: '2026-27',
  title: 'Critical Race and Ethnic Studies B.A.',
  choices: BREADTH.map(
    (b): ChoiceDef => ({
      key: b.key,
      label: `Course for: ${b.label}`,
      quote: b.quote[0],
      options: [],
      free: true,
      parse: parseCourse,
    }),
  ),
  notes: [
    'Every requirement needs a grade of P, C (2.0), or better.',
    'The General Electives, Transnational and Social Movements lists are on the department’s CRES B.A. Electives List page, which the app does not have: upper-division CRES courses are assumed to be on it; check other courses there, and tell the dashboard which courses cover the Transnational and Social Movements requirements.',
    'Up to two courses not on the electives list (or language study, internships, independent studies) may count by petition — add them once approved.',
  ],

  evaluate(h) {
    // "Students must complete all requirements for the major with a grade of P, C (2.0), or better."
    h.policy = { min: 'C', pCounts: true }
    const cat = h.catalog

    // Upper-division courses of any subject in the plan (the external list may hold any of them).
    const subjects = [...new Set(h.enrollments.map((e) => parseCode(e.code).subject))]
    const udAny: CourseSet = subjects.length ? anyOf(...subjects.map((s) => subject(s, 'upper'))) : NONE
    // "Courses which are cross-listed with a CRES course may also count toward this requirement."
    const cresUD: CourseSet = subject('CRES', 'upper')
      .or(udAny.where((c) => c.crossListed.some((x) => x.startsWith('CRES')), 'cross-listed with CRES'))
      .except(CRES_INDEPENDENT)
    const isCresUD = (code: string) => cresUD.has(code, cat)

    // --- lower division ---------------------------------------------------
    const ldElective = h.take(
      'ld-elective',
      'One lower-division CRES elective',
      ['Plus one of the following lower-division electives:', 'Students, may satisfy the lower-division elective requirement with an additional upper-division, however it must be a CRES designated course or cross-listed with a CRES course.'],
      codes(...LD_LIST).or(cresUD),
      { prefer: (c) => (codes(...LD_LIST).has(c) ? 0 : 1), pool: `${LD_LIST.map(display).join(', ')}; or an additional upper-division CRES (or CRES cross-listed) course` },
    )
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('cres10', 'CRES 10 Critical Race and Ethnic Studies: An Introduction', 'Take the following course', codes('CRES 10')),
      ldElective,
    ])

    // --- upper division ---------------------------------------------------
    const dcTerms = h.taken(codes('CRES 101')).map((e) => e.term)
    const core = h.all('core', 'CRES 100 and CRES 101', 'Take the following courses:', ['CRES 100', 'CRES 101'])
    const electives = h.take('ud-electives', 'Five upper-division electives', [Q_ELECTIVES, Q_COMP_NOT_ELECTIVE], udAny.except(codes('CRES 100', 'CRES 101')), {
      n: 5,
      prefer: (c) => (isCresUD(c) ? 0 : CRES_INDEPENDENT.has(c) ? 2 : 1),
      pool: 'upper-division courses on the CRES B.A. Electives List (upper-division CRES courses count; check others on the list)',
    })
    const comp = h.take('comprehensive', 'Senior seminar (CRES 190 series or listed)', [
      'The comprehensive requirement is fulfilled by completing a senior seminar from the CRES 190 series or one of the other senior seminars listed below.',
      'Any CRES 190 series course that is listed in a subsequent General Catalog will also satisfy the comprehensive requirement.',
    ], COMPREHENSIVE, {
      pool: `any CRES 190-series course, or ${COMP_LISTED.filter((c) => !c.startsWith('CRES')).join(', ')}`,
      // "Students must complete their DC requirement prior to the Senior Seminar."
      check: (chosen) => {
        const sem = chosen[0]
        if (!dcTerms.length || sem.term == null || dcTerms.some((t) => t == null || t < sem.term!)) return null
        return `${sem.display} is not after CRES 101 (DC must be completed before the senior seminar)`
      },
    })

    h.solve()

    // Electives outside CRES (or petition-only CRES independent study) must be checked on the list.
    if (electives.status === 'met') {
      const unsure = (electives.used ?? []).filter((e) => !isCresUD(e.code))
      if (unsure.length) {
        electives.status = 'cannot-check'
        electives.detail = `Check that ${unsure.map((e) => e.display).join(', ')} ${unsure.length > 1 ? 'are' : 'is'} on the CRES B.A. Electives List${unsure.some((e) => CRES_INDEPENDENT.has(e.code)) ? ' (independent study counts only by petition)' : ''}.`
      }
    }

    const electiveCourses: Enrollment[] = [...(ldElective.used ?? []), ...(electives.used ?? [])]
    const breadth = breadthNodes(h, electiveCourses, comp.used ?? [])
    const cresOne = electiveCourses.filter((e) => isCresUD(e.code))
    const oneCres = h.node(
      'one-cres-ud',
      'One upper-division CRES course among the electives',
      ['One must be an upper-division CRES course. This course may overlap with the transnational or social movements course. Courses which are cross-listed with a CRES course may also count toward this requirement.'],
      cresOne.length ? 'met' : 'unmet',
      { used: cresOne.slice(0, 1), detail: cresOne.length ? undefined : 'None of the courses counted as electives is an upper-division CRES (or CRES cross-listed) course.' },
    )

    const upper = h.group('upper', 'Upper-Division Courses', [
      core,
      electives,
      h.group('breadth', 'Among the lower- and upper-division electives', [...breadth, oneCres], {
        quote: 'Among the lower-division and upper-division elective courses taken:',
      }),
    ])
    const dc = h.take('dc', 'Disciplinary Communication (DC): CRES 101', 'The DC requirement in CRES is satisfied by the following course.', codes('CRES 101'), { exclusive: false })
    const comprehensive = h.group('comprehensive-req', 'Comprehensive Requirement', [comp], {
      notes: ['Prerequisites for the CRES 190 series include CRES 10, CRES 100 and CRES 101.'],
    })
    const qualification = h.info(
      'qualification',
      'Major qualification',
      'To declare the CRES major, students are required to have completed any 5-credit CRES-designated course with a passing grade (C or P) or better.',
      'Gates declaration, not completion.',
    )
    return [lower, upper, dc, comprehensive, qualification]
  },
})

/** Transnational ×2 and Social Movements ×1, declared by the student from their elective courses. */
function breadthNodes(h: HarnessContext, electiveCourses: Enrollment[], compUsed: Enrollment[]): Node[] {
  const candidates = [...new Set(electiveCourses.map((e) => e.code))]
  // Cross-listed codes are one course (CRES 130 = ANTH 130F): compare by course.
  const course = (code: string) => [canon(code), ...h.catalog.equivalents(code)].sort()[0]
  const counted = (code: string) => electiveCourses.filter((e) => course(e.code) === course(code))
  const compCourses = new Set(compUsed.map((e) => course(e.code)))
  const chosenT = new Map<string, string>() // transnational course -> slot label
  return BREADTH.map((b) => {
    const id = `breadth-${b.key}`
    const code = h.choice(b.key)
    const quote = [...b.quote, Q_COMP_NOT_BREADTH]
    if (!code) {
      if (!candidates.length)
        return h.node(id, b.label, quote, 'unmet', { detail: 'No elective courses in your plan yet.', choice: b.key })
      return h.cannotCheck(id, b.label, quote, 'Check the CRES B.A. Electives List, then pick which of your elective courses is on this list.', {
        choice: b.key,
        options: candidates,
      })
    }
    const fail = (detail: string) => h.node(id, b.label, quote, 'unmet', { detail, choice: b.key, options: candidates })
    // "Senior comprehensive courses do not count toward the transnational or
    // social movements requirements." — the one used for the comprehensive and
    // any additional senior seminar counted as an elective.
    if (compCourses.has(course(code)) || COMPREHENSIVE.has(code, h.catalog))
      return fail(`${display(code)} is a senior comprehensive course, which does not count toward this requirement.`)
    const got = counted(code)
    if (!got.length) return fail(`${display(code)} is not one of the courses counted as your lower- or upper-division electives.`)
    if (b.key.startsWith('transnational')) {
      const dup = chosenT.get(course(code))
      if (dup) return fail(`${display(code)} is already your ${dup}; the two Transnational courses must differ.`)
      chosenT.set(course(code), b.label)
    }
    return h.node(id, b.label, quote, 'met', { used: got.slice(0, 1), detail: 'Per your list assignment.', choice: b.key, options: candidates })
  })
}
