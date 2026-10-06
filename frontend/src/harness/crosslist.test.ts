import { describe, expect, it } from 'vitest'
import { codes, makeCatalog, range } from './courses'

const cat = makeCatalog([
  { code: 'ECON128', credits: '5', division: 'upper', cross_listed: ['LGST128'] },
  { code: 'CMPM179', credits: '5', division: 'upper', cross_listed: ['ARTG179'] },
  { code: 'ARTG179', credits: '5', division: 'upper', cross_listed: ['CMPM179'] },
])

describe('cross-listed codes are the same course', () => {
  it('a partner code the catalog files only on the primary matches a set naming the primary', () => {
    expect(codes('ECON 128').has('LGST128', cat)).toBe(true)
    expect(codes('LGST 128').has('ECON128', cat)).toBe(true)
  })
  it('filters (credits, ranges) apply through the primary', () => {
    expect(range('ECON', 100, 189).minCredits(5).has('LGST128', cat)).toBe(true)
  })
  it('exclusions also exclude the partner', () => {
    expect(range('CMPM', 100, 199).except(['ARTG 179']).has('CMPM179', cat)).toBe(false)
  })
  it('unrelated codes stay unrelated', () => {
    expect(codes('ECON 128').has('ECON129', cat)).toBe(false)
    expect(cat.equivalents('LGST128')).toEqual(['ECON128'])
  })
})

describe('allocation counts a non-repeatable course once', () => {
  it('a course passed in two quarters fills only one exclusive slot', async () => {
    const { HarnessContext } = await import('./context')
    const c2 = makeCatalog([{ code: 'BIOE20C', credits: '5', division: 'lower' }])
    const h = new HarnessContext({ terms: [{ term: '2248', courses: ['BIOE 20C'] }, { term: '2258', courses: ['BIOE 20C'] }] } as never, c2)
    const a = h.take('a', 'A', 'q', codes('BIOE 20C'))
    const b = h.take('b', 'B', 'q', codes('BIOE 20C'))
    h.solve()
    expect([a.status, b.status].sort()).toEqual(['met', 'unmet'])
  })
  it('a cross-listed partner code is the same course', async () => {
    const { HarnessContext } = await import('./context')
    const h = new HarnessContext({ terms: [{ term: '2248', courses: ['ECON 128'] }, { term: '2258', courses: ['LGST 128'] }] } as never, cat)
    const a = h.take('a', 'A', 'q', codes('ECON 128'))
    const b = h.take('b', 'B', 'q', codes('LGST 128'))
    h.solve()
    expect([a.status, b.status].sort()).toEqual(['met', 'unmet'])
  })
})

describe('cross-listing inside one slot and in filters', () => {
  const c3 = makeCatalog([
    { code: 'OAKS151A', credits: '3', division: 'upper', cross_listed: ['EDUC151A'] },
    { code: 'EART172', credits: '5', division: 'upper', cross_listed: ['OCEA172'] },
    { code: 'EART173', credits: '5', division: 'upper' },
    { code: 'BME195', credits: '2', division: 'upper', repeatable: true },
  ])
  it('a partner code the catalog files elsewhere is filtered by the partner course facts', () => {
    expect(range('EDUC', 100, 189).minCredits(5).has('EDUC151A', c3)).toBe(false)
  })
  it('one course entered under two cross-listed codes is one unit within a slot', async () => {
    const { HarnessContext } = await import('./context')
    const h = new HarnessContext({ terms: [{ term: '2248', courses: ['EART 172', 'OCEA 172'] }] } as never, c3)
    const n = h.take('two', 'Two EART', 'q', range('EART', 100, 189), { n: 2 })
    h.solve()
    expect(n.status).toBe('unmet')
  })
  it('options() matches partner codes and distinct enrollments for repeated members', async () => {
    const { HarnessContext } = await import('./context')
    const h = new HarnessContext({ terms: [{ term: '2248', courses: ['BME 195', 'OCEA 172'] }, { term: '2250', courses: ['BME 195'] }] } as never, c3)
    const a = h.options('cap', 'Capstone', 'q', [['BME 195', 'BME 195', 'BME 195']])
    const b = h.options('lab', 'Lab', 'q', [['EART 172']])
    h.solve()
    expect(a.status).toBe('unmet') // two of three quarters
    expect(b.status).toBe('met') // OCEA 172 = EART 172
  })
})
