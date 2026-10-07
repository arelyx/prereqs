// Environmental Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/environmental-studies-ba.md
//
// Shape: shared lower division; ENVS 100/100L; electives that differ by
// concentration (general major, GIS, Global Environmental Justice,
// Conservation Science and Policy); DC overlay; comprehensive overlay.
//
// Judgement calls (see comments in place):
//  - No concentration declared = the general major ("available either without
//    a concentration or in conjunction with one of three").
//  - The comprehensive (and DC) are overlays that may reuse elective courses
//    (kept from 2026-27; in 2025-26 ENVS 183A/195A are no longer electives, but
//    BIOE 151B is both a natural-science elective and a comprehensive option).
//  - 2025-26 vs 2026-27: electives are ENVS 101–179 only (no ENVS 183A/195A,
//    no "not both"); natural list adds BIOE 125, drops ENVS 142; social course
//    list adds BME 80G, PHIL 22/24/28; CSP electives add BIOE 125; CSP field
//    list adds BIOE 145 (+145L); no ENVS 196G except as the GIS comprehensive
//    seminar; chemistry needs CHEM 3BL (or CHEM 1A); up to two substitution
//    courses (department's pre-approved list or petition) — §1a: declared by
//    the student (choice), undeclared candidates → cannot-check.
//  - Natural/social-science lists on the page are used as given; the BIOE 151
//    supercourse courses on the natural-science list count as electives for
//    the concentrations whose elective text points at that list.
//  - "Associated labs are required only when required by the lecture": per the
//    catalog, ENVS 104A and ENVS 130A require concurrent 104L / 130L.
import { canon, codes, defineHarness, policyFailure, range } from '@harness'
import type { CourseSet, Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

// Cross-listed partners ("ENVS 130B [/LGST 130B]") are one course in the library.
const NATURAL = [
  'ENVS 104A', 'ENVS 106A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'BIOE 151A', 'BIOE 151B',
  'BIOE 151C', 'BIOE 151D', 'ENVS 120', 'ENVS 122', 'ENVS 123', 'BIOE 125', 'ENVS 130A', 'ENVS 130C', 'ENVS 131',
  'ENVS 133', 'ENVS 135', 'ENVS 160', 'ENVS 161A', 'ENVS 162', 'ENVS 163', 'ENVS 164',
  'ENVS 166', 'ENVS 167', 'ENVS 168', 'ENVS 169', 'ENVS 170',
]
const SOCIAL = [
  'ENVS 110', 'ENVS 130B', 'ENVS 140', 'ENVS 141', 'ENVS 143', 'ENVS 144', 'ENVS 145', 'ENVS 147',
  'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 152', 'ENVS 154', 'ENVS 158', 'ENVS 165', 'ENVS 172',
  'ENVS 173', 'ENVS 174', 'ENVS 176', 'ENVS 178',
]
const EJ = [
  'ENVS 130B', 'ENVS 140', 'ENVS 143', 'ENVS 144', 'ENVS 147', 'ENVS 152', 'ENVS 154', 'ENVS 158',
  'ENVS 172', 'ENVS 173', 'ENVS 174', 'ENVS 176', 'ENVS 178', 'JRLC 135', 'SOCY 185',
]
const CSP_ELECTIVES = [
  'ENVS 110', 'ENVS 115A', 'ENVS 115B', 'ENVS 120', 'ENVS 122', 'ENVS 123', 'ENVS 140', 'ENVS 141',
  'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 160', 'ENVS 165', 'ENVS 167', 'BIOE 125', 'ENVS 106A', 'ENVS 108',
  'ENVS 152', 'ENVS 154',
]
const FIELD = [
  'ENVS 104A', 'ENVS 106A', 'ENVS 107A', 'ENVS 107B', 'ENVS 107C', 'ENVS 108', 'ENVS 167', 'BIOE 151A',
  'BIOE 151B', 'BIOE 151C', 'BIOE 151D', 'BIOE 112', 'BIOE 114', 'BIOE 117', 'BIOE 124', 'BIOE 128L',
  'BIOE 141L', 'BIOE 145', 'BIOE 150', 'BIOE 161', 'EART 189A', 'BIOE 163',
]
// "If a lecture has a lab offered (required or optional), the lab must be taken to count for this requirement."
const FIELD_PAIRS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 167', 'ENVS 167L'],
  ['BIOE 112', 'BIOE 112L'], ['BIOE 114', 'BIOE 114L'], ['BIOE 117', 'BIOE 117L'], ['BIOE 124', 'BIOE 124L'],
  ['BIOE 145', 'BIOE 145L'], ['BIOE 150', 'BIOE 150L'], ['BIOE 161', 'BIOE 161L'], ['BIOE 163', 'BIOE 163L'],
]
// CEC field course (XENV 188; the DC note calls it NRS/ENVS 188). Not in the course catalog.
const CEC = ['XENV 188', 'ENVS 188']

