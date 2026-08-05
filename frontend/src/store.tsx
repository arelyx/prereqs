// Multi-plan + auth state. All plans live in localStorage in exactly the
// shape the backend stores/validates, so the anonymous mode and the server
// mode are the same data with different persistence. On sign-in, local plans
// can be imported to the server; while signed in, saves go to the server AND
// the local copy (offline-friendly). The store context still exposes the
// ACTIVE plan's content/programIds/planName plus the same mutators, so plan
// consumers (planner, GE panel, requirements…) are unaware of multi-plan.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api, authedEmail, setAuthedEmail, setToken } from './api'
import type { PlanContent, ServerPlan, ValidationResult } from './api'
import { academicYearOf, ayTermCodes, upcomingAcademicYear } from './terms'

// v2 key holds { plans: [...], activeId }. The legacy single-plan key
// ('prereqs.plan') is read once as a migration source and then deleted after
// the first successful v2 write (removal happens in a mount effect, not in
// the state initializer — StrictMode double-invokes initializers).
const PLANS_KEY = 'prereqs.plans.v2'
const LEGACY_PLAN_KEY = 'prereqs.plan'
// Written by setAuthedEmail (api.ts); watched here so auth changes broadcast
// to other open tabs — a sign-out in one tab must sign out the rest, or their
// still-armed flush would re-create every just-nulled plan once a token
// reappears (the two-tab sign-out/sign-in duplication engine).
const EMAIL_KEY = 'prereqs.email'

// Mirror the backend caps (backend/app/api/plans.py MAX_PLANS / PlanIn.name):
// a name over 128 chars would 422 on every save, silently orphaning the plan.
export const MAX_PLANS = 20
export const MAX_PLAN_NAME = 128
// Backend caps on plan content (app/api/plans.py).
export const MAX_COMPLETED = 200
export const MAX_TERMS = 24

export interface PlanState {
  id: string // client-local id, stable across sessions and sign-in/out
  content: PlanContent
  programIds: number[]
  planName: string
  serverPlanId: number | null
  // Monotonic per-plan revision, bumped on every local mutation of THIS plan.
  // The cross-tab storage merge compares revisions per plan so a whole-list
  // write from one tab can't revert a plan the other tab just edited.
  rev: number
}

interface PlansState {
  plans: PlanState[]
  activeId: string
  // Tombstones: client ids of deleted plans (capped). The cross-tab merge
  // union-keeps unmatched plans, so without these a delete in one tab would
  // resurrect from the other tab's copy — and the deleted plan would live on
  // there as an un-saveable zombie PUTting to a dead server id (pass-3 C3-2).
  deleted: string[]
}

export interface PlanMeta {
  id: string
  name: string
  serverPlanId: number | null
}

interface Store {
  // Active-plan view (unchanged surface for existing consumers).
  content: PlanContent
  programIds: number[]
  planName: string
  serverPlanId: number | null
  email: string | null
  validation: ValidationResult | null
  validating: boolean
  // True when the last validate request FAILED (network/422): "no result"
  // must not render as "no issues".
  validationFailed: boolean
  dormant: Set<string>
  // True while the active plan's latest server write has failed (signed in
  // only); cleared by the first successful retry.
  saveFailed: boolean
  setCompleted: (codes: string[]) => void
  addCompleted: (code: string) => void
  addYear: (startYear?: number) => void
  removeYear: (startYear: number) => void
  addCourse: (termCode: string, code: string) => void
  removeCourse: (termCode: string, code: string) => void
  setPrograms: (ids: number[]) => void
  /** Excuse a course from prerequisite checking, or put it back. */
  toggleWaived: (code: string) => void
  signIn: (email: string, token: string, importLocal: boolean) => Promise<void>
  signOut: () => void
  accountDeleted: () => void
  // Multi-plan surface.
  plans: PlanState[]
  activePlanId: string
  // Returns the new plan id, or null at the cap. `content` seeds the plan
  // instead of the default empty upcoming-year grid (transcript import).
  createPlan: (name: string, content?: PlanContent) => string | null
  switchPlan: (id: string) => void
  renamePlan: (id: string, name: string) => void
  deletePlan: (id: string) => void
}

const StoreCtx = createContext<Store | null>(null)

