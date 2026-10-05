import { describe, expect, it } from 'vitest'
import { find, failing, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'MATH 21'],
  ['2272', 'CSE 12', 'CSE 13S'],
  ['2278', 'CSE 101', 'CSE 102'],
  ['2280', 'CSE 130', 'CSE 115A'],
  ['2282', 'CSE 183'],
)

describe('computer-science-minor 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('a list course can fill an additional slot, but the four upper courses must be distinct', () => {
    const r = run(harness, { terms: base.slice(0, 5) }) // drop CSE 183
    expect(find(r, 'additional').status).toBe('unmet')
    expect(find(r, 'list').status).toBe('met')
  })

  it('mixed calculus packages do not complete the calculus option', () => {
    const terms = plan(['2268', 'MATH 19A', 'MATH 11B'])
    expect(find(run(harness, { terms }), 'calc').status).toBe('unmet')
  })

  it('a lecture with a lab counts only with its lab', () => {
    const terms = [...base.slice(0, 4), { term: '2280', courses: ['CSE 156', 'CSE 115A', 'CSE 130'] }]
    const r = run(harness, { terms })
    expect(find(r, 'additional').status).toBe('unmet')
    const withLab = [...base.slice(0, 4), { term: '2280', courses: ['CSE 156', 'CSE 156L', 'CSE 115A', 'CSE 130'] }]
    expect(find(run(harness, { terms: withLab }), 'additional').status).toBe('met')
  })

  it('CSE 280-289 never count; graduate 201-279 do', () => {
    const t = (c: string) => [...base.slice(0, 4), { term: '2280', courses: [c, 'CSE 115A', 'CSE 130'] }]
    expect(find(run(harness, { terms: t('CSE 280A') }), 'additional').status).toBe('unmet')
    expect(find(run(harness, { terms: t('CSE 210A') }), 'additional').status).toBe('met')
  })

  it('P/NP is accepted', () => {
    const r = run(harness, { terms: base, grades: { 'CSE 101': 'P' } })
    expect(find(r, 'cse101').status).toBe('met')
  })

  it('planned courses show in-progress', () => {
    const r = run(harness, { terms: base, currentTerm: '2280' })
    expect(find(r, 'additional').status).toBe('in-progress')
    expect(find(r, 'cse101').status).toBe('met')
    expect(r.status).toBe('in-progress')
  })
})
