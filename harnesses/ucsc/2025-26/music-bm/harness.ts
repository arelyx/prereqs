// Music B.M. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/music-bm.md
//
// The shape that makes this program unusual is time: an ensemble AND an
// applied lesson every quarter you are in the B.M. program (with a 9/6
// quarter floor for frosh/transfer), juries each fall and spring. That part is
// hand-written below (see `perQuarter`); the course lists use the library.
import { codes, defineHarness, isSummer, lettered, policyFailure, regularQuarters, termLabel } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

// 2025-26: no MUSC 10 on the ensemble list.
const ENSEMBLES = [
  'MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 8A', 'MUSC 8B', 'MUSC 9',
  'MUSC 12', 'MUSC 102', 'MUSC 103', 'MUSC 158', 'MUSC 160', 'MUSC 163', 'MUSC 164',
  'MUSC 165', 'MUSC 166', 'MUSC 168',
]
const LESSONS = ['MUSC 61', 'MUSC 62', 'MUSC 161', 'MUSC 161A', 'MUSC 162']
// "Enrollment in MUSC 196B will replace applied lessons for the quarter."
const LESSON_OR_RECITAL = [...LESSONS, 'MUSC 196B']

// 2025-26: all of 101A/B/C, one of 101E–H, one 105; MUSC 150H plus one elective theory.
const CORE_HISTORY = lettered('MUSC 101', 'ABC')
const WORLD_HISTORY = lettered('MUSC 101', 'EFGH')
const ELECTIVE_HISTORY = lettered('MUSC 105', 'ACEHILMOPQRSTV')
const THEORY = lettered('MUSC 150', 'ABCDIJKNPRSTXZ')
const DC = [
  'MUSC 101A', 'MUSC 101B', 'MUSC 101C', 'MUSC 101F', 'MUSC 101G', 'MUSC 105A', 'MUSC 105C',
  'MUSC 105M', 'MUSC 105Q', 'MUSC 105T', 'MUSC 150D',
]

const Q_ENSEMBLE =
  'Students must participate in performing ensembles for every quarter they are in the B.M. program, for a minimum of six (6) quarters (for transfer students), and nine (9) quarters (for frosh students).'
const Q_ENSEMBLE_CAP = 'A maximum of one ensemble per quarter can be counted toward fulfillment of the total requirement.'
const Q_LESSONS =
  'Students must take applied lessons with UCSC faculty for every quarter they are in the B.M. program, for a minimum of six (6) quarters (for transfer students), and nine (9) quarters (for frosh students).'
const Q_CONCURRENT = 'Concurrent enrollment in an appropriate ensemble is required.'

const VOICE = /voice|vocal|sing|soprano|mezzo|alto|tenor|baritone|contralto|countertenor/i

export interface QuarterRow {
  term: string
  label: string
  ensembles: string[]
  lessons: string[]
  planned: boolean
  ok: boolean
  isJury: boolean
}

