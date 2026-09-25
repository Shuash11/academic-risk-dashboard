export function ExportSection({ onPrint, onCsv, onJson }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm screen-only">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">5</span>
        <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Share</p>
      </div>
      <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Export report</h2>
      <p className="mt-1 text-sm text-slate-600">Download or print your current run. Band definitions are included in every export.</p>
      <div className="mt-1 h-px bg-slate-100" />
      <div className="mt-5 flex flex-wrap gap-2.5">
        <button onClick={onPrint} type="button" className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">Print / Save PDF</button>
        <button onClick={onCsv} type="button" className="inline-flex items-center justify-center bg-slate-900 hover:bg-black text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm">Download CSV</button>
        <button onClick={onJson} type="button" className="inline-flex items-center justify-center bg-slate-900 hover:bg-black text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm">Download JSON</button>
      </div>
      <details className="mt-4 text-sm bg-slate-50 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold text-slate-900">How it works</summary>
        <ul className="mt-3 space-y-2 text-slate-600 list-disc ml-5 marker:text-slate-400">
          <li>Inputs (11, session order): 8× <code className="bg-white border border-slate-200 rounded px-1">float32 [N,1]</code> — GWA, Failed, Dropped, Units, Year, n_subjects_t, mean_grade_t, n_failed_grades_t; 3× <code className="bg-white border border-slate-200 rounded px-1">string [N,1]</code> — Program, Enrollment History, Previous Standing.</li>
          <li>Outputs: <code className="bg-white border border-slate-200 rounded px-1">label</code> int64 [N] (0 / 1, 1 = at-risk), <code className="bg-white border border-slate-200 rounded px-1">probabilities</code> float32 [N,2].</li>
          <li>Bands on P(at-risk): Low 0–0.39 · Medium 0.40–0.69 · High 0.70–1.00.</li>
          <li>Parity: opset 14, predictions exact, max Δproba ≤ 1e-5 — missing → <code className="bg-white border border-slate-200 rounded px-1">NaN</code> / <code className="bg-white border border-slate-200 rounded px-1">""</code> in-graph imputed.</li>
        </ul>
      </details>
    </section>
  )
}
