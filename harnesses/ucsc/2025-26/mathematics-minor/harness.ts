// Mathematics Minor — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/mathematics-minor.md
//
// 2025-26 differences from 2026-27: no recommended-course list; MATH 100 may,
// "under exceptional circumstances", be substituted by another upper-division
// MATH course with vice-chair approval (petition attestation, offered only when
// MATH 100 is not in the plan); courses from other departments need vice-chair
// review (note: the plan cannot show approvals).
import { anyOf, codes, defineHarness, range } from '@harness'

const Q_SUB =
  'Under exceptional circumstances, MATH 100 may be substituted by another upper-division mathematics course. The undergraduate vice chair will review requests on an individual basis.'
const Q_ELECTIVES =
  'The remaining four courses are chosen from MATH, AM, or STAT courses numbered 101-190. Courses must be 5 credits or more, and only one of the four courses can be from AM or STAT. Lecture and lab combinations count as a single course. For courses with a required concurrently enrolled lab, only successful completion of the lecture is required for the major.'

export default defineHarness({
  program: 'mathematics-minor',
  edition: '2025-26',
  title: 'Mathematics Minor',
  attestations: [
    {
      id: 'math100-substitute',
      label: 'Undergraduate vice chair approved a substitute for MATH 100',
      quote: Q_SUB,
    },
  ],
  notes: [
    'Courses for the minor may be taken for a letter grade or Pass/No Pass.',
    'Courses from other departments must be reviewed and approved by the undergraduate vice chair.',
    'No senior seminar or thesis is required.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.group('lower', 'Lower-Division Courses', [
      h.take('calc-a', 'MATH 19A or 20A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 20A')),
      h.take('calc-b', 'MATH 19B or 20B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 20B')),
      h.take('linalg', 'Linear algebra (MATH 21 or AM 10)', 'Plus one of the following courses:', codes('MATH 21', 'AM 10'), { notes: ['MATH 21 is preferred.'] }),
      h.all('vector-calc', 'MATH 23A and 23B', 'Plus all of the following courses:', ['MATH 23A', 'MATH 23B']),
    ])

    const amStat = anyOf(range('AM', 101, 190), range('STAT', 101, 190))
    // Petition path: asked only when MATH 100 is not in the plan; once approved,
    // another upper-division MATH course (not one of the four electives) fills the line.
    const math100Slot = h.take('math100', 'MATH 100', 'Take the following course:', codes('MATH 100'))
    const math100Absent = !h.enrollments.some((e) => e.code === 'MATH100')
    const math100 = !math100Absent
      ? math100Slot
      : h.attested('math100-substitute')
        ? h.take('math100-sub', 'MATH 100 (approved substitute)', Q_SUB, range('MATH', 101, 199).minCredits(5), {
            pool: 'an upper-division MATH course approved by the undergraduate vice chair',
          })
        : h.either('math100-or-sub', 'MATH 100, or an approved substitute', Q_SUB, [math100Slot, h.attest('math100-substitute')])
    const upper = h.group('upper', 'Upper-Division Courses', [
      math100,
      h.take('electives', 'Four upper-division electives', ['Plus four upper-division electives:', Q_ELECTIVES], anyOf(range('MATH', 101, 190), amStat).minCredits(5), {
        n: 4,
        atMost: [
          { set: amStat, n: 1, label: 'at most one AM or STAT course' },
          // Catalog: "Students cannot receive credit for this course and MATH 111T."
          { set: codes('MATH 111A', 'MATH 111T'), n: 1, label: 'MATH 111A / MATH 111T (credit for only one)' },
        ],
        labs: 'catalog-merge',
        pool: 'MATH, AM or STAT 101–190 (5+ credits; at most one AM/STAT)',
      }),
    ])

    return [lower, upper]
  },
})
