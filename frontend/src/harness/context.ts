// The HarnessContext ("h"): what a harness's evaluate() receives. It binds the
// student record and the catalog, and offers builders that create report
// nodes. Builders that consume courses register Slots; h.solve() allocates
// every pending exclusive slot at once (a course counts toward only one of
// them) and fills in the nodes. The runner calls solve() once more after
// evaluate() returns, then rolls group statuses up.

import { allocate, combinations, tick } from './allocate'
import type { Slot } from './allocate'
import { canon, codes as codeSet, display, labFor } from './courses'
import type { CourseSet } from './courses'
import { normGrade, policyFailure } from './grades'
import type { GradePolicy } from './grades'
import type {
  AttestationDef,
  Catalog,
  ChoiceDef,
  Enrollment,
  ReqNode,
  Status,
  StudentRecord,
} from './types'

export type Combine = 'all' | 'any'
/** Internal node: may carry a combine mode for roll-up. */
export type Node = ReqNode & { combine?: Combine; children?: Node[] }

export interface Constraint {
  set: CourseSet
  n: number
  label: string
}

export interface TakeOpts {
  /** How many courses (units) are needed. Default 1. */
  n?: number
  /** "At least k of the chosen must come from S." */
  atLeast?: Constraint[]
  /** "At most k of the chosen may come from S." */
  atMost?: Constraint[]
  /** Any other whole-fill rule (return a reason string when invalid, else null). */
  check?: (chosen: Enrollment[]) => string | null
  /**
   * Lecture/lab handling. 'catalog-required': a lecture counts only with its
   * lab (lecture code + 'L', if the catalog has one), and they count as one.
   * 'catalog-merge': a lab, if taken, is absorbed into its lecture's unit.
   * Or explicit [lecture, lab] pairs with a mode.
   */
  labs?: 'none' | 'catalog-required' | 'catalog-merge' | { pairs: [string, string][]; mode: 'required' | 'merge' }
  /** The same course code may count more than once: true, or 'catalog' = when the catalog marks it repeatable. */
  repeatable?: boolean | 'catalog'
  /** Candidate ordering (lower = tried first), e.g. prefer LIT 102 over its substitutes. */
  prefer?: (code: string) => number
  /** Grade policy for this slot (default: the harness-wide policy). */
  policy?: GradePolicy
  /** false = an overlay that may reuse courses counted elsewhere (e.g. DC). */
  exclusive?: boolean
  /** Explanation of the pool for open-ended sets (defaults to set.describe). */
  pool?: string
  notes?: string[]
  /** Hide from summary counts. */
  minor?: boolean
  /**
   * Extra composite units beyond single courses (e.g. "two physics classes
   * may substitute for one elective"). `eligible` widens which enrollments the
   * slot may consume; `build` returns candidate units (each a list of
   * enrollments counted as ONE course) from the available ones.
   */
  composite?: { eligible: CourseSet; build: (avail: Enrollment[]) => Enrollment[][] }
}

