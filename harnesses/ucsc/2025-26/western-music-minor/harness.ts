// Western Music Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/western-music-minor.md
//
// Grade rule: "All upper-division courses attempted toward the minor must be
// taken for a letter grade." No ensemble/lesson exception is stated for the
// minor, so upper-division ensembles and lessons need a letter grade too.
//
// Ensembles and lessons are "quarters"; each enrollment counts as one quarter
// (no one-per-quarter cap is stated for the minor). The four performance slots
// are exclusive, so the same enrollment never counts twice.
//
// "If no upper-division ensembles are available for your instrument/voice
// type, you can petition additional quarters of lower-division ensembles":
// the upper-division ensemble slot also accepts extra lower-division
// ensembles (distinct from the three lower-division quarters), and the
// petition attestation is asked only when one of them was needed.
import { codes, defineHarness, isPass } from '@harness'
import type { Enrollment } from '@harness'

const HISTORY = ['MUSC 11A', 'MUSC 11B', 'MUSC 11D']
const LD_LESSONS = ['MUSC 61', 'MUSC 62', 'MUSC 63']
const LD_ENSEMBLES = ['MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 8A', 'MUSC 8B', 'MUSC 9', 'MUSC 12']
const UD_ENSEMBLES = ['MUSC 102', 'MUSC 103', 'MUSC 158', 'MUSC 160', 'MUSC 163', 'MUSC 164', 'MUSC 165', 'MUSC 166', 'MUSC 168']
const UD_LESSONS = ['MUSC 161', 'MUSC 161A', 'MUSC 161B', 'MUSC 162']
const UD_ELECTIVES = [
  'MUSC 101A', 'MUSC 101B', 'MUSC 101C', 'MUSC 101E', 'MUSC 101F', 'MUSC 101G', 'MUSC 101H', 'MUSC 105A',
  'MUSC 105C', 'MUSC 105E', 'MUSC 105M', 'MUSC 105O', 'MUSC 105P', 'MUSC 105Q', 'MUSC 105R', 'MUSC 105T',
  'MUSC 150A', 'MUSC 150B', 'MUSC 150C', 'MUSC 150H', 'MUSC 150I', 'MUSC 150T', 'MUSC 150X',
]

