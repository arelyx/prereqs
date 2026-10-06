import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'ECON 1', 'ENVS 23', 'AM 11A', 'ENVS 24'],
  ['2270', 'ECON 2', 'ENVS 25', 'AM 11B', 'SOCY 15'],
  ['2272', 'STAT 17', 'STAT 17L'],
  ['2278', 'ECON 100A', 'ENVS 100', 'ENVS 100L'],
  ['2280', 'ECON 113', 'ECON 170', 'ENVS 141'],
  ['2282', 'ECON 175', 'ENVS 160', 'ENVS 165'],
  ['2288', 'ECON 120', 'ENVS 196'],
)
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, ...to: string[]) => t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-studieseconomics-combined-major-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('comprehensive also needs the economics comprehensive exam portions', () => {
    const r = run(harness, { terms: base, attested: [] })
    expect(find(r, 'comprehensive').status).toBe('needs-attestation')
    expect(find(r, 'comp-envs').status).toBe('met')
  })

  it('ENVS exit option must be letter graded (P elsewhere is fine)', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 196': 'P', 'ECON 170': 'P' } })
    expect(find(r, 'comp-envs').status).toBe('unmet')
    expect(find(r, 'econ-electives').status).toBe('met')
  })

  it('ENVS electives need a natural-science course', () => {
    expect(find(run(harness, { terms: edit(base, 'ENVS 160', 'ENVS 147') }), 'envs-electives').status).toBe('unmet')
  })

  it('BIOE 151C (natural-science list) counts as an ENVS elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'ENVS 160', 'BIOE 151C') }))).toEqual([])
  })

  it('economics electives must be on the list (ECON 100M is not: it and ECON 100A are both intermediate micro)', () => {
    expect(find(run(harness, { terms: edit(base, 'ECON 120', 'ECON 100M') }), 'econ-electives').status).toBe('unmet')
  })

  it('ECON 100A cannot double as an economics elective', () => {
    const r = run(harness, { terms: edit(base, 'ECON 120', 'ECON 104') })
    expect(find(r, 'econ-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'ECON 120', 'ECON 100B') }), 'econ-electives').status).toBe('met')
  })

  it('cross-listed LGST 183 counts as ECON 183', () => {
    expect(failing(run(harness, { terms: edit(base, 'ECON 120', 'LGST 183') }))).toEqual([])
  })

  it('calculus series: MATH 19A/19B also needs MATH 23A', () => {
    const t = edit(edit(base, 'AM 11A', 'MATH 19A'), 'AM 11B', 'MATH 19B')
    expect(find(run(harness, { terms: t }), 'calc').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(t, 'MATH 19B', 'MATH 19B', 'MATH 23A') }), 'calc').status).toBe('met')
  })

  it('calculus series: MATH 11A + AM 11B is an accepted mix; MATH 11A + 11B needs MATH 22', () => {
    expect(find(run(harness, { terms: edit(base, 'AM 11A', 'MATH 11A') }), 'calc').status).toBe('met')
    const t = edit(edit(base, 'AM 11A', 'MATH 11A'), 'AM 11B', 'MATH 11B')
    expect(find(run(harness, { terms: t }), 'calc').status).toBe('unmet')
  })

  it('ECON 100M replaces ECON 100A', () => {
    expect(failing(run(harness, { terms: edit(base, 'ECON 100A', 'ECON 100M') }))).toEqual([])
  })

  it('missing ECON 2', () => {
    expect(find(run(harness, { terms: edit(base, 'ECON 2') }), 'ld-core').status).toBe('unmet')
  })

  it('DC: ENVS 195A alone is not enough; ENVS 195A + 195B satisfies DC and comprehensive', () => {
    const t = edit(base, 'ENVS 196', 'ENVS 195A')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comp-envs').status).toBe('unmet')
    expect(failing(run(harness, { terms: edit(base, 'ENVS 196', 'ENVS 195A', 'ENVS 195B') }))).toEqual([])
  })

  it('ENVS 130A counts only with ENVS 130L', () => {
    const t = edit(base, 'ENVS 160', 'ENVS 130A')
    expect(find(run(harness, { terms: t }), 'envs-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'ENVS 160', 'ENVS 130A', 'ENVS 130L') }), 'envs-electives').status).toBe('met')
  })
})
