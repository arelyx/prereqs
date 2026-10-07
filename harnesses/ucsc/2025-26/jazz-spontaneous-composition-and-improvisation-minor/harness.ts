// Jazz, Spontaneous Composition, and Improvisation Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/jazz-spontaneous-composition-and-improvisation-minor.md
//
// Grade rule: "All upper-division courses attempted toward the minor must be
// taken for a letter grade." The minor states no ensemble exception, so the
// rule applies to every upper-division (or graduate) course by catalog
// division — including MUSC 164 Jazz Combos.
//
// Lower-division theory & improvisation: MUSC 20C or MUSC 74, OR two quarters
// of MUSC 3. "If a student elects to take two quarters of MUSC 3 instead of
// MUSC 74 or MUSC 20C, they are only required to do one additional quarter of
// a jazz ensemble" — so those two MUSC 3 quarters also count toward the three
// jazz-ensemble quarters: the LD slot is an overlay, the jazz-ensemble slot
// (exclusive, three quarters) may reuse them.
// "Quarters" of ensembles are counted as enrollments (the page states no
// one-per-quarter cap for the minor).
import { codes, defineHarness, isPass } from '@harness'
import type { Enrollment } from '@harness'

const HISTORY = ['MUSC 11B', 'MUSC 11C', 'MUSC 11E']
const UD_THEORY = ['MUSC 150J', 'MUSC 150K']
const UD_ELECTIVES = [
  'MUSC 101C', 'MUSC 105A', 'MUSC 105C', 'MUSC 105H', 'MUSC 105I', 'MUSC 105V', 'MUSC 121A', 'MUSC 150D',
  'MUSC 150I', 'MUSC 150K', 'MUSC 150J', 'MUSC 150P', 'MUSC 150S', 'MUSC 150Z', 'MUSC 203B', 'MUSC 203F',
  'MUSC 203H',
]
const JAZZ = ['MUSC 3', 'MUSC 164']
// 2025-26: the list also has MUSC 54 North Indian Music Workshop.
const ELECTIVE_ENSEMBLES = [
  'MUSC 1C', 'MUSC 2', 'MUSC 3', 'MUSC 5A', 'MUSC 5B', 'MUSC 5C', 'MUSC 8A', 'MUSC 8B', 'MUSC 9', 'MUSC 10',
  'MUSC 12', 'MUSC 53A', 'MUSC 54', 'MUSC 55', 'MUSC 55A', 'MUSC 77', 'MUSC 102', 'MUSC 103', 'MUSC 129', 'MUSC 158',
  'MUSC 163', 'MUSC 164', 'MUSC 165', 'MUSC 166', 'MUSC 168',
]

export default defineHarness({
  program: 'jazz-spontaneous-composition-and-improvisation-minor',
  edition: '2025-26',
  title: 'Jazz, Spontaneous Composition, and Improvisation Minor',
  attestations: [
    {
      id: 'theory-placement',
      label: 'Placed into MUSC 30A on the Theory Placement Exam (MUSC 14 not required)',
      quote: 'If a student places into MUSC 30A via the exam, they are not required to take MUSC 14.',
      aliases: ['theory placement', 'placement exam', 'tpe'],
    },
  ],
  notes: [
    'Upper-division (and graduate) courses need a letter grade — the minor states no exception for ensembles; lower-division courses may be P/NP.',
    'MUSC 60, Fundamental Keyboard Skills, is recommended alongside the Western theory courses but not required.',
  ],
  evaluate(h) {
    h.policy = undefined
    const UD = { letter: true }
    const udPass = new Set(
      h.enrollments.filter((e) => isPass(e.grade) && (h.catalog.get(e.code)?.division ?? 'upper') !== 'lower').map((e) => e.id),
    )
    const udLetter = (chosen: Enrollment[]) => {
      const bad = chosen.find((e) => udPass.has(e.id))
      return bad ? `${bad.display}: taken P/NP, but upper-division courses need a letter grade` : null
    }

    const audition = h.info(
      'audition',
      'Audition into the jazz ensembles',
      'The Jazz, Spontaneous Composition, and Improvisation minor is limited to students who have sufficient performance proficiency to pass auditions for entry into the jazz ensembles, MUSC 3 and MUSC 164.',
      'An entry condition for the minor, not tracked here.',
    )

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('history', 'Lower-Division History', 'Take one of the following courses', codes(...HISTORY)),
      h.group('theory', 'Lower-Division Theory', [
        h.either('theory/musc14', 'MUSC 14 (or placement into MUSC 30A)', 'If a student places into MUSC 30A via the exam, they are not required to take MUSC 14.', [
          h.take('theory/musc14/course', 'MUSC 14 Beginning Western Theory and Musicianship', 'MUSC 14 — Beginning Western Theory and Musicianship (5)', codes('MUSC 14')),
          h.attest('theory-placement'),
        ]),
        h.take('theory/musc30a', 'MUSC 30A Theory, Literature, and Musicianship I', 'MUSC 30A — Theory, Literature, and Musicianship I (5)', codes('MUSC 30A')),
      ]),
      h.take('musc31', 'MUSC 31 Ear Training (alongside MUSC 30A)', 'The following course alongside MUSC 30A', codes('MUSC 31')),
      h.options(
        'ld-improv',
        'Lower-Division Theory and Improvisation',
        ['Take one of the following courses', 'Or two quarters of the following course'],
        [['MUSC 20C'], ['MUSC 74'], ['MUSC 3', 'MUSC 3']],
        { exclusive: false, labels: ['MUSC 20C', 'MUSC 74', 'Two quarters of MUSC 3'] },
      ),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('ud-theory', 'Upper-Division Theory and Improvisation', 'Take one of the following courses', codes(...UD_THEORY), { policy: UD }),
      h.take('ud-electives', 'Upper-Division Electives', 'Take three (3) of the courses from the following list.', codes(...UD_ELECTIVES), {
        n: 3,
        policy: UD,
      }),
    ])

    const ensembles = h.group(
      'ensembles',
      'Performing Ensembles (six quarters)',
      [
        h.take('jazz-ensembles', 'Jazz Ensembles: three quarters of MUSC 3 and/or MUSC 164', [
          'Take three quarters of MUSC 3 and/or MUSC 164.',
          'If a student elects to take two quarters of MUSC 3 instead of MUSC 74 or MUSC 20C, they are only required to do one additional quarter of a jazz ensemble, plus the three quarters of elective ensembles.',
        ], codes(...JAZZ), {
          n: 3,
          repeatable: true,
          check: udLetter,
          notes: ['Two quarters of MUSC 3 used for the lower-division improvisation requirement also count here.'],
        }),
        h.take('elective-ensembles', 'Elective Ensembles: three quarters', [
          'In addition to the three quarters of a jazz-focused ensemble, students pursuing this minor must take three elective ensembles.',
          'Students may repeat any of the ensembles listed below for credit.',
        ], codes(...ELECTIVE_ENSEMBLES), {
          n: 3,
          repeatable: true,
          check: udLetter,
        }),
      ],
      {
        quote:
          'Students in the Jazz, Spontaneous Composition, and Improvisation minor are required to take six quarters of performing ensembles: at least three quarters of a jazz-focused ensemble (MUSC 3 or MUSC 164), and three completely elective ensembles.',
      },
    )
    return [audition, lower, upper, ensembles]
  },
})
