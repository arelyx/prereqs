import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const lower = plan(
  ['2268', 'MATH 19A', 'AM 10'],
  ['2270', 'MATH 19B', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'AM 30', 'AM 20', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'ECE 101', 'ECE 101L', 'ECE 103'],
  ['2280', 'ECE 171', 'ECE 171L'],
)
const add = (...courses: string[]) => [...lower, { term: '2282', courses }]

describe('electrical-engineering-minor 2025-26', () => {
  it('complete record (Robotics and Automation electives, 15 credits) is met without declaring a list', () => {
    const r = run(harness, { terms: add('ECE 115', 'ECE 145', 'ECE 149') })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('14 credits is not enough', () => {
    // ECE 102 (5) + ECE 102L (2) + ECE 174 (3) + ECE 104 (5) = 15; drop ECE 174 → 12
    expect(failing(run(harness, { terms: add('ECE 102', 'ECE 102L', 'ECE 174', 'ECE 104') }))).toEqual([])
    expect(find(run(harness, { terms: add('ECE 102', 'ECE 102L', 'ECE 104') }), 'electives').status).toBe('unmet')
  })

  it('all electives must come from one concentration list', () => {
    // ECE 151 (Robotics/Digital Hardware only) + ECE 104 (Electronics/Power only) + ECE 136 (not Robotics)
    const r = run(harness, { terms: add('ECE 151', 'ECE 104', 'ECE 115') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('a declared concentration restricts the list', () => {
    const t = add('ECE 115', 'ECE 145', 'ECE 149')
    expect(find(run(harness, { terms: t, choices: { concentration: 'Power and Energy' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: { concentration: 'Robotics and Automation' } }), 'electives').status).toBe('met')
  })

  it('a lab without its lecture contributes no credits', () => {
    // Electronics: ECE 104 (5) + ECE 110 (5) + ECE 176L (2) + ECE 174 (3) = 15 only if ECE 176 is passed
    expect(find(run(harness, { terms: add('ECE 104', 'ECE 110', 'ECE 176L', 'ECE 174') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: add('ECE 104', 'ECE 110', 'ECE 176L', 'ECE 176', 'ECE 174') }), 'electives').status).toBe('met')
  })

  it('2025-26: no alternative core package (ECE 141 + PHYS 116A/116C/133 does not replace ECE 103)', () => {
    const alt = [...lower.slice(0, 3), { term: '2278', courses: ['ECE 101', 'ECE 101L', 'ECE 141', 'PHYS 116A', 'PHYS 116C', 'PHYS 133'] }, lower[4]]
    const t = [...alt, { term: '2282', courses: ['ECE 104', 'ECE 110', 'ECE 115'] }]
    expect(failing(run(harness, { terms: t }))).toEqual(['core/ECE103:unmet'])
  })

  it('2025-26: ECE 176 is on the Electronics and Photonics list', () => {
    const t = add('ECE 104', 'ECE 110', 'ECE 176')
    expect(find(run(harness, { terms: t, choices: { concentration: 'Electronics and Photonics' } }), 'electives').status).toBe('met')
  })

  it('the core needs every course of one package', () => {
    const t = lower.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ECE 103') }))
    expect(failing(run(harness, { terms: [...t, { term: '2282', courses: ['ECE 115', 'ECE 145', 'ECE 149'] }] }))).toEqual(['core/ECE103:unmet'])
  })

  it('ECE 183 counts only with the undergraduate director approval', () => {
    const t = add('ECE 115', 'ECE 145', 'ECE 183')
    expect(find(run(harness, { terms: t, attested: [] }), 'electives').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['ece183-approval'] }), 'electives').status).toBe('met')
  })

  it('2025-26: no ECE 218-for-ECE 118 petition', () => {
    expect(find(run(harness, { terms: add('ECE 218', 'ECE 136') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: add('ECE 118', 'ECE 136') }), 'electives').status).toBe('met')
  })

  it('ECE 193 counts only once', () => {
    const t = [...add('ECE 115', 'ECE 193'), { term: '2288', courses: ['ECE 193'] }]
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('PHYS 6 series counts', () => {
    const t = lower.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'PHYS 5A': 'PHYS 6A', 'PHYS 5L': 'PHYS 6L' })[c] ?? c) }))
    expect(failing(run(harness, { terms: [...t, { term: '2282', courses: ['ECE 115', 'ECE 145', 'ECE 149'] }] }))).toEqual([])
  })

  it('2025-26: no PHYS 15A / 15C substitution', () => {
    const t = lower.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'PHYS 5A': 'PHYS 15A', 'PHYS 5C': 'PHYS 15C' })[c] ?? c) }))
    expect(failing(run(harness, { terms: [...t, { term: '2282', courses: ['ECE 115', 'ECE 145', 'ECE 149'] }] }))).toEqual(['phys-a:unmet', 'phys-c:unmet'])
  })

  it('P/NP is accepted', () => {
    expect(failing(run(harness, { terms: add('ECE 115', 'ECE 145', 'ECE 149'), grades: { 'ECE 115': 'P', 'ECE 103': 'P' } }))).toEqual([])
  })

  it('planned electives are in progress', () => {
    const r = run(harness, { terms: add('ECE 115', 'ECE 145', 'ECE 149'), currentTerm: '2282' })
    expect(find(r, 'electives').status).toBe('in-progress')
  })

  it('review: ECE 253 entered as its cross-listed code CSE 208 counts with its credits', () => {
    expect(find(run(harness, { terms: add('CSE 208', 'ECE 251', 'ECE 255') }), 'electives').status).toBe('met')
  })

  it('review: when only ECE 183 completes the 15 credits, ask for the approval (not unmet)', () => {
    expect(find(run(harness, { terms: add('ECE 183', 'ECE 115', 'ECE 145'), attested: [] }), 'electives').status).toBe('needs-attestation')
  })

  it('review: a lab whose lecture failed adds no credits; NP does not count', () => {
    expect(find(run(harness, { terms: add('ECE 136', 'ECE 141', 'ECE 130', 'ECE 130L'), grades: { 'ECE 130': 'F' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: add('ECE 115', 'ECE 145', 'ECE 149'), grades: { 'ECE 149': 'NP' } }), 'electives').status).toBe('unmet')
  })
})