export default defineHarness({
  program: 'music-bm',
  edition: '2025-26',
  title: 'Music B.M.',
  choices: [
    {
      key: 'instrument',
      label: 'Primary instrument',
      quote: 'B.M. students will major in an instrument or voice.',
      options: [
        { value: 'voice', label: 'Voice' },
        { value: 'instrument', label: 'An instrument (not voice)' },
      ],
      parse: (raw) => (VOICE.test(raw) ? 'voice' : raw.trim() ? 'instrument' : undefined),
    },
    {
      key: 'entry',
      label: 'Admitted as',
      quote: 'for a minimum of six (6) quarters (for transfer students), and nine (9) quarters (for frosh students).',
      options: [
        { value: 'frosh', label: 'Frosh (first-year)', aliases: ['first-year', 'freshman'] },
        { value: 'transfer', label: 'Transfer' },
      ],
    },
    {
      key: 'bm_start',
      label: 'First quarter in the B.M. program',
      quote: 'for every quarter they are in the B.M. program',
      options: [],
      free: true,
      input: 'term',
      parse: (raw) => (/^2\d{3}$/.test(raw.trim()) ? raw.trim() : undefined),
    },
  ],
  attestations: [
    {
      id: 'musc60-waiver',
      label: 'MUSC 60 waived (instructor approval, or piano lessons with a UCSC instructor)',
      quote: 'MUSC 60 enrollment may be waived by instructor approval, or if the student is taking piano lessons from a UC Santa Cruz instructor.',
      aliases: ['musc 60 waiver', 'keyboard waiver'],
    },
    {
      id: 'juries',
      label: 'Continuing B.M. juries passed each fall and spring',
      quote: 'Demonstration of an advanced level at Continuing B.M. juries each fall and spring quarter.',
      aliases: ['jury', 'juries'],
    },
    {
      id: 'senior-recital',
      label: 'Senior Recital presented and evaluated',
      quote: 'Students in the B.M. program present a Senior Recital which is evaluated by faculty.',
      aliases: ['recital'],
    },
  ],
  coverage: { unknownOk: { GERM1: 'GERM 1 was dropped from the catalog (2026-27 page: no longer offered since fall 2025)' } },
  notes: [
    'Upper-division courses need a letter grade (upper-division ensembles may be P/NP); lower-division courses may be P/NP.',
    'B.M. admission is by audition (“B.M. Audition”) — that gates entry and is not tracked here.',
  ],
  evaluate(h) {
    // "All upper-division courses applied toward the Music B.M. must be taken
    // for a letter grade, except for upper-division performing ensembles"
    const UD = { letter: true }
    h.policy = undefined

    // --- lower division ---------------------------------------------------
    // 2025-26: no failed-section exception — one passed MUSC 31 alongside each MUSC 30 course.
    const musc31 = h.taken(codes('MUSC 31'))
    const ear31ok = musc31.length >= 3
    const ear = h.node('musc31', 'MUSC 31 Ear Training — alongside each MUSC 30 course', 'The following courses should be taken alongside MUSC 30 series classes.', ear31ok ? 'met' : 'unmet', {
      progress: { have: Math.min(musc31.length, 3), need: 3, unit: 'sections' },
      used: musc31,
      options: ['MUSC31'],
      detail: ear31ok ? undefined : `${musc31.length} of 3 sections passed (one with each of MUSC 30A, 30B, 30C)`,
    })
    const voice = h.choice('instrument') === 'voice'
    const lower = h.group('lower', 'Lower-Division Courses', [
      h.all('theory-ld', 'Lower-Division Theory', 'Take all of the following courses.', ['MUSC 30A', 'MUSC 30B', 'MUSC 30C']),
      h.group('keyboard', 'Keyboard and Musicianship', [
        ear,
        h.either('musc60', 'MUSC 60 Fundamental Keyboard Skills', 'MUSC 60 — Fundamental Keyboard Skills (2)', [
          h.take('musc60/course', 'MUSC 60', 'MUSC 60 — Fundamental Keyboard Skills (2)', codes('MUSC 60')),
          h.attest('musc60-waiver'),
        ]),
      ]),
      h.needChoice('instrument') ??
        (voice
          ? h.all('language', 'Foreign language (voice students)', 'FREN 1, GERM 1, and ITAL 1 are required for B.M. voice students.', ['FREN 1', 'GERM 1', 'ITAL 1'], {
              notes: ['High school transcripts or AP scores may satisfy this — if so, add the course to your completed list as exam credit.'],
            })
          : h.info('language', 'Foreign language', 'There are no foreign language requirements for other students in the B.A. or B.M. programs', 'Not required for instrumentalists.')),
    ])

    // --- upper division ---------------------------------------------------
    const UDL = { policy: UD }
    const upper = h.group('upper', 'Upper-Division Courses', [
      h.group('history', 'History and Culture', [
        h.all('core-history', 'Core History/Culture: MUSC 101A, 101B, 101C', 'Take all of the following courses', CORE_HISTORY, UDL),
        h.take('world-history', 'Elective History/Culture (MUSC 101E–H)', 'Take one of these courses', codes(...WORLD_HISTORY), UDL),
        h.take('elective-history', 'Elective History/Culture (MUSC 105)', 'Take one of these courses', codes(...ELECTIVE_HISTORY), UDL),
      ]),
      h.group('theory', 'Theory', [
        h.take('core-theory', 'Core Theory: MUSC 150H', 'Take the following course', codes('MUSC 150H'), UDL),
        h.take('theory-ud', 'Elective Theory', 'Take one of the following courses', codes(...THEORY), UDL),
      ]),
    ])

    // --- performance: per quarter ----------------------------------------
    const perf = perQuarter(h)

    const dc = h.take('dc', 'Disciplinary Communication (DC)', 'The DC requirement for the Music B.M. degree is satisfied by completing one of the following courses.', codes(...DC), {
      exclusive: false,
      policy: UD,
    })
    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement', [
      h.take('musc196b', 'MUSC 196B Senior Recital Preparation', 'Students fulfill the comprehensive requirement for the Music B.M. degree by completing MUSC 196B: Senior Recital Preparation (w/ lessons).', codes('MUSC 196B'), {
        exclusive: false,
        policy: UD,
      }),
      h.attest('senior-recital'),
    ])
    return [lower, upper, perf, dc, comprehensive]
  },
})

