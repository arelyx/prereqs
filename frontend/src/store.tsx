// Multi-plan + auth state. All plans live in localStorage in exactly the
// shape the backend stores/validates, so the anonymous mode and the server
// mode are the same data with different persistence. On sign-in, local plans
// can be imported to the server; while signed in, saves go to the server AND
// the local copy (offline-friendly). The store context still exposes the
// ACTIVE plan's content/programIds/planName plus the same mutators, so plan
// consumers (planner, GE panel, requirements…) are unaware of multi-plan.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, authedEmail, setAuthedEmail, setToken } from './api'
import type { PlanContent, ServerPlan, ValidationResult } from './api'
import { academicYearOf, ayTermCodes, upcomingAcademicYear } from './terms'

// v2 key holds { plans: [...], activeId }. The legacy single-plan key
// ('prereqs.plan') is read once as a migration source and then deleted after
// the first successful v2 write (removal happens in a mount effect, not in
// the state initializer — StrictMode double-invokes initializers).
const PLANS_KEY = 'prereqs.plans.v2'
const LEGACY_PLAN_KEY = 'prereqs.plan'

// Mirror the backend caps (backend/app/api/plans.py MAX_PLANS / PlanIn.name):
// a name over 128 chars would 422 on every save, silently orphaning the plan.
export const MAX_PLANS = 20
export const MAX_PLAN_NAME = 128

export interface PlanState {
  id: string // client-local id, stable across sessions and sign-in/out
  content: PlanContent
  programIds: number[]
  planName: string
  serverPlanId: number | null
}

interface PlansState {
  plans: PlanState[]
  activeId: string
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
  signIn: (email: string, token: string, importLocal: boolean) => Promise<void>
  signOut: () => void
  accountDeleted: () => void
  // Multi-plan surface.
  plans: PlanState[]
  activePlanId: string
  createPlan: (name: string) => string | null // new plan id, or null at the cap
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
    },
    programIds: [],
    planName: name,
    serverPlanId: null,
  }
}

