// Grade helpers. Unknown grade (null) = a passing letter grade: the plan
// rarely records grades, and a planned course is assumed to be passed for a
// letter. Harnesses that care say so via a GradePolicy.

import type { Enrollment } from './types'

const POINTS: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7, F: 0,
}

export function normGrade(g: string | null | undefined): string | null {
  if (g == null) return null
  const t = g.trim().toUpperCase()
  return t === '' ? null : t
}

export function isPass(g: string | null): boolean {
  return g === 'P' || g === 'S'
}

/** Campus pass: any D- or better, or P. NP/F/W/I/NR do not pass. */
export function passed(e: Enrollment): boolean {
  const g = e.grade
  if (g == null) return true
  if (isPass(g)) return true
  return g in POINTS && POINTS[g] > 0
}

export function gradePoints(g: string | null): number | null {
  if (g == null) return 4.0 // unknown counts as passing letter; GPA math should not use it
  return g in POINTS ? POINTS[g] : null
}

/** Is a letter grade at least `min` ('C', 'B-')? P counts per `pAs`. */
export function atLeast(e: Enrollment, min: string, pAs: 'pass' | 'fail' = 'pass'): boolean {
  const g = e.grade
  if (g == null) return true
  if (isPass(g)) return pAs === 'pass'
  const p = POINTS[g]
  return p !== undefined && p >= POINTS[min]
}

export interface GradePolicy {
  /** P/NP not allowed (a letter grade is required). */
  letter?: boolean
  /** Minimum letter grade. */
  min?: string
  /** For `min`, does P satisfy it? (UCSC: P = C or better, so usually yes.) */
  pCounts?: boolean
}

/** Why an enrollment fails a policy, or null if it passes. */
export function policyFailure(e: Enrollment, policy: GradePolicy | undefined): string | null {
  if (!passed(e)) return `${e.display}: grade ${e.grade} does not pass`
  if (!policy) return null
  if (policy.letter && isPass(e.grade)) return `${e.display}: taken P/NP, but a letter grade is required`
  if (policy.min && !atLeast(e, policy.min, policy.pCounts === false ? 'fail' : 'pass'))
    return `${e.display}: grade ${e.grade} is below the required ${policy.min}`
  return null
}
