import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const core = plan(
  ['2248', 'MATH 19A', 'CSE 20', 'ECE 80T'],
  ['2250', 'MATH 19B', 'CSE 12', 'PHYS 5A', 'PHYS 5L'],
  ['2252', 'AM 10', 'ECE 13', 'PHYS 5B', 'PHYS 5M'],
  ['2258', 'MATH 23A', 'AM 20', 'PHYS 5C', 'PHYS 5N'],
  ['2260', 'MATH 23B', 'PHYS 5D', 'ECE 101', 'ECE 101L'],
  ['2262', 'ECE 102', 'ECE 102L', 'ECE 103', 'ECE 103L'],
  ['2268', 'ECE 135', 'ECE 135L', 'ECE 171', 'ECE 171L'],
  ['2270', 'ECE 151', 'CSE 100', 'CSE 100L', 'CSE 107'],
)
const eo = ['ECE 121', 'ECE 104', 'ECE 172', 'ECE 136']
const cap = plan(['2278', 'ECE 129A'], ['2280', 'ECE 129B'], ['2282', 'ECE 129C'])
const rec = (electives: string[], extra: { term: string; courses: string[] }[] = cap) => [...core, { term: '2272', courses: electives }, ...extra]
const EO = { concentration: 'Electronics/Optics' }
const CSS = { concentration: 'Communications, Signals and Systems' }
const drop = (t: { term: string; courses: string[] }[], c: string) => t.map((q) => ({ ...q, courses: q.courses.filter((x) => x !== c) }))