// Elective lecture/lab pairs: a lab is absorbed into its lecture's unit.
const ELECTIVE_PAIRS: [string, string][] = [
  ['ENVS 104A', 'ENVS 104L'], ['ENVS 106A', 'ENVS 106M'], ['ENVS 108', 'ENVS 108L'], ['ENVS 115A', 'ENVS 115L'],
  ['ENVS 130A', 'ENVS 130L'], ['ENVS 162', 'ENVS 162L'], ['ENVS 163', 'ENVS 163L'], ['ENVS 167', 'ENVS 167L'],
]
// Catalog: "Concurrent enrollment in ENVS 104L is required." / "Concurrent enrollment in ENVS 130L ..."
const LAB_REQUIRED: [string, string][] = [['ENVS104A', 'ENVS104L'], ['ENVS130A', 'ENVS130L']]
function requiredLabs(chosen: Enrollment[]): string | null {
  for (const [lec, lab] of LAB_REQUIRED)
    if (chosen.some((e) => e.code === lec) && !chosen.some((e) => e.code === lab))
      return `${lec.replace('ENVS', 'ENVS ')} counts only with its required lab ${lab.replace('ENVS', 'ENVS ')}`
  return null
}

const NATURAL_SET = codes(...NATURAL)
const SOCIAL_SET = codes(...SOCIAL)
// "ENVS 101-179" (5 credits or more; ENVS 104A is 2 credits but counts with
// its 5-credit lab).
const ENVS_POOL = range('ENVS', 101, 179).minCredits(5).or(codes('ENVS 104A', ...SOCIAL))
const LISTED_POOL = ENVS_POOL.or(NATURAL_SET)

const Q_CHEM_NOTE = 'Note: This requirement may also be satisfied with prior completion of CHEM 1A or equivalent.'
const Q_SUBST =
  'Single environmental studies students can petition up to two upper-division courses to count toward the single environmental studies major requirements. These two substitutions courses may be the following:'
const Q_SUBST_LIST = 'Pre-approved substitution courses: See the department website for a list of classes that can be taken without petition, as a substitution for an ENVS elective.'

/** Free-form course list: "BIOE 107, SOCY 130" → canonical, comma-joined. */
function parseList(raw: string): string | undefined {
  const out = raw
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter((x) => /^[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}$/.test(x))
    .map(canon)
  return out.length ? [...new Set(out)].join(',') : undefined
}
const Q_LABS = 'Associated labs are required only when required by the lecture.'
const Q_COMP_LETTER = 'All courses used to satisfy the senior comprehensive requirement must be taken for a letter grade.'
const Q_DC = 'The DC requirement in environmental studies is satisfied by completing'
const Q_MATH_NOTE = 'May also be satisfied with a score of 3 or higher on the AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement Exam.'
const MATH = codes('AM 3', 'AM 11A', 'AM 11B', 'MATH 3', 'MATH 11A', 'MATH 16A', 'MATH 19A')
// "Students with advanced skills in one of the graduate focal areas may also
// take a graduate seminar by invitation from the instructor." (general major
// only) — an ENVS graduate seminar, asked about only when no listed option is met.
const Q_GRAD = 'Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor.'
const GRAD_SEMINAR = range('ENVS', 200, 296).where((c) => !/Laborator/i.test(c.title), 'not a laboratory')

type Conc = 'general' | 'gis' | 'gej' | 'csp'

