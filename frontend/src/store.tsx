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
import type { PlanContent, ValidationResult } from './api'
import { academicYearOf, ayTermCodes, upcomingAcademicYear } from './terms'

// v2 key holds { plans: [...], activeId }. The legacy single-plan key
// ('prereqs.plan') is read once as a migration source and then deleted after
// the first successful v2 write (removal happens in a mount effect, not in
// the state initializer — StrictMode double-invokes initializers).
const PLANS_KEY = 'prereqs.plans.v2'
const LEGACY_PLAN_KEY = 'prereqs.plan'

// Mirrors the backend cap (backend/app/api/plans.py MAX_PLANS).
export const MAX_PLANS = 20

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
      if (Array.isArray(parsed?.plans) && parsed.plans.length > 0) {
        const active = parsed.plans.some((p) => p.id === parsed.activeId)
          ? parsed.activeId
          : parsed.plans[0].id
        return { plans: parsed.plans, activeId: active }
      }
    }
  } catch {
    /* corrupted v2 state: fall through */
  }
  // One-time migration: wrap the legacy single plan as the first plan.
  try {
    const raw = localStorage.getItem(LEGACY_PLAN_KEY)
    if (raw) {
      const legacy = JSON.parse(raw)
      if (legacy?.content) {
        const plan: PlanState = {
          id: newPlanId(),
          content: legacy.content,
          programIds: legacy.programIds ?? [],
          planName: legacy.planName ?? 'My Plan',
          serverPlanId: legacy.serverPlanId ?? null,
        }
        return { plans: [plan], activeId: plan.id }
      }
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

  // Push dirty plans to the server. Fire-and-forget: the local copy holds
  // the truth when offline or the token expired.
  const flush = useCallback(() => {
    if (!emailRef.current) return
    for (const p of stateRef.current.plans) {
      if (p.serverPlanId == null) continue
      const payload = pushPayload(p)
      if (pushedRef.current.get(p.id) === payload) continue
      pushedRef.current.set(p.id, payload)
      api.updatePlan(p.serverPlanId, p.planName, p.programIds, p.content).catch(() => {})
    }
  }, [])

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
  // clear stale results immediately on switch so no cross-plan bleed.
  useEffect(() => {
    const t = setTimeout(() => {
      setValidating(true)
      api
        .validate(active.content, active.programIds)
        .then(setValidation)
        .catch(() => setValidation(null))
        .finally(() => setValidating(false))
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
        const plan = freshPlan(name.trim() || 'My Plan')
        setState((s) => ({ plans: [...s.plans, plan], activeId: plan.id }))
        if (emailRef.current) {
          api
            .createPlan(plan.planName, plan.programIds, plan.content)
            .then((created) => {
              pushedRef.current.set(plan.id, pushPayload(plan))
              setState((s) => ({
                ...s,
                plans: s.plans.map((p) =>
                  p.id === plan.id ? { ...p, serverPlanId: created.id } : p,
                ),
              }))
            })
            .catch(() => {
              /* offline or at server cap: plan stays local-only */
            })
        }
        return plan.id
      },
      switchPlan: (id) => {
        flush()
        setState((s) => (s.plans.some((p) => p.id === id) ? { ...s, activeId: id } : s))
      },
      renamePlan: (id, name) => {
        const trimmed = name.trim()
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
        setState((s) => {
          let plans = s.plans.filter((p) => p.id !== id)
          if (plans.length === 0) plans = [freshPlan('My Plan')] // never zero plans
          const activeId = s.activeId === id ? plans[0].id : s.activeId
          return { plans, activeId }
        })
      },
      signIn: async (newEmail, token, importLocal) => {
        setToken(token)
        setAuthedEmail(newEmail)
        setEmail(newEmail)
        const local = stateRef.current
        const serverPlans = await api.listPlans().catch(() => [])
        const merged: PlanState[] = serverPlans.map((sp) => ({
          id: newPlanId(),
          content: sp.content,
          programIds: sp.program_ids,
          planName: sp.name,
          serverPlanId: sp.id,
        }))
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
      },
      signOut: () => {
        api.logout().catch(() => {})
        setToken(null)
        setAuthedEmail(null)
        setEmail(null)
        pushedRef.current.clear()
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
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) => ({ ...p, serverPlanId: null })),
        }))
      },
    }),
    [state, active, email, validation, validating, dormant, update, flush],
  )

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
