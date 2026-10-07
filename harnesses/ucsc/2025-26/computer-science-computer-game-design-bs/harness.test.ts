import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CMPM 80K'],
  ['2270', 'MATH 19B', 'CSE 30', 'FILM 80V'],
  ['2272', 'CSE 12', 'CSE 16', 'CMPM 80J'],
  ['2278', 'CSE 13S', 'MATH 21', 'CMPM 120'],
  ['2280', 'CSE 101', 'CMPM 121', 'CMPM 130'],
  ['2282', 'CMPM 176', 'CMPM 146', 'CMPM 163'],
  ['2288', 'CSE 160', 'CMPM 110', 'CMPM 179'],
  ['2290', 'CMPM 170'],
  ['2292', 'CMPM 171'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('computer-science-computer-game-design-bs 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('at most two of the "other skills" courses', () => {
    expect(find(run(harness, { terms: swap('CMPM 146', ['CMPM 122']) }), 'cge').status).toBe('met') // 110, 122 = two
    const t = swap('CMPM 146', ['CMPM 122']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CMPM 163' ? 'CSE 103' : c)) }))
    expect(find(run(harness, { terms: t }), 'cge').status).toBe('unmet')
  })

  it('CMPM 179 counts only once toward the electives', () => {
    const t = [...swap('CMPM 146', []), { term: '2298', courses: ['CMPM 179'] }]
    expect(find(run(harness, { terms: t }), 'cge').status).toBe('unmet')
  })

  it('a lecture with a required lab counts only with the lab', () => {
    expect(find(run(harness, { terms: swap('CMPM 146', ['CSE 156']) }), 'cge').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CMPM 146', ['CSE 156', 'CSE 156L']) }), 'cge').status).toBe('met')
  })

  it('five electives are required; courses outside the list do not count', () => {
    expect(find(run(harness, { terms: swap('CSE 160', ['CSE 185E']) }), 'cge').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('CSE 160', []) }))).toEqual(['cge:unmet'])
  })

  it('2025-26: CMPM 170 + 171 are required courses and the only comprehensive (no tracks)', () => {
    expect(failing(run(harness, { terms: swap('CMPM 171', ['CMPM 174']) }))).toEqual(['design-dev/CMPM171:unmet', 'comprehensive/CMPM171:unmet'])
    const t = swap('CMPM 170', ['CMPM 181']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CMPM 171' ? 'CMPM 182' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual(['design-dev/CMPM170:unmet', 'design-dev/CMPM171:unmet', 'comprehensive/CMPM170:unmet', 'comprehensive/CMPM171:unmet'])
  })

  it('2025-26: CMPM 119, CSE 164, 165, 167, 168 are not Computer Game Engineering electives', () => {
    for (const c of ['CMPM 119', 'CSE 164', 'CSE 165', 'CSE 167', 'CSE 168']) {
      expect(find(run(harness, { terms: swap('CMPM 146', [c]) }), 'cge').status).toBe('unmet')
    }
  })

  it('CMPM 130 is required and is the DC course', () => {
    expect(failing(run(harness, { terms: swap('CMPM 130', []) }))).toEqual(['design-dev/CMPM130:unmet', 'dc:unmet'])
  })

  it('FILM 80V and CMPM 80J are required', () => {
    expect(failing(run(harness, { terms: swap('FILM 80V', []) }))).toEqual(['playable/FILM80V:unmet'])
  })

  it('MATH 20A/20B, AM 10 and ECE 13 alternatives', () => {
    const m: Record<string, string> = { 'MATH 19A': 'MATH 20A', 'MATH 19B': 'MATH 20B', 'MATH 21': 'AM 10', 'CSE 13S': 'ECE 13' }
    expect(failing(run(harness, { terms: base.map((q) => ({ ...q, courses: q.courses.map((c) => m[c] ?? c) })) }))).toEqual([])
  })

  it('CSE 20 test-out (review: §1a): attestation only when CSE 20 is absent; AP credit counts', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CSE 20', []), attested: [] }))).toEqual(['cse20:needs-attestation'])
    expect(failing(run(harness, { terms: swap('CSE 20', []), completed: ['CSE 20'], attested: [] }))).toEqual([])
    expect(failing(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }))).toEqual(['cse20:unmet'])
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'CMPM 171': 'P' } }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CMPM 171': 'P' } }), 'design-dev/CMPM171').status).toBe('unmet')
  })

  it('review: cross-listed codes are one course (ARTG 179 = CMPM 179; CSE 166A = ECON 166A, still capped as "other skills")', () => {
    expect(find(run(harness, { terms: swap('CMPM 179', ['ARTG 179']) }), 'cge').status).toBe('met')
    expect(find(run(harness, { terms: swap('CMPM 146', ['ARTG 179']) }), 'cge').status).toBe('unmet')
    const t = swap('CMPM 146', ['CSE 166A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CMPM 163' ? 'CSE 103' : c)) }))
    expect(find(run(harness, { terms: t }), 'cge').status).toBe('unmet')
  })

  it('review: a required lab is needed (CMPM 164L, CSE 161L); a core course (CSE 101) is not an elective; a failed elective does not count', () => {
    expect(find(run(harness, { terms: swap('CMPM 146', ['CMPM 164']) }), 'cge').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CMPM 146', ['CSE 161']) }), 'cge').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CMPM 146', []) }), 'cge').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CSE 160': 'F' } }), 'cge').status).toBe('unmet')
  })
})
