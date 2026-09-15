import { useEffect, useRef, useState } from 'react'

export function StatusLog({ entries, onClear, compact }) {
  const boxRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const visible = expanded || compact ? entries : entries.slice(-12)

  const userScrolledUp = useRef(false)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80
    if (!userScrolledUp.current || nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [entries, expanded])

  const onScroll = () => {
    const el = boxRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    userScrolledUp.current = !nearBottom
  }

  const count = entries.length
  const hasMore = count > 12 && !expanded && !compact

  if (compact) {
    return (
      <div
        ref={boxRef}
        onScroll={onScroll}
        tabIndex={0}
        className="px-3 py-2 max-h-[400px] min-h-[120px] overflow-y-auto overscroll-contain bg-slate-50/50 scroll-smooth focus:outline-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-live="polite"
        aria-label="Status messages"
        role="log"
      >
        {count === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center flex flex-col items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">◌</span>
            No activity yet.
          </p>
        ) : (
          <div className="space-y-1.5 py-1">
            {entries.map((e, i) => {
              const isLast = i === entries.length - 1
              const base = 'text-[0.82rem] leading-relaxed rounded-xl px-3 py-2 border flex gap-2.5'
              const cls =
                e.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : e.type === 'warn'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : e.type === 'err'
                      ? 'bg-red-50 border-red-200 text-red-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-700'
              const icon = e.type === 'ok' ? '✓' : e.type === 'warn' ? '⚠' : e.type === 'err' ? '✕' : '·'
              return (
                <div key={i} className={`${base} ${cls} ${isLast ? 'ring-1 ring-slate-900/5' : ''}`}>
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/70 border border-black/5 flex items-center justify-center text-[0.7rem] font-bold mt-0.5">{icon}</span>
                  <span className="min-w-0 break-words" dangerouslySetInnerHTML={{ __html: e.html }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold tracking-wide uppercase text-slate-700">Activity</h3>
          <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 font-mono text-slate-600">{count}</span>
          {hasMore && <span className="text-xs text-slate-500">· showing last 12</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasMore && (
            <button onClick={() => setExpanded(true)} className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-full bg-white border border-slate-200">Show all</button>
          )}
          {expanded && count > 12 && (
            <button onClick={() => setExpanded(false)} className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-full bg-white border border-slate-200">Collapse</button>
          )}
          <button onClick={onClear} disabled={count === 0} className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 px-2 py-1">Clear</button>
        </div>
      </div>
      <div
        ref={boxRef}
        onScroll={onScroll}
        tabIndex={0}
        className="px-3 py-2 max-h-[260px] min-h-[96px] overflow-y-auto overscroll-contain touch-pan-y bg-slate-50/50 scroll-smooth focus:outline-none focus:ring-1 focus:ring-slate-200"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-live="polite"
        aria-label="Status messages"
        role="log"
      >
        {count === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center flex flex-col items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">◌</span>
            Idle — import a CSV, then run predictions.
          </p>
        ) : (
          <div className="space-y-1.5 py-1">
            {visible.map((e, i) => {
              const isLast = i === visible.length - 1
              const base = 'text-[0.82rem] leading-relaxed rounded-xl px-3 py-2 border flex gap-2.5'
              const cls =
                e.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : e.type === 'warn'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : e.type === 'err'
                      ? 'bg-red-50 border-red-200 text-red-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-700'
              const icon = e.type === 'ok' ? '✓' : e.type === 'warn' ? '⚠' : e.type === 'err' ? '✕' : '·'
              return (
                <div key={i} className={`${base} ${cls} ${isLast ? 'ring-1 ring-slate-900/5' : ''}`}>
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/70 border border-black/5 flex items-center justify-center text-[0.7rem] font-bold mt-0.5">{icon}</span>
                  <span className="min-w-0 break-words" dangerouslySetInnerHTML={{ __html: e.html }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
