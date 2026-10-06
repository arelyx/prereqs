import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'CRSN 55'],
  ['2270', 'CRSN 55', 'CRSN 151A'],
  ['2272', 'CRSN 151B'],
  ['2278', 'CRSN 151C', 'CRSN 161'],
  ['2280', 'ENVS 120'],
  ['2282', 'SOCY 125'],
)
const edit = (t: StudentRecord['terms'], from: string, ...to: string[]) => {
  let done = false
  return t.map((q) => ({
    ...q,
    courses: q.courses.flatMap((c) => {
      if (c !== from || done) return [c]
      done = true
      return to
    }),
  }))
}
const add = (t: StudentRecord['terms'], term: string, ...codes: string[]) => [...t, { term, courses: codes }]

describe('sustainability-studies-minor 2026-27', () => {
  it('complete record (Breadth Capstone) is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('CRSN 55 must be taken twice', () => {
    expect(find(run(harness, { terms: edit(base, 'CRSN 55') }), 'crsn55').status).toBe('unmet')
  })

  it('each core course is required', () => {
    expect(find(run(harness, { terms: edit(base, 'CRSN 151C') }), 'core').status).toBe('unmet')
  })

  it('Option 1: CRSN 152 three times replaces the Breadth Capstone', () => {
    const t = add(edit(edit(base, 'ENVS 120'), 'SOCY 125'), '2288', 'CRSN 152')
    const t3 = add(add(t, '2290', 'CRSN 152'), '2292', 'CRSN 152')
    const r = run(harness, { terms: t3 })
    expect(failing(r)).toEqual([])
    // only twice: not enough
    expect(find(run(harness, { terms: add(t, '2290', 'CRSN 152') }), 'capstone').status).toBe('unmet')
  })

  it('Option 1 done: the elective keeps a breadth course', () => {
    const t = plan(
      ['2268', 'CRSN 55'], ['2270', 'CRSN 55', 'CRSN 151A'], ['2272', 'CRSN 151B'],
      ['2278', 'CRSN 151C', 'ENVS 120'], ['2280', 'CRSN 152'], ['2282', 'CRSN 152'], ['2288', 'CRSN 152'],
    )
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('the elective must be a 5-credit course (CRSN 155S is 3 credits)', () => {
    const r = run(harness, { terms: edit(base, 'CRSN 161', 'CRSN 155S') })
    // CRSN 155S can be the capstone's CRSN course, but then a breadth course must be the elective
    expect(find(r, 'ud-elective').status).toBe('met')
    expect(find(r, 'cap-breadth').status).toBe('met')
    const only = run(harness, { terms: edit(edit(base, 'CRSN 161', 'CRSN 155S'), 'SOCY 125') })
    expect(only.status).not.toBe('met')
  })

  it('Breadth Capstone needs at least one Breadth Elective (two CRSN courses do not do it)', () => {
    const t = edit(edit(base, 'ENVS 120', 'CRSN 155S'), 'SOCY 125', 'CRSN 151C')
    const r = run(harness, { terms: t, attested: 'all' })
    expect(find(r, 'cap-breadth').status).toBe('unmet')
  })

  it('the elective does not also count toward the Breadth Capstone', () => {
    const r = run(harness, { terms: edit(base, 'CRSN 161') })
    expect(r.status).not.toBe('met')
  })

  it('a repeated CRSN 151C may be the capstone CRSN course if on a different topic', () => {
    const t = edit(base, 'SOCY 125', 'CRSN 151C')
    expect(find(run(harness, { terms: t, attested: 'all' }), 'capstone').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'capstone').status).toBe('needs-attestation')
  })

  it('ECE breadth lecture counts only with its required lab', () => {
    expect(find(run(harness, { terms: edit(base, 'SOCY 125', 'ECE 175') }), 'cap-breadth').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'SOCY 125', 'ECE 175', 'ECE 175L') }), 'cap-breadth').status).toBe('met')
  })

  it('cross-listed partner code counts (POLI 179 = ENVS 144)', () => {
    expect(find(run(harness, { terms: edit(base, 'SOCY 125', 'POLI 179') }), 'cap-breadth').status).toBe('met')
  })

  it('lower-division listed course (HAVC 48) cannot fill the upper-division capstone', () => {
    // HAVC 48 is never counted in the capstone; the result is only "check yourself"
    // because HAVC 48 might be accepted as the elective, freeing CRSN 161 for the capstone.
    const r = run(harness, { terms: edit(base, 'SOCY 125', 'HAVC 48') })
    expect(find(r, 'cap-breadth').status).toBe('cannot-check')
    expect(find(r, 'cap-breadth').used?.map((e) => e.code)).not.toContain('HAVC48')
    expect(r.status).not.toBe('met')
  })

  it('an upper-division course not on the catalog list is check-yourself (list is updated regularly)', () => {
    const r = run(harness, { terms: edit(base, 'SOCY 125', 'ENVS 160') })
    expect(find(r, 'cap-breadth').status).toBe('cannot-check')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CRSN 151A': 'P', 'ENVS 120': 'P' } }))).toEqual([])
  })

  it('25 upper-division credits: met by the complete record', () => {
    const r = run(harness, { terms: base })
    expect(find(r, 'ud-credits').progress?.have).toBe(28)
  })

  it('HAVC 48 (listed, lower-division) as the only elective candidate is check-yourself', () => {
    const r = run(harness, { terms: edit(base, 'CRSN 161', 'HAVC 48') })
    expect(r.status).toBe('cannot-check')
    expect(failing(r).some((x) => x.endsWith(':unmet') && !x.startsWith('cap-ideass'))).toBe(false)
  })

  it('ECE 176 without its required lab is not the elective', () => {
    const r = run(harness, { terms: edit(base, 'CRSN 161', 'ECE 176') })
    expect(r.status).toBe('unmet')
    expect(failing(run(harness, { terms: edit(base, 'CRSN 161', 'ECE 176', 'ECE 176L') }))).toEqual([])
  })
})