function newPlanId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function freshPlan(name: string): PlanState {
  return {
    id: newPlanId(),
    content: {
      completed: [],
      terms: ayTermCodes(upcomingAcademicYear()).map((term_code) => ({ term_code, courses: [] })),
      waived: [],
    },
    programIds: [],
    planName: name,
    serverPlanId: null,
    rev: 0,
  }
}

// Shape repair: localStorage (both keys) and the server can hold plans that
// are valid JSON but structurally wrong — every plan entering React state goes
// through here so one bad member can't white-screen the app. Salvage what
// exists, default the rest; a non-object "plan" is dropped entirely.
function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function repairContent(raw: unknown): PlanContent {
  const c =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const terms = (Array.isArray(c.terms) ? c.terms : [])
    .filter((t): t is Record<string, unknown> => {
      if (typeof t !== 'object' || t === null) return false
      const code = (t as { term_code?: unknown }).term_code
      // A numeric term_code (e.g. hand-edited JSON) is salvageable — coerce
      // below instead of dropping the whole term with its courses.
      return typeof code === 'string' || (typeof code === 'number' && Number.isFinite(code))
    })
    .map((t) => ({ term_code: String(t.term_code), courses: stringArray(t.courses) }))
  return { completed: stringArray(c.completed), terms, waived: stringArray(c.waived) }
}

function normalizePlan(raw: unknown): PlanState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newPlanId(),
    content: repairContent(r.content),
    programIds: Array.isArray(r.programIds)
      ? r.programIds.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      : [],
    planName:
      typeof r.planName === 'string' && r.planName.trim()
        ? r.planName.slice(0, MAX_PLAN_NAME)
        : 'My Plan',
    serverPlanId: typeof r.serverPlanId === 'number' ? r.serverPlanId : null,
    rev: typeof r.rev === 'number' && Number.isFinite(r.rev) && r.rev > 0 ? r.rev : 0,
  }
}

function normalizePlans(raw: unknown[]): PlanState[] {
  const out: PlanState[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const p = normalizePlan(item)
    if (p && !seen.has(p.id)) {
      seen.add(p.id)
      out.push(p)
    }
  }
  return out
}

const MAX_TOMBSTONES = 100

function normalizeDeleted(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string').slice(-MAX_TOMBSTONES)
    : []
}

// Union of tombstone lists, own order first, capped to the newest entries.
function mergeDeleted(own: string[], incoming: string[]): string[] {
  if (incoming.length === 0) return own
  const seen = new Set(own)
  const out = [...own]
  for (const id of incoming) {
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out.slice(-MAX_TOMBSTONES)
}

function hasWork(p: PlanState): boolean {
  return (
    p.content.completed.length > 0 ||
    p.content.terms.some((t) => t.courses.length > 0) ||
    p.programIds.length > 0
  )
}

function loadPlans(): PlansState {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PlansState
      if (Array.isArray(parsed?.plans)) {
        const deleted = normalizeDeleted(parsed.deleted)
        const dead = new Set(deleted)
        const plans = normalizePlans(parsed.plans).filter((p) => !dead.has(p.id))
        if (plans.length > 0) {
          const active = plans.some((p) => p.id === parsed.activeId)
            ? parsed.activeId
            : plans[0].id
          return { plans, activeId: active, deleted }
        }
      }
    }
  } catch {
    /* corrupted v2 state: fall through */
  }
  // One-time migration: wrap the legacy single plan as the first plan.
  try {
    const raw = localStorage.getItem(LEGACY_PLAN_KEY)
    if (raw) {
      const plan = normalizePlan(JSON.parse(raw))
      if (plan) return { plans: [plan], activeId: plan.id, deleted: [] }
    }
  } catch {
    /* corrupted legacy plan: start fresh */
  }
  const plan = freshPlan('My Plan')
  return { plans: [plan], activeId: plan.id, deleted: [] }
}

function sortTerms(terms: { term_code: string; courses: string[] }[]) {
  return [...terms].sort((a, b) => parseInt(a.term_code, 10) - parseInt(b.term_code, 10))
}

