import { useEffect, useState } from 'react'

function ConfusionMatrix({ matrix, label }) {
  if (!matrix || matrix.length !== 2) return null
  const [[tn, fp], [fn, tp]] = matrix
  const total = tn + fp + fn + tp
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">{label}</p>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-slate-200 rounded-lg overflow-hidden text-center">
        <div className="bg-slate-50 p-2" />
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600">Predicted Not At-Risk</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600">Predicted At-Risk</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600 text-right pr-3">Actual Not At-Risk</div>
        <div className="bg-emerald-50 p-3 text-lg font-bold text-emerald-800">{tn.toLocaleString()}</div>
        <div className="bg-red-50 p-3 text-lg font-bold text-red-800">{fp.toLocaleString()}</div>
        <div className="bg-slate-100 p-2 text-xs font-semibold text-slate-600 text-right pr-3">Actual At-Risk</div>
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

function SplitCard({ title, years, rows, students, atRisk, atRiskRate, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <p className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 tabular-nums">{yearRange(years)}</p>
      <p className="mt-1 text-sm text-slate-600 tabular-nums">
        {rows.toLocaleString()} rows · {students.toLocaleString()} students · {(atRiskRate * 100).toFixed(1)}% at-risk ({atRisk.toLocaleString()} at-risk)
      </p>
    </div>
  )
}

// "2018–2023" style range from a year array (first–last, en dash).
function yearRange(years) {
  if (!years || years.length === 0) return ''
  if (years.length === 1) return String(years[0])
  return String(years[0]) + '–' + String(years[years.length - 1])
}

const MODEL_COLORS = {
  dummy: '#64748b',
  decision_tree: '#059669',
  random_forest: '#1d4e89',
  logistic_regression: '#7c3aed',
  naive_bayes: '#d97706',
}

const METRIC_LABELS = {
  accuracy: 'Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1_score: 'F1-Score',
  roc_auc: 'ROC-AUC',
  pr_auc: 'PR-AUC',
  specificity: 'Specificity',
}

export function ModelEvaluation() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [variantView, setVariantView] = useState('with_smote')

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

  const ds = data.dataset
  const design = data.prediction_design
  const best = data.best_model
  const bestId = best?.id
  const bestVariant = best?.variant
  const bestSuffix = bestVariant === 'with_smote' ? ' + SMOTE' : ''
  const models = Object.entries(data.models)

  // Metrics for the currently toggled variant; falls back to the flattened
  // (winning-variant) top-level metrics if a model lacks variants.
  const metricsOf = (m) => {
    const v = m.variants && m.variants[variantView]
    return v ? v.metrics : m
  }

  // Boundary-spanning students, extracted from the split_note disclosure.
  const crossBoundaryMatch = ds.split_note ? ds.split_note.match(/cross-boundary students: ([0-9,]+)/i) : null
  const crossBoundary = crossBoundaryMatch ? Number(crossBoundaryMatch[1].replace(/,/g, '')).toLocaleString() : null

  // Best-model narrative numbers (winning variant confusion matrix).
  const bestModelEntry = best && data.models[best.id] ? data.models[best.id] : null
  const bestMetrics = bestModelEntry ? (bestModelEntry.variants && bestModelEntry.variants[bestVariant] ? bestModelEntry.variants[bestVariant].metrics : bestModelEntry) : null
  const bestCM = bestMetrics && bestMetrics.confusion_matrix && bestMetrics.confusion_matrix.length === 2 ? bestMetrics.confusion_matrix : null
  const bestTp = bestCM ? bestCM[1][1] : null
  const bestFn = bestCM ? bestCM[1][0] : null
  // False alarms per 10 alerts = 10 × (1 − precision): precision 0.1076 → ~9 of 10.
  const alertsInTen = bestMetrics && bestMetrics.precision != null ? Math.round(10 * (1 - bestMetrics.precision)) : null
  const flaggedShare = bestMetrics ? ((1 - bestMetrics.specificity) * 100).toFixed(1) : null

  // SMOTE effect on recall, computed per model from the per-variant data.
  const smoteImprovesAll = models.every(([, m]) => {
    const w = m.variants?.with_smote?.metrics?.recall
    const wo = m.variants?.without_smote?.metrics?.recall
    return w != null && wo != null && w > wo
  })

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model Evaluation</h1>
          <span className="text-[0.65rem] font-bold uppercase tracking-wide bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-full">{data.status}</span>
        </div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">
          Performance comparison of the four classification algorithms plus a stratified Dummy baseline on a chronological temporal split — training on {yearRange(ds.train_years)}, held-out testing on {yearRange(ds.test_years)}. All models predict at-risk on the student's NEXT record (t+1) from end-of-semester-t information only.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          Dataset: {ds.total_rows.toLocaleString()} rows → {ds.student_semester_records.toLocaleString()} modelled (train {ds.train_rows.toLocaleString()} / test {ds.test_rows.toLocaleString()})
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          Target: at-risk on the NEXT record (t+1)
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          Threshold: {design.classification_threshold}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold">
          Best: {best?.label + bestSuffix} — recall {(best?.recall * 100).toFixed(1)}% (primary metric); precision {(best?.precision * 100).toFixed(1)}%, F1 {(best?.f1_score * 100).toFixed(1)}%
        </span>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Temporal split</h2>
      <p className="mt-1 text-sm text-slate-600">
        Chronological split on the predictor semester, no shuffling: train on {yearRange(ds.train_years)}, held-out test on {yearRange(ds.test_years)}. Students active across the boundary contribute early rows to training and late rows to testing (forward prediction).
      </p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SplitCard title="Training" years={ds.train_years} rows={ds.train_rows} students={ds.train_students} atRisk={ds.train_at_risk} atRiskRate={ds.train_at_risk_rate} accent="bg-white border-slate-200" />
        <SplitCard title="Held-out test" years={ds.test_years} rows={ds.test_rows} students={ds.test_students} atRisk={ds.test_at_risk} atRiskRate={ds.test_at_risk_rate} accent="bg-white border-slate-200" />
      </div>
      {ds.split_note && (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed">
          <span className="font-semibold text-slate-700">Split note: </span>{ds.split_note}
          {crossBoundary && <span className="font-semibold text-slate-700"> Cross-boundary students: {crossBoundary}.</span>}
        </p>
      )}

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Model comparison</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Variant:</span>
        {['with_smote', 'without_smote'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariantView(v)}
            aria-pressed={variantView === v}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${variantView === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            {v === 'with_smote' ? 'With SMOTE' : 'Without SMOTE'}
          </button>
        ))}
        <span className="text-xs text-slate-500">— every model is evaluated on the held-out test set ({ds.test_rows.toLocaleString()} rows).</span>
      </div>
      <div className="mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white text-xs">
              <tr className="text-left">
                <th className="py-3 px-4 font-semibold">Model</th>
                <th className="py-3 px-4 font-semibold">Variant</th>
                <th className="py-3 px-4 font-semibold text-right">Accuracy</th>
                <th className="py-3 px-4 font-semibold text-right">Precision</th>
                <th className="py-3 px-4 font-semibold text-right">Recall</th>
                <th className="py-3 px-4 font-semibold text-right">F1-Score</th>
                <th className="py-3 px-4 font-semibold text-right">ROC-AUC</th>
                <th className="py-3 px-4 font-semibold text-right">PR-AUC</th>
                <th className="py-3 px-4 font-semibold text-right">Specificity</th>
                <th className="py-3 px-4 font-semibold text-right">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map(([id, m]) => {
                const mt = metricsOf(m)
                const isWinning = m.winning_variant === variantView
                return (
                  <tr key={id} className={`hover:bg-slate-50 ${id === bestId && variantView === bestVariant ? 'bg-emerald-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MODEL_COLORS[id] || '#666' }} />
                        <span className="font-semibold text-slate-900">{m.label}</span>
                        {id === bestId && variantView === bestVariant && <span className="text-[0.6rem] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">BEST</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[0.7rem] font-semibold whitespace-nowrap rounded-full px-2 py-0.5 border bg-slate-50 border-slate-200 text-slate-600">
                        {variantView === 'with_smote' ? 'with SMOTE' : 'no SMOTE'}{isWinning ? ' · winning' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{(mt.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.f1_score * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.roc_auc * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.pr_auc * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{(mt.specificity * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{mt.threshold}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">
          Best model selected by highest test recall — the primary metric ({design.evaluation_hierarchy}).
        </p>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Metric comparison</h2>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['recall', 'precision', 'f1_score', 'roc_auc', 'pr_auc', 'specificity', 'accuracy'].map((metric) => (
          <div key={metric} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">
              {METRIC_LABELS[metric]}{metric === 'recall' ? ' — primary selection metric' : ''}
            </p>
            <div className="space-y-2">
              {models.map(([id, m]) => (
                <MetricBar key={id} label={m.label} value={metricsOf(m)[metric]} color={MODEL_COLORS[id] || '#666'} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Confusion matrices</h2>
      <p className="mt-1 text-sm text-slate-600">True Negatives (TN), False Positives (FP), False Negatives (FN), True Positives (TP) on the held-out test set, for the selected variant.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {models.map(([id, m]) => (
          <ConfusionMatrix key={id} matrix={metricsOf(m).confusion_matrix} label={m.label} />
        ))}
      </div>

      {bestMetrics && bestTp != null && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900">Actual results — what happened, and what does it mean?</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc ml-5 marker:text-slate-400">
            <li>
              <strong>What happened:</strong> {best?.label + bestSuffix} correctly identified {bestTp.toLocaleString()} of the {ds.test_at_risk.toLocaleString()} at-risk testing observations (recall {bestMetrics.recall.toFixed(4)}); {bestFn.toLocaleString()} at-risk students were not detected (FN).
            </li>
            <li>
              <strong>Why it's important:</strong> Recall is the primary metric — the objective is early identification, so a missed at-risk student (FN) costs more than a false alarm.
            </li>
            <li>
              <strong>What it means:</strong> Precision {bestMetrics.precision.toFixed(4)} means roughly {alertsInTen} of every 10 alerts were false alarms; specificity {bestMetrics.specificity.toFixed(4)} means {flaggedShare}% of not-at-risk students were flagged — outputs must remain supplementary to human judgment.
            </li>
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-bold text-amber-900">Read with care — verification notes</h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-900 list-disc ml-5 marker:text-amber-400">
          <li>
            No 100% results exist in this leakage-free evaluation. An earlier candidate target (next-semester academic standing) was audited and found degenerate — exactly re-derivable from same-semester data, 0 mismatches in {design.degenerate_target_audit.linked_rows_checked.toLocaleString()} linked rows — and rejected. {design.degenerate_target_audit.detail}
          </li>
          <li>
            Adopted target: {design.target_rule} — it differs from the same-semester admin rule on {design.degenerate_target_audit.adopted_target_mismatches_vs_admin_rule_t.toLocaleString()} of the linked rows, so it is genuinely uncertain.
          </li>
          <li>
            Classification threshold: {design.classification_threshold} for every reported metric.
          </li>
          <li>
            {smoteImprovesAll ? 'SMOTE improves recall for every model (per-variant data above).' : 'SMOTE improves recall for most models (per-variant data above).'} Leakage guards enforced: {design.leakage_guards.join('; ')}.
          </li>
        </ul>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">How to read these metrics</h3>
        <p className="mt-1 text-sm text-slate-600">Evaluation hierarchy: {design.evaluation_hierarchy}.</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc ml-5 marker:text-slate-400">
          <li><strong>Recall (primary):</strong> Of all actual at-risk students, how many were correctly identified — the metric used for best-model selection.</li>
          <li><strong>Precision:</strong> Of students predicted at-risk, how many actually are.</li>
          <li><strong>F1-Score:</strong> Harmonic mean of precision and recall — a secondary metric, never the selection metric here.</li>
          <li><strong>ROC-AUC:</strong> Area under the ROC curve — measures discrimination ability across all thresholds.</li>
          <li><strong>PR-AUC:</strong> Area under the precision-recall curve — informative for imbalanced targets.</li>
          <li><strong>Specificity:</strong> Of actual not-at-risk students, how many were correctly left alone.</li>
          <li><strong>Accuracy (supporting):</strong> Proportion of all predictions that are correct.</li>
        </ul>
      </div>
    </div>
  )
}
