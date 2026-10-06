// Global and Community Health B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/global-and-community-health-bs.md
//
// Two concentrations (Biomedical; Public and Community Health) — a declared
// choice. Unusual bits handled in code below:
//  - Letter grades for every major course.
//  - General chemistry: CHEM 3B/3C taken before fall 2026 need CHEM 3BL/3CL.
//  - BIOL 20L is not required for BIOL 20A + BIOE 20B completed at California
//    community colleges: when both are on record with no UCSC term and BIOL
//    20L is missing we cannot tell where they were taken → cannot-check.
//  - STAT 7/7L may be waived by petition for a pre-UCSC STAT 5 articulated
//    course (attestation; only offered when STAT 5 is on record with no term).
//  - Calculus: MATH 11/19 transitions per the campus policy are accepted.
//  - Biomedical Spanish: "SPAN 1-SPAN 4 or the equivalent" + SPAN 5M. Levels
//    below the highest Spanish course taken (SPAN 5M and SPHS 4–6 imply the
//    SPAN 4 level) are "the equivalent" by placement — an attestation.
//    Levels above it are unmet.
//  - The public-health core lists "⟨Physiology of Disease⟩" with no course
//    code (garbled source row). The only catalog course with that title is
//    METX 41, and the introduction says these students "take an introductory
//    physiology course", so METX 41 fills it.
//  - DC = GCH 190 + GCH 195, which are also upper-division core courses
//    (overlay). Comprehensive = passing BIOL 189 (the internship).
import { canon, codes, defineHarness, display, policyFailure } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const FALL_2026 = 2268

const BREADTH = [
  'ANTH 2', 'BIOL 80A', 'BIOL 80J', 'BIOL 88', 'CLNI 30', 'CMMU 10', 'CSE 80A', 'ENVS 25', 'ENVS 80F', 'FMST 10',
  'FMST 30', 'FMST 31', 'FMST 41', 'GCH 41', 'HIS 81', 'LALS 55', 'LALS 57', 'LIT 80K', 'POLI 17', 'POLI 20',
  'POLI 61', 'PSYC 1', 'SOCY 1', 'SOCY 10', 'SOCY 15', 'SPAN 3', 'SPAN 4', 'SPAN 5M',
]
const STEM = ['BIOE 118', 'BIOL 101', 'BIOL 105', 'BIOL 117', 'CHEM 169', 'CHEM 171', 'METX 100', 'METX 133', 'METX 135']
const NON_STEM = [
  'ANTH 110E', 'ANTH 110F', 'ANTH 110M', 'ANTH 110T', 'ANTH 110Y', 'ANTH 111', 'ANTH 112', 'ANTH 129', 'ANTH 134',
  'ANTH 136', 'ANTH 144', 'ANTH 146', 'ANTH 148', 'ANTH 160', 'ANTH 161', 'ANTH 161S', 'ANTH 162', 'BIOL 188',
  'CMMU 156', 'CMMU 160', 'CMMU 161', 'CMMU 162', 'CMMU 163', 'CMMU 164', 'DANM 136', 'FMST 124', 'GCH 123',
  'GCH 186', 'HIS 101D', 'HIS 101F', 'HIS 139C', 'HIS 151', 'HIS 151A', 'HIS 151B', 'HIS 177A', 'LALS 175',
  'LALS 194X', 'LGST 108', 'LGST 137', 'LGST 173', 'POLI 102', 'POLI 120B', 'POLI 120C', 'POLI 121', 'POLI 155',
  'POLI 160B', 'POLI 166', 'POLI 175', 'POLI 182', 'POLI 187', 'POLI 189', 'POLI 190S', 'SOCY 121', 'SOCY 121G',
  'SOCY 127P', 'SOCY 128C', 'SOCY 128I', 'SOCY 128J', 'SOCY 128M', 'SOCY 132', 'SOCY 135', 'SOCY 153', 'SOCY 154',
  'SOCY 159', 'SOCY 161',
]