// Serialized server payload per plan, used to skip no-op PUTs.
function pushPayload(p: PlanState): string {
  return JSON.stringify({ name: p.planName, programIds: p.programIds, content: p.content })
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlansState>(loadPlans)
  const [email, setEmail] = useState<string | null>(authedEmail())
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationFailed, setValidationFailed] = useState(false)
  const [dormant, setDormant] = useState<Set<string>>(new Set())

  const active = state.plans.find((p) => p.id === state.activeId) ?? state.plans[0]

  // Refs so flush() (also called from beforeunload) sees current values.
  const stateRef = useRef(state)
  stateRef.current = state
  const emailRef = useRef(email)
  emailRef.current = email
  // planId -> last payload pushed to (or loaded from) the server.
  const pushedRef = useRef(new Map<string, string>())
  // Plan ids with a POST /plans in flight: flush ticks, createPlan and the
  // deleted-last reseed can overlap, and a plan must never be created twice.
  const creatingRef = useRef(new Set<string>())
  // planId -> payload currently in a PUT, so a slow PUT isn't re-sent.
  const puttingRef = useRef(new Map<string, string>())
  // signIn owns the server plan list while it merges; flush must not race it.
  const signingInRef = useRef(false)
  // Server-identity ownership: flush may POST-create a serverless plan ONLY
  // if this tab made it serverless (createPlan, deleted-last reseed, a
  // signed-in reload with unsynced plans, a failed import at sign-in). Plans
  // adopted from another tab's storage write — including plans whose null
  // serverPlanId arrived via a sign-out elsewhere — are that tab's to create;
  // creating them here too duplicated the whole plan set (pass-2 R1).
  const mayCreateRef = useRef(new Set<string>())
  // Set while another tab is mid-sign-in (its email write arrived, its plans
  // write hasn't): that tab's next plans write is the authoritative
  // post-merge list and REPLACES local state instead of union-merging.
  const adoptingRef = useRef(false)
  const adoptTimerRef = useRef<number | null>(null)
  // Plans whose last server write failed — drives the "not saved" indicator.
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set())
  const markSave = useCallback((id: string, ok: boolean) => {
    setFailedIds((prev) => {
      if (prev.has(id) !== ok) return prev // already in the right state
      const next = new Set(prev)
      if (ok) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    api.dormant().then((d) => setDormant(new Set(d.codes))).catch(() => {})
  }, [])

  // Plans loaded from localStorage while signed in that lack a server id
  // (offline creation before a reload, an earlier failed POST) are ours to
  // create. Signed out this stays empty — after a sign-out elsewhere, a
  // reloaded tab must not re-create the whole nulled plan set at re-sign-in.
  useEffect(() => {
    if (!authedEmail()) return
    for (const p of stateRef.current.plans) {
      if (p.serverPlanId == null) mayCreateRef.current.add(p.id)
    }
  }, [])

  // The legacy key has been absorbed into the v2 state by now; drop it so
  // stale single-plan data can't shadow future edits.
  useEffect(() => {
    localStorage.removeItem(LEGACY_PLAN_KEY)
  }, [])

  // Persist locally on every change.
  useEffect(() => {
    try {
      localStorage.setItem(PLANS_KEY, JSON.stringify(state))
    } catch {
      /* storage full/unavailable: in-memory state still applies */
    }
  }, [state])

  // Cross-tab merge. `storage` fires only in OTHER tabs, so this never sees
  // this tab's own writes. Per plan (matched by client id, falling back to
  // serverPlanId so a sign-in remap elsewhere doesn't duplicate a plan we
  // already track), the higher-`rev` copy wins — a whole-list write from one
  // tab can't revert a plan it didn't edit (pass-2 R3); ties go to the
  // incoming (newer) write. Server identity is merged separately: a known
  // serverPlanId is kept over null so a stale broadcast can't strip a plan's
  // link and bait flush into re-creating it. Keep OUR active selection, and
  // return the unchanged state when the merge is a no-op so the two tabs
  // don't ping-pong persist writes at each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PLANS_KEY || !e.newValue) return
      let incoming: PlanState[] = []
      let incomingDeleted: string[] = []
      try {
        const parsed = JSON.parse(e.newValue) as { plans?: unknown[]; deleted?: unknown }
        if (Array.isArray(parsed?.plans)) incoming = normalizePlans(parsed.plans)
        incomingDeleted = normalizeDeleted(parsed?.deleted)
      } catch {
        return /* another tab wrote junk: keep our state */
      }
      if (incoming.length === 0) return
      // Another tab just signed in: its first post-sign-in write (recognized
      // by carrying server ids) is the freshly reconciled server truth.
      // Union-merging our pre-sign-in copies against its remapped ids would
      // duplicate every plan (pass-2 R1) — its list is the base, but per plan
      // OUR copy still wins on higher rev: an edit made here during the
      // sign-in window must not be silently discarded (pass-3 C3-1). Flush
      // then pushes the surviving newer copy over the server one.
      if (adoptingRef.current && incoming.some((p) => p.serverPlanId != null)) {
        adoptingRef.current = false
        if (adoptTimerRef.current != null) {
          clearTimeout(adoptTimerRef.current)
          adoptTimerRef.current = null
        }
        pushedRef.current = new Map(incoming.map((p) => [p.id, pushPayload(p)]))
        setFailedIds(new Set())
        setState((s) => {
          const deleted = mergeDeleted(s.deleted, incomingDeleted)
          const dead = new Set(deleted)
          const ownById = new Map(s.plans.map((p) => [p.id, p]))
          const plans: PlanState[] = []
          for (const inc of incoming) {
            if (dead.has(inc.id)) continue
            const own = ownById.get(inc.id)
            plans.push(
              own && own.rev > inc.rev
                ? { ...own, serverPlanId: inc.serverPlanId ?? own.serverPlanId }
                : inc,
            )
          }
          // Keep serverless plans THIS tab created (mayCreateRef) that the
          // sign-in didn't see; flush will create them. Everything else
          // defers to the adopted list.
          const ids = new Set(plans.map((p) => p.id))
          for (const p of s.plans) {
            if (
              !ids.has(p.id) &&
              !dead.has(p.id) &&
              p.serverPlanId == null &&
              mayCreateRef.current.has(p.id)
            ) {
              plans.push(p)
            }
          }
          mayCreateRef.current = new Set(
            plans
              .filter((p) => p.serverPlanId == null && mayCreateRef.current.has(p.id))
              .map((p) => p.id),
          )
          if (plans.length === 0) {
            const seed = freshPlan('My Plan')
            mayCreateRef.current.add(seed.id)
            plans.push(seed)
          }
          const activeId = plans.some((p) => p.id === s.activeId) ? s.activeId : plans[0].id
          return { plans, activeId, deleted }
        })
        return
      }
      setState((s) => {
        const deleted = mergeDeleted(s.deleted, incomingDeleted)
        const dead = new Set(deleted)
        const ownById = new Map(s.plans.map((p) => [p.id, p]))
        const ownByServerId = new Map<number, PlanState>()
        for (const p of s.plans) if (p.serverPlanId != null) ownByServerId.set(p.serverPlanId, p)
        const matched = new Set<string>()
        const merged: PlanState[] = []
        for (const inc of incoming) {
          if (dead.has(inc.id)) continue
          const own =
            ownById.get(inc.id) ??
            (inc.serverPlanId != null ? ownByServerId.get(inc.serverPlanId) : undefined)
          if (!own) {
            // Brand-new to us: adopt it. Not added to mayCreateRef — if it
            // has no server id yet, the originating tab owns the create.
            merged.push(inc)
            continue
          }
          matched.add(own.id)
          const winner = inc.rev >= own.rev ? inc : own
          const other = winner === inc ? own : inc
          merged.push({ ...winner, id: inc.id, serverPlanId: winner.serverPlanId ?? other.serverPlanId })
        }
        for (const p of s.plans) if (!matched.has(p.id) && !dead.has(p.id)) merged.push(p)
        if (merged.length === 0) {
          // Every plan we knew was deleted elsewhere: reseed, never zero.
          const seed = freshPlan('My Plan')
          mayCreateRef.current.add(seed.id)
          merged.push(seed)
        }
        let activeId = s.activeId
        if (!merged.some((p) => p.id === activeId)) {
          const prev = ownById.get(s.activeId)
          const renamed =
            prev?.serverPlanId != null
              ? merged.find((p) => p.serverPlanId === prev.serverPlanId)
              : undefined
          activeId = renamed?.id ?? merged[0].id
        }
        const next = { plans: merged, activeId, deleted }
        return JSON.stringify(next) === JSON.stringify(s) ? s : next
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Auth broadcast: sign-out/sign-in in one tab signs the others out/in too.
  // On a remote sign-out, disarm sync and null the server links locally (the
  // account may even be gone); on a remote sign-in, hold flush until that
  // tab's reconciled plan list arrives (adoption above) — with a fallback
  // timer so a tab closed mid-sign-in can't wedge sync here forever.
  useEffect(() => {
    const onAuth = (e: StorageEvent) => {
      if (e.key !== EMAIL_KEY) return
      if (adoptTimerRef.current != null) {
        clearTimeout(adoptTimerRef.current)
        adoptTimerRef.current = null
      }
      if (!e.newValue) {
        adoptingRef.current = false
        setEmail(null)
        pushedRef.current.clear()
        mayCreateRef.current.clear()
        setFailedIds(new Set())
        setState((s) =>
          s.plans.some((p) => p.serverPlanId != null)
            ? { ...s, plans: s.plans.map((p) => ({ ...p, serverPlanId: null })) }
            : s,
        )
      } else {
        setEmail(e.newValue)
        adoptingRef.current = true
        adoptTimerRef.current = window.setTimeout(() => {
          adoptingRef.current = false
          adoptTimerRef.current = null
        }, 10_000)
      }
    }
    window.addEventListener('storage', onAuth)
    return () => window.removeEventListener('storage', onAuth)
  }, [])

  // Push dirty plans to the server. Fire-and-forget: the local copy holds
  // the truth when offline or the token expired. A plan without a server id
  // (deleted-last reseed, offline creation, an earlier failed POST) is
  // created here; "pushed" is recorded only after a request SUCCEEDS so a
  // transient failure is retried on the next tick instead of vanishing.
  const flush = useCallback(() => {
    if (!emailRef.current || signingInRef.current || adoptingRef.current) return
    for (const p of stateRef.current.plans) {
      const payload = pushPayload(p)
      if (p.serverPlanId == null) {
        // Only create plans THIS tab made serverless (see mayCreateRef).
        if (!mayCreateRef.current.has(p.id) || creatingRef.current.has(p.id)) continue
        creatingRef.current.add(p.id)
        api
          .createPlan(p.planName, p.programIds, p.content)
          .then((created) => {
            if (!stateRef.current.plans.some((x) => x.id === p.id)) {
              // Deleted while the create was in flight: roll the server copy
              // back or it would resurrect at the next sign-in (pass-2 R2).
              api.deletePlan(created.id).catch(() => {})
              return
            }
            pushedRef.current.set(p.id, payload)
            markSave(p.id, true)
            setState((s) => ({
              ...s,
              plans: s.plans.map((x) => (x.id === p.id ? { ...x, serverPlanId: created.id } : x)),
            }))
          })
          .catch(() => markSave(p.id, false))
          .finally(() => creatingRef.current.delete(p.id))
        continue
      }
      if (pushedRef.current.get(p.id) === payload) continue
      if (puttingRef.current.get(p.id) === payload) continue
      puttingRef.current.set(p.id, payload)
      api
        .updatePlan(p.serverPlanId, p.planName, p.programIds, p.content)
        .then(() => {
          pushedRef.current.set(p.id, payload)
          markSave(p.id, true)
        })
        .catch((err) => {
          // A 404 here is NOT proof the plan row is gone: PUT /plans/{id}
          // also 404s for "one or more programs not found" (checked BEFORE
          // the plan lookup) and "unknown university". Never destroy local
          // work on it — unlink instead, which stops the dead PUT loop (the
          // zombie of pass-3 C3-2) while keeping the user's plan. It is not
          // re-created in this session (mayCreateRef stays unarmed) so a plan
          // deleted on another device doesn't immediately resurrect, and the
          // honest "not saved" indicator stays up because it genuinely isn't.
          if (err instanceof ApiError && err.status === 404) {
            pushedRef.current.delete(p.id)
            setState((s) =>
              s.plans.some((x) => x.id === p.id && x.serverPlanId != null)
                ? {
                    ...s,
                    plans: s.plans.map((x) => (x.id === p.id ? { ...x, serverPlanId: null } : x)),
                  }
                : s,
            )
          }
          markSave(p.id, false) // retried on the next debounce tick
        })
        .finally(() => puttingRef.current.delete(p.id))
    }
  }, [markSave])

  // Debounced server sync (the local write above is immediate); flush on
  // unload so a quick edit-then-close isn't lost.
  useEffect(() => {
    if (!email) return
    const t = setTimeout(flush, 500)
    return () => clearTimeout(t)
  }, [state, email, flush])
  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [flush])

  // Re-validate (debounced) whenever the active plan or programs change;
  // clear stale results immediately on switch so no cross-plan bleed. The
  // generation counter guards the in-flight request too: a slow response
  // computed for plan A must never land after the user switched to plan B.
  const validateGen = useRef(0)
  useEffect(() => {
    const gen = ++validateGen.current
    const t = setTimeout(() => {
      setValidating(true)
      api
        .validate(active.content, active.programIds)
        .then((v) => {
          if (validateGen.current !== gen) return
          setValidation(v)
          setValidationFailed(false)
        })
        .catch(() => {
          if (validateGen.current !== gen) return
          // "Couldn't check" is a distinct state: a failed validate must not
          // render as a clean bill of health (pass-2 R4).
          setValidation(null)
          setValidationFailed(true)
        })
        .finally(() => validateGen.current === gen && setValidating(false))
    }, 350)
    return () => clearTimeout(t)
  }, [active.content, active.programIds])
  useEffect(() => {
    setValidation(null)
    setValidationFailed(false)
  }, [state.activeId])

  // Update the ACTIVE plan in place, bumping its revision when it changed —
  // the cross-tab merge relies on `rev` to keep local edits over stale
  // broadcast copies.
  const update = useCallback(
    (fn: (p: PlanState) => PlanState) =>
      setState((s) => ({
        ...s,
        plans: s.plans.map((p) => {
          if (p.id !== s.activeId) return p
          const next = fn(p)
          return next === p ? p : { ...next, rev: p.rev + 1 }
        }),
      })),
    [],
  )

  const store: Store = useMemo(
    () => ({
      content: active.content,
      programIds: active.programIds,
      planName: active.planName,
      serverPlanId: active.serverPlanId,
      email,
      validation,
      validating,
      validationFailed,
      dormant,
      saveFailed: failedIds.has(active.id),
      plans: state.plans,
      activePlanId: active.id,
      setCompleted: (codes) =>
        update((s) => ({ ...s, content: { ...s.content, completed: codes } })),
      addCompleted: (code) =>
        update((s) =>
          s.content.completed.includes(code)
            ? s
            : { ...s, content: { ...s.content, completed: [...s.content.completed, code] } },
        ),
      addYear: (startYear) =>
        update((s) => {
          // Explicit year (gap-filling / leading add) or the AY after the
          // last one present (or the upcoming AY if the plan is empty).
          const years = s.content.terms.map((t) => academicYearOf(t.term_code))
          const target =
            startYear ?? (years.length ? Math.max(...years) + 1 : upcomingAcademicYear())
          const existing = new Set(s.content.terms.map((t) => t.term_code))
          const added = ayTermCodes(target)
            .filter((c) => !existing.has(c))
            .map((term_code) => ({ term_code, courses: [] }))
          return {
            ...s,
            content: { ...s.content, terms: sortTerms([...s.content.terms, ...added]) },
          }
        }),
      removeYear: (startYear) =>
        update((s) => ({
          ...s,
          content: {
            ...s.content,
            terms: s.content.terms.filter((t) => academicYearOf(t.term_code) !== startYear),
          },
        })),
      addCourse: (termCode, code) =>
        update((s) => {
          // A quarter cell can exist in the UI (its AY row is shown) without a
          // terms entry yet — materialize it on first add.
          const present = s.content.terms.some((t) => t.term_code === termCode)
          const terms = present
            ? s.content.terms
            : sortTerms([...s.content.terms, { term_code: termCode, courses: [] }])
          return {
            ...s,
            content: {
              ...s.content,
              terms: terms.map((t) =>
                t.term_code === termCode && !t.courses.includes(code)
                  ? { ...t, courses: [...t.courses, code] }
                  : t,
              ),
            },
          }
        }),
      removeCourse: (termCode, code) =>
        update((s) => ({
          ...s,
          content: {
            ...s.content,
            terms: s.content.terms.map((t) =>
              t.term_code === termCode
                ? { ...t, courses: t.courses.filter((c) => c !== code) }
                : t,
            ),
          },
        })),
      setPrograms: (ids) => update((s) => ({ ...s, programIds: ids })),
      toggleWaived: (code) =>
        update((s) => {
          const waived = s.content.waived.includes(code)
            ? s.content.waived.filter((c) => c !== code)
            : [...s.content.waived, code].slice(0, MAX_COMPLETED)
          return { ...s, content: { ...s.content, waived } }
        }),
      createPlan: (name, content) => {
        if (stateRef.current.plans.length >= MAX_PLANS) return null
        flush() // outgoing plan's pending edits push now, not post-switch
        const plan = freshPlan(name.trim().slice(0, MAX_PLAN_NAME) || 'My Plan')
        // Same repair path as anything loaded from storage or the server, so
        // a seeded plan can't carry a shape the rest of the store rejects.
        if (content) plan.content = repairContent(content)
        setState((s) => ({ ...s, plans: [...s.plans, plan], activeId: plan.id }))
        mayCreateRef.current.add(plan.id) // ours to (re)create server-side
        if (emailRef.current) {
          creatingRef.current.add(plan.id) // flush must not double-create it
          api
            .createPlan(plan.planName, plan.programIds, plan.content)
            .then((created) => {
              if (!stateRef.current.plans.some((p) => p.id === plan.id)) {
                // Deleted before the POST resolved: roll back the server copy
                // instead of orphaning it (pass-2 R2).
                api.deletePlan(created.id).catch(() => {})
                return
              }
              pushedRef.current.set(plan.id, pushPayload(plan))
              markSave(plan.id, true)
              setState((s) => ({
                ...s,
                plans: s.plans.map((p) =>
                  p.id === plan.id ? { ...p, serverPlanId: created.id } : p,
                ),
              }))
            })
            .catch(() => {
              // Offline or at the server cap: plan stays local for now and
              // the next flush retries the create.
              markSave(plan.id, false)
            })
            .finally(() => creatingRef.current.delete(plan.id))
        }
        return plan.id
      },
      switchPlan: (id) => {
        flush()
        setState((s) => (s.plans.some((p) => p.id === id) ? { ...s, activeId: id } : s))
      },
      renamePlan: (id, name) => {
        const trimmed = name.trim().slice(0, MAX_PLAN_NAME)
        if (!trimmed) return
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, planName: trimmed, rev: p.rev + 1 } : p,
          ),
        }))
        // The debounced flush picks up the rename (name is in the payload).
      },
      deletePlan: (id) => {
        const victim = stateRef.current.plans.find((p) => p.id === id)
        if (victim?.serverPlanId != null && emailRef.current) {
          api.deletePlan(victim.serverPlanId).catch(() => {})
        }
        pushedRef.current.delete(id)
        mayCreateRef.current.delete(id)
        markSave(id, true) // dead plan can't hold the "not saved" indicator
        setState((s) => {
          // Never zero plans. The reseeded plan has serverPlanId null, so the
          // next flush creates it server-side for signed-in users. The
          // tombstone makes the delete stick cross-tab (pass-3 C3-2).
          const deleted = s.plans.some((p) => p.id === id)
            ? mergeDeleted(s.deleted, [id])
            : s.deleted
          let plans = s.plans.filter((p) => p.id !== id)
          if (plans.length === 0) {
            const seed = freshPlan('My Plan')
            mayCreateRef.current.add(seed.id) // this tab owns the reseed create
            plans = [seed]
          }
          const activeId = s.activeId === id ? plans[0].id : s.activeId
          return { plans, activeId, deleted }
        })
      },
      signIn: async (newEmail, token, importLocal) => {
        setToken(token)
        setAuthedEmail(newEmail)
        setEmail(newEmail)
        signingInRef.current = true
        try {
          const local = stateRef.current
          let serverPlans: ServerPlan[]
          try {
            serverPlans = await api.listPlans()
          } catch (e) {
            // A failed list is an ERROR, not an empty account: importing the
            // local plans against unknown server state would duplicate every
            // plan. Revert the sign-in and surface the failure instead.
            setToken(null)
            setAuthedEmail(null)
            setEmail(null)
            throw e
          }
          // Server content passes through the same shape repair as local
          // state: an already-poisoned plan must not white-screen the app.
          // A server plan the local state already tracks (by serverPlanId)
          // keeps its existing client id, so other tabs can match it by id
          // instead of adopting a duplicate under a fresh id.
          const byServerId = new Map<number, PlanState>()
          for (const p of local.plans) {
            if (p.serverPlanId != null && !byServerId.has(p.serverPlanId)) {
              byServerId.set(p.serverPlanId, p)
            }
          }
          const merged: PlanState[] = serverPlans.map((sp) => {
            const prior = byServerId.get(sp.id)
            return normalizePlan({
              id: prior?.id ?? newPlanId(),
              rev: prior?.rev ?? 0,
              content: sp.content,
              programIds: sp.program_ids,
              planName: sp.name,
              serverPlanId: sp.id,
            }) as PlanState // input is an object, so never null
          })
          // Import local anonymous plans: all of them into an empty account,
          // otherwise (register-with-work flow) only the ones holding work.
          const toImport =
            serverPlans.length === 0 ? local.plans : importLocal ? local.plans.filter(hasWork) : []
          const mergedIds = new Set(merged.map((p) => p.id))
          for (const lp of toImport) {
            if (merged.length >= MAX_PLANS) break
            if (mergedIds.has(lp.id)) continue // already tracked via serverPlanId
            const created = await api
              .createPlan(lp.planName, lp.programIds, lp.content)
              .catch(() => null)
            merged.push({ ...lp, serverPlanId: created?.id ?? null })
          }
          pushedRef.current = new Map(merged.map((p) => [p.id, pushPayload(p)]))
          // Failed imports stay ours to create; everything else has an owner.
          mayCreateRef.current = new Set(
            merged.filter((p) => p.serverPlanId == null).map((p) => p.id),
          )
          // A plan deleted mid-sign-in (another tab tombstoned it) must not
          // keep the server row this merge just created/loaded for it.
          const liveDead = new Set(stateRef.current.deleted)
          for (const m of merged) {
            if (liveDead.has(m.id) && m.serverPlanId != null) {
              api.deletePlan(m.serverPlanId).catch(() => {})
            }
          }
          // Commit against the LIVE state, not the pre-await snapshot: edits
          // that landed during listPlans/imports (in this tab, or in another
          // tab arriving via the storage merge) carry a higher rev and must
          // survive — flush then pushes them over the just-loaded server
          // copies (pass-3 C3-1).
          const snapshotIds = new Set(local.plans.map((p) => p.id))
          setState((s) => {
            const dead = new Set(s.deleted)
            const currentById = new Map(s.plans.map((p) => [p.id, p]))
            const plans: PlanState[] = []
            for (const m of merged) {
              if (dead.has(m.id)) continue
              const cur = currentById.get(m.id)
              plans.push(
                cur && cur.rev > m.rev
                  ? { ...cur, serverPlanId: m.serverPlanId ?? cur.serverPlanId }
                  : m,
              )
            }
            // Serverless plans born DURING the await (created here or adopted
            // from another tab) stay tracked by their owning tab; keep them.
            // Snapshot plans the import policy dropped stay dropped.
            const ids = new Set(plans.map((p) => p.id))
            for (const p of s.plans) {
              if (
                !ids.has(p.id) &&
                !dead.has(p.id) &&
                !snapshotIds.has(p.id) &&
                p.serverPlanId == null
              ) {
                plans.push(p)
              }
            }
            if (plans.length === 0) {
              const seed = freshPlan('My Plan')
              mayCreateRef.current.add(seed.id)
              plans.push(seed)
            }
            // Keep the user's current plan active if it survived the merge.
            const activeId = plans.some((p) => p.id === s.activeId) ? s.activeId : plans[0].id
            return { plans, activeId, deleted: s.deleted }
          })
        } finally {
          signingInRef.current = false
        }
      },
      signOut: () => {
        api.logout().catch(() => {})
        setToken(null)
        setAuthedEmail(null)
        setEmail(null)
        pushedRef.current.clear()
        mayCreateRef.current.clear()
        setFailedIds(new Set())
        // Keep local copies of every plan; they are anonymous again.
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) => ({ ...p, serverPlanId: null })),
        }))
      },
      accountDeleted: () => {
        setToken(null)
        setAuthedEmail(null)
        setEmail(null)
        pushedRef.current.clear()
        mayCreateRef.current.clear()
        setFailedIds(new Set())
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) => ({ ...p, serverPlanId: null })),
        }))
      },
    }),
    [state, active, email, validation, validating, validationFailed, dormant, failedIds, update, flush, markSave],
  )

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
