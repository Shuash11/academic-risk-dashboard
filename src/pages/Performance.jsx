import { useEffect, useMemo, useState } from 'react'
import { FigureCatalog, FigureCategories, FigureModels, FigureStalenessNote } from '../lib/figureCatalog.js'

function Badges({ figure }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{figure.category}</span>
      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{figure.metric}</span>
      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{figure.model}</span>
      {figure.experiment !== '' && (
        <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{figure.experiment}</span>
      )}
      <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs">pre-retraining</span>
    </div>
  )
}

export function Performance() {
  const [category, setCategory] = useState('All')
  const [model, setModel] = useState('All models')
  const [query, setQuery] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FigureCatalog.filter((f) => {
      if (category !== 'All' && f.category !== category) return false
      if (model !== 'All models' && f.model !== model) return false
      if (q !== '') {
        const hay = (f.label + ' ' + f.metric + ' ' + f.category).toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [category, model, query])

  const activeFigure = lightboxIndex >= 0 && lightboxIndex < filtered.length ? filtered[lightboxIndex] : null

  function clearFilters() {
    setCategory('All')
    setModel('All models')
    setQuery('')
  }

  function goPrev() {
    if (filtered.length === 0) return
    setLightboxIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1))
  }

  function goNext() {
    if (filtered.length === 0) return
    setLightboxIndex((prev) => (prev >= filtered.length - 1 ? 0 : prev + 1))
  }

  useEffect(() => {
    if (!activeFigure) return
    function onKey(e) {
      if (e.key === 'Escape') setLightboxIndex(-1)
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [activeFigure, filtered.length])

  useEffect(() => {
    setLightboxIndex(-1)
  }, [category, model, query])

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Model performance figures</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Training and evaluation artifacts from ML-EXP-001 and ML-EXP-002 covering class balance, 5-fold cross-validation, model comparison, held-out test evaluation, and deployment bands, rendered from public/figures/.</p>
        <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">{FigureStalenessNote}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {['All', ...FigureCategories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={c === category ? 'rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-sm font-semibold' : 'rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 px-3.5 py-1.5 text-sm font-semibold'}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="All models">All models</option>
            {FigureModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search figures…"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 flex-1"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">{filtered.length} of 28 figures</p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">No figures match the current filters.</p>
          <button onClick={clearFilters} className="mt-3 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold">Clear filters</button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f, idx) => (
            <button key={f.id} onClick={() => setLightboxIndex(idx)} className="text-left overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition">
              <img loading="lazy" src={f.src} alt={f.label} className="w-full aspect-video object-contain bg-slate-50 border-b border-slate-200" />
              <span className="block p-4">
                <span className="block font-semibold text-sm text-slate-900">{f.label}</span>
                <Badges figure={f} />
              </span>
            </button>
          ))}
        </div>
      )}

      {activeFigure && (
        <div onClick={() => setLightboxIndex(-1)} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-slate-900">{activeFigure.label}</p>
                <Badges figure={activeFigure} />
              </div>
              <button onClick={() => setLightboxIndex(-1)} aria-label="Close" className="rounded-full bg-slate-900 text-white w-8 h-8 text-sm font-bold shrink-0">X</button>
            </div>
            <img src={activeFigure.src} alt={activeFigure.label} className="mt-4 w-full max-h-[85vh] object-contain bg-slate-50 rounded-xl border border-slate-200" />
            <div className="mt-4 flex items-center justify-between">
              <button onClick={goPrev} className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm font-semibold">Prev</button>
              <p className="text-xs text-slate-500">{lightboxIndex + 1} of {filtered.length}</p>
              <button onClick={goNext} className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm font-semibold">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
