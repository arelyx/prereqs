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
  const box = useRef<HTMLDivElement>(null)

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
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.code}>
              <button
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-sky-50"
                onClick={() => {
                  onSelect(c)
                  setQ('')
                  setOpen(false)
                }}
              >
                <span className={`font-semibold whitespace-nowrap ${c.dormant ? 'text-red-600' : ''}`}>
                  {c.display_code}
                </span>
                <span className="text-slate-600">{c.title}</span>
                {c.dormant && (
                  <span className="rounded bg-red-100 px-1 text-[10px] font-medium text-red-700">
                    not offered in 5+ years
                  </span>
                )}
                {c.ge_codes.map((g) => (
                  <span key={g} className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">
                    {g}
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