/** Ensembles + lessons in every quarter of the program; juries each fall/spring. */
function perQuarter(h: HarnessContext): Node {
  const ens = codes(...ENSEMBLES)
  const les = codes(...LESSON_OR_RECITAL)
  // Ensembles may be P/NP; lessons are lower- or upper-division courses: UD lessons need a letter.
  const ensembles = h.taken(ens, undefined)
  const lessons = h.enrollments.filter(
    (e) => les.has(e.code) && policyFailure(e, h.catalog.get(e.code)?.division === 'upper' ? { letter: true } : undefined) == null,
  )
  const entry = h.choice('entry')
  const min = entry === 'transfer' ? 6 : entry === 'frosh' ? 9 : null

  const terms = h.enrollments.map((e) => e.term).filter((t): t is string => !!t && !isSummer(t))
  const firstLesson = lessons.find((e) => e.term && !isSummer(e.term))?.term
  const declaredStart = h.choice('bm_start')
  const start = declaredStart ?? firstLesson
  const end = terms.length ? terms.reduce((a, b) => (Number(b) > Number(a) ? b : a)) : undefined

  const rows: QuarterRow[] = []
  if (start && end) {
    const active = new Set(terms)
    for (const t of regularQuarters(start, end)) {
      if (!active.has(t)) continue // not enrolled that quarter (leave, gap)
      const inT = (list: Enrollment[]) => list.filter((e) => e.term === t)
      const e = inT(ensembles)
      const l = inT(lessons)
      rows.push({
        term: t,
        label: termLabel(t),
        ensembles: e.map((x) => x.display),
        lessons: l.map((x) => x.display),
        planned: h.enrollments.some((x) => x.term === t && x.planned),
        ok: e.length > 0 && l.length > 0,
        isJury: t.endsWith('8') || t.endsWith('2'),
      })
    }
  }
  const ensembleQuarters = rows.filter((r) => r.ensembles.length > 0).length
  const lessonQuarters = rows.filter((r) => r.lessons.length > 0).length
  const missingEns = rows.filter((r) => r.ensembles.length === 0)
  const missingLes = rows.filter((r) => r.lessons.length === 0)
  const usedEns = ensembles.filter((e) => rows.some((r) => r.term === e.term))
  const usedLes = lessons.filter((e) => rows.some((r) => r.term === e.term))

  const quarterNode = (
    id: string,
    title: string,
    quote: string[],
    count: number,
    missing: QuarterRow[],
    used: Enrollment[],
    pool: string[],
  ): Node => {
    if (!start) {
      return h.node(id, title, quote, 'unmet', {
        detail: 'No applied lessons in your plan yet — the B.M. program quarters start with your first lesson.',
        options: pool.map((c) => c.replace(' ', '')),
        progress: { have: 0, need: min ?? 9, unit: 'quarters' },
      })
    }
    if (min == null) {
      return h.node(id, title, quote, 'needs-choice', {
        choice: 'entry',
        detail: `${count} quarter(s) so far — choose frosh or transfer to know whether 9 or 6 are required.`,
        used,
        progress: { have: count, need: 9, unit: 'quarters' },
      })
    }
    const problems: string[] = []
    if (missing.length) problems.push(`missing in ${missing.map((r) => r.label).join(', ')}`)
    if (count < min) problems.push(`${count} of ${min} quarters`)
    return h.node(id, title, quote, problems.length ? 'unmet' : 'met', {
      detail: problems.join(' · ') || undefined,
      used,
      progress: { have: Math.min(count, min), need: min, unit: 'quarters' },
      options: pool.map((c) => c.replace(' ', '')),
    })
  }

  const ensNode = quarterNode('ensembles', 'Performing ensemble every quarter', [Q_ENSEMBLE, Q_ENSEMBLE_CAP], ensembleQuarters, missingEns, usedEns, ENSEMBLES)
  const lesNode = quarterNode('lessons', 'Individual applied lessons every quarter', [Q_LESSONS, Q_CONCURRENT], lessonQuarters, missingLes, usedLes, LESSONS)
  const group = h.group('performance', 'Performance (every quarter in the B.M.)', [ensNode, lesNode, h.attest('juries')], {
    detail: start
      ? `Program quarters ${declaredStart ? 'from' : 'assumed from your first lesson,'} ${termLabel(start)}${end ? ` through ${termLabel(end)}` : ''}.`
      : undefined,
  })
  group.data = { quarters: rows, start: start ?? null, startDeclared: !!declaredStart, min }
  return group
}
