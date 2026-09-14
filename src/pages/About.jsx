import { AppConfig } from '../config.js'

const MODELS = [
  {
    id: 'decision_tree',
    name: 'Decision Tree',
    short: 'DT',
    size: '~286 KB',
    color: 'bg-emerald-600',
    desc: 'Interpretable, axis-aligned splits. Fastest cold-start, tiny payload, exact parity with scikit-learn.',
    strengths: ['Instant load', 'Fully interpretable', 'Deterministic bands'],
    trade: 'Higher variance; sensitive to noise.',
  },
  {
    id: 'random_forest',
    name: 'Random Forest',
    short: 'RF',
    size: '~23 MB',
    color: 'bg-slate-900',
    desc: 'Ensemble of trees (majority vote). Most robust, higher memory and slower to load due to ~23 MB model.',
    strengths: ['Best generalization on parity test', 'Robust to missing imputation', 'Stable probabilities'],
    trade: 'Large download; heavier WASM inference.',
  },
  {
    id: 'logistic_regression',
    name: 'Logistic Regression',
    short: 'LR',
    size: '~4 KB',
    color: 'bg-brand-primary',
    desc: 'Linear model + sigmoid. Calibrated probabilities, well-understood coefficients, parity atol 4e-08.',
    strengths: ['Tiny', 'Well-calibrated', 'Fast'],
    trade: 'Linear boundary only.',
  },
  {
    id: 'naive_bayes',
    name: 'Naïve Bayes',
    short: 'NB',
    size: '~5 KB',
    color: 'bg-indigo-600',
    desc: 'Probabilistic generative model assuming feature independence. Very fast and compact.',
    strengths: ['Fastest inference', 'Good with categorical modes', 'Tiny'],
    trade: 'Independence assumption may mis-calibrate.',
  },
]

export function About() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">About the system</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">A privacy-first dashboard that runs entirely in your browser. Models are converted to ONNX (opset 14) and executed via <code className="bg-slate-100 border border-slate-200 rounded px-1">onnxruntime-web</code> CPU/WASM. No data is uploaded or stored.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900">Inputs · 8 features</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><span className="font-semibold">Numeric (float32 [N,1]):</span> GWA, Failed, Dropped, Total Units, Year Level</li>
            <li><span className="font-semibold">Categorical (string [N,1]):</span> Program, Enrollment History, Previous Standing</li>
            <li className="text-slate-500">Missing → numerics <code>NaN</code> median-imputed, categoricals <code>""</code> mode-imputed in-graph.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900">Outputs</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><code>label</code> int64 [N] — 0 / 1 (1 = at-risk)</li>
            <li><code>probabilities</code> float32 [N,2] — columns align to [0,1]</li>
            <li><span className="font-semibold">Bands on P(at-risk):</span> Low 0–0.39 · Medium 0.40–0.69 · High 0.70–1.00</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-6">
          <h3 className="font-bold">Privacy</h3>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">FileReader + local tensors, `executionProviders: ["wasm"]`, `numThreads=1`. Models in <code className="bg-white/10 border border-white/20 rounded px-1">public/models/</code>. WASM fetched once from CDN, then fully offline.</p>
          <p className="mt-3 text-xs text-slate-400">Contract: <code>onnx_inputs.json</code> · Parity: <code>onnx_parity.json</code></p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">The four models</h2>
      <p className="text-sm text-slate-600">All run in the same browser session — pick one or compare all. Switch in the Dashboard.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODELS.map((m) => (
          <div key={m.id} className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl ${m.color} text-white flex items-center justify-center font-bold text-xs shadow`}>{m.short}</span>
                <div>
                  <h3 className="font-bold text-slate-900 leading-none">{m.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{m.size} · opset 14</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Converted ✓</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.strengths.map((s) => (
                <span key={s} className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 text-slate-700">{s}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500"><span className="font-semibold">Trade-off:</span> {m.trade}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">Which should you use?</h3>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
          <li className="rounded-xl bg-slate-50 border border-slate-200 p-3"><span className="font-semibold">Quick demo / low bandwidth:</span> Decision Tree or Naïve Bayes</li>
          <li className="rounded-xl bg-slate-50 border border-slate-200 p-3"><span className="font-semibold">Most stable screening:</span> Random Forest (if 23 MB load is OK)</li>
          <li className="rounded-xl bg-slate-50 border border-slate-200 p-3"><span className="font-semibold">Calibrated probabilities:</span> Logistic Regression</li>
          <li className="rounded-xl bg-slate-50 border border-slate-200 p-3"><span className="font-semibold">Side-by-side:</span> Compare all → bands + histogram + per-row drilldown</li>
        </ul>
      </div>
    </div>
  )
}
