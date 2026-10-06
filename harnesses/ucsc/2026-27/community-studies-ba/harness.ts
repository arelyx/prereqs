// Community Studies B.A. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/community-studies-ba.md
//
// One lower-division course, the six listed core courses (incl. full-time
// field study CMMU 105A/B/C), three topical courses that must ALL be finished
// before field study begins, DC = CMMU 100 + 107 and the capstone essay in
// CMMU 107. Every course needs a letter grade of C or better.
//
// Judgement call: the intro says "seven upper-division core classes, two of
// which are 15 credits each", but the Core Courses list names six courses
// (all shown at 5 credits). The harness requires the six listed courses.
import { codes, defineHarness } from '@harness'
import type { Enrollment } from '@harness'

const CORE = ['CMMU 100', 'CMMU 101', 'CMMU 105A', 'CMMU 105B', 'CMMU 105C', 'CMMU 107']
const FIELD_STUDY = new Set(['CMMU105A', 'CMMU105B', 'CMMU105C'])
const THESIS = ['CMMU 195A', 'CMMU 195B', 'CMMU 195C']

// Topical lists, page order. Cross-listed aliases (shown as "[/X]" on the page)
// are included so a course recorded under its other code still counts.
const TOPICAL = [
  // Community Studies
  'CMMU 130', 'CMMU 132', 'CMMU 133', 'CMMU 134', 'CMMU 137', 'CMMU 141', 'CMMU 143', 'CMMU 145',
  'CMMU 148', 'CMMU 149', 'CMMU 151', 'CMMU 156', 'CMMU 157', 'CMMU 160', 'CMMU 161', 'CMMU 162',
  'CMMU 163', 'CMMU 164', 'CMMU 165', 'GCH 165', 'CMMU 167', 'CMMU 186',
  // Anthropology
  'ANTH 134', 'ANTH 136', 'ANTH 153', 'ANTH 194P',
  // Education
  'EDUC 135', 'EDUC 173', 'EDUC 181',
  // Environmental Studies
  'ENVS 130B', 'LGST 130B', 'ENVS 158',
  // History of Art and Visual Culture
  'HAVC 141K', 'HAVC 141O', 'HAVC 142',
  // History
  'HIS 123',
  // Latin American and Latino Studies
  'LALS 175',
  // Oakes College
  'OAKS 153',
  // Politics
  'POLI 120C', 'LGST 120C', 'POLI 122', 'POLI 124', 'GCH 186',
  // Psychology
  'PSYC 147A', 'PSYC 147B', 'PSYC 149', 'PSYC 153', 'PSYC 155', 'PSYC 159H',
  // Sociology
  'SOCY 122', 'LGST 122', 'SOCY 127', 'LGST 127', 'SOCY 131', 'SOCY 176A', 'SOCY 177', 'SOCY 177E', 'SOCY 177G',
]

const Q_TOPICAL_BEFORE = 'All three topical courses must be completed before a student begins full-time field study (CMMU 105A-CMMU 105B-CMMU 105C).'

export default defineHarness({
  program: 'community-studies-ba',
  edition: '2026-27',
  title: 'Community Studies B.A.',
  notes: [
    'Every course for the major must be taken for a letter grade, with a C or better.',
    'The topical courses must all be finished before your first quarter of full-time field study (CMMU 105A/B/C).',
    'EAP coursework may satisfy one topical course by petition — add it as a completed course once approved.',
  ],
  coverage: {
    unknownOk: {
      GCH165: 'cross-listed alias of CMMU 165 shown on the page; the catalog lists the course under CMMU 165',
      LGST130B: 'cross-listed alias of ENVS 130B',
      LGST120C: 'cross-listed alias of POLI 120C',
      LGST122: 'cross-listed alias of SOCY 122',
      LGST127: 'cross-listed alias of SOCY 127',
    },
  },
  evaluate(h) {
    // "All courses for the major must be taken for a letter grade. Satisfactory
    // completion of all major course requirements is defined by a grade of C or higher."
    h.policy = { letter: true, min: 'C' }

    const lower = h.take('lower', 'Lower-Division Course', 'Take one of the following:', codes('CMMU 10', 'CMMU 20'))

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

    const topical = h.take('topical', 'Three topical courses (before field study)', ['Take three courses from the lists below.', Q_TOPICAL_BEFORE], codes(...TOPICAL), {
      n: 3,
      check: beforeField,
    })
    const upper = h.group(
      'upper',
      'Upper-Division Courses',
      [
        h.all('core', 'Core Courses', 'Complete all of the following courses:', CORE),
        topical,
      ],
      { quote: 'Students complete the core curriculum and three topical courses.' },
    )

    const dc = h.all(
      'dc',
      'Disciplinary Communication (DC): CMMU 100 and CMMU 107',
      'they fulfill the DC requirement by completing these two courses:',
      ['CMMU 100', 'CMMU 107'],
      { exclusive: false },
    )

    const comprehensive = h.group('comprehensive', 'Comprehensive Requirement: Senior Capstone', [
      h.take(
        'capstone-essay',
        'Capstone Analytic Essay (CMMU 107)',
        ['Each student must fulfill this requirement whether through a Capstone Analytic Essay, a senior thesis, or a student-directed seminar.', 'The Capstone Analytic Essay is completed entirely in the following course:'],
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
      'Complete one of the following courses or any upper-division topical course listed in the Requirements and Planners section. This course must be passed with a letter grade of C or better.',
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