const Q_CHEM_NOTE = 'CHEM 3B and 3C taken Fall 2026 or later will satisfy this requirement as they are inclusive of lab curriculum. If taken prior to Fall 2026, students must also have completed CHEM 3BL and CHEM 3CL.'
const Q_20L = 'BIOL 20L is not required for students who have completed BIOL 20A and BIOE 20B at California community colleges.'
const Q_STAT5 = 'If, prior to enrolling at UCSC, a student takes a course articulated to STAT 5, they may petition to have the STAT 7/STAT 7L requirement waived.'
const Q_SPANISH = 'SPAN 1-SPAN 4 or the equivalent and one quarter of Spanish for health-care workers (SPAN 5M).'
const Q_INTERNSHIP = 'Students must participate in a community health-care service activity approved by the health sciences internship coordinator. Students will accrue a minimum of 80 hours over one quarter. This requirement satisfies the Comprehensive Requirement.'
const Q_COMPREHENSIVE = 'For the global and community health B.S., this requirement can be satisfied by receiving a passing grade in the Health Sciences Internship, BIOL 189.'

export default defineHarness({
  program: 'global-and-community-health-bs',
  edition: '2026-27',
  title: 'Global and Community Health B.S.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'GCH B.S. students choose between two concentrations in this major.',
      options: [
        { value: 'biomedical', label: 'Biomedical', aliases: ['biomedical concentration'] },
        { value: 'public-community', label: 'Public and Community Health', aliases: ['public and community health concentration', 'public health', 'community health'] },
      ],
    },
  ],
  attestations: [
    {
      id: 'stat5-waiver',
      label: 'STAT 7/7L waived by petition (STAT 5 articulated course taken before UCSC)',
      quote: Q_STAT5,
      aliases: ['stat 5', 'stat5', 'waiver'],
    },
    {
      id: 'spanish-equivalent',
      label: 'Lower Spanish levels satisfied by placement (“or the equivalent”)',
      quote: Q_SPANISH,
      aliases: ['spanish placement', 'placement', 'spanish equivalent'],
    },
  ],
  notes: [
    'All courses that are taken to satisfy any major requirement must be taken for a letter grade.',
    'At least half of the upper-division courses required for the major must be taken at UC Santa Cruz (the plan does not record where a course was taken).',
    'Once matriculated, BIOL 20A, BIOL 100, BIOL 105, BIOL 101 or BIOL 110 taken elsewhere need prior department permission.',
    'The GCH B.S. cannot be combined with the GCH B.A. or with majors/minors of Chemistry and Biochemistry, EEB, METX or MCD Biology.',
  ],
  evaluate(h) {
    // "All courses that are taken to satisfy any major requirement must be taken for a letter grade."
    h.policy = { letter: true }
    const choose = h.needChoice('concentration')
    if (choose) return [choose]
    const biomed = h.choice('concentration') === 'biomedical'

    const biol20l = h.take('biol20l', 'BIOL 20L', ['BIOL 20L — Experimental Biology Laboratory (2)', Q_20L], codes('BIOL 20L'))
    const coreList = ['BIOE 20B', 'BIOL 20A', 'CHEM 8A', 'CHEM 8L', 'CHEM 8B', 'CHEM 8M', 'GCH 1']
    const coreQuote = biomed ? 'All of the following courses:' : 'Core Courses'
    const ldChildren: (Node | null)[] = [
      h.all('ld-core', biomed ? 'Lower-division core' : 'Core Courses', coreQuote, coreList),
      biol20l,
      biomed ? h.all('physics', 'Physics', coreQuote, ['PHYS 6A', 'PHYS 6B', 'PHYS 6C', 'PHYS 6L']) : null,
      biomed ? null : h.take('physiology', 'Physiology of Disease (METX 41)', 'Physiology of Disease', codes('METX 41'), {
        notes: ['The catalog page lists “Physiology of Disease” without a course code; METX 41 is the catalog course with that title.'],
      }),
      statistics(h),
      generalChem(h),
      h.options('calc', 'Calculus', ['Plus one of the following options:', 'Students may transition between the MATH 11 and 19 series per the'], [
        ['MATH 11A', 'MATH 11B'],
        ['MATH 16A', 'MATH 16B'],
        ['MATH 19A', 'MATH 19B'],
        ['MATH 19A', 'MATH 11B'],
        ['MATH 11A', 'MATH 19B'],
      ], { notes: ['Mixed MATH 11/19 sequences follow the campus Calculus Series Transition Policy (external).'] }),
      biomed ? spanish(h) : h.take('breadth', 'Lower-Division Breadth Requirement', 'Lower-Division Breadth Requirement (Choose One)', codes(...BREADTH), {
        notes: ['Cross-listed: BIOL 88/HIS 88, CLNI 30/JRLC 30, GCH 41/CSE 41.'],
      }),
    ]
    const lower = h.group('lower', 'Lower-Division Courses', ldChildren)

    const internship = h.take('internship', 'Internship Requirement: BIOL 189', ['BIOL 189 — Health Sciences Internship (3)', Q_INTERNSHIP], codes('BIOL 189'))
    let upper: Node
    let electives: Node | null = null
    if (biomed) {
      upper = h.group('upper', 'Upper-Division Courses', [
        h.all('ud-core', 'Upper-division core', 'All of the following courses:', ['BIOL 100', 'BIOL 101', 'BIOL 105', 'BIOL 110', 'BIOL 113', 'BIOL 130', 'BIOL 130L', 'GCH 190', 'GCH 195', 'METX 115'], {
          notes: ['CHEM 109 is also recommended for pre-med students.'],
        }),
        internship,
      ])
    } else {
      upper = h.group('upper', 'Upper-Division Courses', [
        h.all('ud-core', 'Upper-division core', 'All of the following courses:', ['BIOL 100', 'BIOL 113', 'GCH 190', 'GCH 195', 'METX 115']),
        h.take('community-analysis', 'CMMU 165 or METX 108', 'One of the following courses:', codes('CMMU 165', 'METX 108'), {
          notes: ['CMMU 165 is cross-listed as GCH 165.', 'CHEM 109 is also recommended for pre-med students.'],
        }),
        internship,
      ])
      electives = h.group('electives', 'Electives', [
        h.take('stem', 'STEM Elective (choose one)', ['STEM Elective (Choose One):', 'Enrollment in METX 135 requires concurrent enrollment in METX 135L.'], codes(...STEM), {
          labs: { pairs: [['METX 135', 'METX 135L']], mode: 'required' },
          notes: ['Approved UC Online courses may substitute — see a GCH B.S. advisor for the current list.'],
        }),
        h.take('non-stem', 'Non-STEM Electives (choose two)', 'Non-STEM Electives (Choose two):', codes(...NON_STEM), {
          n: 2,
          notes: ['Students may petition for substitution of elective courses (add an approved substitute once approved).'],
        }),
      ])
    }

    // DC: the same GCH 190/195 enrollments the core uses (overlay).
    const dcQuote = biomed
      ? 'The DC requirement in global and community health B.S. degree is satisfied by completing the following courses:'
      : 'The DC requirement in the global and community health B.S. degree is satisfied by completing the following courses:'
    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-190', 'GCH 190', dcQuote, codes('GCH 190'), { exclusive: false, minor: true }),
      h.take('dc-195', 'GCH 195', dcQuote, codes('GCH 195'), { exclusive: false, minor: true }),
    ], { quote: dcQuote })
    h.solve()

    // BIOL 20L waiver for community-college BIOL 20A + BIOE 20B.
    if (biol20l.status === 'unmet') {
      const noTerm = (c: string) => h.taken(codes(c)).some((e) => e.term == null)
      if (noTerm('BIOL 20A') && noTerm('BIOE 20B')) {
        biol20l.status = 'cannot-check'
        biol20l.detail = 'Not required if you completed BIOL 20A and BIOE 20B at a California community college — check where they were taken.'
      }
    }

    const comprehensive = h.node('comprehensive', 'Comprehensive Requirement', Q_COMPREHENSIVE, internship.status === 'met' ? 'met' : 'unmet', {
      used: internship.used,
      detail: internship.status === 'met' ? 'Satisfied by BIOL 189.' : 'Satisfied by passing the Health Sciences Internship (BIOL 189).',
    })
    return [lower, upper, ...(electives ? [electives] : []), dc, comprehensive]
  },
})

