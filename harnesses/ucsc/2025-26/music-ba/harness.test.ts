import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

type Terms = ReturnType<typeof plan>
const swap = (t: Terms, from: string, to: string | null): Terms => {
  let done = false
  return t.map((q) => ({
    ...q,
    courses: q.courses.flatMap((c) => {
      if (done || c !== from) return [c]
      done = true
      return to ? [to] : []
    }),
  }))
}
const add = (t: Terms, term: string, ...courses: string[]): Terms => [...t, { term, courses }]

// --- Compositional Practices ---------------------------------------------------
const cp = plan(
  ['2268', 'MUSC 14', 'MUSC 11B', 'MUSC 3'],
  ['2270', 'MUSC 20B', 'MUSC 80C', 'MUSC 3'],
  ['2272', 'MUSC 81A', 'MUSC 3'],
  ['2278', 'MUSC 30A', 'MUSC 31', 'MUSC 120', 'MUSC 164'],
  ['2280', 'MUSC 30B', 'MUSC 31', 'MUSC 121A', 'MUSC 164'],
  ['2282', 'MUSC 101C', 'MUSC 150K', 'MUSC 164'],
  ['2288', 'MUSC 120', 'MUSC 150N', 'MUSC 168'],
  ['2290', 'MUSC 123A', 'MUSC 105H', 'MUSC 168'],
  ['2292', 'MUSC 196A', 'MUSC 168'],
)
const CP = { concentration: 'Compositional Practices' }

describe('music-ba 2025-26 compositional practices', () => {
  it('complete record: everything met except the module membership check', () => {
    const r = run(harness, { terms: cp, choices: CP })
    expect(failing(r)).toEqual(['modules/confirm:cannot-check'])
    expect(find(r, 'modules').status).toBe('cannot-check')
  })

  it('needs a concentration first', () => {
    expect(run(harness, { terms: cp }).nodes[0].status).toBe('needs-choice')
  })

  it('MUSC 120 must be taken twice; a third 120 can fill composition/analysis', () => {
    const one = swap(cp, 'MUSC 120', null)
    expect(find(run(harness, { terms: one, choices: CP }), 'musc120').status).toBe('unmet')
    const three = swap(cp, 'MUSC 121A', 'MUSC 120')
    const r = run(harness, { terms: three, choices: CP })
    expect(find(r, 'musc120').status).toBe('met')
    expect(find(r, 'comp-analysis').status).toBe('met')
  })

  it('MUSC 14 can be bypassed by placement (attestation); MUSC 30A shows placement', () => {
    const t = swap(cp, 'MUSC 14', null)
    expect(find(run(harness, { terms: t, choices: CP, attested: [] }), 'musc14').status).toBe('met') // 30A in plan
    const gm = swap(swap(gmPlan, 'MUSC 14', null), 'MUSC 20A', 'MUSC 20A')
    expect(find(run(harness, { terms: gm, choices: GM, attested: [] }), 'musc14').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: gm, choices: GM, attested: ['theory placement exam'] }), 'musc14').status).toBe('met')
  })

  it('only one module LD course short → modules unmet', () => {
    const r = run(harness, { terms: swap(cp, 'MUSC 81A', null), choices: CP })
    expect(find(r, 'modules/lower').status).toBe('unmet')
    expect(find(r, 'modules').status).toBe('unmet')
  })

  it('elective ensembles cannot double-count with module ensembles', () => {
    // six module quarters + three elective quarters are needed: drop one MUSC 168
    const r = run(harness, { terms: swap(cp, 'MUSC 168', null), choices: CP })
    expect(find(r, 'elective-ensembles').status).toBe('unmet')
  })

  it('non-repeatable workshop counts once among elective ensembles', () => {
    let t = cp
    for (let i = 0; i < 3; i++) t = swap(t, 'MUSC 168', 'MUSC 74')
    expect(find(run(harness, { terms: t, choices: CP }), 'elective-ensembles').status).toBe('unmet')
  })

  it('upper-division lecture needs a letter grade; MUSC 120 and ensembles may be P/NP', () => {
    const r = run(harness, { terms: cp, choices: CP, grades: { 'MUSC 101C': 'P', 'MUSC 120': 'P', 'MUSC 164': 'P', 'MUSC 30A': 'P' } })
    expect(find(r, 'musc101c').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'musc120').status).toBe('met')
    expect(find(r, 'modules/ensembles').status).toBe('met')
    expect(find(r, 'theory-ld').status).toBe('met')
  })

  it('MUSC 31: CP needs two sections', () => {
    const t = cp.map((q) => (q.term === '2278' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 31') } : q))
    expect(find(run(harness, { terms: t, choices: CP }), 'musc31').status).toBe('unmet')
  })

  it('graduate seminar may replace the history/culture elective', () => {
    const r = run(harness, { terms: swap(cp, 'MUSC 105H', 'MUSC 254K'), choices: CP })
    expect(find(r, 'history-elective').status).toBe('met')
  })

  it('senior composition recital is an attestation', () => {
    const r = run(harness, { terms: cp, choices: CP, attested: ['placement'] })
    expect(find(r, 'attest:senior-composition-recital').status).toBe('needs-attestation')
  })
})

