import { useEffect, useState } from 'react'

function MetricCard({ label, value, color = 'text-slate-900', best }) {
  return (
    <div className={`rounded-xl border p-4 ${best ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100' : 'bg-white border-slate-200'}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-xl font-extrabold tracking-tight tabular-nums ${color}`}>
        {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}
        {best && <span className="ml-2 text-[0.65rem] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">BEST</span>}
      </dd>
    </div>
  )
}

function ConfusionMatrix({ matrix, label }) {
  if (!matrix || matrix.length !== 2) return null
  const [[tn, fp], [fn, tp]] = matrix
  const total = tn + fp + fn + tp
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">{label}</p>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-slate-200 rounded-lg overflow-hidden text-center">
        <div className="bg-slate-50 p-2" />
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600">Predicted 0</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600">Predicted 1</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600 text-right pr-3">Actual 0</div>
        <div className="bg-emerald-50 p-3 text-lg font-bold text-emerald-800">{tn.toLocaleString()}</div>
        <div className="bg-red-50 p-3 text-lg font-bold text-red-800">{fp.toLocaleString()}</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600 text-right pr-3">Actual 1</div>
        <div className="bg-amber-50 p-3 text-lg font-bold text-amber-800">{fn.toLocaleString()}</div>
        <div className="bg-emerald-50 p-3 text-lg font-bold text-emerald-800">{tp.toLocaleString()}</div>
      </div>
      <p className="mt-2 text-[0.7rem] text-slate-500">Total: {total.toLocaleString()} | TN={tn.toLocaleString()} FP={fp.toLocaleString()} FN={fn.toLocaleString()} TP={tp.toLocaleString()}</p>
    </div>
  )
}

function MetricBar({ label, value, max = 1, color = '#0f172a' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-14 text-right">{(value * 100).toFixed(1)}%</span>
    </div>
  )
}

const MODEL_COLORS = {
  decision_tree: '#059669',
  random_forest: '#1d4e89',
  logistic_regression: '#7c3aed',
  naive_bayes: '#d97706',
}

export function ModelEvaluation() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('./data/model_metrics.json')
      .then((r) => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model Evaluation</h1>
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Could not load model metrics: {error}. Run the Python export script first.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model Evaluation</h1>
        <p className="mt-4 text-sm text-slate-500 italic rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">Loading model metrics...</p>
      </div>
    )
  }

  const models = Object.entries(data.models)
  const bestId = data.best_model?.id

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model Evaluation</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Performance comparison of the four classification algorithms on a stratified 80/20 train-test split.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          Dataset: {data.dataset.total_rows.toLocaleString()} rows (train {data.dataset.train_rows.toLocaleString()} / test {data.dataset.test_rows.toLocaleString()})
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          Target: at-risk rate {(data.dataset.at_risk_rate * 100).toFixed(1)}%
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold">
          Best: {data.best_model?.label} (F1 = {(data.best_model?.f1_score * 100).toFixed(1)}%)
        </span>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white text-xs">
              <tr className="text-left">
                <th className="py-3 px-4 font-semibold">Model</th>
                <th className="py-3 px-4 font-semibold text-right">Accuracy</th>
                <th className="py-3 px-4 font-semibold text-right">Precision</th>
                <th className="py-3 px-4 font-semibold text-right">Recall</th>
                <th className="py-3 px-4 font-semibold text-right">F1-Score</th>
                <th className="py-3 px-4 font-semibold text-right">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map(([id, m]) => (
                <tr key={id} className={`hover:bg-slate-50 ${id === bestId ? 'bg-emerald-50/50' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MODEL_COLORS[id] || '#666' }} />
                      <span className="font-semibold text-slate-900">{m.label}</span>
                      {id === bestId && <span className="text-[0.6rem] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">BEST</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">{(m.accuracy * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">{(m.precision * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">{(m.recall * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold">{(m.f1_score * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">{(m.roc_auc * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Metric comparison</h2>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc'].map((metric) => (
          <div key={metric} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">{metric.replace('_', ' ')}</p>
            <div className="space-y-2">
              {models.map(([id, m]) => (
                <MetricBar key={id} label={m.label} value={m[metric]} color={MODEL_COLORS[id] || '#666'} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Confusion matrices</h2>
      <p className="mt-1 text-sm text-slate-600">True Negatives (TN), False Positives (FP), False Negatives (FN), True Positives (TP) on the held-out test set.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {models.map(([id, m]) => (
          <ConfusionMatrix key={id} matrix={m.confusion_matrix} label={m.label} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">How to read these metrics</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc ml-5 marker:text-slate-400">
          <li><strong>Accuracy:</strong> Proportion of all predictions that are correct.</li>
          <li><strong>Precision:</strong> Of students predicted at-risk, how many actually are.</li>
          <li><strong>Recall:</strong> Of all actual at-risk students, how many were correctly identified.</li>
          <li><strong>F1-Score:</strong> Harmonic mean of precision and recall — the primary metric for best-model selection.</li>
          <li><strong>ROC-AUC:</strong> Area under the ROC curve — measures discrimination ability across all thresholds.</li>
        </ul>
      </div>
    </div>
  )
}
