// Computer Science: Computer Game Design B.S. — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/computer-science-computer-game-design-bs.md
import { codes, defineHarness } from '@harness'
import type { HarnessContext, Node } from '@harness'

const CGE = [
  'CMPM 110', 'CMPM 119', 'CMPM 122', 'CMPM 125', 'CMPM 131', 'CMPM 132', 'CMPM 146', 'CMPM 147', 'CMPM 148',
  'CMPM 150', 'CMPM 151', 'CMPM 152', 'CMPM 163', 'CMPM 164', 'CMPM 169', 'CMPM 172', 'CMPM 123', 'CMPM 177',
  'CMPM 178', 'CMPM 179', 'ARTG 179', 'CMPM 180', 'CSE 102', 'CSE 103', 'CSE 104', 'CSE 110A', 'CSE 110B', 'CSE 112',
  'CSE 113', 'CSE 115A', 'CSE 115B', 'CSE 115C', 'CSE 117', 'CSE 118', 'CSE 119', 'CSE 120', 'CSE 130', 'CSE 132',
  'CSE 138', 'CSE 140', 'CSE 142', 'CSE 144', 'CSE 145', 'CSE 146', 'CSE 150', 'CSE 156', 'CSE 157', 'CSE 160',
  'CSE 161', 'CSE 162', 'CSE 163', 'CSE 164', 'CSE 165', 'CSE 167', 'CSE 168', 'CSE 180', 'CSE 181', 'CSE 183',
  'CSE 186', 'CSE 187', 'CSE 184', 'ECE 118', 'ECON 166A', 'CSE 166A',
]
// "No more than two of the five can be from CMPM 110, CMPM 122, CMPM 131,
// CMPM 132, CMPM 150, CMPM 177, CSE 103, CSE 104, or ECON 166A." (the page
// says "These seven courses" but names nine; all nine are capped)
const OTHER_SKILLS = codes('CMPM 110', 'CMPM 122', 'CMPM 131', 'CMPM 132', 'CMPM 150', 'CMPM 177', 'CSE 103', 'CSE 104', 'ECON 166A', 'CSE 166A')
// "Associated labs are required only when required by the lecture." The
// catalog requires concurrent labs for these listed lectures.
const REQUIRED_LABS: [string, string][] = [['CSE 156', 'CSE 156L'], ['CSE 161', 'CSE 161L'], ['CSE 162', 'CSE 162L'], ['CMPM 164', 'CMPM 164L']]

export default defineHarness({
  program: 'computer-science-computer-game-design-bs',
  edition: '2026-27',
  title: 'Computer Science: Computer Game Design B.S.',
  coverage: {
    unknownOk: {
      ARTG179: 'cross-listed with CMPM 179 on the page; not in the committed ARTG catalog',
      CSE166A: 'cross-listed with ECON 166A on the page; not in the committed CSE catalog',
    },
  },
  notes: [
    'The Baskin School of Engineering requires letter grades for all courses in an engineering major.',
    'Course requirements are divided into five areas and a course may count in only one of them.',
  ],
  evaluate(h) {
    // "The Baskin School of Engineering requires letter grades for all courses in an engineering major."
    h.policy = { letter: true }

    const math = h.group('math', 'Mathematics', [
      h.options('calc', 'Calculus', ['Choose one of the following options:', 'Credit for one or both MATH 19A/MATH 19B may be granted with adequate performance on the CEEB calculus AB or BC Advanced Placement examinations.'], [
        ['MATH 19A', 'MATH 19B'],
        ['MATH 20A', 'MATH 20B'],
      ]),
      h.take('linalg', 'Linear algebra', 'Plus one of the following courses:', codes('MATH 21', 'AM 10')),
      h.take('cse16', 'CSE 16', 'Plus the following course:', codes('CSE 16')),
    ])

    const comp = h.group('computational', 'Computational Foundations', [
      h.take('c-prog', 'C programming', 'Choose one of the following options:', codes('ECE 13', 'CSE 13S')),
      h.take('cse20', 'CSE 20', ['Plus all of the following courses:', 'Students with no prior programming courses will take CSE 20 before CSE 30 and CSE 12.'], codes('CSE 20')),
      h.all('cse-core', 'CSE 12, 30, 101', 'Plus all of the following courses:', ['CSE 12', 'CSE 30', 'CSE 101']),
    ])

    const foundations = h.all('playable', 'Games and Playable Media Foundations', 'Complete all of the following courses:', ['FILM 80V', 'CMPM 80J'])
    const design = h.all('design-dev', 'Game Design and Development', 'Complete all of the following courses:', ['CMPM 80K', 'CMPM 120', 'CMPM 121', 'CMPM 130', 'CMPM 176'])

    const cge = h.take('cge', 'Computer Game Engineering electives (five)', [
      'Complete five courses from the following list.',
      'No more than two of the five can be from CMPM 110, CMPM 122, CMPM 131, CMPM 132, CMPM 150, CMPM 177, CSE 103, CSE 104, or ECON 166A.',
      'CMPM 179 and CMPM 180 are repeatable for credit but may only count once each toward the elective requirement.',
      'NOTE: Lecture/lab combinations count as one course. Associated labs are required only when required by the lecture.',
    ], codes(...CGE), {
      n: 5,
      labs: { pairs: REQUIRED_LABS, mode: 'required' },
      atMost: [{ set: OTHER_SKILLS, n: 2, label: 'at most two from CMPM 110/122/131/132/150/177, CSE 103/104, ECON 166A' }],
      // cross-listed pairs are one course: "CMPM 179 [/ARTG 179]", "ECON 166A [/CSE 166A]"
      check: (chosen) => {
        const c = new Set(chosen.map((e) => e.code))
        if (c.has('CMPM179') && c.has('ARTG179')) return 'CMPM 179 and ARTG 179 are the same course'
        if (c.has('ECON166A') && c.has('CSE166A')) return 'ECON 166A and CSE 166A are the same course'
        return null
      },
      notes: ['Enrollment restrictions might apply to any of the CSE courses listed here.'],
    })

    // "Students must satisfy the major's upper-division disciplinary
    // communication (DC) requirement by completing the following course:
    // CMPM 130" — also required under Game Design and Development.
    const dc = h.take('dc', 'Disciplinary Communication (DC)', "Students must satisfy the major's upper-division disciplinary communication (DC) requirement by completing the following course:", codes('CMPM 130'), { exclusive: false })

    const comprehensive = h.options('comprehensive', 'Comprehensive Requirement', [
      'Students satisfy the senior comprehensive requirement by receiving a passing grade for all of the courses in one of the following tracks:',
      'Note: Not all tracks will be offered in all years.',
    ], [
      ['CMPM 170', 'CMPM 171'],
      ['CMPM 173', 'CMPM 174'],
      ['CMPM 181', 'CMPM 182'],
    ], { labels: ['Game Design', 'Computational Media', 'Games for Impact'] })

    h.solve()
    cse20TestOut(h, comp)
    return [math, comp, foundations, design, cge, dc, comprehensive]
  },
})

function findNode(root: Node, id: string): Node | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return undefined
}

/** CSE 20 is listed as required; a test-out student "will start with CSE 30" — the page does not say it satisfies the line. */
function cse20TestOut(h: HarnessContext, root: Node) {
  const n = findNode(root, 'cse20')!
  if (n.status !== 'unmet' || !h.has('CSE 30')) return
  n.status = 'cannot-check'
  n.detail = 'No CSE 20 in your plan, but you passed CSE 30. If you cleared the CSE 20 test-out, confirm with an advisor that it satisfies this line; otherwise take CSE 20 (AP credit: add it as CSE 20).'
}