// --- Global Musics --------------------------------------------------------------
const gmPlan = plan(
  ['2268', 'MUSC 14', 'MUSC 11D', 'MUSC 5A'],
  ['2270', 'MUSC 20A', 'MUSC 80B', 'MUSC 5A'],
  ['2272', 'MUSC 20B', 'MUSC 80Q', 'MUSC 10'],
  ['2278', 'MUSC 101E', 'MUSC 158', 'MUSC 12'],
  ['2280', 'MUSC 105C', 'MUSC 158', 'MUSC 12'],
  ['2282', 'MUSC 150D', 'MUSC 10', 'MUSC 12'],
  ['2288', 'MUSC 101F', 'MUSC 105H'],
  ['2290', 'MUSC 150I', 'MUSC 253D'],
  ['2292', 'MUSC 105A', 'MUSC 195A'],
)
const GM = { concentration: 'global' }

describe('music-ba 2025-26 global musics', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: gmPlan, choices: GM }))).toEqual(['modules/confirm:cannot-check'])
  })

  it('research course must be concurrent with MUSC 195A', () => {
    const t = swap(add(swap(gmPlan, 'MUSC 195A', null), '2298', 'MUSC 195A'), 'X', null)
    expect(find(run(harness, { terms: t, choices: GM }), 'comprehensive').status).toBe('unmet')
  })

  it('creative portfolio: listed course + MUSC 196A in the same quarter', () => {
    const t = swap(swap(gmPlan, 'MUSC 195A', 'MUSC 196A'), 'MUSC 105A', 'MUSC 150Z')
    expect(find(run(harness, { terms: t, choices: GM }), 'comprehensive').status).toBe('met')
    // a research-list course with 196A does not count
    const bad = swap(gmPlan, 'MUSC 195A', 'MUSC 196A')
    expect(find(run(harness, { terms: bad, choices: GM }), 'comprehensive').status).toBe('unmet')
  })

  it('MUSC 200 cannot fill both the graduate requirement and the research project', () => {
    const t = swap(swap(gmPlan, 'MUSC 253D', 'MUSC 200'), 'MUSC 105A', 'MUSC 200')
    const r = run(harness, { terms: t, choices: GM })
    // MUSC 200 is not repeatable: taking it in two quarters still earns one
    // course, so it cannot cover both ("cannot be double counted").
    expect([find(r, 'comprehensive').status, find(r, 'grad-research').status]).toContain('unmet')
    const once = swap(gmPlan, 'MUSC 105A', 'MUSC 200').map((q) => (q.term === '2290' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 253D') } : q))
    const r2 = run(harness, { terms: once, choices: GM })
    expect([find(r2, 'comprehensive').status, find(r2, 'grad-research').status]).toContain('unmet')
  })

  it('needs three upper-division electives beyond the modules', () => {
    // 101F/105H/105A are left for three electives, but then 105A cannot also be the research course
    const r = run(harness, { terms: swap(gmPlan, 'MUSC 150I', null), choices: GM })
    expect([find(r, 'ud-electives').status, find(r, 'comprehensive').status]).toContain('unmet')
    expect(find(r, 'modules/upper').status).toBe('met')
  })

  it('needs MUSC 20A', () => {
    expect(find(run(harness, { terms: swap(gmPlan, 'MUSC 20A', null), choices: GM }), 'theory-ld').status).toBe('unmet')
  })
})

// --- Western Music -----------------------------------------------------------------
const wm = plan(
  ['2268', 'MUSC 30A', 'MUSC 31', 'MUSC 60', 'MUSC 2', 'MUSC 61'],
  ['2270', 'MUSC 30B', 'MUSC 31', 'MUSC 60', 'MUSC 2', 'MUSC 61'],
  ['2272', 'MUSC 30C', 'MUSC 31', 'MUSC 60', 'MUSC 2', 'MUSC 61'],
  ['2278', 'MUSC 101A', 'MUSC 150H', 'MUSC 102', 'MUSC 161'],
  ['2280', 'MUSC 101B', 'MUSC 150D', 'MUSC 102', 'MUSC 161'],
  ['2282', 'MUSC 101E', 'MUSC 105Q', 'MUSC 102', 'MUSC 161'],
  ['2288', 'MUSC 101F', 'MUSC 150C', 'MUSC 105M'],
)
const WM = { concentration: 'Western Music' }