export default defineHarness({
  program: 'environmental-studies-ba',
  edition: '2025-26',
  title: 'Environmental Studies B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'The major is available either without a concentration or in conjunction with one of three more specialized concentrations that provide depth in particular areas of expertise.',
      options: [
        { value: 'general', label: 'General major (no concentration)', aliases: ['general', 'none', 'no concentration', 'general major'] },
        { value: 'gis', label: 'Geographic Information Systems', aliases: ['gis', 'geographic information systems concentration'] },
        { value: 'gej', label: 'Global Environmental Justice', aliases: ['gej', 'environmental justice', 'global environmental justice concentration'] },
        { value: 'csp', label: 'Conservation Science and Policy', aliases: ['csp', 'conservation', 'conservation science and policy concentration'] },
      ],
      // A student who has not declared a concentration is in the general major.
      default: 'general',
    },
    {
      // §1a external list: the department website's pre-approved substitution
      // list, or a course approved by petition — the student declares them.
      key: 'substitutions',
      label: 'Up to two upper-division substitution courses for ENVS electives (on the department’s pre-approved list, or approved by petition)',
      quote: Q_SUBST,
      options: [],
      free: true,
      parse: parseList,
    },
  ],
  attestations: [
    {
      id: 'math-placement',
      label: 'Scored 300 or higher on the ALEKS Math Placement Exam (in place of the math course)',
      quote: 'May also be satisfied with a score of 3 or higher on the AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement Exam.',
      aliases: ['aleks', 'math placement', 'placement exam'],
    },
    {
      id: 'grad-seminar-invitation',
      label: 'Invited by the instructor to take a graduate seminar for the senior comprehensive',
      quote: Q_GRAD,
      aliases: ['graduate seminar', 'grad seminar'],
    },
  ],
  coverage: {
    unknownOk: {
      XENV188: 'California Ecology and Conservation (CEC) field course named on the page; not in the course catalog',
      ENVS188: 'NRS/ENVS 188 (CEC course) named in the DC note; not in the course catalog',
    },
  },
  notes: [
    'No letter-grade policy except the senior comprehensive, which must be taken for a letter grade.',
    'Up to two upper-division substitution courses may count as ENVS electives: classes on the department website’s pre-approved substitution list, or courses approved by petition (outside ENVS or UC Santa Cruz, EAP, Wildlands Studies, Sierra Institute). List them under “substitutions”.',
    'NRS/ENVS 188 or NRS/BIOL 188 (California Ecology and Conservation), taken spring 2023 or later, gives 1/2 DC credit — confirm with an ENVS advisor how to complete the other half.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy, except that the course(s) taken to fulfill the senior comprehensive requirement must be taken for a letter grade."
    h.policy = undefined
    const conc = (h.choice('concentration') ?? 'general') as Conc

    // §1a test-out: "May also be satisfied with a score of 3 or higher on the
    // AP Calculus exam or a score of 300 or higher on the ALEKS Math Placement
    // Exam." AP credit is a course in the plan; ALEKS is an attestation offered
    // only when no listed math course is in the plan.
    const math = h.take('math', 'Mathematics', ['Plus one of the following courses:', Q_MATH_NOTE], MATH, {
      notes: ['AP Calculus (score 3+): add the exam credit to your plan as the course it grants.'],
    })
    const lower = h.group('lower', 'Lower-Division Courses', [
      chemistry(h),
      h.take('ecology', 'ENVS 24 or BIOE 20C', 'Plus one of the following courses:', codes('ENVS 24', 'BIOE 20C')),
      h.take('envs25', 'ENVS 25', 'Plus the following course:', codes('ENVS 25')),
      math,
      h.options('stats', 'Statistics series', 'Plus one of these statistics series:', [['STAT 7', 'STAT 7L'], ['STAT 17', 'STAT 17L']]),
      h.take('social', 'Social science course', 'Plus one of the following:', codes('ANTH 2', 'BME 80G', 'PHIL 22', 'PHIL 24', 'PHIL 28', 'SOCY 1', 'SOCY 10', 'SOCY 15', 'ENVS 26')),
    ], { notes: ['Continuing students must complete all lower-division requirements before taking ENVS 100 and ENVS 100L.'] })

    const core = h.all('envs100', 'ENVS 100 and ENVS 100L', 'Students are required to complete the following upper-division courses:', ['ENVS 100', 'ENVS 100L'], {
      notes: ['ENVS 100 and ENVS 100L are offered in winter and spring.'],
    })

    // Declared substitution courses (at most two count; upper-division only).
    const declared = (h.choice('substitutions') ?? '').split(',').filter(Boolean)
    const SUB = codes(...declared).where((c) => c.division === 'upper', 'upper-division')
    const subOpts = declared.length
      ? { atMost: [{ set: SUB, n: 2, label: 'at most two substitution courses' }], prefer: (c: string) => (SUB.has(c, h.catalog) ? 1 : 0) }
      : {}

    const upperExtra: Node[] = []
    let electives: Node
    if (conc === 'general') {
      electives = h.take(
        'electives',
        'Seven upper-division electives',
        [
          'Students take seven, 5-credit or more upper-division electives from ENVS 101-179.',
          Q_LABS,
          'At least one course must be from the list below of courses based in the natural sciences',
          'At least one course must be from the list below of courses based in the social sciences',
          Q_SUBST,
          Q_SUBST_LIST,
        ],
        LISTED_POOL.or(SUB),
        electiveOpts(7, true),
      )
    } else if (conc === 'gis') {
      upperExtra.push(h.all('gis-core', 'GIS courses', 'Plus all of the following:', ['ENVS 115A', 'ENVS 115L', 'ENVS 115B', 'ENVS 115C']))
      electives = h.take(
        'electives',
        'Four upper-division electives',
        [
          'Students take four, 5-credit or more upper-division electives from ENVS 101-179.',
          Q_LABS,
          'At least one course must be from the list below of courses based in the natural sciences',
          'At least one course must be from the list below of courses based in the social sciences',
          Q_SUBST,
          Q_SUBST_LIST,
        ],
        LISTED_POOL.or(SUB),
        { ...electiveOpts(4, true), notes: ['The department strongly recommends at least one internship related to GIS applications.'] },
      )
    } else if (conc === 'gej') {
      upperExtra.push(h.take('ej-electives', 'Four environmental justice electives', 'Plus four of the following environmental justice electives:', codes(...EJ), { n: 4 }))
      // "Among those four courses, at least one course must be from the list
      // below of courses based in the natural sciences." The EJ list has no
      // natural-science course, so this constrains the three additional electives.
      electives = h.take(
        'electives',
        'Three additional upper-division electives',
        [
          'Students take three, 5-credit or more upper-division electives from ENVS 101-179.',
          Q_LABS,
          'Among those four courses, at least one course must be from the list below of courses based in the natural sciences.',
          Q_SUBST,
          Q_SUBST_LIST,
        ],
        LISTED_POOL.or(SUB),
        electiveOpts(3, false),
      )
    } else {
      upperExtra.push(
        h.take('csp-conservation', 'ENVS 120, ENVS 160, or BIOE 165', 'Plus one of the following:', codes('ENVS 120', 'ENVS 160', 'BIOE 165')),
        h.take('csp-policy', 'ENVS 140 or ENVS 150', 'Plus one of the following:', codes('ENVS 140', 'ENVS 150')),
        h.take('csp-electives', 'Two CSP electives', ['Plus two of the following CSP electives:', 'No duplicate courses from lists above.', 'Lecture/lab combinations count as a single course.'], codes(...CSP_ELECTIVES), {
          n: 2,
          labs: { pairs: [['ENVS 115A', 'ENVS 115L']], mode: 'merge' },
        }),
        h.take(
          'csp-field',
          'Field course',
          ['One of the following options:', 'Lecture/Lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be taken to count for this requirement.', 'Or the California Ecology and Conservation (CEC) field course through the University of California Natural Reserve System (XENV 188).'],
          codes(...FIELD, ...CEC),
          { labs: { pairs: FIELD_PAIRS, mode: 'required' } },
        ),
      )
      // Electives here point only at ENVS 101-179 (no natural/social lists).
      electives = h.take(
        'electives',
        'Two upper-division electives',
        ['Students take two, 5-credit or more upper-division electives from ENVS 101-179.', Q_LABS, Q_SUBST, Q_SUBST_LIST],
        ENVS_POOL.or(SUB),
        { n: 2, labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' }, check: requiredLabs, ...subOpts },
      )
    }
    const upper = h.group('upper', 'Upper-Division Courses', [core, ...upperExtra])

    // DC: ENVS 100/100L (already required) plus one course; overlay.
    const dcList: Record<Conc, string[]> = {
      // 2025-26: no ENVS 196G in any DC list (GIS lists ENVS 196).
      general: ['BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196'],
      gis: ['ENVS 183B', 'ENVS 195B', 'ENVS 196'],
      gej: ['ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196'],
      csp: ['BIOE 151B', 'ENVS 183B', 'ENVS 190', 'ENVS 195B', 'ENVS 196'],
    }
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.all('dc-envs100', 'ENVS 100 and ENVS 100L', Q_DC, ['ENVS 100', 'ENVS 100L'], { exclusive: false }),
      h.take('dc-course', 'One DC course', 'Plus one of the following:', codes(...dcList[conc]), { exclusive: false }),
    ], { quote: Q_DC })

    // Comprehensive: overlay (ENVS 183A / 195A are also listed as electives).
    const compPackages: Record<Conc, string[][]> = {
      // 2025-26: ENVS 196G only in the GIS comprehensive.
      general: [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196']],
      gis: [['ENVS 183A', 'ENVS 183B'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196G']],
      gej: [['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196']],
      csp: [['BIOE 151B'], ['ENVS 183A', 'ENVS 183B'], ['ENVS 190'], ['ENVS 195A', 'ENVS 195B'], ['ENVS 196']],
    }
    const compQuote = ['The senior comprehensive may be satisfied by completing one of the options listed below.', Q_COMP_LETTER, ...(conc === 'general' ? [Q_GRAD] : [])]
    const topic: Record<Conc, string | null> = {
      general: null,
      gis: 'The topic engaged in the senior comprehensive courses must be relevant to the field of Geographic Information Systems.',
      gej: 'The topic engaged in the senior comprehensive courses must be relevant to the field of global environmental justice.',
      csp: 'The topic engaged in senior comprehensive courses must be relevant to the field of conservation science and policy.',
    }
    const compNotes = [
      'The senior thesis and senior internship options require applying to a faculty mentor early and at least a two-quarter commitment.',
      ...(topic[conc] ? [`${topic[conc]} (reviewed by the course instructor)`] : []),
      ...(conc === 'general' ? ['An ENVS graduate seminar counts only by invitation from the instructor (you will be asked to confirm it).'] : []),
    ]
    const comprehensive = h.options('comprehensive', 'Comprehensive Requirement (letter grade)', compQuote, compPackages[conc], {
      exclusive: false,
      policy: { letter: true },
      notes: compNotes,
    })

    h.solve()
    softenElectives(h, electives, declared.length > 0, LISTED_POOL, [dc, comprehensive, ...upperExtra])
    if (math.status === 'unmet' && !h.enrollments.some((e) => MATH.has(e.code, h.catalog))) {
      if (h.attested('math-placement')) {
        math.status = 'met'
        math.detail = 'Met by placement (ALEKS score of 300 or higher).'
      } else {
        math.status = 'needs-attestation'
        math.attest = h.attestations.find((a) => a.id === 'math-placement')
        math.detail = 'Take one of the listed courses (AP Calculus credit: add it as the course it grants), or confirm an ALEKS score of 300 or higher.'
      }
    }
    if (conc === 'general' && comprehensive.status === 'unmet') {
      const grad = h.passed.find((e) => GRAD_SEMINAR.has(e.code, h.catalog) && policyFailure(e, { letter: true }) == null)
      if (grad) {
        comprehensive.used = [grad]
        if (h.attested('grad-seminar-invitation')) {
          comprehensive.status = 'met'
          comprehensive.detail = `${grad.display}: graduate seminar taken by invitation from the instructor.`
        } else {
          comprehensive.status = 'needs-attestation'
          comprehensive.attest = h.attestations.find((a) => a.id === 'grad-seminar-invitation')
          comprehensive.detail = `${grad.display} counts for the comprehensive only if the instructor invited you — confirm it.`
        }
      }
    }
    return [lower, upper, electives, dc, comprehensive]

    function electiveOpts(n: number, social: boolean) {
      const atLeast = [{ set: NATURAL_SET, n: 1, label: 'at least one natural-science course' }]
      if (social) atLeast.push({ set: SOCIAL_SET, n: 1, label: 'at least one social-science course' })
      return {
        n,
        labs: { pairs: ELECTIVE_PAIRS, mode: 'merge' as const },
        atLeast,
        check: requiredLabs,
        ...(declared.length ? { atMost: [{ set: SUB, n: 2, label: 'at most two substitution courses' }], prefer: (c: string) => (SUB.has(c, h.catalog) ? 1 : 0) } : {}),
        pool: 'ENVS 101–179 (5+ credits), a course on the natural-/social-science lists, or up to two declared substitution courses',
        notes: ['Up to two upper-division substitution courses (department pre-approved list or petition) may count — list them under “substitutions”.'],
      }
    }
  },
})

