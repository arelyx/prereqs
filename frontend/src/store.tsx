// Plan + auth state. The plan lives in localStorage in exactly the shape the
// backend stores/validates, so the anonymous mode and the server mode are the
// same data with different persistence. On sign-in, a local plan can be
// imported to the server; while signed in, saves go to the server AND the
// local copy (offline-friendly).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, authedEmail, setAuthedEmail, setToken } from './api'
import type { PlanContent, ValidationResult } from './api'
import { currentTermCode, nextTermCode } from './terms'

const PLAN_KEY = 'prereqs.plan'

interface PlanState {
  content: PlanContent
  programIds: number[]
  planName: string
  serverPlanId: number | null
}

interface Store extends PlanState {
  email: string | null
  validation: ValidationResult | null
  validating: boolean
  setCompleted: (codes: string[]) => void
  addCompleted: (code: string) => void
  addTerm: () => void
  removeTerm: (termCode: string) => void
  addCourse: (termCode: string, code: string) => void
  removeCourse: (termCode: string, code: string) => void
  setPrograms: (ids: number[]) => void
  signIn: (email: string, token: string, importLocal: boolean) => Promise<void>
  signOut: () => void
  accountDeleted: () => void
}

const StoreCtx = createContext<Store | null>(null)

function loadLocal(): PlanState {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* corrupted local plan: start fresh */
  }
  const first = nextTermCode(currentTermCode())
  return {
    content: { completed: [], terms: [{ term_code: first, courses: [] }] },
    programIds: [],
    planName: 'My Plan',
    serverPlanId: null,
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlanState>(loadLocal)
  const [email, setEmail] = useState<string | null>(authedEmail())
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)

  // Persist locally on every change; push to server when signed in.
  useEffect(() => {
    localStorage.setItem(PLAN_KEY, JSON.stringify(state))
    if (email && state.serverPlanId != null) {
      api
        .updatePlan(state.serverPlanId, state.planName, state.programIds, state.content)
        .catch(() => {
          /* offline or expired token: local copy still holds the truth */
        })
    }
  }, [state, email])

  // Re-validate (debounced) whenever the plan or programs change.
  useEffect(() => {
    const t = setTimeout(() => {
      setValidating(true)
      api
        .validate(state.content, state.programIds)
        .then(setValidation)
        .catch(() => setValidation(null))
        .finally(() => setValidating(false))
    }, 350)
    return () => clearTimeout(t)
  }, [state.content, state.programIds])

  const update = useCallback((fn: (s: PlanState) => PlanState) => setState((s) => fn(s)), [])

  const store: Store = useMemo(
    () => ({
      ...state,
      email,
      validation,
      validating,
      setCompleted: (codes) =>
        update((s) => ({ ...s, content: { ...s.content, completed: codes } })),
      addCompleted: (code) =>
        update((s) =>
          s.content.completed.includes(code)
            ? s
            : { ...s, content: { ...s.content, completed: [...s.content.completed, code] } },
        ),
      addTerm: () =>
        update((s) => {
          const last = s.content.terms[s.content.terms.length - 1]
          const next = nextTermCode(last ? last.term_code : currentTermCode())
          return {
            ...s,
            content: {
              ...s.content,
              terms: [...s.content.terms, { term_code: next, courses: [] }],
            },
          }
        }),
      removeTerm: (termCode) =>
        update((s) => ({
          ...s,
          content: {
            ...s.content,
            terms: s.content.terms.filter((t) => t.term_code !== termCode),
          },
        })),
      addCourse: (termCode, code) =>
        update((s) => ({
          ...s,
          content: {
            ...s.content,
            terms: s.content.terms.map((t) =>
              t.term_code === termCode && !t.courses.includes(code)
                ? { ...t, courses: [...t.courses, code] }
                : t,
            ),
          },
        })),
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
      signIn: async (newEmail, token, importLocal) => {
        setToken(token)
        setAuthedEmail(newEmail)
        setEmail(newEmail)
        const plans = await api.listPlans().catch(() => [])
        if (importLocal || plans.length === 0) {
          const created = await api.createPlan(state.planName, state.programIds, state.content)
          update((s) => ({ ...s, serverPlanId: created.id }))
        } else {
          const p = plans[0]
          setState({
            content: p.content,
            programIds: p.program_ids,
            planName: p.name,
            serverPlanId: p.id,
          })
        }
      },
      signOut: () => {
        api.logout().catch(() => {})
        setToken(null)
        setAuthedEmail(null)
        setEmail(null)
        update((s) => ({ ...s, serverPlanId: null }))
      },
      accountDeleted: () => {
        setToken(null)
        setAuthedEmail(null)
        setEmail(null)
        update((s) => ({ ...s, serverPlanId: null }))
      },
    }),
    [state, email, validation, validating, update],
  )

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
