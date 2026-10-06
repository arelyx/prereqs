// Shared building blocks for degree dashboards (default renderer and bespoke
// harness Views import these via '@app/components/degree/ui').
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Enrollment, ReqNode, Status } from '../../harness/types'
import { display } from '../../harness/courses'
import { termLabel } from '../../harness/terms'
import { useStore } from '../../store'

export const STATUS: Record<Status, { label: string; pill: string; ring: string; text: string }> = {
  met: {
    label: 'Done',
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    ring: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  'in-progress': {
    label: 'Planned',
    pill: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    ring: 'text-sky-600 dark:text-sky-400',
    text: 'text-sky-700 dark:text-sky-300',
  },
  unmet: {
    label: 'To do',
    pill: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    ring: 'text-zinc-400 dark:text-zinc-500',
    text: 'text-zinc-600 dark:text-zinc-400',
  },
  'needs-choice': {
    label: 'Decide',
    pill: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
    ring: 'text-violet-600 dark:text-violet-400',
    text: 'text-violet-700 dark:text-violet-300',
  },
  'needs-attestation': {
    label: 'Confirm',
    pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    ring: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
  },
  'cannot-check': {
    label: 'Check yourself',
    pill: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300',
    ring: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-800 dark:text-orange-300',
  },
  info: {
    label: 'Note',
    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
    ring: 'text-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
  },
}

/** Circle glyph per status (SVG, crisp in both themes). */
export function StatusIcon({ status, size = 18 }: { status: Status; size?: number }) {
  const c = STATUS[status].ring
  const common = { width: size, height: size, viewBox: '0 0 20 20', className: `${c} shrink-0`, 'aria-label': STATUS[status].label, role: 'img' as const }
  switch (status) {
    case 'met':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path d="M6 10.5l2.6 2.6L14.2 7.4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'in-progress':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" />
        </svg>
      )
    case 'needs-choice':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <text x="10" y="14.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">?</text>
        </svg>
      )
    case 'needs-attestation':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <text x="10" y="14.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">!</text>
        </svg>
      )
    case 'cannot-check':
      return (
        <svg {...common}>
          <path d="M10 1.8l8.6 15.4H1.4z" fill="currentColor" />
          <text x="10" y="15.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">?</text>
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="3 2.2" />
        </svg>
      )
  }
}

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[status].pill}`}>
      {label ?? STATUS[status].label}
    </span>
  )
}

export function Bar({ have, need, status, className = '' }: { have: number; need: number; status: Status; className?: string }) {
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 0
  const color =
    status === 'met' ? 'bg-emerald-500' : status === 'in-progress' ? 'bg-sky-500' : status === 'unmet' ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-amber-500'
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`} role="progressbar" aria-valuenow={have} aria-valuemax={need}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A course chip: done (green), planned (sky, dashed), option (neutral, clickable). */
export function CourseChip({
  code,
  enrollment,
  kind,
  onOpen,
}: {
  code: string
  enrollment?: Enrollment
  kind: 'done' | 'planned' | 'option' | 'missing' | 'excluded'
  onOpen?: (code: string) => void
}) {
  const dormant = useStore().dormant
  const cls = {
    done: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
    planned: 'border-dashed border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
    option: dormant.has(code)
      ? 'border-red-200 bg-white text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300'
      : 'border-zinc-200 bg-white text-zinc-700 hover:border-sky-400 hover:text-sky-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-sky-600 dark:hover:text-sky-300',
    missing: 'border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
    excluded: 'border-rose-300 bg-rose-50 text-rose-800 line-through dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300',
  }[kind]
  const when = enrollment?.term ? termLabel(enrollment.term) : enrollment ? 'credit' : null
  return (
    <button
      type="button"
      onClick={() => onOpen?.(code)}
      aria-label={`${display(code)} — ${{ done: 'counted', planned: 'planned', option: 'option', missing: 'still needed', excluded: 'not counted' }[kind]}`}
      title={kind === 'option' && dormant.has(code) ? 'Not offered in the last 5 years' : when ? `${display(code)} — ${when}` : display(code)}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {kind === 'done' && <span aria-hidden>✓</span>}
      {display(code)}
      {when && kind !== 'option' && <span className="font-normal opacity-60">{shortTerm(enrollment!.term)}</span>}
    </button>
  )
}

export function shortTerm(term: string | null): string {
  if (!term) return 'credit'
  const n = Number(term)
  const yy = String(Math.floor((n - 2000) / 10) % 100).padStart(2, '0')
  const s = { 0: 'W', 2: 'S', 4: 'Su', 8: 'F' }[n % 10] ?? '?'
  return `${s}${yy}`
}

/** "From the catalog" disclosure with the verbatim source quote(s). */
export function Quote({ quote }: { quote: string | string[] }) {
  const [open, setOpen] = useState(false)
  const qs = (Array.isArray(quote) ? quote : [quote]).filter(Boolean)
  if (!qs.length) return null
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-300"
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} catalog wording
      </button>
      {open && (
        <blockquote className="mt-1 space-y-1 border-l-2 border-zinc-300 pl-2 text-[11px] italic leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {qs.map((q, i) => (
            <p key={i}>“{q}”</p>
          ))}
        </blockquote>
      )}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>{children}</div>
  )
}

/** Leaves that count for summary numbers (skips info/minor and unchosen alternatives). */
export function countLeaves(nodes: ReqNode[]): Record<Status, number> {
  const out: Record<Status, number> = { met: 0, 'in-progress': 0, unmet: 0, 'needs-choice': 0, 'needs-attestation': 0, 'cannot-check': 0, info: 0 }
  const visit = (n: ReqNode) => {
    const combine = (n as { combine?: string }).combine
    if (n.children?.length && combine) {
      if (combine === 'any' || (n as { flat?: boolean }).flat) {
        out[n.status]++
        return
      }
      n.children.forEach(visit)
      return
    }
    if (n.status === 'info') return
    out[n.status]++
  }
  nodes.forEach(visit)
  return out
}