describe('electrical-engineering-bs 2025-26', () => {
  it('asks for a concentration', () => {
    expect(find(run(harness, { terms: rec(eo) }), 'choice:concentration').status).toBe('needs-choice')
  })

  it('complete Electronics/Optics record is met', () => {
    const r = run(harness, { terms: rec(eo), choices: EO })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('complete Communications, Signals and Systems record is met', () => {
    expect(failing(run(harness, { terms: rec(['ECE 157', 'ECE 157L', 'ECE 152', 'ECE 153', 'CSE 150']), choices: CSS }))).toEqual([])
  })

  it('at least three electives must come from the concentration list', () => {
    // ECE 104 and ECE 172 are Electronics/Optics only
    const r = run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 172', 'ECE 152']), choices: CSS })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 152', 'ECE 153']), choices: CSS }), 'electives').status).toBe('met')
  })

  it('the fourth elective may come from the other concentration list', () => {
    // CSE 150 is only on the Communications list
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 172', 'CSE 150']), choices: EO }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'CSE 150', 'ECE 252']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('a design elective is required among the four', () => {
    expect(find(run(harness, { terms: rec(['ECE 104', 'ECE 110', 'ECE 172', 'ECE 136']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('ECE 157 counts as the design elective only with ECE 157L', () => {
    expect(find(run(harness, { terms: rec(['ECE 157', 'ECE 104', 'ECE 172', 'ECE 136']), choices: EO }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: rec(['ECE 157', 'ECE 157L', 'ECE 104', 'ECE 172', 'ECE 136']), choices: EO }), 'electives').status).toBe('met')
  })

  it('the design elective must be taken before the first ECE 129A', () => {
    const t = [...core, { term: '2272', courses: ['ECE 104', 'ECE 172', 'ECE 136'] }, { term: '2278', courses: ['ECE 129A', 'ECE 121'] }, ...cap.slice(1)]
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual(['design-timing:unmet'])
    // an earlier design course that is not among the counted four: cannot-check, not unmet
    const t2 = [...core, { term: '2272', courses: ['ECE 104', 'ECE 172', 'ECE 136', 'ECE 167', 'ECE 110'] }, { term: '2278', courses: ['ECE 129A', 'ECE 121'] }, ...cap.slice(1)]
    expect(find(run(harness, { terms: t2, choices: EO }), 'design-timing').status).not.toBe('unmet')
  })

  it('a lecture/lab combination counts as one course', () => {
    // 130 + 130L are one course: only three electives
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 130', 'ECE 130L', 'ECE 104']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('only one of a conjoined undergraduate/graduate pair counts', () => {
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 130', 'ECE 230', 'ECE 104']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('ECE 183 needs the undergraduate director approval', () => {
    const t = rec(['ECE 121', 'ECE 104', 'ECE 172', 'ECE 183'])
    expect(find(run(harness, { terms: t, choices: EO, attested: ['exit survey', 'test-out'] }), 'electives').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: EO }), 'electives').status).toBe('met')
  })

  it('2025-26: no ECE 218-for-ECE 118 petition', () => {
    const t = rec(['ECE 218', 'ECE 104', 'ECE 172', 'ECE 136'])
    expect(find(run(harness, { terms: t, choices: EO }), 'electives').status).toBe('unmet')
  })

  it('2025-26: ECE 170 and PHYS 137 are not Electronics/Optics electives', () => {
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 172', 'ECE 170']), choices: EO }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 172', 'PHYS 137']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('2025-26: ECE 13 is required alongside CSE 12; CSE 13S is not an alternative', () => {
    const t = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'ECE 13' ? 'CSE 13S' : c)) }))
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual(['c-prog:unmet'])
  })

  it('2025-26: ECE 8 does not replace ECE 80T', () => {
    const t = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'ECE 80T' ? 'ECE 8' : c)) }))
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual(['ece-intro:unmet'])
  })

  it('DC/capstone: ECE 129A plus 10 credits of ECE 195', () => {
    const one195 = rec(eo, plan(['2278', 'ECE 129A'], ['2280', 'ECE 195']))
    const r = run(harness, { terms: one195, choices: EO })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'project').status).toBe('unmet')
    const two195 = rec(eo, plan(['2278', 'ECE 129A'], ['2280', 'ECE 195'], ['2282', 'ECE 195']))
    expect(failing(run(harness, { terms: two195, choices: EO }))).toEqual([])
  })

  it('2025-26: the outcomes assessment (exit survey/interview + one option) is an attestation', () => {
    expect(failing(run(harness, { terms: rec(eo), choices: EO, attested: [] }))).toEqual(['attest:exit-requirement:needs-attestation'])
  })

  it('ECE 80T is waived for transfer students', () => {
    const t = drop(rec(eo), 'ECE 80T')
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual(['ece-intro:unmet'])
    expect(failing(run(harness, { terms: t, choices: EO, entry: 'transfer' }))).toEqual([])
  })

  it('CSE 30 instead of CSE 20; or the CSE 20 test-out', () => {
    const t = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 20' ? 'CSE 30' : c)) }))
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual([])
    const none = drop(rec(eo), 'CSE 20')
    expect(find(run(harness, { terms: none, choices: EO, attested: ['exit survey'] }), 'programming').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: none, choices: EO }), 'programming').status).toBe('met')
  })

  it('AM 30 + AM 100 alternative to MATH 23A/B; mixing does not count', () => {
    const alt = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MATH 23A' ? 'AM 30' : c === 'MATH 23B' ? 'AM 100' : c)) }))
    expect(failing(run(harness, { terms: alt, choices: EO }))).toEqual([])
    const mix = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MATH 23B' ? 'AM 100' : c)) }))
    expect(failing(run(harness, { terms: mix, choices: EO }))).toEqual(['vector:unmet'])
  })

  it('PHYS 5D is required; 2025-26: PHYS 15A does not substitute for 5A', () => {
    expect(failing(run(harness, { terms: drop(rec(eo), 'PHYS 5D'), choices: EO }))).toEqual(['phys-rest/PHYS5D:unmet'])
    const t = rec(eo).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5A' ? 'PHYS 15A' : c)) }))
    expect(failing(run(harness, { terms: t, choices: EO }))).toEqual(['phys5a:unmet'])
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: rec(eo), choices: EO, grades: { 'ECE 151': 'P' } }), 'core/ECE151').status).toBe('unmet')
  })

  it('missing ECE 103L fails', () => {
    expect(failing(run(harness, { terms: drop(rec(eo), 'ECE 103L'), choices: EO }))).toEqual(['core/ECE103L:unmet'])
  })

  it('review: the CSE 20 test-out is offered only when CSE 20 is absent; attested ⇒ met by test-out', () => {
    const none = drop(rec(eo), 'CSE 20')
    const r = run(harness, { terms: none, choices: EO, attested: ['exit survey'] })
    expect(failing(r)).toEqual(['programming:needs-attestation'])
    expect(find(r, 'programming').attest?.id).toBe('cse20-testout')
    expect(find(run(harness, { terms: none, choices: EO }), 'programming').detail).toMatch(/test-out/)
    // A failed CSE 20 (no CSE 30) is unmet even with every attestation.
    expect(failing(run(harness, { terms: rec(eo), choices: EO, grades: { 'CSE 20': 'F' } }))).toEqual(['programming:unmet'])
  })

  it('review: a lab alone is not an elective; a repeated ECE 198 counts once; ECE 218 is not ECE 118', () => {
    expect(find(run(harness, { terms: rec(['ECE 121', 'ECE 104', 'ECE 172', 'ECE 130L']), choices: EO }), 'electives').status).toBe('unmet')
    const t = [...rec(['ECE 121', 'ECE 104', 'ECE 198']), { term: '2276', courses: ['ECE 198'] }]
    expect(find(run(harness, { terms: t, choices: EO }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: rec(['ECE 218', 'ECE 118', 'ECE 104', 'ECE 172']), choices: EO }), 'electives').status).toBe('unmet')
  })

  it('review: ECE 183 approval is not asked when four other electives suffice; a design course in the same term as ECE 129A is late', () => {
    const r = run(harness, { terms: rec(['ECE 183', 'ECE 121', 'ECE 104', 'ECE 172', 'ECE 136']), choices: EO, attested: ['exit survey'] })
    expect(find(r, 'electives').status).toBe('met')
    const late = [...core, { term: '2272', courses: ['ECE 104', 'ECE 172', 'ECE 136'] }, { term: '2278', courses: ['ECE 129A', 'ECE 121'] }, ...cap.slice(1)]
    expect(failing(run(harness, { terms: late, choices: EO }))).toEqual(['design-timing:unmet'])
  })

  it('review: P in a capstone course fails DC and the project course', () => {
    expect(failing(run(harness, { terms: rec(eo), choices: EO, grades: { 'ECE 129B': 'P' } }))).toEqual(['dc:unmet', 'project:unmet'])
  })

  it('review: ECE 253 and its cross-listed code CSE 208 are one elective', () => {
    expect(find(run(harness, { terms: rec(['ECE 121', 'CSE 208', 'ECE 152', 'ECE 153']), choices: CSS }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: rec(['ECE 121', 'CSE 208', 'ECE 253', 'ECE 153']), choices: CSS }), 'electives').status).toBe('unmet')
  })
})