/**
 * Pre-approved substitution list is external: with no declaration, an unmet
 * elective requirement with an unused upper-division 5+-credit course from
 * outside the pool is cannot-check (it may be on the list), never unmet.
 */
function softenElectives(h: HarnessContext, node: Node, declared: boolean, pool: CourseSet, overlays: Node[]): void {
  if (node.status !== 'unmet' || declared) return
  const taken = new Set(overlays.flatMap((n) => collectUsed(n)).map((e) => e.id))
  // A substitution "for an ENVS elective" comes from outside ENVS.
  const cand = h.passed.filter((e) => {
    if (h.used.has(e.id) || taken.has(e.id) || e.code.startsWith('ENVS') || pool.has(e.code, h.catalog)) return false
    const c = h.catalog.get(e.code)
    return !!c && c.division === 'upper' && c.credits >= 5
  })
  if (!cand.length) return
  node.status = 'cannot-check'
  node.detail = `${node.detail ? node.detail + ' · ' : ''}${[...new Set(cand.map((e) => e.display))].join(', ')} may count if on the department’s pre-approved substitution list (or by petition) — check it and list it under “substitutions”.`
}

function collectUsed(n: Node): Enrollment[] {
  return [...(n.used ?? []), ...(n.children ?? []).flatMap(collectUsed)]
}

