// Mathematics Theory and Computation B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/mathematics-theory-and-computation-bs.md
//
// Core: calculus, linear algebra, multivariable, ODE; MATH 100, a coding
// course, one course from each of four lists (analysis theory, algebra
// theory, analysis computation, algebra computation); three electives from an
// explicit list, where extra courses from the two COMPUTATION lists also
// count ("If a student takes more than one course from the Analysis or
// Algebra Computation requirement lists, the extra course(s) can be counted
// toward the elective requirements"). Unlike the B.A./B.S., the page gives no
// such allowance for the theory lists and no MATH 101–190 range, so a second
// theory-list course does not count as an elective.
//
// Computer Science B.S. double majors may petition to use CSE courses for the
// coding requirement and the electives: a CSE course is only used when needed,
// and then the petition is an attestation.
import { codes, defineHarness, range } from '@harness'
import type { Enrollment, Node } from '@harness'

const CODING = ['MATH 152', 'ASTR 119', 'EART 112', 'EART 119A', 'PHYS 115']
const ANALYSIS_COMP = ['MATH 145', 'MATH 148', 'AM 114', 'AM 147']
const ALGEBRA_COMP = ['MATH 115', 'MATH 116', 'MATH 134', 'MATH 140', 'MATH 160', 'MATH 162']
const ELECTIVE_LIST = [
  // 2025-26: MATH 114 and MATH 139 are not on this edition's elective list.
  'MATH 106', 'MATH 107', 'MATH 118', 'MATH 120', 'MATH 124', 'MATH 125',
  'STAT 108', 'STAT 131', 'STAT 132', 'AM 107', 'AM 115', 'AM 129', 'AM 148', 'ASTR 111', 'BME 118',
  'EART 124', 'EART 125', 'EART 162', 'EART 172', 'ECE 103', 'ECE 130', 'ECE 135', 'ECE 141', 'ECE 151',
  'ECE 153', 'ECON 104', 'ECON 113', 'ECON 114', 'ECON 124', 'ECON 166A', 'ECON 166B', 'PHYS 116C',
  'PHYS 139A', 'PHYS 139B', 'PHYS 171',
  // "PHYS 171 [/ASTR 171]": the current catalog no longer records the
  // cross-listing, so the 2025-26 partner code is listed explicitly.
  'ASTR 171',
]
// Cross-listed partners named on the page ("AM 107 [/PHYS 107]", "ECON 166A [/CSE 166A]", …)
// are the same course to the library, so PHYS 107, OCEA 172, CSE 166A/B need no listing.

// "Students who have taken a lower-division coding course can request a
// substitution for the coding requirement." The page names no list; these are
// the UCSC lower-division programming courses (Java, C, Python, assembly/C).
const LD_CODING = codes('CSE 5J', 'CSE 12', 'CSE 13S', 'CSE 20', 'CSE 30')
const Q_SUBST = 'Students who have taken a lower-division coding course can request a substitution for the coding requirement.'

const Q_PETITION =
  'Students who are declared in the Computer Science B.S. and wish to double major in the Mathematics Theory and Computation B.S. may petition to use CSE courses toward the upper-division coding requirement and the three required upper-division electives for the Mathematics Theory and Computation B.S. major.'
const Q_ELECTIVES =
  'Three elective courses are required. If a student takes more than one course from the Analysis or Algebra Computation requirement lists, the extra course(s) can be counted toward the elective requirements. Other elective options are listed below.'

/** CSE courses usable only under the CS double-major petition (ECON 166A/B's cross-listed CSE codes excluded: they are listed electives). */
const PETITION_CSE = range('CSE', 100, 199).except(['ECON 166A', 'ECON 166B'])