/** STAT 7 + 7L, or the petition waiver for a pre-UCSC STAT 5 articulated course. */
function statistics(h: HarnessContext): Node {
  const stat5 = h.taken(codes('STAT 5')).filter((e) => e.term == null)
  return h.either('stats', 'Statistics', 'STAT 7 — Statistical Methods for the Biological, Environmental, and Health Sciences (5)', [
    h.all('stat7', 'STAT 7 and STAT 7L', 'STAT 7 — Statistical Methods for the Biological, Environmental, and Health Sciences (5)', ['STAT 7', 'STAT 7L']),
    stat5.length
      ? h.group('stat5', 'STAT 5 articulated course + petition', [
          h.node('stat5-course', 'Course articulated to STAT 5 (before UCSC)', Q_STAT5, 'met', { used: stat5 }),
          h.attest('stat5-waiver'),
        ])
      : null,
  ].filter((x): x is Node => !!x))
}

/** SPAN 1–4 (or the equivalent) + SPAN 5M. */
function spanish(h: HarnessContext): Node {
  const levels = ['SPAN 1', 'SPAN 2', 'SPAN 3', 'SPAN 4'].map(canon)
  const ok = (code: string) => h.enrollments.find((e) => e.code === code && policyFailure(e, h.policy) == null)
  const got = levels.map(ok)
  // SPAN 5M and SPHS 4–6 are taken after (or instead of) SPAN 4 / placement.
  const beyond = ['SPAN5M', 'SPHS4', 'SPHS5', 'SPHS6'].some((c) => ok(c))
  const highest = beyond ? 3 : got.reduce((hi, e, i) => (e ? i : hi), -1)
  const missing = levels.filter((_, i) => !got[i])
  const above = levels.filter((_, i) => !got[i] && i > highest)
  const used = got.filter((x): x is Enrollment => !!x)
  let seq: Node
  if (!missing.length) seq = h.node('span-1-4', 'SPAN 1–SPAN 4 (or the equivalent)', Q_SPANISH, 'met', { used })
  else if (above.length)
    seq = h.node('span-1-4', 'SPAN 1–SPAN 4 (or the equivalent)', Q_SPANISH, 'unmet', {
      used,
      options: levels,
      detail: `Still need ${above.map(display).join(', ')} (or placement beyond it)`,
      progress: { have: 4 - above.length, need: 4 },
    })
  else
    seq = h.group('span-1-4', 'SPAN 1–SPAN 4 (or the equivalent)', [
      h.node('span-1-4/courses', 'Spanish courses taken', Q_SPANISH, 'met', {
        used,
        detail: `${missing.map(display).join(', ')} not taken — covered only if placement showed the equivalent`,
      }),
      h.attest('spanish-equivalent'),
    ], { quote: Q_SPANISH })
  return h.group('spanish', 'Language Requirement', [
    seq,
    h.take('span5m', 'SPAN 5M Medical Spanish', Q_SPANISH, codes('SPAN 5M')),
  ], { quote: Q_SPANISH })
}

