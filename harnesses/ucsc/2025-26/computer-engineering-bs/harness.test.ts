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

const decl = (list: string) => ({ 'approved-electives': list })

describe('computer-engineering-bs 2025-26', () => {
  it('asks for a concentration', () => {
    expect(find(run(harness, { terms: core }), 'choice:concentration').status).toBe('needs-choice')
  })

  it('computer systems complete (elective declared from the approved list)', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'), choices: { concentration: 'Computer Systems', ...decl('CSE 140') } })
    expect(failing(r)).toEqual([])
  })

  it('2025-26: the elective must be on the external approved list — cannot-check until declared, unmet if declared elsewhere', () => {
    const t = add('CSE 125', 'CSE 130', 'CSE 111', 'CSE 140')
    const r = run(harness, { terms: t, choices: { concentration: 'Computer Systems' } })
    expect(find(r, 'cs/elective').status).toBe('cannot-check')
    expect(find(r, 'cs/elective').choice).toBe('approved-electives')
    expect(find(run(harness, { terms: t, choices: { concentration: 'Computer Systems', ...decl('ECE 171') } }), 'cs/elective').status).toBe('unmet')
    // no unused upper-division course at all → unmet
    expect(find(run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 111'), choices: { concentration: 'Computer Systems' } }), 'cs/elective').status).toBe('unmet')
  })

  it('2025-26: CSE 110A is not an option for the Computer Systems CSE 111/134 requirement', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 110A', 'CSE 140'), choices: { concentration: 'Computer Systems', ...decl('CSE 140') } })
    expect(failing(r)).toEqual(['cs/sys:unmet'])
  })

  it('digital hardware: CSE 122 cannot be used twice', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 122', 'CSE 140'), choices: { concentration: 'Digital Hardware', ...decl('CSE 140') } })
    expect(find(r, 'dh/one-more').status).toBe('unmet')
    const ok = run(harness, { terms: add('CSE 125', 'CSE 122', 'ECE 171', 'ECE 171L', 'CSE 140'), choices: { concentration: 'Digital Hardware', ...decl('CSE 140') } })
    expect(failing(ok)).toEqual([])
  })

  it('2025-26: networks — CSE 151 + 151L completes the option; CSE 151 alone does not', () => {
    const r = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'CSE 151', 'CSE 151L'), choices: { concentration: 'networks' } })
    expect(failing(r)).toEqual([])
    const lone = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'CSE 151'), choices: { concentration: 'networks', ...decl('ECE 171') } })
    expect(find(lone, 'net/elective').status).toBe('unmet')
  })

  it('2025-26: an upper-division CSE course (not only non-CSE) might be on the external list', () => {
    const r = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'CSE 115A'), choices: { concentration: 'networks' } })
    expect(find(r, 'net/elective').status).toBe('cannot-check')
    const ok = run(harness, { terms: add('CSE 150', 'CSE 156', 'CSE 156L', 'CSE 130', 'ECE 171'), choices: { concentration: 'networks', ...decl('ECE 171') } })
    expect(failing(ok)).toEqual([])
  })

  it('system programming complete', () => {
    const r = run(harness, { terms: add('CSE 130', 'CSE 134', 'CSE 150', 'CSE 151', 'CSE 151L', 'CSE 113'), choices: { concentration: 'System Programming' } })
    expect(failing(r)).toEqual([])
  })

  it('2025-26: no PHYS 15A substitution; ECE 9 for PHYS 5B+5M', () => {
    const t = core.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5B' ? 'ECE 9' : c)).filter((c) => c !== 'PHYS 5M') }))
    const r = run(harness, { terms: [...t, { term: '2298', courses: ['CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems', ...decl('CSE 140') } })
    expect(failing(r)).toEqual([])
    const h15 = t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5A' ? 'PHYS 15A' : c)) }))
    const r15 = run(harness, { terms: [...h15, { term: '2298', courses: ['CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems', ...decl('CSE 140') } })
    expect(failing(r15)).toEqual(['phys5a:unmet'])
  })

  it('letter grades required', () => {
    const r = run(harness, { terms: add('CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'), choices: { concentration: 'computer-systems', ...decl('CSE 140') }, grades: { 'AM 20': 'P' } })
    expect(find(r, 'ode-cse12/AM20').status).toBe('unmet')
  })

  it('2025-26: CSE 185E is a required core course (and satisfies DC); CSE 195 alone is not enough', () => {
    const t = core.map((q) => ({ ...q, courses: q.courses.filter((c) => !['CSE 185E', 'CSE 123A', 'CSE 123B'].includes(c)) }))
    const r = run(harness, { terms: [...t, { term: '2298', courses: ['CSE 195', 'CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems', ...decl('CSE 140') } })
    expect(failing(r)).toEqual(['core/CSE185E:unmet'])
    // with CSE 185E, CSE 195 may be the capstone
    const t2 = core.map((q) => ({ ...q, courses: q.courses.filter((c) => !['CSE 123A', 'CSE 123B'].includes(c)) }))
    const r2 = run(harness, { terms: [...t2, { term: '2298', courses: ['CSE 195', 'CSE 125', 'CSE 130', 'CSE 111', 'CSE 140'] }], choices: { concentration: 'computer-systems', ...decl('CSE 140') } })
    expect(failing(r2)).toEqual([])
    expect(find(r2, 'dc').used?.map((e) => e.display)).toEqual(['CSE 185E'])
  })
})
