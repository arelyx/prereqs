import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const core = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'CSE 12', 'AM 10', 'PHYS 5B', 'PHYS 5M'],
  ['2278', 'CSE 13S', 'AM 30', 'PHYS 5C', 'PHYS 5N'],
  ['2280', 'AM 20', 'CSE 100', 'CSE 100L', 'CSE 101'],
  ['2282', 'ECE 101', 'ECE 101L', 'CSE 120', 'CSE 107'],
  ['2288', 'ECE 103', 'ECE 103L', 'CSE 121', 'CSE 185E'],
  ['2290', 'CSE 123A'],
  ['2292', 'CSE 123B'],
)
const add = (...courses: string[]) => [...core, { term: '2298', courses }]

describe('computer-engineering-bs 2026-27', () => {
  it('asks for a concentration', () => {
    expect(find(run(harness, { terms: core }), 'choice:concentration').status).toBe('needs-choice')
  })

  it('computer systems complete', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'), choices: { concentration: 'Computer Systems' } })
    expect(failing(r)).toEqual([])
  })

  it('digital hardware: CSE 122 cannot be used twice', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 122', 'CSE 140'), choices: { concentration: 'Digital Hardware' } })
    expect(find(r, 'dh/one-more').status).toBe('unmet')
    const ok = run(harness, { terms: add('CSE 125', 'CSE 122', 'ECE 171', 'ECE 171L', 'CSE 140'), choices: { concentration: 'Digital Hardware' } })
    expect(failing(ok)).toEqual([])
  })

  it('networks complete; DC courses are not electives', () => {
    const r = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'CSE 151', 'CSE 151L'), choices: { concentration: 'networks' } })
    expect(failing(r)).toEqual([])
    const bad = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'CSE 115A'), choices: { concentration: 'networks' } })
    expect(find(bad, 'net/elective').status).toBe('unmet')
  })

  it('a non-CSE upper-division course might be on the external list: cannot-check', () => {
    const r = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'ECE 171'), choices: { concentration: 'networks' } })
    expect(find(r, 'net/elective').status).toBe('cannot-check')
  })

  it('PHYS 15A substitutes for 5A; ECE 9 for PHYS 5B+5M', () => {
    const t = core.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5A' ? 'PHYS 15A' : c === 'PHYS 5B' ? 'ECE 9' : c)).filter((c) => c !== 'PHYS 5M') }))
    const r = run(harness, { terms: [...t, { term: '2298', courses: ['CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems' } })
    expect(failing(r)).toEqual([])
  })

  it('letter grades required', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'), choices: { concentration: 'computer-systems' }, grades: { 'AM 20': 'P' } })
    expect(find(r, 'ode-cse12/AM20').status).toBe('unmet')
  })

  it('a single CSE 195 for both DC and capstone is flagged', () => {
    const t = core.map((q) => ({ ...q, courses: q.courses.filter((c) => !['CSE 185E', 'CSE 123A', 'CSE 123B'].includes(c)) }))
    const r = run(harness, { terms: [...t, { term: '2298', courses: ['CSE 195', 'CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems' } })
    expect(failing(r)).toEqual(['capstone:cannot-check'])
  })
})
