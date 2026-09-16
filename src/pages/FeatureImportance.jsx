import { useEffect, useState, useMemo } from 'react'

const MODEL_COLORS = {
  decision_tree: '#059669',
  random_forest: '#1d4e89',
  logistic_regression: '#7c3aed',
  naive_bayes: '#d97706',
}

const MODEL_IDS = ['decision_tree', 'random_forest', 'logistic_regression', 'naive_bayes']

function ImportanceBarChart({ features, color, topN = 15 }) {
  const top = features.filter((f) => f.importance > 0).slice(0, topN)
  const maxImp = top.length > 0 ? top[0].importance : 1

  const ref = (el) => {
    if (!el) return
    const dpr = window.devicePixelRatio || 1
    const barH = 28
    const gap = 4
    const padL = 180
    const padR = 60
    const padT = 10
    const padB = 10
    const H = padT + top.length * (barH + gap) + padB
    const W = 640

    el.width = W * dpr
    el.height = H * dpr
    el.style.width = '100%'
    el.style.height = H + 'px'
    const ctx = el.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    top.forEach((f, i) => {
      const y = padT + i * (barH + gap)
      const bw = maxImp > 0 ? ((W - padL - padR) * (f.importance / maxImp)) : 0

      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.roundRect(padL, y, W - padL - padR, barH, 4)
      ctx.fill()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(padL, y, Math.max(bw, 2), barH, 4)
      ctx.fill()

      ctx.fillStyle = '#475569'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const displayName = f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name
      ctx.fillText(displayName, padL - 8, y + barH / 2)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText((f.importance * 100).toFixed(2) + '%', padL + bw + 6, y + barH / 2)
    })
  }

  return <canvas ref={ref} width="640" height={10 + top.length * 32 + 10} className="w-full block" />
}

function TopFeaturesSummary({ models }) {
  const consensus = useMemo(() => {
    const featureMap = {}
    models.forEach(([id, data]) => {
      data.features.forEach((f, idx) => {
        if (!featureMap[f.name]) featureMap[f.name] = { name: f.name, appearsIn: 0, totalImportance: 0, bestRank: Infinity, models: [] }
        featureMap[f.name].appearsIn++
        featureMap[f.name].totalImportance += f.importance
        if (f.importance > 0) {
          featureMap[f.name].bestRank = Math.min(featureMap[f.name].bestRank, idx + 1)
          featureMap[f.name].models.push({ id, importance: f.importance, rank: idx + 1 })
        }
      })
    })

    const n = models.length
    return Object.values(featureMap)
      .map((f) => ({ ...f, avgImportance: f.totalImportance / n }))
      .filter((f) => f.avgImportance > 0)
      .sort((a, b) => b.avgImportance - a.avgImportance)
      .slice(0, 8)
  }, [models])

  return (
    <div className="rounded-2xl bg-slate-900 text-white p-6">
      <h3 className="font-bold">Key predictors across all models</h3>
      <p className="mt-1 text-xs text-slate-400">Ranked by average importance across all four algorithms.</p>
      <ol className="mt-4 space-y-3">
        {consensus.map((f, i) => (
          <li key={f.name} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{f.name}</p>
              <p className="text-xs text-slate-400">Avg importance {(f.avgImportance * 100).toFixed(1)}% · present in {f.appearsIn}/{4} models</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function FeatureImportance() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedModel, setSelectedModel] = useState('decision_tree')

  useEffect(() => {
    fetch('./data/feature_importance.json')
      .then((r) => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Feature Importance</h1>
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Could not load feature importance data: {error}. Run the Python export script first.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Feature Importance</h1>
        <p className="mt-4 text-sm text-slate-500 italic rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">Loading feature importance data...</p>
      </div>
    )
  }

  const models = Object.entries(data.models)
  const currentFeatures = data.models[selectedModel]?.features || []

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Feature Importance</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Which academic variables contribute most to predicting at-risk status across the four models.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-xs font-bold tracking-wide uppercase text-slate-600">Select model</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {models.map(([id, m]) => (
                <button
                  key={id}
                  onClick={() => setSelectedModel(id)}
                  className={`text-left p-3 rounded-xl border-2 text-sm font-semibold transition ${selectedModel === id ? 'text-white shadow' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  style={selectedModel === id ? { backgroundColor: MODEL_COLORS[id], borderColor: MODEL_COLORS[id] } : {}}
                >
                  <span className="block text-xs opacity-70">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Top features — {data.models[selectedModel]?.label}</p>
              <ImportanceBarChart features={currentFeatures} color={MODEL_COLORS[selectedModel] || '#0f172a'} topN={15} />
            </div>
          </div>
        </div>
        <TopFeaturesSummary models={models} />
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">All models side by side</h2>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {models.map(([id, m]) => (
          <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[id] }} />
              <p className="text-sm font-bold text-slate-900">{m.label}</p>
            </div>
            <div className="space-y-1.5">
              {m.features.filter((f) => f.importance > 0).slice(0, 10).map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-44 truncate" title={f.name}>{f.name}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: (f.importance * 100) + '%', backgroundColor: MODEL_COLORS[id] }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-14 text-right">{(f.importance * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">How feature importance works</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc ml-5 marker:text-slate-400">
          <li><strong>Decision Tree & Random Forest:</strong> Importance = total decrease in Gini impurity (or information gain) attributed to each feature across all splits.</li>
          <li><strong>Logistic Regression:</strong> Importance = absolute value of the learned coefficient for each feature (normalized to sum to 1).</li>
          <li><strong>Naive Bayes:</strong> Importance = absolute difference of class-conditional means (proxy for discriminative power).</li>
          <li>All importance values are normalized to sum to 100% per model for comparability.</li>
        </ul>
      </div>
    </div>
  )
}