export default defineHarness({
  program: 'western-music-minor',
  edition: '2025-26',
  title: 'Western Music Minor',
  attestations: [
    {
      id: 'musc60-waiver',
      label: 'MUSC 60 waived (instructor approval, or UCSC piano lessons)',
      quote: 'MUSC 60 enrollment may be waived by instructor approval, or if the student is taking piano lessons from a UC Santa Cruz instructor.',
      aliases: ['musc 60 waiver', 'musc60', 'keyboard waiver', 'piano lessons'],
    },
    {
      id: 'ld-ensemble-petition',
      label: 'Petition approved: extra lower-division ensembles in place of upper-division ones',
      quote: 'If no upper-division ensembles are available for your instrument/voice type, you can petition additional quarters of lower-division ensembles.',
      aliases: ['ensemble petition', 'lower-division ensemble petition', 'ld ensemble'],
    },
  ],
  notes: [
    'Upper-division courses — including upper-division ensembles and lessons — need a letter grade; lower-division courses may be P/NP.',
    'Lessons and ensembles must be on your primary instrument or voice (pianists taking UCSC lessons may play another instrument in ensembles) — the app cannot see the instrument.',
    'Admission to MUSC 30A needs an A or A+ in MUSC 14 at UCSC, or the Theory Placement Exam; that gates enrollment, not completion.',
  ],
  evaluate(h) {
    h.policy = undefined
    const UD = { letter: true }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('history', 'Lower-Division History', 'Take one of the following courses', codes(...HISTORY)),
      h.group('theory', 'Lower-Division Theory', [
        h.all('theory/30', 'MUSC 30A, 30B, 30C', 'Take all of the following courses.', ['MUSC 30A', 'MUSC 30B', 'MUSC 30C']),
        h.group('keyboard', 'Lower-Division Keyboard and Musicianship', [
          // MUSC 31 alongside each of MUSC 30A/B/C: three sections (the planner
          // shows "MUSC 31 & 60" with each MUSC 30 course). 2025-26 has no
          // failed-section exception (2026-27 added one), so a failed section
          // must be passed again.
          h.take('musc31', 'MUSC 31 Ear Training — alongside each MUSC 30 course', 'The following courses should be taken alongside MUSC 30 series classes.', codes('MUSC 31'), {
            n: 3,
            repeatable: true,
          }),
          h.either('musc60', 'MUSC 60 Fundamental Keyboard Skills (or waiver)', 'MUSC 60 enrollment may be waived by instructor approval, or if the student is taking piano lessons from a UC Santa Cruz instructor.', [
            h.take('musc60/course', 'MUSC 60 Fundamental Keyboard Skills', 'MUSC 60 — Fundamental Keyboard Skills (2)', codes('MUSC 60'), {
              notes: ['The page lists MUSC 60 once; its planner shows MUSC 60 alongside each MUSC 30 course — confirm with the department how many quarters you need.'],
            }),
            h.attest('musc60-waiver'),
          ]),
        ]),
      ]),
      h.take('ld-lessons', 'Lower-Division Applied Lessons: three quarters', 'Take three quarters of applied lessons from any course type on this list, on your primary instrument or voice.', codes(...LD_LESSONS), {
        n: 3,
        repeatable: true,
      }),
      h.take('ld-ensembles', 'Lower-Division Performing Ensembles: three quarters', [
        'Take three quarters of performing ensembles from any course on this list, on your primary instrument or voice.',
        'All courses may be repeated for credit.',
      ], codes(...LD_ENSEMBLES), {
        n: 3,
        repeatable: true,
      }),
    ])

    // Petition path: lower-division ensembles beyond the three LD quarters may
    // fill the UD slot, but only by petition — asked only when the allocator
    // actually needed one ("If no upper-division ensembles are available for
    // your instrument/voice type, you can petition additional quarters of
    // lower-division ensembles.").
    const UD_ENS = codes(...UD_ENSEMBLES)
    const LD_ENS = codes(...LD_ENSEMBLES)
    const udPass = (e: Enrollment) => isPass(e.grade) && h.catalog.get(e.code)?.division !== 'lower'
    for (const e of h.enrollments) if (udPass(e) && UD_ENS.has(e.code, h.catalog)) h.excluded.set(e.id, `${e.display}: taken P/NP, but upper-division courses need a letter grade`)
    const udEnsCourses = h.take(
      'ud-ensembles/courses',
      'Three quarters of upper-division ensembles',
      'Take three quarters of performing ensembles from any course on this list, on your primary instrument or voice.',
      UD_ENS.or(LD_ENS),
      {
        n: 3,
        repeatable: true,
        prefer: (c) => (UD_ENS.has(c, h.catalog) ? 0 : 1),
        // Upper-division ensembles need a letter grade; petitioned lower-division ones may be P/NP.
        check: (chosen) => {
          const bad = chosen.find(udPass)
          return bad ? `${bad.display}: taken P/NP, but upper-division courses need a letter grade` : null
        },
        notes: ['Extra lower-division ensembles count here only by petition (music@ucsc.edu), when no upper-division ensemble fits your instrument/voice.'],
      },
    )
    const udLessons = h.take('ud-lessons', 'Upper-Division Applied Lessons: three quarters', 'Take three quarters of applied lessons from any course type on this list, on your primary instrument or voice.', codes(...UD_LESSONS), {
      n: 3,
      repeatable: true,
      policy: UD,
    })
    const udElectives = h.take('ud-electives', 'Upper-Division Electives', 'Take two (2) courses from the following list', codes(...UD_ELECTIVES), { n: 2, policy: UD })
    h.solve()
    const viaPetition = (udEnsCourses.used ?? []).filter((e) => LD_ENS.has(e.code, h.catalog))
    if (viaPetition.length && h.attested('ld-ensemble-petition'))
      udEnsCourses.detail = [udEnsCourses.detail, `${viaPetition.map((e) => e.display).join(', ')} counted by your lower-division ensemble petition`].filter(Boolean).join(' · ')
    const udEnsembles = h.group(
      'ud-ensembles',
      'Upper-Division Performing Ensembles: three quarters',
      [udEnsCourses, viaPetition.length ? h.attest('ld-ensemble-petition') : null],
      {
        quote: [
          'Take three quarters of performing ensembles from any course on this list, on your primary instrument or voice.',
          'If no upper-division ensembles are available for your instrument/voice type, you can petition additional quarters of lower-division ensembles.',
        ],
      },
    )
    const upper = h.group('upper', 'Upper-Division Courses', [udEnsembles, udLessons, udElectives])
    return [lower, upper]
  },
})
