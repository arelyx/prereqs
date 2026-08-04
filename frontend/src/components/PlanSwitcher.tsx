// Nav-bar plan switcher: shows the active plan, lists all plans, and hosts
// create / rename / delete. All confirmations are inline (no window.prompt /
// confirm — they block automation and clash with the zinc styling).

import { useEffect, useRef, useState } from 'react'
import { MAX_PLAN_NAME, MAX_PLANS, useStore } from '../store'

// A plan name should always be a non-empty string by the time it reaches
// render, but a rogue value must degrade to a label, not an empty button.
const planLabel = (name: unknown): string =>
  typeof name === 'string' && name.trim() ? name : 'Untitled plan'

export default function PlanSwitcher() {
  const store = useStore()
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const atCap = store.plans.length >= MAX_PLANS

  // Close on outside click / Escape; reset transient editor state.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  useEffect(() => {
    if (!open) {
      setRenamingId(null)
      setConfirmDeleteId(null)
      setCreating(false)
      setNewName('')
    }
  }, [open])

  const commitRename = () => {
    if (renamingId) store.renamePlan(renamingId, renameValue)
    setRenamingId(null)
  }

  const commitCreate = () => {
    const id = store.createPlan(newName.trim() || `Plan ${store.plans.length + 1}`)
    if (id) {
      setCreating(false)
      setNewName('')
      setOpen(false)
    }
  }

  return (
    <div className="relative flex items-center gap-2" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="switch plan"
        aria-expanded={open}
        className="flex max-w-48 items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="truncate">{planLabel(store.planName)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 text-zinc-400">
          <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {store.email && store.saveFailed && (
        <span
          title="Your latest changes could not be saved to your account. They are kept on this device and saving will be retried."
          className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-500"
        >
          not saved
        </span>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1 shadow-lg">
          <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Your plans
          </p>
          <ul>
            {store.plans.map((p) => (
              <li key={p.id} className="group flex items-center gap-1 px-1">
                {renamingId === p.id ? (
                  <form
                    className="flex-1 px-2 py-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      commitRename()
                    }}
                  >
                    <input
                      autoFocus
                      aria-label="plan name"
                      maxLength={MAX_PLAN_NAME}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-1.5 py-0.5 text-sm"
                    />
                  </form>
                ) : confirmDeleteId === p.id ? (
                  <div className="flex flex-1 items-center justify-between gap-2 px-2 py-1 text-sm">
                    <span className="truncate text-red-600 dark:text-red-400">
                      Delete “{planLabel(p.planName)}”?
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <button
                        className="font-medium text-red-600 dark:text-red-400 hover:underline"
                        onClick={() => {
                          store.deletePlan(p.id)
                          setConfirmDeleteId(null)
                        }}
                      >
                        delete
                      </button>
                      <button
                        className="text-zinc-500 hover:underline"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        keep
                      </button>
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        store.switchPlan(p.id)
                        setOpen(false)
                      }}
                      className={`flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                        p.id === store.activePlanId
                          ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          p.id === store.activePlanId ? 'bg-sky-500' : 'bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{planLabel(p.planName)}</span>
                    </button>
                    <button
                      aria-label={`rename plan ${planLabel(p.planName)}`}
                      title="Rename"
                      onClick={() => {
                        setConfirmDeleteId(null)
                        setRenamingId(p.id)
                        setRenameValue(planLabel(p.planName))
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M8.5 1.5 10.5 3.5 4 10 1.5 10.5 2 8 8.5 1.5Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </button>
                    <button
                      aria-label={`delete plan ${planLabel(p.planName)}`}
                      title="Delete"
                      onClick={() => {
                        setRenamingId(null)
                        setConfirmDeleteId(p.id)
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M2 2 10 10 M10 2 2 10" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-zinc-100 dark:border-zinc-900 px-1 pt-1">
            {atCap ? (
              <p className="px-2 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                Plan limit reached ({MAX_PLANS}) — delete a plan to add another.
              </p>
            ) : creating ? (
              <form
                className="flex items-center gap-1.5 px-2 py-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  commitCreate()
                }}
              >
                <input
                  autoFocus
                  aria-label="new plan name"
                  placeholder="New plan name…"
                  maxLength={MAX_PLAN_NAME}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-1.5 py-0.5 text-sm"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-sky-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-sky-500"
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-sky-700 dark:text-sky-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                + New plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
