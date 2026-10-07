// Community Studies B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/community-studies-ba.md
//
// One lower-division course, the six listed core courses (incl. full-time
// field study CMMU 105A/B/C), three topical courses that must ALL be finished
// before field study begins, DC = CMMU 100 + 107 and the capstone essay in
// CMMU 107. Every course needs a letter grade of C or better.
//
// Judgement call: the intro says "seven upper-division core classes, two of
// which are 15 credits each", but the Core Courses list names six courses
// (all shown at 5 credits). The harness requires the six listed courses.
//
// 2025-26: the lower-division course is CMMU 10 only (2026-27 also accepts
// CMMU 20). The page also calls CMMU 100 "CMMU 102 Preparation for Field
// Studies" (its former number); the list row is CMMU 100.
import { codes, defineHarness } from '@harness'
import type { Enrollment } from '@harness'

const CORE = ['CMMU 100', 'CMMU 101', 'CMMU 105A', 'CMMU 105B', 'CMMU 105C', 'CMMU 107']
const FIELD_STUDY = new Set(['CMMU105A', 'CMMU105B', 'CMMU105C'])
const THESIS = ['CMMU 195A', 'CMMU 195B', 'CMMU 195C']

// Topical lists, page order. Cross-listed codes ("[/X]" on the page) need
// nothing: the library treats them as one course.
const TOPICAL = [
  // Community Studies
  'CMMU 130', 'CMMU 132', 'CMMU 133', 'CMMU 134', 'CMMU 137', 'CMMU 141', 'CMMU 143', 'CMMU 145',
  'CMMU 148', 'CMMU 149', 'CMMU 151', 'CMMU 156', 'CMMU 157', 'CMMU 160', 'CMMU 161', 'CMMU 162',
  'CMMU 163', 'CMMU 164', 'CMMU 165', 'CMMU 167', 'CMMU 186',
  // Anthropology
  'ANTH 134', 'ANTH 136', 'ANTH 153', 'ANTH 194P',
  // Education
  'EDUC 135', 'EDUC 173', 'EDUC 181',
  // Environmental Studies
  'ENVS 130B', 'ENVS 158',
  // History of Art and Visual Culture
  'HAVC 141K', 'HAVC 141O', 'HAVC 142',
  // History
  'HIS 123',
  // Latin American and Latino Studies
  'LALS 175',
  // Oakes College
  'OAKS 153',
  // Politics
  'POLI 120C', 'POLI 122', 'POLI 124', 'GCH 186',
  // Psychology
  'PSYC 147A', 'PSYC 147B', 'PSYC 149', 'PSYC 153', 'PSYC 155', 'PSYC 159H',
  // Sociology
  'SOCY 122', 'SOCY 127', 'SOCY 131', 'SOCY 176A', 'SOCY 177', 'SOCY 177E', 'SOCY 177G',
]

const Q_TOPICAL_BEFORE = 'All three topical courses must be completed before a student begins full-time field study (CMMU 105A-B-C).'

export default defineHarness({
  program: 'community-studies-ba',
  edition: '2025-26',
  title: 'Community Studies B.A.',
  notes: [
    'Every course for the major must be taken for a letter grade, with a C or better.',
    'The topical courses must all be finished before your first quarter of full-time field study (CMMU 105A/B/C).',
    'EAP coursework may satisfy one topical course by petition, and the program director may approve other topical courses — add an approved course as completed and confirm with the program adviser.',
    'CMMU 100 Preparation for Field Studies was formerly numbered CMMU 102.',
  ],

  evaluate(h) {
    // "All courses for the major must be taken for a letter grade. Satisfactory
    // completion of all major course requirements is defined by a grade of C or higher."
    h.policy = { letter: true, min: 'C' }

    const lower = h.take('lower', 'Lower-Division Course: CMMU 10', ['CMMU 10 — Introduction to Community Activism (5)', 'Students are advised to complete CMMU 10 as early as possible.'], codes('CMMU 10'))

    // The earliest field-study quarter in the plan (null = none with a term).
    const fieldTerms = h.enrollments.filter((e) => FIELD_STUDY.has(e.code) && e.term).map((e) => Number(e.term))
    const fieldStart = fieldTerms.length ? Math.min(...fieldTerms) : null
    const beforeField = (chosen: Enrollment[]): string | null => {
      if (fieldStart == null) return null
      const late = chosen.filter((e) => e.term != null && Number(e.term) >= fieldStart)
      return late.length
        ? `${late.map((e) => e.display).join(', ')} ${late.length > 1 ? 'are' : 'is'} not completed before field study begins`
        : null
    }

    const topical = h.take('topical', 'Three topical courses (before field study)', ['Students must complete three upper-division courses on topics related to health equity, economic justice, or other fields relevant to community studies from the available approved courses.', Q_TOPICAL_BEFORE], codes(...TOPICAL), {
      n: 3,
      check: beforeField,
    })
    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        h.all('core', 'Core Courses', 'Community Studies core curriculum courses follow a sequential pattern and are only offered during specific academic quarters.', CORE),
        topical,
      ],
      { quote: 'In addition to the core curriculum, students must successfully complete three topical courses to develop expertise in specific areas.' },
    )

    const dc = h.all(
      'dc',
      'Disciplinary Communication (DC): CMMU 100 and CMMU 107',
      'they fulfill the DC requirement with two courses:',
      ['CMMU 100', 'CMMU 107'],
      { exclusive: false },
    )

    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement: Senior Capstone', [
      h.take(
        'capstone-essay',
        'Capstone Analytic Essay (CMMU 107)',
        ['Each student must fulfill this requirement whether through a Capstone Analytic Essay, a senior thesis, or a student-directed seminar.', 'The Capstone Analytic Essay is completed entirely in CMMU 107 Analysis of Field Materials.'],
        codes('CMMU 107'),
        { exclusive: false },
      ),
      h.info(
        'thesis-sds',
        'Optional: senior thesis (CMMU 195A/B/C) or student-directed seminar (CMMU 42)',
        [
          'Students electing to write a senior thesis must have a faculty thesis adviser and under direction of the adviser, may enroll in the following courses for variable units in order to complete the thesis.',
          'the student develops and teaches a CMMU 42 course related to the student’s field study and academic coursework and submits a seminar completion report.',
        ],
        `All students complete the Capstone Analytic Essay in CMMU 107; ${THESIS.join(', ')} (thesis) or a student-directed seminar build on it with a faculty adviser.`,
      ),
    ])

    const qualification = h.info(
      'qualification',
      'Major qualification',
      'Students qualify to declare the community studies major by satisfactorily completing CMMU 10, Introduction to Community Activism, and at least one upper-division topical course from the approved list of courses.',
      'Gates declaration of the major, not completion.',
    )

    // Say why a topical course in the plan was not counted.
    h.solve()
    if (topical.status === 'unmet') {
      const late = beforeField(h.taken(codes(...TOPICAL)).filter((e) => !topical.used?.includes(e)))
      if (late) topical.detail = [topical.detail, late].filter(Boolean).join(' · ')
    }

    return [lower, upper, dc, comprehensive, qualification]
  },
})
