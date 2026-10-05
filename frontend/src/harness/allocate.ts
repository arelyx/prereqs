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
}

export function allocate(slots: Slot[], pool: Enrollment[], budget = 400_000): Allocation {
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
    if (sat + (n - i) <= bestSat) return
    if (i === n) {
      bestSat = sat
      best = new Map(assign)
      return
    }
    const slot = slots[i]
    const avail = pool.filter((e) => !used.has(e.id) && slot.eligible(e))
    for (const fill of slot.fills(avail)) {
      for (const e of fill) used.add(e.id)
      assign.set(slot.id, fill)
      dfs(i + 1, sat + 1)
      assign.delete(slot.id)
      for (const e of fill) used.delete(e.id)
      if (bestSat === n || exhausted) return
    }
    dfs(i + 1, sat)
  }
  dfs(0, 0)

  // Partial progress for unsatisfied slots from what is left, in slot order.
  const finalUsed = new Set<string>()
  for (const fill of best.values()) for (const e of fill) finalUsed.add(e.id)
  const chosen = new Map(best)
  const partial = new Map<string, { have: number; need: number }>()
  const satisfied = new Set(best.keys())
  for (const slot of slots) {
    if (satisfied.has(slot.id)) continue
    const avail = pool.filter((e) => !finalUsed.has(e.id) && slot.eligible(e))
    const p = slot.partial(avail)
    for (const e of p.chosen) finalUsed.add(e.id)
    chosen.set(slot.id, p.chosen)
    partial.set(slot.id, { have: p.have, need: p.need })
  }
  return { chosen, satisfied, partial, exhausted, used: finalUsed }
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
    yield idx.map((i) => items[i])
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}