/** ENVS 23, or CHEM 3A + 3B + 3BL, or CHEM 4A/4AL/4B/4BL, or (note) CHEM 1A. */
function chemistry(h: HarnessContext): Node {
  const quote = ['One of the following options:', Q_CHEM_NOTE]
  const title = 'Physical science / chemistry'
  const first = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const options = [canon('ENVS 23'), 'CHEM3A', 'CHEM3B', 'CHEM3BL', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL', 'CHEM1A']
  for (const one of ['ENVS23', 'CHEM1A']) {
    const e = first(one)
    if (e) return h.node('chem', title, quote, 'met', { used: [e], options })
  }
  const a = [first('CHEM3A'), first('CHEM3B'), first('CHEM3BL')]
  const missingA = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL'].filter((_, i) => !a[i])
  const usedA = a.filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  if (missingA.length === 0) return h.node('chem', title, quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('chem', title, quote, 'met', { used: usedB, options })
  // The 2025-26 page requires CHEM 3BL; a CHEM 3B from fall 2026 on includes
  // the lab (2026-27 catalog), a case this page does not address.
  const b3 = a[1]
  if (missingA.length === 1 && missingA[0] === 'CHEM 3BL' && b3?.term != null && Number(b3.term) >= FALL_2026)
    return h.cannotCheck('chem', title, quote, 'CHEM 3BL not in the plan: CHEM 3B taken fall 2026 or later includes the lab (2026-27 catalog), which this 2025-26 page does not address — confirm with an adviser.', { used: usedA, options })
  const closerA = usedA.length / 3 >= usedB.length / 4
  return h.node('chem', title, quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Take ENVS 23, or still need ${(closerA ? missingA : missingB).join(', ')}`,
  })
}
