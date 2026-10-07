// Electronic Music Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/electronic-music-minor.md
//
// Six course lists. Grade rule: "All upper-division courses attempted toward
// the minor must be taken for a letter grade." The minor states no ensemble
// exception (unlike the majors), so every upper-division (or graduate) course
// needs a letter grade, decided by the catalog's division — MUSC 73 is a
// lower-division course even though it sits in the upper-division workshop
// list, so it may be P/NP.
// Placement / test-out paths (theory placement into MUSC 30A, CSE 20 test-out)
// are attestations; department-approved substitutions are notes only.
import { codes, defineHarness, isPass } from '@harness'
import type { Enrollment } from '@harness'

const HISTORY = ['MUSC 11A', 'MUSC 11B', 'MUSC 11C', 'MUSC 11D', 'MUSC 11E']
// PHYS 80U [/MUSC 80U]: the library treats cross-listed codes as one course.
// 2025-26: MUSC 80R is not on this edition's list (the sample-plan footnote
// mentions it, but the list is the rule).
const TECH = ['MUSC 71', 'MUSC 72', 'MUSC 80K', 'MUSC 80L', 'PHYS 80U', 'FILM 171A', 'THEA 114']
// 2025-26: CT 20 is not on this edition's list.
const PROGRAMMING = ['CSE 5J', 'CSE 20', 'ECE 101', 'ECE 153', 'ECE 171', 'PHYS 160']
// 2025-26: no MUSC 254A / MUSC 105X on this edition's list.
const LECTURE = [
  'MUSC 105H', 'MUSC 123A', 'MUSC 123B', 'MUSC 123C', 'MUSC 150N', 'MUSC 150P', 'MUSC 150R', 'MUSC 150Z',
  'MUSC 206B', 'MUSC 206C',
]
const WORKSHOP = ['MUSC 73', 'MUSC 129', 'MUSC 167', 'MUSC 167R', 'MUSC 267']

const Q_GRADES = 'All upper-division courses attempted toward the minor must be taken for a letter grade.'

export default defineHarness({
  program: 'electronic-music-minor',
  edition: '2025-26',
  title: 'Electronic Music Minor',
  attestations: [
    {
      id: 'theory-placement',
      label: 'Placed into MUSC 30A on the Theory Placement Exam',
      quote: 'If a student places into MUSC 30A via the exam, they will automatically satisfy the minor\'s theory requirement.',
      aliases: ['theory placement', 'placement exam', 'tpe'],
    },
    {
      id: 'cse20-test-out',
      label: 'Tested out of CSE 20',
      quote: 'If a student tests out of CSE 20 via the exam, they will automatically satisfy the minor\'s programming requirement.',
      aliases: ['cse 20 test', 'test out', 'test-out', 'programming exam'],
    },
  ],
  notes: [
    'Upper-division (and graduate) courses need a letter grade; lower-division courses may be P/NP.',
    'Similar courses taken here or elsewhere may be approved by the department as substitutions (email music@ucsc.edu) — add an approved substitute as the course it replaces.',
  ],
  evaluate(h) {
    h.policy = undefined
    // Upper-division/graduate enrollments taken P/NP cannot count anywhere.
    // Division through the cross-listing: MUSC 80U has no catalog row of its
    // own but is the lower-division PHYS 80U.
    const division = (code: string) =>
      h.catalog.get(code)?.division ?? h.catalog.equivalents(code).map((x) => h.catalog.get(x)?.division).find(Boolean) ?? 'upper'
    const udPass = new Set(h.enrollments.filter((e) => isPass(e.grade) && division(e.code) !== 'lower').map((e) => e.id))
    const listed = codes(...TECH, ...PROGRAMMING, ...LECTURE, ...WORKSHOP)
    for (const e of h.enrollments)
      if (udPass.has(e.id) && listed.has(e.code, h.catalog)) h.excluded.set(e.id, `${e.display}: taken P/NP, but upper-division courses need a letter grade`)
    const udLetter = (chosen: Enrollment[]) => {
      const bad = chosen.find((e) => udPass.has(e.id))
      return bad ? `${bad.display}: taken P/NP, but upper-division courses need a letter grade` : null
    }

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('history', 'Electronic Music History: MUSC 80C', 'Take the following course.', codes('MUSC 80C')),
      h.take('history-elective', 'Lower-Division Music History Elective', 'Take one course from the following list.', codes(...HISTORY), {
        notes: ['A similar music survey/history course taken here or at another institution may be approved by the department.'],
      }),
      h.either(
        'theory',
        'Lower-Division Music Theory',
        'Students who place into MUSC 14 must pass the course to satisfy the minor\'s theory requirement.',
        [
          h.take('theory/musc14', 'MUSC 14 (or MUSC 30A, which needs placement)', [
            'Students who place into MUSC 14 must pass the course to satisfy the minor\'s theory requirement.',
            'If a student places into MUSC 30A via the exam, they will automatically satisfy the minor\'s theory requirement.',
          ], codes('MUSC 14', 'MUSC 30A'), {
            exclusive: false,
          }),
          h.attest('theory-placement'),
        ],
      ),
      h.take('tech-sound', 'Technical Sound Elective', 'Take one course from the following list.', codes(...TECH), {
        check: udLetter,
        notes: ['A similar music course that has a technical focus may be approved by the department.'],
      }),
      h.either('programming', 'Introductory Programming Elective', 'Take one of the following courses.', [
        h.take('programming/course', 'One programming course', ['Take one of the following courses.', 'Students who place into CSE 20 must pass the course, or another from the list, to satisfy the minor\'s programming requirement.'], codes(...PROGRAMMING), {
          check: udLetter,
          notes: ['A similar programming course taken here or at another institution may be approved by the department.'],
        }),
        h.attest('cse20-test-out'),
      ]),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('lecture', 'Upper-Division Lecture/Seminar Electives', [
        'Take four (4) of the following courses.',
        Q_GRADES,
      ], codes(...LECTURE), {
        n: 4,
        policy: { letter: true },
        notes: [
          'If you tested out of MUSC 123A, take another course from this list outside the 123 series.',
          'MUSC 123A was formerly MUSC 123: add a completed MUSC 123 as MUSC 123A.',
        ],
      }),
      h.take('workshop', 'Upper-Division Workshop/Ensemble Electives', [
        'Take three (3) of the following courses.',
        'All courses in list, except MUSC 167R, can be repeated for credit.',
      ], codes(...WORKSHOP), {
        n: 3,
        repeatable: 'catalog',
        check: udLetter,
      }),
    ])
    return [lower, upper]
  },
})