interface PendingSlot {
  slot: Slot
  node: Node
  exclusive: boolean
  finish: (chosen: Enrollment[], satisfied: boolean, partial: { have: number; need: number } | undefined, exhausted: boolean) => void
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export class HarnessContext {
  readonly catalog: Catalog
  readonly enrollments: Enrollment[] // every occurrence, including failed ones
  readonly choices: Record<string, string> // normalized to option values
  readonly rawChoices: Record<string, string>
  readonly attestedRaw: 'all' | string[]
  readonly attestations: AttestationDef[]
  readonly choiceDefs: ChoiceDef[]
  /** Harness-wide default grade policy (set by the harness). */
  policy: GradePolicy | undefined
  /** Enrollments excluded by policy somewhere, with the reason. */
  readonly excluded = new Map<string, string>()
  private pending: PendingSlot[] = []
  private usedIds = new Set<string>()
  private usedKeys = new Set<string>()

  /**
   * Unit of exclusivity across slots: a repeatable course (catalog flag) is
   * counted per enrollment; any other course is ONE course however many
   * times it was taken and under whichever cross-listed code.
   */
  courseKey = (e: Enrollment): string => {
    if (this.catalog.get(e.code)?.repeatable) return e.id
    return this.groupKey(e.code)
  }

  /** Stable name of a course across its cross-listed codes. */
  groupKey(code: string): string {
    return [code, ...this.catalog.equivalents(code)].sort()[0]
  }
  private allNodes: Node[] = []

  constructor(
    student: StudentRecord,
    catalog: Catalog,
    choiceDefs: ChoiceDef[] = [],
    attestations: AttestationDef[] = [],
    opts: { includePlanned?: boolean } = {},
  ) {
    this.catalog = catalog
    this.choiceDefs = choiceDefs
    this.attestations = attestations
    this.attestedRaw = student.attested ?? 'all'
    const grades: Record<string, string> = {}
    for (const [k, v] of Object.entries(student.grades ?? {})) grades[canon(k)] = v
    const cur = student.currentTerm ?? null
    const list: Enrollment[] = []
    const seen = new Map<string, number>()
    const push = (code: string, term: string | null) => {
      const c = canon(code)
      const k = `${term ?? 'done'}:${c}`
      const i = seen.get(k) ?? 0
      seen.set(k, i + 1)
      const planned = term != null && cur != null && Number(term) >= Number(cur)
      list.push({
        id: `${k}:${i}`,
        code: c,
        display: display(c),
        term,
        grade: planned ? null : normGrade(grades[c]),
        planned,
      })
    }
    for (const c of student.completed ?? []) push(c, null)
    const terms = [...student.terms].sort((a, b) => Number(a.term) - Number(b.term))
    for (const t of terms) for (const c of t.courses) push(c, t.term)
    this.enrollments = opts.includePlanned === false ? list.filter((e) => !e.planned) : list

    this.rawChoices = { ...(student.choices ?? {}) }
    if (student.entry && !this.rawChoices.entry) this.rawChoices.entry = student.entry
    this.choices = {}
    for (const def of choiceDefs) {
      const raw = this.rawChoices[def.key]
      if (raw == null || raw === '') continue
      if (def.parse) {
        const v = def.parse(String(raw))
        if (v != null) this.choices[def.key] = v
        continue
      }
      const n = norm(String(raw))
      const opt = def.options.find(
        (o) => norm(o.value) === n || norm(o.label) === n || (o.aliases ?? []).some((a) => norm(a) === n),
      )
      if (opt) this.choices[def.key] = opt.value
    }
    for (const def of choiceDefs) {
      if (this.choices[def.key] == null && def.default != null && (!def.when || def.when(this.choices)))
        this.choices[def.key] = def.default
    }
  }

  // --- student facts -------------------------------------------------------

  /** Declared choice value (normalized to the option value), if any. */
  choice(key: string): string | undefined {
    return this.choices[key]
  }

  get entry(): string | undefined {
    return this.choices.entry ?? this.rawChoices.entry
  }

  attested(id: string): boolean {
    if (this.attestedRaw === 'all') return true
    const def = this.attestations.find((a) => a.id === id)
    const keys = [id, def?.label ?? '', ...(def?.aliases ?? [])].map(norm).filter(Boolean)
    return this.attestedRaw.some((name) => {
      const n = norm(name)
      return keys.some((k) => n === k || (k.length >= 4 && n.includes(k)))
    })
  }

  private passedCache: Enrollment[] | null = null
  /** Passing enrollments (campus pass), any policy aside. */
  get passed(): Enrollment[] {
    this.passedCache ??= this.enrollments.filter((e) => policyFailure(e, undefined) == null)
    return this.passedCache
  }

  /** Passing enrollments whose code is in `set`. */
  taken(set: CourseSet, policy?: GradePolicy): Enrollment[] {
    return this.enrollments.filter(
      (e) => set.has(e.code, this.catalog) && policyFailure(e, policy ?? this.policy) == null,
    )
  }

  has(code: string, policy?: GradePolicy): boolean {
    return this.taken(codeSet(code), policy).length > 0
  }

  // --- node builders -------------------------------------------------------

  private register(node: Node): Node {
    this.allNodes.push(node)
    return node
  }

  /** A group whose children must all be met (combine 'all') or any one ('any'). */
  group(id: string, title: string, children: (Node | null | undefined | false)[], opts: { quote?: string | string[]; combine?: Combine; detail?: string; notes?: string[] } = {}): Node {
    return this.register({
      id,
      title,
      status: 'info',
      quote: opts.quote ?? [],
      combine: opts.combine ?? 'all',
      children: children.filter((c): c is Node => !!c),
      detail: opts.detail,
      notes: opts.notes,
    })
  }

  /** Harness-authoring mistakes detected at evaluation time (lint fails on these). */
  readonly authoringErrors: string[] = []

  /**
   * Alternatives: met when any child is met (e.g. "either PHYS 182, or 195A
   * and 195B"). Pitfall: if two branches hold EXCLUSIVE slots, the allocator
   * treats every branch as required and the branches compete for courses —
   * use one h.options() slot (packages) instead, or make branches overlays.
   */
  either(id: string, title: string, quote: string | string[], children: Node[], opts: { detail?: string; notes?: string[] } = {}): Node {
    const exclusiveNodes = new Set(this.pending.filter((p) => p.exclusive).map((p) => p.node))
    const holds = (n: Node): boolean => exclusiveNodes.has(n) || (n.children ?? []).some(holds)
    if (children.filter(holds).length > 1)
      this.authoringErrors.push(`either('${id}'): more than one branch holds exclusive slots — use h.options() or exclusive:false`)
    return this.group(id, title, children, { quote, combine: 'any', ...opts })
  }

  info(id: string, title: string, quote: string | string[], detail?: string): Node {
    return this.register({ id, title, status: 'info', quote, detail })
  }

  /** A fixed status node (custom logic computed by the harness). */
  node(id: string, title: string, quote: string | string[], status: Status, extra: Partial<ReqNode> = {}): Node {
    return this.register({ id, title, quote, status, ...extra })
  }

  /** Something the app cannot verify; the student must check it. */
  cannotCheck(id: string, title: string, quote: string | string[], detail: string, extra: Partial<ReqNode> = {}): Node {
    return this.register({ id, title, quote, status: 'cannot-check', detail, ...extra })
  }

  /** A non-course condition the student confirms (juries, exam, petition…). */
  attest(attId: string, title?: string, extra: Partial<ReqNode> = {}): Node {
    const def = this.attestations.find((a) => a.id === attId)
    if (!def) throw new Error(`harness bug: undeclared attestation ${attId}`)
    const ok = this.attested(attId)
    return this.register({
      id: `attest:${attId}`,
      title: title ?? def.label,
      quote: def.quote,
      status: ok ? 'met' : 'needs-attestation',
      detail: ok ? 'You confirmed this.' : 'Confirm this once it is done — the app cannot see it in your courses.',
      attest: def,
      ...extra,
    })
  }

  /** Node asking for a declared choice. Returns null when the choice is made. */
  needChoice(key: string, title?: string): Node | null {
    if (this.choice(key)) return null
    const def = this.choiceDefs.find((c) => c.key === key)
    if (!def) throw new Error(`harness bug: undeclared choice ${key}`)
    return this.register({
      id: `choice:${key}`,
      title: title ?? def.label,
      quote: def.quote,
      status: 'needs-choice',
      choice: key,
      detail: `Choose: ${def.options.map((o) => o.label).join(' / ')}`,
    })
  }

  /**
   * Take `n` courses from `set` (exclusive by default: a course used here is
   * not available to other exclusive slots in the same solve()).
   */
  take(id: string, title: string, quote: string | string[], set: CourseSet, opts: TakeOpts = {}): Node {
    const n = opts.n ?? 1
    const policy = opts.policy ?? this.policy
    const cat = this.catalog
    const pairs = this.labPairs(set, opts.labs)
    const labCodes = new Set([...pairs.values()])
    const isMember = (code: string) => set.has(code, cat)
    const eligibleCode = (code: string) => isMember(code) || labCodes.has(code) || !!opts.composite?.eligible.has(code, cat)
    const okGrade = (e: Enrollment) => {
      const why = policyFailure(e, policy)
      if (why && eligibleCode(e.code)) this.excluded.set(e.id, why)
      return why == null
    }
    const atLeast = opts.atLeast ?? []
    const atMost = opts.atMost ?? []
    const labMode = typeof opts.labs === 'object' ? opts.labs.mode : opts.labs === 'catalog-required' ? 'required' : opts.labs === 'catalog-merge' ? 'merge' : 'none'

    // Build units: a lecture (+ its lab when taken). Labs never stand alone
    // unless they are members in their own right without a paired lecture.
    const units = (avail: Enrollment[]): Enrollment[][] => {
      const out: Enrollment[][] = []
      const takenLabs = new Set<string>()
      const seenCodes = new Set<string>()
      for (const e of avail) {
        tick() // building units is real work: charge it to the allocation budget
        if (labCodes.has(e.code) || !isMember(e.code)) continue
        const rep = opts.repeatable === 'catalog' ? !!cat.get(e.code)?.repeatable : !!opts.repeatable
        // One course however it was entered: cross-listed codes share a key.
        const ck = this.groupKey(e.code)
        if (!rep && seenCodes.has(ck)) continue
        const lab = pairs.get(e.code)
        let unit = [e]
        if (lab) {
          const le = avail.find((x) => x.code === lab && !takenLabs.has(x.id))
          if (le) {
            unit = [e, le]
            takenLabs.add(le.id)
          } else if (labMode === 'required') continue
        }
        seenCodes.add(ck)
        out.push(unit)
      }
      if (opts.composite) out.push(...opts.composite.build(avail.filter((e) => opts.composite!.eligible.has(e.code, cat))))
      if (opts.prefer) {
        const p = opts.prefer
        return out.map((u, i) => ({ u, i, k: p(u[0].code) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.u)
      }
      return out
    }
    const overlap = (chosen: Enrollment[][]) => {
      const ids = chosen.flat().map((e) => e.id)
      return new Set(ids).size !== ids.length
    }
    const count = (chosen: Enrollment[][], s: CourseSet) => chosen.filter((u) => s.has(u[0].code, cat)).length
    const violates = (chosen: Enrollment[][]) => overlap(chosen) || atMost.some((c) => count(chosen, c.set) > c.n)
    const deficit = (chosen: Enrollment[][]) =>
      atLeast.reduce((d, c) => d + Math.max(0, c.n - count(chosen, c.set)), 0)
    const fullOk = (chosen: Enrollment[][]) =>
      !violates(chosen) && deficit(chosen) === 0 && (!opts.check || opts.check(chosen.flat()) == null)

    const slot: Slot = {
      id,
      eligible: (e) => eligibleCode(e.code) && okGrade(e),
      *fills(avail) {
        const us = units(avail)
        for (const combo of combinations(us, n)) if (fullOk(combo)) yield combo.flat()
      },
      partial(avail) {
        const us = units(avail)
        for (let k = Math.min(n, us.length); k >= 0; k--) {
          let tries = 0
          for (const combo of combinations(us, k)) {
            if (++tries > 5000) break
            if (violates(combo)) continue
            if (n - k < deficit(combo)) continue
            if (k === n && !fullOk(combo)) continue
            return { chosen: combo.flat(), have: k, need: n }
          }
        }
        return { chosen: [], have: 0, need: n }
      },
    }

    const node = this.register({
      id,
      title,
      quote,
      status: 'unmet',
      progress: { have: 0, need: n },
      options: set.members ? set.members.filter((c) => cat.has(c) || !set.members) : undefined,
      pool: set.members ? undefined : (opts.pool ?? set.describe),
      notes: opts.notes,
      minor: opts.minor,
    })
    this.pending.push({
      slot,
      node,
      exclusive: opts.exclusive !== false,
      finish: (chosen, satisfied, partial, exhausted) => {
        const unitsChosen = chosen.filter((e) => !labCodes.has(e.code)).length
        const have = satisfied ? n : (partial?.have ?? unitsChosen)
        node.used = chosen
        node.progress = { have: Math.min(have, n), need: n }
        if (satisfied) {
          node.status = 'met'
          node.detail = undefined
        } else if (exhausted) {
          node.status = 'cannot-check'
          node.detail = 'Too many combinations to check automatically — ask an advisor.'
        } else {
          node.status = 'unmet'
          const msgs: string[] = []
          const left = n - have
          const gradeBlocked = [...this.excluded].some(([eid]) => {
            const e = this.enrollments.find((x) => x.id === eid)
            return !!e && isMember(e.code) && !chosen.includes(e)
          })
          // "1 more needed" would mislead when the course was taken but a grade rule blocks it.
          if (left > 0 && !(gradeBlocked && left === 1 && n === 1)) msgs.push(`${left} more needed`)
          const cu = chosen.filter((e) => !labCodes.has(e.code)).map((e) => [e])
          for (const c of atLeast) {
            const got = count(cu, c.set)
            if (got < c.n) msgs.push(`${c.label}: ${got} of ${c.n}`)
          }
          for (const [eid, why] of this.excluded) {
            const e = this.enrollments.find((x) => x.id === eid)
            if (e && isMember(e.code) && !chosen.includes(e)) msgs.push(why)
          }
          if (opts.check && have === n) {
            const why = opts.check(chosen)
            if (why) msgs.push(why)
          }
          if (labMode === 'required') {
            const missingLab = this.passed.filter((e) => isMember(e.code) && pairs.has(e.code) && !this.passed.some((x) => x.code === pairs.get(e.code)))
            if (missingLab.length)
              msgs.push(`${missingLab.map((e) => e.display).join(', ')} needs its lab (${missingLab.map((e) => display(pairs.get(e.code)!)).join(', ')}) to count`)
          }
          node.detail = msgs.join(' · ')
        }
      },
    })
    return node
  }

  /** Every course in the list (each its own exclusive slot), shown as one node. */
  all(id: string, title: string, quote: string | string[], list: string[], opts: Omit<TakeOpts, 'n' | 'atLeast' | 'atMost'> = {}): Node {
    const children = list.map((c) =>
      this.take(`${id}/${canon(c)}`, display(c), quote, codeSet(c), { ...opts, minor: true }),
    )
    const g = this.group(id, title, children, { quote })
    ;(g as Node & { flat?: boolean }).flat = true
    return g
  }

  /**
   * One of several course packages ("either MATH 19A+19B or MATH 20A+20B").
   * Each package is a list of codes; every code of the chosen package counts.
   */
  options(id: string, title: string, quote: string | string[], packages: string[][], opts: { policy?: GradePolicy; exclusive?: boolean; labels?: string[]; notes?: string[] } = {}): Node {
    const policy = opts.policy ?? this.policy
    const pk = packages.map((p) => p.map(canon))
    const members = new Set(pk.flat())
    // A package member matches its cross-listed partner codes too.
    const same = (want: string, code: string) =>
      code === want || this.catalog.equivalents(want).includes(code)
    const isMember = (code: string) => members.has(code) || this.catalog.equivalents(code).some((m) => members.has(m))
    const okGrade = (e: Enrollment) => {
      const why = policyFailure(e, policy)
      if (why && isMember(e.code)) this.excluded.set(e.id, why)
      return why == null
    }
    // Distinct enrollments for a package (a package may name a code twice,
    // e.g. three quarters of BME 195).
    const pick = (p: string[], avail: Enrollment[]): Enrollment[] => {
      const fill: Enrollment[] = []
      for (const c of p) {
        const e = avail.find((x) => same(c, x.code) && !fill.includes(x))
        if (e) fill.push(e)
      }
      return fill
    }
    const slot: Slot = {
      id,
      eligible: (e) => isMember(e.code) && okGrade(e),
      *fills(avail) {
        for (const p of pk) {
          const fill = pick(p, avail)
          if (fill.length === p.length) yield fill
        }
      },
      partial(avail) {
        let best: Enrollment[] = []
        let bestNeed = pk[0]?.length ?? 0
        for (const p of pk) {
          const fill = pick(p, avail)
          if (fill.length / p.length > best.length / bestNeed) {
            best = fill
            bestNeed = p.length
          }
        }
        return { chosen: best, have: best.length, need: bestNeed }
      },
    }
    const node = this.register({
      id,
      title,
      quote,
      status: 'unmet',
      options: [...members],
      notes: opts.notes,
      detail: undefined,
    })
    ;(node as Node & { packages?: string[][] }).packages = pk
    this.pending.push({
      slot,
      node,
      exclusive: opts.exclusive !== false,
      finish: (chosen, satisfied, partial, exhausted) => {
        node.used = chosen
        node.progress = satisfied ? { have: chosen.length, need: chosen.length } : partial
        node.status = satisfied ? 'met' : exhausted ? 'cannot-check' : 'unmet'
        if (!satisfied && exhausted) node.detail = 'Too many combinations to check automatically — ask an advisor.'
        else if (!satisfied) {
          const p = pk.find((x) => chosen.length && chosen.every((e) => x.includes(e.code))) ?? pk[0]
          const missing = p.filter((c) => !chosen.some((e) => e.code === c))
          node.detail = `Complete one option${chosen.length ? ` — closest: still need ${missing.map(display).join(', ')}` : ''}`
        }
      },
    })
    return node
  }

  private labPairs(set: CourseSet, labs: TakeOpts['labs']): Map<string, string> {
    const m = new Map<string, string>()
    if (!labs || labs === 'none') return m
    if (typeof labs === 'object') {
      for (const [lec, lab] of labs.pairs) m.set(canon(lec), canon(lab))
      return m
    }
    const candidates = set.members ?? this.enrollments.map((e) => e.code)
    for (const c of candidates) {
      if (c.endsWith('L')) continue
      const lab = labFor(c, this.catalog)
      if (lab) m.set(c, lab)
    }
    return m
  }

  // --- solving -------------------------------------------------------------

  /** Allocate all pending slots now. Exclusive slots share one allocation over the unused pool. */
  solve(): void {
    const pending = this.pending
    this.pending = []
    const pool = this.enrollments.filter((e) => !this.usedKeys.has(this.courseKey(e)))
    const excl = pending.filter((p) => p.exclusive)
    if (excl.length) {
      const res = allocate(excl.map((p) => p.slot), pool, undefined, this.courseKey)
      for (const p of excl) {
        p.finish(res.chosen.get(p.slot.id) ?? [], res.satisfied.has(p.slot.id), res.partial.get(p.slot.id), res.exhausted)
      }
      for (const id of res.used) this.usedIds.add(id)
      for (const k of res.usedKeys) this.usedKeys.add(k)
    }
    for (const p of pending.filter((x) => !x.exclusive)) {
      const res = allocate([p.slot], this.enrollments)
      p.finish(res.chosen.get(p.slot.id) ?? [], res.satisfied.has(p.slot.id), res.partial.get(p.slot.id), res.exhausted)
    }
  }

  /** Enrollment ids consumed by exclusive slots so far. */
  get used(): ReadonlySet<string> {
    return this.usedIds
  }
}

// --- roll-up -------------------------------------------------------------

const RANK: Record<Status, number> = {
  unmet: 6,
  'needs-choice': 5,
  'needs-attestation': 4,
  'cannot-check': 3,
  'in-progress': 2,
  met: 1,
  info: 0,
}

export function worst(statuses: Status[]): Status {
  const s: Status[] = statuses.filter((x) => x !== 'info')
  if (!s.length) return 'info'
  return s.reduce((a, b) => (RANK[b] > RANK[a] ? b : a))
}

export function best(statuses: Status[]): Status {
  const s: Status[] = statuses.filter((x) => x !== 'info')
  if (!s.length) return 'info'
  // Among alternatives: met beats in-progress beats needs-attestation … beats unmet.
  const order: Status[] = ['met', 'in-progress', 'needs-attestation', 'cannot-check', 'needs-choice', 'unmet']
  for (const o of order) if (s.includes(o)) return o
  return 'unmet'
}

export function rollUp(node: Node): Status {
  if (!node.children || !node.children.length || !node.combine) return node.status
  const kids = node.children.map(rollUp)
  node.status = node.combine === 'any' ? best(kids) : worst(kids)
  if (node.combine === 'all') {
    const counted = node.children.filter((c) => c.status !== 'info')
    const done = counted.filter((c) => c.status === 'met').length
    if (!node.progress && counted.length > 1) node.progress = { have: done, need: counted.length }
    else if (node.progress && (node as Node & { flat?: boolean }).flat) node.progress = { have: done, need: counted.length }
  }
  return node.status
}
