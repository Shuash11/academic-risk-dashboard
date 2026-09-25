export function Controls({
  selectedModel,
  onModelChange,
  onFileChange,
  onClear,
  onRun,
  isRunning,
  runProgress,
  fileInputRef,
  uploadedFile,
  rowCount,
  onShowActivity,
  activityCount,
  rowLimit,
  onRowLimitChange,
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">1</span>
        <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Input</p>
      </div>
      <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Data & model</h2>
      <div className="mt-1 h-px bg-slate-100" />
      <div className="grid gap-5 mt-5">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase text-slate-600 mb-2">Model</p>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${isRunning ? 'opacity-60 pointer-events-none' : ''}`} aria-busy={isRunning}>
            {[
              { id: 'compare-all', label: 'Compare all', sub: '4 models', icon: '◈', accent: 'bg-slate-900 text-white border-slate-900' },
              { id: 'decision_tree', label: 'Decision Tree', sub: 'fast, lightweight', icon: 'DT', accent: 'bg-emerald-600 text-white border-emerald-600' },
              { id: 'random_forest', label: 'Random Forest', sub: '56.3 MB', icon: 'RF', accent: 'bg-brand-primary text-white border-brand-primary' },
              { id: 'logistic_regression', label: 'Logistic Regression', sub: 'calibrated', icon: 'LR', accent: 'bg-indigo-600 text-white border-indigo-600' },
              { id: 'naive_bayes', label: 'Naive Bayes', sub: 'tiny & fast', icon: 'NB', accent: 'bg-violet-600 text-white border-violet-600' },
            ].map((m) => {
              const active = selectedModel === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModelChange(m.id)}
                  aria-pressed={active}
                  disabled={isRunning}
                  className={`text-left flex items-center gap-3 p-3.5 rounded-xl border-2 shadow-sm transition disabled:cursor-not-allowed ${active ? m.accent + ' shadow' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'}`}
                >
                  <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${active ? 'bg-white/15 border-white/30 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{m.icon}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold leading-none ${active ? 'text-white' : 'text-slate-900'}`}>{m.label}</span>
                    <span className={`block text-xs mt-1 ${active ? 'text-white/80' : 'text-slate-500'}`}>— {m.sub}</span>
                  </span>
                  {active && <span className="ml-auto w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs">✓</span>}
                </button>
              )
            })}
          </div>
          {isRunning && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">Scoring in progress — model selection locked until done.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Dataset</h3>
              <p className="mt-1 text-[0.88rem] leading-relaxed text-slate-600">Upload a CSV — we map columns automatically. ID/status columns are ignored (Student ID stays as label).</p>
            </div>
          </div>

          <div className={`mx-3 rounded-xl border-2 border-dashed bg-white p-5 ${isRunning ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex w-9 h-9 rounded-full bg-slate-900 text-white items-center justify-center text-sm">↑</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Drop CSV or choose file</p>
                  <p className="text-xs text-slate-500">Headers are case-insensitive</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <label className="font-medium text-slate-600 whitespace-nowrap">Row limit</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={rowLimit}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); onRowLimitChange(isFinite(v) && v >= 0 ? v : 0) }}
                    disabled={isRunning}
                    className="w-20 border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                  />
                  <span className="text-slate-500 whitespace-nowrap">{rowLimit === 0 ? 'no limit' : ''}</span>
                </div>
                <label className={`relative inline-flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl shadow transition ${isRunning ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white cursor-pointer'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5-5"/><path d="M12 3v12"/></svg>
                  Import CSV<input ref={fileInputRef} onChange={onFileChange} type="file" accept=".csv,text/csv" disabled={isRunning} hidden aria-label="Import CSV file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
                <button onClick={onClear} disabled={isRunning} type="button" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed">Clear</button>
              </div>
            </div>
          </div>

          {uploadedFile ? (
            <div className="mx-3 mt-3 mb-3 rounded-xl border bg-emerald-50 border-emerald-200 px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-900 truncate max-w-[22ch] sm:max-w-[32ch]" title={uploadedFile.name}>
                    File uploaded — <span className="font-mono font-semibold">{uploadedFile.name}</span>
                  </p>
                  <p className="text-xs text-emerald-800">
                    {uploadedFile.count.toLocaleString()} rows · headers mapped · <span className="font-medium">ready to run</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={onShowActivity} type="button" className="relative inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-white border border-emerald-200 rounded-full px-3 py-1.5 transition hover:shadow-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
                  Activity
                  {activityCount > 0 && <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-emerald-600 text-white text-[0.6rem] font-bold px-1">{activityCount}</span>}
                </button>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase bg-white border border-emerald-200 text-emerald-800 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Loaded
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-3 mt-3 mb-3 rounded-xl border border-dashed border-slate-200 bg-white px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-slate-500">
              <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[0.7rem]">∅</span>
              No file yet — import a CSV to begin.
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-5 sm:p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl" />
          {isRunning && runProgress && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-full bg-emerald-400 transition-all duration-500 ease-out" style={{ width: `${(runProgress.current / runProgress.total) * 100}%` }} />
            </div>
          )}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              <div className={`hidden sm:flex w-10 h-10 rounded-xl border items-center justify-center shrink-0 ${isRunning ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/15 border-white/20 text-white'}`}>
                {isRunning ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '▶'}
              </div>
              <div className="min-w-0">
                {isRunning ? (
                  <>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Scoring {runProgress ? `${runProgress.current}/${runProgress.total}` : ''} — {runProgress?.label || 'working…'}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300 mt-1">
                      Hold tight — {runProgress?.label === 'Random Forest' ? 'large model (56.3 MB) may take a moment' : 'running locally, no upload'} • {runProgress ? Math.round((runProgress.current / runProgress.total) * 100) : 0}% • {runProgress?.current === runProgress?.total ? 'finalizing…' : 'do not close this tab'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 max-w-[220px] h-1.5 bg-white/15 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${runProgress ? (runProgress.current / runProgress.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[0.7rem] font-mono text-slate-300">{runProgress ? `${runProgress.current}/${runProgress.total}` : ''}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ready to score?</p>
                    <p className="text-xs leading-relaxed text-slate-300 mt-1">Runs locally in your browser — CPU/WASM, no upload, private by design.</p>
                  </>
                )}
              </div>
            </div>
            <button onClick={onRun} disabled={isRunning} type="button" aria-busy={isRunning} className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm px-6 py-3 rounded-xl shadow disabled:opacity-90 disabled:cursor-not-allowed transition whitespace-nowrap shrink-0">
              {isRunning ? (
                <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" /> Scoring… {runProgress ? `${Math.round((runProgress.current / runProgress.total) * 100)}%` : ''}</>
              ) : (
                <>Run predictions <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">→</span></>
              )}
            </button>
          </div>
          {isRunning && <p className="relative mt-3 text-[0.7rem] text-slate-400">Buttons locked until scoring finishes · you'll see live updates in the activity log</p>}
        </div>
      </div>
    </section>
  )
}
