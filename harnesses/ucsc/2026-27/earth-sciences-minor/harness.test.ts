import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'EART 10', 'EART 10L'],
  ['2278', 'EART 104', 'EART 102'],
  ['2280', 'EART 140', 'EART 140L', 'OCEA 101'],
  ['2282', 'EART 116'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('earth-sciences-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })
  it('intro lectures and labs are interchangeable', () => {
    expect(failing(run(harness, { terms: swap('EART 10L', 'EART 20L') }))).toEqual([])
  })
  it('intro lab is required', () => {
    expect(failing(run(harness, { terms: swap('EART 10L') }))).toEqual(['intro-lab:unmet'])
  })
  it('five upper-division courses, not four', () => {
    expect(failing(run(harness, { terms: swap('EART 116') }))).toEqual(['upper:unmet'])
  })
  it('lecture without its lab does not count; lab is not a separate course', () => {
    expect(find(run(harness, { terms: swap('EART 140L') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 130', 'EART 130L') }), 'upper').status).toBe('met')
  })
  it('EART 196B / EART 198 excluded, lower-division EART excluded', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 196B') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 198') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 11') }), 'upper').status).toBe('unmet')
  })
  it('at most one quarter of EART 199 or OCEA 199', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 199') }), 'upper').status).toBe('met')
    const t = swap('EART 116', 'EART 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'EART 102' ? 'OCEA 199' : c)) }))
    expect(find(run(harness, { terms: t }), 'upper').status).toBe('unmet')
  })
  it('ENVS 115A + 115L together = one course', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'ENVS 115A', 'ENVS 115L') }), 'upper').status).toBe('met')
    expect(find(run(harness, { terms: swap('EART 116', 'ENVS 115A') }), 'upper').status).toBe('unmet')
  })
  it('letter grades, except EART 199 etc.', () => {
    expect(find(run(harness, { terms: base, grades: { 'EART 104': 'P' } }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'EART 10': 'P' } }), 'intro-lecture').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('EART 116', 'EART 199'), grades: { 'EART 199': 'P' } }))).toEqual([])
  })
  it('EART 110B counts only with its lab EART 110M', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 110B') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 110B', 'EART 110M') }), 'upper').status).toBe('met')
  })
  it('review: EART 110A (no catalog lab) counts alone; 3-credit EART 189A and labs alone do not', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 110A') }), 'upper').status).toBe('met')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 189A') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 150L') }), 'upper').status).toBe('unmet')
  })
  it('review: a course taken twice counts once', () => {
    expect(find(run(harness, { terms: [...swap('EART 116'), { term: '2288', courses: ['EART 104'] }] }), 'upper').status).toBe('unmet')
  })
})
