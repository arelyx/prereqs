import { useState } from 'react'
import { api } from './api'
import AuthModal from './components/AuthModal'
import CoursePanel from './components/CoursePanel'
import CourseSearch from './components/CourseSearch'
import GEPanel from './components/GEPanel'
import Planner from './components/Planner'
import ProgramRequirements from './components/ProgramRequirements'
import { ProgramInfoPanels, ProgramPicker } from './components/ProgramsSidebar'
import { StoreProvider, useStore } from './store'

function NavBar({ onAuth }: { onAuth: () => void }) {
  const store = useStore()
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-black tracking-tight text-slate-900">prereqs</h1>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
            UC Santa Cruz
          </span>
        </div>
        {store.email ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{store.email}</span>
            <button className="text-slate-500 hover:underline" onClick={store.signOut}>
              sign out
            </button>
            <button
              className="text-red-500 hover:underline"
              onClick={() => {
                if (confirm('Delete your account and all saved plans? This cannot be undone.')) {
                  api.deleteAccount().then(store.accountDeleted).catch(() => {})
                }
              }}
            >
              delete account
            </button>
          </div>
        ) : (
          <button
            onClick={onAuth}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Sign in to save your plan
          </button>
        )}
      </div>
    </header>
  )
}

function Dashboard() {
  const [openCourse, setOpenCourse] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const store = useStore()
  const errorCount =
    store.validation?.issues.filter((i) => i.severity === 'error').length ?? 0

  return (
    <div className="min-h-screen">
      <NavBar onAuth={() => setAuthOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex items-center gap-4">
          <div className="w-96">
            <CourseSearch
              placeholder="Explore any course (e.g. CSE 101)…"
              onSelect={(c) => setOpenCourse(c.code)}
            />
          </div>
          {store.validating ? (
            <span className="text-xs text-slate-400">checking plan…</span>
          ) : errorCount > 0 ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {errorCount} blocking issue{errorCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              plan looks valid
            </span>
          )}
        </div>

        {/* Single column below xl, ordered: planner/GE → program picker →
            requirements → general info, so "add a program" isn't buried
            under the requirement blocks on mobile. On xl the picker + info
            regroup into the right-hand sidebar (the wrapper is
            display:contents on mobile so its children join the grid). */}
        {/* rows-[auto_1fr]: the row-spanning sidebar's extra height must land
            in row 2, not inflate row 1 and open a gap under the GE panel. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px] xl:grid-rows-[auto_1fr]">
          <div className="order-1 space-y-4 xl:col-start-1 xl:row-start-1">
            <Planner onOpenCourse={setOpenCourse} />
            <GEPanel onOpenCourse={setOpenCourse} />
          </div>
          <div className="order-3 space-y-4 xl:col-start-1 xl:row-start-2">
            <ProgramRequirements onOpenCourse={setOpenCourse} />
          </div>
          <div className="contents xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:block">
            <div className="order-2">
              <ProgramPicker />
            </div>
            <div className="order-4 space-y-3 xl:mt-3">
              <ProgramInfoPanels />
            </div>
          </div>
        </div>
      </main>

      {openCourse && (
        <CoursePanel
          code={openCourse}
          onClose={() => setOpenCourse(null)}
          onOpenCourse={setOpenCourse}
        />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  )
}
