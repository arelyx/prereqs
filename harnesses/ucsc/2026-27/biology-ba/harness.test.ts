import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// Frosh from fall 2026 (CHEM 3B includes lab). Upper division:
// core BIOE 106/107/109; anatomy BIOE 134+134L; electives BIOE 108, 114+114L,
// 140, 165; DC = BIOE 108 + BIOE 114/114L; lab/field + comprehensive = BIOE 114L.
const base = plan(
  ['2268', 'BIOE 20C', 'CHEM 3A', 'MATH 16A'],
  ['2270', 'BIOL 20A', 'CHEM 3B', 'STAT 5'],
  ['2272', 'BIOE 20B', 'PHYS 1A'],
  ['2278', 'BIOE 106', 'BIOE 107'],
  ['2280', 'BIOE 109', 'BIOE 134', 'BIOE 134L'],
  ['2282', 'BIOE 108', 'BIOE 140'],
  ['2288', 'BIOE 114', 'BIOE 114L', 'BIOE 165'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
// No lab/field or comprehensive course: anatomy BIOE 136, BIOE 172 instead of the herpetology pair.
const noLab = () => edit(edit(edit(edit(base, 'BIOE 114', 'BIOE 172'), 'BIOE 114L', null), 'BIOE 134', 'BIOE 136'), 'BIOE 134L', null)
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('biology-ba 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('CHEM 3B before fall 2026 needs CHEM 3BL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2260', 'CHEM 3BL') }), 'gen-chem').status).toBe('met')
  })

  it('CHEM 4A + 4AL is the alternative; 4A alone is not enough', () => {
    const t = edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', null)
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2268', 'CHEM 4AL') }), 'gen-chem').status).toBe('met')
  })

  it('statistics: STAT 7 needs STAT 7L', () => {
    const t = edit(base, 'STAT 5', 'STAT 7')
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2270', 'STAT 7L') }), 'stats').status).toBe('met')
  })

  it('physics: any one of PHYS 1A, 1B, 6A; none fails', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 6A') }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 1B') }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 5A') }), 'physics').status).toBe('unmet')
  })

  it('BIOL 105 may replace BIOE 106 as the genetics core', () => {
    expect(failing(run(harness, { terms: edit(base, 'BIOE 106', 'BIOL 105') }))).toEqual([])
  })

  it('missing BIOE 109 fails the core', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 109', null) }), 'core').status).toBe('unmet')
  })

  it('a required concurrent lab must be passed with its lecture (BIOE 134 without 134L)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 134L', null) }), 'anat-phys').status).toBe('unmet')
  })

  it('BIOE 131 counts without its optional lab', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'BIOE 134', 'BIOE 131'), 'BIOE 134L', null) }), 'anat-phys').status).toBe('met')
  })

  it('only three electives fails', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', null) }), 'electives').status).toBe('unmet')
  })

  it('elective list courses (BIOL 101, METX 133) count; BIOL 110 does not', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'METX 133') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'BIOL 110') }), 'electives').status).toBe('unmet')
  })

  it('a 2-credit lab is not an elective; BIOE 180+ is outside the range', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'BIOE 131L') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'BIOE 186') }), 'electives').status).toBe('unmet')
  })

  it('BIOE 106 + BIOL 105: one is the genetics core, the other may be an elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'BIOE 140', 'BIOL 105') }))).toEqual([])
  })

  it('anatomy course cannot also be an elective', () => {
    // BIOE 134 is in the 100-179 range, but it is the only anatomy course
    const r = run(harness, { terms: edit(base, 'BIOE 140', null) })
    expect(find(r, 'anat-phys').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('5-credit lecture + 5-credit lab as two electives is cannot-check', () => {
    const t = add(edit(base, 'BIOE 140', 'BIOE 145'), '2282', 'BIOE 145L')
    expect(find(run(harness, { terms: edit(t, 'BIOE 165', null) }), 'electives').status).toBe('cannot-check')
    // with a fourth independent elective it is simply met
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met')
  })

  it('DC needs two courses from the list', () => {
    const t = edit(base, 'BIOE 108', 'BIOE 147')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(t, 'BIOE 140', 'BIOE 172') }), 'dc').status).toBe('met')
  })

  it('DC: BIOE 129 needs BIOE 129L; BIOE 129 alone still counts as an elective', () => {
    const t = edit(base, 'BIOE 108', 'BIOE 129')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
    expect(find(run(harness, { terms: add(t, '2282', 'BIOE 129L') }), 'dc').status).toBe('met')
  })

  it('DC: BIOE 117 counts with its lab for electives; for DC the lab is not part of it', () => {
    const t = add(edit(base, 'BIOE 108', 'BIOE 117'), '2282', 'BIOE 117L')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('DC: California Ecology and Conservation (NRS 188) from spring 2023 is half DC credit', () => {
    const t = edit(base, 'BIOE 108', 'BIOE 147')
    expect(find(run(harness, { terms: add(t, '2282', 'NRS 188') }), 'dc').status).toBe('met')
    expect(find(run(harness, { terms: t, completed: ['XENV 188'] }), 'dc').status).toBe('cannot-check')
    const early = [{ term: '2230', courses: ['NRS 188'] }, ...t]
    expect(find(run(harness, { terms: early }), 'dc').status).toBe('unmet')
  })

  it('comprehensive: no listed lab/field, research or thesis course fails', () => {
    // swap the herpetology pair for a non-lab DC lecture
    const t = noLab()
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'lab-field').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2288', 'BIOE 195') }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: add(t, '2288', 'CRSN 152') }), 'comprehensive').status).toBe('met')
    // a non-EEB research course may count: ask
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: add(t, '2288', 'BIOL 186L') }), 'comprehensive').status).toBe('cannot-check')
    // BIOL 186L is a lab but not one of the eight courses unless counted as the one
    // research-based upper-division course — ask (reviewed 2026-10-06)
    expect(find(run(harness, { terms: add(t, '2288', 'BIOL 186L') }), 'lab-field').status).toBe('cannot-check')
  })

  it('comprehensive via senior thesis leaves the lab/field requirement to an advisor', () => {
    const t = add(noLab(), '2288', 'BIOE 195')
    expect(find(run(harness, { terms: t }), 'lab-field').status).toBe('cannot-check')
  })

  it('letter grades: P in a core lecture fails; P in a comprehensive course is cannot-check', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOE 107': 'P' } }), 'core').status).toBe('unmet')
    const t = noLab()
    const r = run(harness, { terms: add(t, '2288', 'BIOE 183W'), grades: { 'BIOE 183W': 'P' } })
    expect(find(r, 'comprehensive').status).toBe('cannot-check')
  })

  // --- adversarial review 2026-10-06 ---
  describe('review 2026-10-06', () => {
    it('CHEM 3B taken before fall 2026 and retaken fall 2026 or later needs no CHEM 3BL', () => {
      const t = [{ term: '2262', courses: ['CHEM 3B'] }, ...base]
      expect(find(run(harness, { terms: t, grades: {} }), 'gen-chem').status).toBe('met')
    })

    it('transfer CHEM 3B with no term and no CHEM 3BL is cannot-check', () => {
      const r = run(harness, { terms: edit(base, 'CHEM 3B', null), completed: ['CHEM 3B'] })
      expect(find(r, 'gen-chem').status).toBe('cannot-check')
    })

    it('lab/field must be one of the eight courses: CRSN 152 satisfies comprehensive only', () => {
      // "A total of eight (8) upper-division biology courses …: one must include laboratory or fieldwork"
      const r = run(harness, { terms: add(noLab(), '2288', 'CRSN 152') })
      expect(find(r, 'comprehensive').status).toBe('met')
      expect(find(r, 'lab-field').status).toBe('unmet')
      expect(find(r, 'lab-field').detail).toContain('CRSN 152')
    })

    it('lab/field: a 5-credit MCD lab outside the elective list (BIOL 105L) is not one of the eight', () => {
      expect(find(run(harness, { terms: add(noLab(), '2288', 'BIOL 105L') }), 'lab-field').status).toBe('unmet')
    })

    it('lab/field: BIOE 131 with its optional lab BIOE 131L as the anatomy course counts', () => {
      const t = add(edit(noLab(), 'BIOE 136', 'BIOE 131'), '2280', 'BIOE 131L')
      const r = run(harness, { terms: t })
      expect(find(r, 'lab-field').status).toBe('met')
      expect(failing(r)).toEqual([])
    })

    it('lab/field: a surplus elective-eligible field course can be swapped into the electives', () => {
      const r = run(harness, { terms: add(noLab(), '2288', 'BIOE 128L') })
      expect(find(r, 'lab-field').status).toBe('met')
      expect(failing(r)).toEqual([])
    })

    it('catalog "cannot receive credit for both" BIOE 150 and BIOE 151A: only one is an elective', () => {
      const t = edit(edit(base, 'BIOE 140', 'BIOE 150'), 'BIOE 165', 'BIOE 151A')
      expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
      expect(find(run(harness, { terms: add(t, '2288', 'BIOE 147') }), 'electives').status).toBe('met')
    })

    it('DC: BIOE 150L and BIOE 151B cannot both count (no credit for both)', () => {
      const t = add(edit(edit(noLab(), 'BIOE 108', 'BIOE 150L'), 'BIOE 172', 'BIOE 151B'), '2282', 'BIOE 147')
      expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
      expect(find(run(harness, { terms: add(t, '2282', 'BIOE 174') }), 'dc').status).toBe('met')
    })

    it('three electives + an unused research course (BIOE 193) or graduate course is cannot-check, not unmet', () => {
      const t = edit(base, 'BIOE 140', null)
      // "Only one upper-division course requirement may be met with a research-based independent study or graduate-level UC Santa Cruz biology course."
      expect(find(run(harness, { terms: add(t, '2288', 'BIOE 193') }), 'electives').status).toBe('cannot-check')
      expect(find(run(harness, { terms: add(t, '2288', 'BIOE 247') }), 'electives').status).toBe('cannot-check')
      // a non-research 180+ course is still unmet
      expect(find(run(harness, { terms: add(t, '2288', 'BIOE 189F') }), 'electives').status).toBe('unmet')
    })

    it('qualification grades (C- in BIOL 20A) gate declaration only; shown as info', () => {
      const r = run(harness, { terms: base, grades: { 'BIOL 20A': 'C-' } })
      expect(find(r, 'qualification').status).toBe('info')
      expect(failing(r)).toEqual([])
    })

    it('METX 135 + METX 135L as anatomy satisfies anatomy, lab/field and comprehensive', () => {
      const t = add(edit(noLab(), 'BIOE 136', 'METX 135'), '2280', 'METX 135L')
      expect(failing(run(harness, { terms: t }))).toEqual([])
    })

    it('METX 135 without METX 135L (required concurrent lab) is not the anatomy course', () => {
      expect(find(run(harness, { terms: edit(noLab(), 'BIOE 136', 'METX 135') }), 'anat-phys').status).toBe('unmet')
    })

    it('empty plan fails without crashing', () => {
      const r = run(harness, { terms: [] })
      expect(r.status).toBe('unmet')
      expect(find(r, 'lab-field').status).toBe('unmet')
    })

    it('kitchen sink: every listed course in one plan is complete', () => {
      const all = add([...base, { term: '2290', courses: [] }], '2290', 'BIOE 145', 'BIOE 145L', 'BIOE 150', 'BIOE 150L', 'BIOE 151A', 'BIOE 151B',
        'BIOE 129', 'BIOE 129L', 'BIOL 105', 'BIOL 100', 'BIOL 101', 'METX 100', 'METX 100L', 'CRSN 152', 'BIOE 195', 'NRS 188')
      expect(failing(run(harness, { terms: all }))).toEqual([])
    })
  })
})