/** CHEM 3A-3C (+3BL/3CL when 3B/3C were taken before fall 2026) or CHEM 4A/4AL/4B/4BL. */
function generalChem(h: HarnessContext): Node {
  const ok = (code: string) => h.enrollments.filter((e) => e.code === code && policyFailure(e, h.policy) == null)
  const first = (code: string) => ok(code)[0]
  const quote = ['Plus one of the following series of courses:', Q_CHEM_NOTE]
  const a = ['CHEM3A', 'CHEM3B', 'CHEM3C'].map(first)
  const missingA: string[] = ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'].filter((_, i) => !a[i])
  let undated = false
  for (const [lec, lab] of [['CHEM3B', 'CHEM3BL'], ['CHEM3C', 'CHEM3CL']] as const) {
    const e = first(lec)
    if (!e) continue
    if (e.term == null) {
      if (!first(lab)) undated = true
    } else if (Number(e.term) < FALL_2026 && !first(lab)) missingA.push(lab.replace('CHEM', 'CHEM '))
  }
  const usedA = [...a, first('CHEM3BL'), first('CHEM3CL')].filter((x): x is Enrollment => !!x)
  const b = ['CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL'].map(first)
  const missingB = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL'].filter((_, i) => !b[i])
  const usedB = b.filter((x): x is Enrollment => !!x)
  const options = ['CHEM3A', 'CHEM3B', 'CHEM3C', 'CHEM4A', 'CHEM4AL', 'CHEM4B', 'CHEM4BL']
  const title = 'General chemistry series'
  if (missingA.length === 0 && !undated) return h.node('gen-chem', title, quote, 'met', { used: usedA, options })
  if (missingB.length === 0) return h.node('gen-chem', title, quote, 'met', { used: usedB, options })
  if (missingA.length === 0 && undated)
    return h.cannotCheck('gen-chem', title, quote, 'CHEM 3B/3C has no term: if taken before fall 2026 you also need CHEM 3BL/3CL.', { used: usedA, options })
  const closerA = usedA.length >= usedB.length
  return h.node('gen-chem', title, quote, 'unmet', {
    used: closerA ? usedA : usedB,
    options,
    detail: `Still need ${(closerA ? missingA : missingB).join(', ')}`,
    progress: closerA ? { have: a.filter(Boolean).length, need: 3 } : { have: usedB.length, need: 4 },
  })
}
