// Last-resort guard: a render crash must degrade to a plain "reload" screen,
// never a blank page. Anything reaching this boundary is a bug — the store
// normalizes persisted state on load precisely so this stays unreachable.

import { Component } from 'react'
import type { ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Something went wrong.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Reload the page to continue — your plan data is kept on this device.
        </p>
        <button
          onClick={() => location.reload()}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          Reload
        </button>
      </div>
    )
  }
}
