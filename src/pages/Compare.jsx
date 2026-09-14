import parityData from '../../models/onnx_parity.json'
const rows = parityData?.models || {}

const META = [
  { id: 'decision_tree', label: 'Decision Tree', size: '286 KB', type: 'Tree' },
  { id: 'random_forest', label: 'Random Forest', size: '23 MB', type: 'Ensemble' },
  { id: 'logistic_regression', label: 'Logistic Regression', size: '4.1 KB', type: 'Linear' },
  { id: 'naive_bayes', label: 'Naïve Bayes', size: '5.4 KB', type: 'Probabilistic' },
]

export function Compare() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model comparison</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Side-by-side evaluation from <code className="bg-slate-100 border border-slate-200 rounded px-1">onnx_parity.json</code> (sklearn vs ONNX, N=6, opset 14). No retraining — graph parity only.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white text-xs">
              <tr className="text-left">
                <th className="py-3 px-3 font-semibold">Model</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold text-right">Size</th>
                <th className="py-3 px-3 font-semibold text-center">Pred match</th>
                <th className="py-3 px-3 font-semibold text-right">Max |Δproba|</th>
                <th className="py-3 px-3 font-semibold text-center">≤ 1e-5</th>
                <th className="py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {META.map((m) => {
                const p = rows[m.id] || {}
                const ok = p.pred_match
                const within = p.proba_match_tol_1e5
                const delta = p.max_abs_proba_diff
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{m.label}</td>
                    <td className="py-3 px-3 text-slate-600">{m.type}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs">{m.size}</td>
                    <td className="py-3 px-3 text-center">{ok ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">✓ exact</span> : <span className="text-amber-700">mismatch</span>}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs">{delta != null ? delta.toExponential(2) : '—'}</td>
                    <td className="py-3 px-3 text-center">{within ? <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">pass</span> : <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs">fail</span>}</td>
                    <td className="py-3 px-3"><span className="inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">{p.status || 'converted'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          Tolerance: <code className="bg-white border border-slate-200 rounded px-1">proba_atol 1e-5</code> · <code>pred exact</code> · All 4 models <span className="font-semibold text-emerald-700">converted</span> on opset 14. Graph compat: categorical sentinel NaN→"" re-declared for ONNX only (fills unchanged).
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900">When to choose what</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
            <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" /><span><span className="font-semibold">Fast / offline:</span> Decision Tree, Naïve Bayes — sub-second load, tiny payload.</span></li>
            <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" /><span><span className="font-semibold">Robust screening:</span> Random Forest — ensemble vote, best on parity, but 23 MB fetch.</span></li>
            <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" /><span><span className="font-semibold">Calibrated scores:</span> Logistic Regression — near-perfect ONNX parity (Δ 4.3e-08).</span></li>
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-6">
          <h3 className="font-bold">How to evaluate in the app</h3>
          <ol className="mt-3 list-decimal ml-5 space-y-1.5 text-sm text-slate-300">
            <li>Go to <span className="font-semibold text-white">Dashboard</span> → <span className="font-mono bg-white/10 rounded px-1">Compare all</span> or one model.</li>
            <li>Import CSV or <span className="font-mono bg-white/10 rounded px-1">Load sample rows</span> (SAMPLE-01…03).</li>
            <li><span className="font-semibold text-white">Run predictions</span> → see <span className="font-mono bg-white/10 rounded px-1">Summary</span> bands + per-row drilldown.</li>
            <li>Check <span className="font-mono bg-white/10 rounded px-1">Charts</span> for band / histogram side-by-side.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-400">Tip: Random Forest is the reference for charts when Compare all is selected.</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">Parity detail (6-row reference)</h3>
        <p className="text-sm text-slate-600">Sklearn predictions (reference) vs ONNX predictions on the same 6 rows.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="py-2 px-3">Model</th>
                <th className="py-2 px-3">sklearn_pred</th>
                <th className="py-2 px-3">onnx_pred</th>
                <th className="py-2 px-3 text-right">max |Δ|</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {META.map((m) => {
                const p = rows[m.id]
                if (!p) return null
                return (
                  <tr key={m.id}>
                    <td className="py-2 px-3 font-medium">{m.label}</td>
                    <td className="py-2 px-3 font-mono">[{p.sklearn_pred?.join(', ')}]</td>
                    <td className="py-2 px-3 font-mono">[{p.onnx_pred?.join(', ')}]</td>
                    <td className="py-2 px-3 text-right font-mono">{p.max_abs_proba_diff?.toExponential(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