describe('music-ba 2025-26 western music', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: wm, choices: WM }))).toEqual([])
  })

  it('core history needs two of MUSC 101A–C', () => {
    const r = run(harness, { terms: swap(wm, 'MUSC 101B', 'MUSC 101G'), choices: WM })
    expect(find(r, 'core-history').status).toBe('unmet')
  })

  it('two ensembles in one quarter count once', () => {
    const t = wm.map((q) => (q.term === '2282' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 102') } : q.term === '2280' ? { ...q, courses: [...q.courses, 'MUSC 165'] } : q))
    const r = run(harness, { terms: t, choices: WM })
    expect(find(r, 'ensembles').status).toBe('unmet')
  })

  it('a lesson quarter without a concurrent ensemble does not count', () => {
    const t = wm.map((q) => (q.term === '2282' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 102') } : q))
    const t2 = add(t, '2290', 'MUSC 163')
    const r = run(harness, { terms: t2, choices: WM })
    expect(find(r, 'ensembles').status).toBe('met')
    expect(find(r, 'lessons').status).toBe('unmet')
  })

  it('comprehensive needs a 105-series course not already used (or MUSC 120)', () => {
    const r = run(harness, { terms: swap(wm, 'MUSC 105M', null), choices: WM })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(wm, 'MUSC 105M', 'MUSC 120'), choices: WM }), 'comprehensive').status).toBe('met')
  })

  it('final elective: a further 150 or 101 course', () => {
    expect(find(run(harness, { terms: swap(wm, 'MUSC 150C', null), choices: WM }), 'final-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(wm, 'MUSC 150C', 'MUSC 122'), choices: WM }), 'final-elective').status).toBe('met')
  })

  it('MUSC 60 may be waived (attestation); proficiency audition is an attestation', () => {
    const t = wm.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'MUSC 60') }))
    const r = run(harness, { terms: t, choices: WM, attested: ['proficiency audition'] })
    expect(find(r, 'musc60').status).toBe('needs-attestation')
    expect(find(r, 'attest:proficiency-audition').status).toBe('met')
  })

  // 2025-26 has no failed-section exception (2026-27 does); grades are per
  // code, so a single failed repeat cannot be expressed — three passed sections are required.
  it('2025-26: MUSC 31: WM needs three passed sections, no failed-section exception', () => {
    const t = add(swap(wm, 'MUSC 31', null), '2266', 'MUSC 31')
    // three passed sections still (one moved); now drop one: two passed, none failed → unmet
    const two = swap(wm, 'MUSC 31', null)
    expect(find(run(harness, { terms: two, choices: WM }), 'musc31').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: WM }), 'musc31').status).toBe('met')
  })

  it('upper-division lessons need a letter grade', () => {
    const r = run(harness, { terms: wm, choices: WM, grades: { 'MUSC 161': 'P', 'MUSC 102': 'P' } })
    expect(find(r, 'lessons').status).toBe('unmet')
    expect(find(r, 'ensembles').status).toBe('met')
  })
})

// Adversarial review (2026-10-06).
describe('music-ba 2025-26 — rules that differ from 2026-27', () => {
  it('2025-26: WM requires MUSC 150H plus one elective theory course', () => {
    const r = run(harness, { terms: swap(wm, 'MUSC 150H', 'MUSC 150K'), choices: WM })
    expect(find(r, 'theory-core').status).toBe('unmet')
    expect(find(r, 'theory-elective').status).toBe('met')
  })

  it('2025-26: WM elective theory list does not include MUSC 150H', () => {
    const t = plan(['2268', 'MUSC 150H'])
    const r = run(harness, { terms: t, choices: WM })
    expect(find(r, 'theory-core').status).toBe('met')
    expect(find(r, 'theory-elective').status).toBe('unmet')
  })

  it('2025-26: GM module upper-division courses are MUSC 101/105/150 only (no MUSC 120)', () => {
    const t = plan(['2268', 'MUSC 120'], ['2270', 'MUSC 120'], ['2272', 'MUSC 120'])
    expect(find(run(harness, { terms: t, choices: GM }), 'modules/upper').progress?.have).toBe(0)
  })

  it('2025-26: MUSC 203F is not a GM upper-division elective', () => {
    const r = run(harness, { terms: swap(gmPlan, 'MUSC 150I', 'MUSC 203F'), choices: GM })
    expect([find(r, 'ud-electives').status, find(r, 'comprehensive').status]).toContain('unmet')
  })

  it('2025-26: MUSC 150K is not a GM creative-portfolio course', () => {
    const t = swap(swap(gmPlan, 'MUSC 195A', 'MUSC 196A'), 'MUSC 105A', 'MUSC 150K')
    expect(find(run(harness, { terms: t, choices: GM }), 'comprehensive').status).toBe('unmet')
  })

  it('2025-26: MUSC 54 is a CP elective ensemble; MUSC 72 is not (it is on the GM list)', () => {
    const t54 = plan(['2268', 'MUSC 54'], ['2270', 'MUSC 54'], ['2272', 'MUSC 54'])
    expect(find(run(harness, { terms: t54, choices: CP }), 'elective-ensembles').progress?.have).toBe(3)
    const t72 = plan(['2268', 'MUSC 72'], ['2270', 'MUSC 72'], ['2272', 'MUSC 72'])
    expect(find(run(harness, { terms: t72, choices: CP }), 'elective-ensembles').progress?.have).toBe(0)
    expect(find(run(harness, { terms: t72, choices: GM }), 'elective-ensembles').progress?.have).toBe(3)
  })

  it('2025-26: MUSC 150J and MUSC 203H are GM elective ensembles/workshops', () => {
    const t = plan(['2268', 'MUSC 150J', 'MUSC 203H', 'MUSC 267'])
    expect(find(run(harness, { terms: t, choices: GM }), 'elective-ensembles').progress?.have).toBe(3)
  })
})

