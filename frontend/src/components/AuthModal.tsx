import { useState } from 'react'
import { api, ApiError } from '../api'
import { useStore } from '../store'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasLocalWork =
    store.content.completed.length > 0 || store.content.terms.some((t) => t.courses.length > 0)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res =
        mode === 'register'
          ? await api.register(email, password)
          : await api.login(email, password)
      // Registering (or logging into an empty account) imports the local plan
      // so no anonymous work is lost.
      await store.signIn(res.email, res.token, mode === 'register' && hasLocalWork)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold">
          {mode === 'register' ? 'Create an account' : 'Sign in'}
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          {mode === 'register'
            ? hasLocalWork
              ? 'Your current plan will be saved to your new account.'
              : 'Save your plan and access it anywhere.'
            : 'Welcome back.'}
        </p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <input
            type="email"
            required
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="password (min 8 chars — no recovery yet, don't forget it!)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-sky-600 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? '…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button
          className="mt-2 w-full text-center text-xs text-slate-500 hover:underline"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        >
          {mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  )
}
