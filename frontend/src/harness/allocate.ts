// The ALLOCATION helper: assign enrollments to mutually exclusive requirement
// slots ("a course may count toward only one of these") so that as many
// slots as possible are fully satisfied.
//
// Exhaustive depth-first search with a bound, deterministic: slots are tried
// in the order given, fills in the order each slot enumerates them, and the
// first assignment reaching the best score wins. A node budget guarantees
// termination; if it is hit, `exhausted` is true and harnesses should report
// cannot-check rather than a possibly-wrong unmet.

import type { Enrollment } from './types'

export interface Slot {
  id: string
  /** Could this enrollment ever help this slot? (cheap filter) */
  eligible(e: Enrollment): boolean
  /** Complete, valid fills from `avail` (all eligible + unused), preferred first. */
  fills(avail: Enrollment[]): Iterable<Enrollment[]>
  /** Best-effort partial progress when the slot cannot be completed. */
  partial(avail: Enrollment[]): { chosen: Enrollment[]; have: number; need: number }
}

export interface Allocation {
  chosen: Map<string, Enrollment[]>
  satisfied: Set<string>
  partial: Map<string, { have: number; need: number }>
  exhausted: boolean
  used: Set<string> // enrollment ids
  usedKeys: Set<string> // course keys (see `keyOf`)
}

// Work accounting: every combination examined anywhere inside one
// allocate() call (including inside slots' fill generators) costs one unit.
// Deterministic — it counts steps, never time.
let work = 0
let workLimit = Infinity
const EXHAUSTED = new Error('allocation work budget exhausted')

/** Charge one unit of work; throws (caught by allocate) past the budget. */
export function tick(): void {
  if (++work > workLimit) throw EXHAUSTED
}

/** Default work budget per allocate() call (~0.1–0.3 s in a browser). */
export const WORK_BUDGET = 100_000
/** Budget for proving a single slot has (no) fill. */
const PROBE_BUDGET = 5_000

/** Does `slot` have any fill from `avail`? 'maybe' when the probe budget runs out. */
function hasFill(slot: Slot, avail: Enrollment[]): boolean | 'maybe' {
  const outer = workLimit
  const start = work
  workLimit = Math.min(outer, work + PROBE_BUDGET)
  try {
    return !slot.fills(avail)[Symbol.iterator]().next().done
  } catch (e) {
    if (e !== EXHAUSTED) throw e
    if (outer !== Infinity && work >= outer) throw e // the real budget is gone
    return 'maybe'
  } finally {
    workLimit = outer
    if (outer === Infinity) work = start
  }
}

/**
 * `keyOf` names the unit of exclusivity. By default every enrollment is its
 * own unit; the context passes a course key so that a non-repeatable course
 * taken twice (or under two cross-listed codes) still counts once across all
 * exclusive slots.
 */
export function allocate(
  allSlots: Slot[],
  pool: Enrollment[],
  budget = WORK_BUDGET,
  keyOf: (e: Enrollment) => string = (e) => e.id,
): Allocation {
  // Slots with no possible fill even from the whole pool can never be
  // satisfied: search only the rest (they still get partial progress below).
  // Most specific slots first (fewest eligible enrollments; stable): among
  // equally good assignments, an explicit list keeps its courses and an
  // open-ended pool takes what is left.
  const slots = allSlots
    .filter((s) => hasFill(s, pool.filter((e) => s.eligible(e))) !== false)
    .map((s, i) => ({ s, i, k: pool.filter((e) => s.eligible(e)).length }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.s)
  const n = slots.length
  let nodes = 0
  let exhausted = false
  let bestSat = -1
  let best: Map<string, Enrollment[]> = new Map()
  const used = new Set<string>()
  const assign = new Map<string, Enrollment[]>()

  const dfs = (i: number, sat: number): void => {
    if (exhausted) return
    if (++nodes > budget) {
      exhausted = true
      return
    }
    tick()
    if (sat + (n - i) <= bestSat) return
    // Tighter bound: only slots that still have some fill from the unused pool can be satisfied.
    if (i < n && bestSat >= 0) {
      let ub = sat
      for (let j = i; j < n; j++) {
        const s = slots[j]
        const avail = pool.filter((e) => !used.has(keyOf(e)) && s.eligible(e))
        work += avail.length >> 3
        if (hasFill(s, avail) !== false) ub++
        if (ub > bestSat) break
      }
      if (ub <= bestSat) return
    }
    if (i === n) {
      bestSat = sat
      best = new Map(assign)
      return
    }
    const slot = slots[i]
    const avail = pool.filter((e) => !used.has(keyOf(e)) && slot.eligible(e))
    for (const fill of slot.fills(avail)) {
      const keys = fill.map(keyOf)
      for (const k of keys) used.add(k)
      assign.set(slot.id, fill)
      dfs(i + 1, sat + 1)
      assign.delete(slot.id)
      for (const k of keys) used.delete(k)
      if (bestSat === n || exhausted) return
    }
    dfs(i + 1, sat)
  }
  work = 0
  workLimit = budget
  try {
    dfs(0, 0)
  } catch (e) {
    if (e !== EXHAUSTED) throw e
    exhausted = true
  } finally {
    workLimit = Infinity
  }

  // Partial progress for unsatisfied slots from what is left, in slot order.
  const finalUsed = new Set<string>()
  const finalKeys = new Set<string>()
  const mark = (e: Enrollment) => {
    finalUsed.add(e.id)
    finalKeys.add(keyOf(e))
  }
  for (const fill of best.values()) fill.forEach(mark)
  const chosen = new Map(best)
  const partial = new Map<string, { have: number; need: number }>()
  const satisfied = new Set(best.keys())
  for (const slot of allSlots) {
    if (satisfied.has(slot.id)) continue
    const avail = pool.filter((e) => !finalKeys.has(keyOf(e)) && slot.eligible(e))
    const p = slot.partial(avail)
    p.chosen.forEach(mark)
    chosen.set(slot.id, p.chosen)
    partial.set(slot.id, { have: p.have, need: p.need })
  }
  return { chosen, satisfied, partial, exhausted, used: finalUsed, usedKeys: finalKeys }
}

/** k-combinations of `items` in lexicographic index order (lazy). */
export function* combinations<T>(items: T[], k: number): Generator<T[]> {
  const n = items.length
  if (k > n || k < 0) return
  if (k === 0) {
    yield []
    return
  }
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    tick()
    yield idx.map((i) => items[i])
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}
