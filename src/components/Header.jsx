export function Header() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 z-50 bg-slate-900 text-white font-bold text-sm py-2 px-4 rounded-lg shadow">
        Skip to dashboard content
      </a>
      <header className="relative overflow-hidden bg-white border-b border-slate-200">
        {/* subtle design layer — not technical, just depth */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40" />
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] bg-brand-primary/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-9 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-[62ch]">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-full px-3 py-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase">On-device · Private</span>
                <span className="hidden sm:inline text-slate-400 text-xs">·</span>
                <span className="hidden sm:inline text-xs font-medium text-slate-300">No data leaves your browser</span>
              </div>
              <h1 className="mt-4 text-[1.9rem] sm:text-[2.2rem] font-extrabold tracking-[-0.02em] leading-[1.05] text-slate-900">
                Academic Risk <span className="bg-gradient-to-r from-brand-primary to-indigo-600 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-slate-600">
                Privacy-first assessment that runs four trained classifiers directly in your browser and generates actionable insights.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400" /> Instant results</span>
                <span className="w-px h-3 bg-slate-200" />
                <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400" /> Works offline after load</span>
                <span className="w-px h-3 bg-slate-200 hidden sm:block" />
                <span className="hidden sm:inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400" /> No account needed</span>
              </div>
            </div>

            {/* minimal visual — four-model hint without technical labels */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <div className="flex -space-x-2">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 border-[3px] border-white shadow flex items-center justify-center text-white font-bold text-[0.7rem]">DT</div>
                <div className="w-11 h-11 rounded-2xl bg-brand-primary border-[3px] border-white shadow flex items-center justify-center text-white font-bold text-[0.7rem]">RF</div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 border-[3px] border-white shadow flex items-center justify-center text-white font-bold text-[0.7rem]">LR</div>
                <div className="w-11 h-11 rounded-2xl bg-slate-700 border-[3px] border-white shadow flex items-center justify-center text-white font-bold text-[0.7rem]">NB</div>
              </div>
              <div className="ml-3 text-left">
                <p className="text-xs font-bold tracking-wide uppercase text-slate-500">4 models</p>
                <p className="text-sm font-semibold text-slate-900 leading-none">Ensemble insight</p>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