export default defineHarness({
  program: 'mathematics-theory-and-computation-bs',
  edition: '2025-26',
  title: 'Mathematics Theory and Computation B.S.',
  attestations: [
    {
      id: 'cse-petition',
      label: 'Declared in the Computer Science B.S. with an approved petition to use CSE courses',
      quote: Q_PETITION,
      aliases: ['cse petition', 'computer science double major', 'cs double major'],
    },
    {
      id: 'coding-substitution',
      label: 'Approved substitution of a lower-division coding course for the coding requirement',
      quote: Q_SUBST,
      aliases: ['coding substitution', 'coding requirement substitution'],
    },
  ],
  notes: [
    'There are no grading-option restrictions for Mathematics Department courses (P/NP counts).',
    'Course substitutions and courses taken abroad need approval from the Mathematics Department (exception to policy request).',
  ],
  evaluate(h) {
    // "There are no restrictions on grading options for Mathematics Department courses."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('linalg', 'Linear algebra (MATH 21 or AM 10)', 'Plus one of the following courses:', codes('AM 10', 'MATH 21'), { notes: ['MATH 21 is preferred.'] }),
      h.options('multivar', 'MATH 23A + 23B, or AM 30 + AM 100', 'Plus one of the following options:', [['MATH 23A', 'MATH 23B'], ['AM 30', 'AM 100']], {
        notes: ['MATH 23A and MATH 23B are preferred.'],
      }),
      h.take('ode', 'Differential equations (MATH 24 or AM 20)', 'Plus one of the following courses:', codes('AM 20', 'MATH 24'), { notes: ['MATH 24 is preferred.'] }),
    ])

    const isPetitionCse = (code: string) => PETITION_CSE.has(code, h.catalog)
    const preferNonCse = (code: string) => (isPetitionCse(code) ? 1 : 0)
    const hasCse = h.taken(PETITION_CSE).length > 0
    const codingSet = hasCse ? codes(...CODING).or(PETITION_CSE) : codes(...CODING)
    const codingNotes = [
      'MATH 152 is preferred; ASTR 119, EART 112, EART 119A and PHYS 115 are intended for double majors.',
      'Students who have taken a lower-division coding course can request a substitution for the coding requirement; “or equivalent” courses need department approval.',
    ]
    // No upper-division coding course at all, but a lower-division coding
    // course: the substitution the page offers is the only path, so ask for it.
    const ldCoding = h.taken(codingSet).length === 0 ? h.taken(LD_CODING) : []
    const coding = ldCoding.length
      ? h.attest('coding-substitution', 'Coding requirement (by substitution)', {
          detail: `No listed coding course; ${ldCoding.map((e) => e.display).join(', ')} can stand in only with an approved substitution.`,
          used: ldCoding,
          notes: codingNotes,
        })
      : h.take('coding', 'Coding requirement', ['Plus one of the following courses or equivalent:', Q_PETITION], codingSet, { prefer: preferNonCse, notes: codingNotes })
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('math100', 'MATH 100', 'The following course:', codes('MATH 100')),
      coding,
      h.take('analysis-theory', 'Analysis Theory (MATH 103A or 105A)', 'Plus one of the following courses:', codes('MATH 103A', 'MATH 105A')),
      h.take('algebra-theory', 'Algebra Theory (MATH 110, 111A, 111T or 117)', 'Plus one of the following courses:', codes('MATH 110', 'MATH 111A', 'MATH 111T', 'MATH 117')),
      h.take('analysis-comp', 'Analysis Computation (MATH 145, 148, AM 114 or 147)', ['Plus one of the following courses:', 'Students who take more than one course from the Analysis Computation Requirement may use the extra courses toward the three major electives requirement.'], codes(...ANALYSIS_COMP)),
      h.take('algebra-comp', 'Algebra Computation (MATH 115, 116, 134, 140, 160 or 162)', ['Plus one of the following courses:', 'Students who take more than one course from the Algebra Computation Requirement may use the extra courses toward the three major electives requirement.'], codes(...ALGEBRA_COMP)),
    ])

    const electiveSet = codes(...ELECTIVE_LIST, ...ANALYSIS_COMP, ...ALGEBRA_COMP)
    const electivesTake = h.take('electives-courses', 'Three electives', [Q_ELECTIVES, Q_PETITION], hasCse ? electiveSet.or(PETITION_CSE) : electiveSet, {
      n: 3,
      prefer: preferNonCse,
      notes: ['Courses from departments other than Mathematics, Statistics or Applied Math have significant prerequisites and are intended for double majors.'],
    })
    const electives = h.group('electives', 'Electives', [electivesTake], { quote: Q_ELECTIVES })

    // Comprehensive: MATH 194 or 195 (not used by any other course slot).
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement (MATH 194 or 195)', 'The comprehensive exit requirement in mathematics is satisfied by one of the following courses:', codes('MATH 194', 'MATH 195'))

    h.solve()
    // A CSE course was needed → it counts only under the CS double-major petition.
    const viaPetition = (n: Node) => (n.used ?? []).filter((e: Enrollment) => isPetitionCse(e.code))
    // The petition is shown where the CSE course was used, so the right
    // requirement is blamed when it is missing.
    const petition = (used: Enrollment[], id?: string) =>
      h.attest('cse-petition', undefined, { detail: `${used.map((e) => e.display).join(', ')} ${used.length > 1 ? 'count' : 'counts'} only under an approved petition (CS B.S. double majors).`, ...(id ? { id } : {}) })
    const cseCoding = viaPetition(coding)
    const cseElectives = viaPetition(electivesTake)
    if (cseCoding.length) upper.children!.push(petition(cseCoding))
    if (cseElectives.length) electives.children!.push(petition(cseElectives, cseCoding.length ? 'attest:cse-petition:electives' : undefined))

    // DC: MATH 100 plus MATH 194/195 — courses already counted above (overlay).
    const dcQuote = 'The DC requirement in the mathematics B.S. is satisfied by:'
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-math100', 'MATH 100', dcQuote, codes('MATH 100'), { exclusive: false }),
      h.take('dc-senior', 'MATH 194 or MATH 195', [dcQuote, 'Plus one of the following courses:'], codes('MATH 194', 'MATH 195'), { exclusive: false }),
    ], { quote: dcQuote })

    return [lower, upper, electives, comprehensive, dc]
  },
})