describe('music-ba 2025-26 — review', () => {
  it('CP: an upper-division lesson (MUSC 161) taken P/NP is not an elective ensemble/workshop', () => {
    // "except MUSC 120 (Seminar in Composition) and upper-division workshops & performing ensembles"
    let t = cp
    for (let i = 0; i < 3; i++) t = swap(t, 'MUSC 168', 'MUSC 161')
    expect(find(run(harness, { terms: t, choices: CP }), 'elective-ensembles').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: CP, grades: { 'MUSC 161': 'P' } }), 'elective-ensembles').status).toBe('unmet')
    // ...while an upper-division ensemble taken P/NP still counts
    expect(find(run(harness, { terms: cp, choices: CP, grades: { 'MUSC 168': 'P' } }), 'elective-ensembles').status).toBe('met')
  })

  it('GM: the undergraduate MUSC 105S is not the graduate-level course (MUSC 253S is)', () => {
    // "Students in the Global Musics concentration are also required to take one graduate-level course."
    const ug = swap(gmPlan, 'MUSC 253D', 'MUSC 105S')
    expect(find(run(harness, { terms: ug, choices: GM }), 'grad-research').status).toBe('unmet')
    const grad = swap(gmPlan, 'MUSC 253D', 'MUSC 253S')
    expect(failing(run(harness, { terms: grad, choices: GM }))).toEqual(['modules/confirm:cannot-check'])
  })

  it('GM: creative portfolio with MUSC 120 and MUSC 196A in the same quarter', () => {
    const t = swap(swap(gmPlan, 'MUSC 195A', 'MUSC 196A'), 'MUSC 105A', 'MUSC 120')
    const r = run(harness, { terms: t, choices: GM })
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('CP: MUSC 196A taken P/NP does not count (not a workshop or ensemble)', () => {
    expect(find(run(harness, { terms: cp, choices: CP, grades: { 'MUSC 196A': 'P' } }), 'musc196a').status).toBe('unmet')
  })

  it('WM: empty plan is incomplete', () => {
    const r = run(harness, { terms: [], choices: WM, attested: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'ensembles').status).toBe('unmet')
  })

  it('WM: a theory course on the DC list (MUSC 150D) also satisfies DC', () => {
    const DC_OTHER = ['MUSC 101A', 'MUSC 101B', 'MUSC 101F', 'MUSC 105Q', 'MUSC 105M']
    const t = wm.map((q) => ({ ...q, courses: q.courses.filter((c) => !DC_OTHER.includes(c)) }))
    const r = run(harness, { terms: t, choices: WM })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'dc').used?.map((e) => e.display)).toEqual(['MUSC 150D'])
    expect(find(r, 'theory-elective').status).toBe('met')
  })

  it('WM: MUSC 14 is not a Western Music requirement', () => {
    expect(failing(run(harness, { terms: wm, choices: WM }))).toEqual([])
  })

  it('WM: the proficiency audition is asked when not attested', () => {
    const r = run(harness, { terms: wm, choices: WM, attested: ['musc 60 waiver'] })
    expect(find(r, 'attest:proficiency-audition').status).toBe('needs-attestation')
    expect(verdict(r).complete).toBe(false)
  })

  it('GM: MUSC 14 absent and MUSC 30A absent → needs the placement attestation', () => {
    const t = swap(gmPlan, 'MUSC 14', null)
    expect(find(run(harness, { terms: t, choices: GM, attested: [] }), 'musc14').status).toBe('needs-attestation')
  })
})
