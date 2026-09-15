export function Overlay({ show, label, sub, progress }) {
  if (!show) return null

  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={label}>
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-white px-10 py-10 shadow-2xl max-w-md w-[90vw] text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-900 animate-pulse" />
          </div>
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight text-slate-900">{label}</p>
          {sub && <p className="mt-1 text-sm text-slate-500 leading-relaxed">{sub}</p>}
        </div>
        {progress && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>{progress.phase || `Model ${progress.current} of ${progress.total}`}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full transition-all duration-500 ease-out" style={{ width: pct + '%' }} />
            </div>
            {progress.detail && <p className="mt-2 text-xs text-slate-500">{progress.detail}</p>}
          </div>
        )}
        {!progress && (
          <p className="text-xs text-slate-400">This may take a moment — please wait.</p>
        )}
      </div>
    </div>
  )
}