// Shape repair: localStorage (both keys) and the server can hold plans that
// are valid JSON but structurally wrong — every plan entering React state goes
// through here so one bad member can't white-screen the app. Salvage what
// exists, default the rest; a non-object "plan" is dropped entirely.
function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function normalizePlan(raw: unknown): PlanState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const c =
    typeof r.content === 'object' && r.content !== null && !Array.isArray(r.content)
      ? (r.content as Record<string, unknown>)
      : {}
  const terms = (Array.isArray(c.terms) ? c.terms : [])
    .filter(
      (t): t is Record<string, unknown> =>
        typeof t === 'object' && t !== null && typeof (t as { term_code?: unknown }).term_code === 'string',
    )
    .map((t) => ({ term_code: t.term_code as string, courses: stringArray(t.courses) }))
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newPlanId(),
    content: { completed: stringArray(c.completed), terms },
    programIds: Array.isArray(r.programIds)
      ? r.programIds.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      : [],
    planName:
      typeof r.planName === 'string' && r.planName.trim()
        ? r.planName.slice(0, MAX_PLAN_NAME)
        : 'My Plan',
    serverPlanId: typeof r.serverPlanId === 'number' ? r.serverPlanId : null,
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
        const plans = normalizePlans(parsed.plans)
        if (plans.length > 0) {
          const active = plans.some((p) => p.id === parsed.activeId)
            ? parsed.activeId
            : plans[0].id
          return { plans, activeId: active }
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
      if (plan) return { plans: [plan], activeId: plan.id }
    }
  } catch {
    /* corrupted legacy plan: start fresh */
  }
  const plan = freshPlan('My Plan')
  return { plans: [plan], activeId: plan.id }
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
  // Plans adopted from another tab before THAT tab's POST resolved: creating
  // them here too would duplicate them server-side. The other tab owns the
  // create; the marker clears when its storage write carries the server id.
  const otherTabOwnsRef = useRef(new Set<string>())
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
  // this tab's own writes: union the plan lists by id with the incoming
  // (newer) write winning per plan, and keep OUR active selection. Returning
  // the unchanged state when the merge is a no-op stops the two tabs from
  // ping-ponging persist writes at each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PLANS_KEY || !e.newValue) return
      let incoming: PlanState[] = []
      try {
        const parsed = JSON.parse(e.newValue) as { plans?: unknown[] }
        if (Array.isArray(parsed?.plans)) incoming = normalizePlans(parsed.plans)
      } catch {
        return /* another tab wrote junk: keep our state */
      }
      if (incoming.length === 0) return
      for (const p of incoming) {
        if (p.serverPlanId != null) otherTabOwnsRef.current.delete(p.id)
      }
      setState((s) => {
        const known = new Set(s.plans.map((p) => p.id))
        for (const p of incoming) {
          if (p.serverPlanId == null && !known.has(p.id)) otherTabOwnsRef.current.add(p.id)
        }
        const fromOther = new Set(incoming.map((p) => p.id))
        const merged = [...incoming, ...s.plans.filter((p) => !fromOther.has(p.id))]
        const activeId = merged.some((p) => p.id === s.activeId) ? s.activeId : merged[0].id
        const next = { plans: merged, activeId }
        return JSON.stringify(next) === JSON.stringify(s) ? s : next
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Push dirty plans to the server. Fire-and-forget: the local copy holds
  // the truth when offline or the token expired. A plan without a server id
  // (deleted-last reseed, offline creation, an earlier failed POST) is
  // created here; "pushed" is recorded only after a request SUCCEEDS so a
  // transient failure is retried on the next tick instead of vanishing.
  const flush = useCallback(() => {
    if (!emailRef.current || signingInRef.current) return
    for (const p of stateRef.current.plans) {
      const payload = pushPayload(p)
      if (p.serverPlanId == null) {
        if (creatingRef.current.has(p.id) || otherTabOwnsRef.current.has(p.id)) continue
        creatingRef.current.add(p.id)
        api
          .createPlan(p.planName, p.programIds, p.content)
          .then((created) => {
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
        .catch(() => markSave(p.id, false)) // retried on the next debounce tick
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
        .then((v) => validateGen.current === gen && setValidation(v))
        .catch(() => validateGen.current === gen && setValidation(null))
        .finally(() => validateGen.current === gen && setValidating(false))
    }, 350)
    return () => clearTimeout(t)
  }, [active.content, active.programIds])
  useEffect(() => {
    setValidation(null)
  }, [state.activeId])

  // Update the ACTIVE plan in place.
  const update = useCallback(
    (fn: (p: PlanState) => PlanState) =>
      setState((s) => ({
        ...s,
        plans: s.plans.map((p) => (p.id === s.activeId ? fn(p) : p)),
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
      createPlan: (name) => {
        if (stateRef.current.plans.length >= MAX_PLANS) return null
        flush() // outgoing plan's pending edits push now, not post-switch
        const plan = freshPlan(name.trim().slice(0, MAX_PLAN_NAME) || 'My Plan')
        setState((s) => ({ plans: [...s.plans, plan], activeId: plan.id }))
        if (emailRef.current) {
          creatingRef.current.add(plan.id) // flush must not double-create it
          api
            .createPlan(plan.planName, plan.programIds, plan.content)
            .then((created) => {
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
          plans: s.plans.map((p) => (p.id === id ? { ...p, planName: trimmed } : p)),
        }))
        // The debounced flush picks up the rename (name is in the payload).
      },
      deletePlan: (id) => {
        const victim = stateRef.current.plans.find((p) => p.id === id)
        if (victim?.serverPlanId != null && emailRef.current) {
          api.deletePlan(victim.serverPlanId).catch(() => {})
        }
        pushedRef.current.delete(id)
        markSave(id, true) // dead plan can't hold the "not saved" indicator
        setState((s) => {
          // Never zero plans. The reseeded plan has serverPlanId null, so the
          // next flush creates it server-side for signed-in users.
          let plans = s.plans.filter((p) => p.id !== id)
          if (plans.length === 0) plans = [freshPlan('My Plan')]
          const activeId = s.activeId === id ? plans[0].id : s.activeId
          return { plans, activeId }
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
          const merged: PlanState[] = serverPlans.map(
            (sp) =>
              normalizePlan({
                id: newPlanId(),
                content: sp.content,
                programIds: sp.program_ids,
                planName: sp.name,
                serverPlanId: sp.id,
              }) as PlanState, // input is an object, so never null
          )
          // Import local anonymous plans: all of them into an empty account,
          // otherwise (register-with-work flow) only the ones holding work.
          const toImport =
            serverPlans.length === 0 ? local.plans : importLocal ? local.plans.filter(hasWork) : []
          for (const lp of toImport) {
            if (merged.length >= MAX_PLANS) break
            const created = await api
              .createPlan(lp.planName, lp.programIds, lp.content)
              .catch(() => null)
            merged.push({ ...lp, serverPlanId: created?.id ?? null })
          }
          pushedRef.current = new Map(merged.map((p) => [p.id, pushPayload(p)]))
          // Keep the user's current plan active if it survived the merge.
          const activeId = merged.some((p) => p.id === local.activeId)
            ? local.activeId
            : merged[0].id
          setState({ plans: merged, activeId })
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
        setFailedIds(new Set())
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) => ({ ...p, serverPlanId: null })),
        }))
      },
    }),
    [state, active, email, validation, validating, dormant, failedIds, update, flush, markSave],
  )

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
