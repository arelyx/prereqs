import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { CourseSummary } from '../api'

interface Props {
  placeholder?: string
  onSelect: (course: CourseSummary) => void
  autoFocus?: boolean
}

export default function CourseSearch({ placeholder, onSelect, autoFocus }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<CourseSummary[]>([])
  const [open, setOpen] = useState(false)
  // The dropdown is wider than narrow hosts (quarter cells); anchor it to
  // whichever edge keeps it on screen.
  const [alignRight, setAlignRight] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && box.current) {
      const { left } = box.current.getBoundingClientRect()
      setAlignRight(left + 288 > window.innerWidth - 8)
    }
  }, [open])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      api
        .searchCourses(q.trim())
        .then((r) => {
          setResults(r.courses)
          setOpen(true)
        })
        .catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={box} className="relative">
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? 'Search courses (e.g. CSE 101)'}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul
          className={`absolute z-30 mt-1 max-h-72 w-[min(18rem,calc(100vw-1rem))] min-w-full divide-y divide-zinc-100 dark:divide-zinc-800 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {results.map((c) => (
            <li key={c.code}>
              <button
                className="w-full px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-zinc-900"
                onClick={() => {
                  onSelect(c)
                  setQ('')
                  setOpen(false)
                }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-sm font-semibold ${c.dormant ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {c.display_code}
                  </span>
                  {c.ge_codes.map((g) => (
                    <span key={g} className="rounded bg-emerald-100 dark:bg-emerald-950 px-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                      {g}
                    </span>
                  ))}
                  {c.dormant && (
                    <span className="whitespace-nowrap rounded bg-red-100 dark:bg-red-950 px-1 text-[10px] font-medium text-red-700 dark:text-red-300">
                      not offered in 5+ years
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">{c.title}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
