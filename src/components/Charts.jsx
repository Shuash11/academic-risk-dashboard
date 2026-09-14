import { useEffect, useRef } from 'react'

function setupHiDpi(canvas) {
  const dpr = window.devicePixelRatio || 1
  const w = canvas.width
  const h = canvas.height
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.aspectRatio = w + ' / ' + h
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  return { ctx, w, h }
}

function empty(canvas, message) {
  const s = setupHiDpi(canvas)
  s.ctx.clearRect(0, 0, s.w, s.h)
  s.ctx.fillStyle = '#64748b'
  s.ctx.font = '14px Inter, system-ui, sans-serif'
  s.ctx.textAlign = 'center'
  s.ctx.fillText(message, s.w / 2, s.h / 2)
}

function bandBar(canvas, dist, modelLabel) {
  const s = setupHiDpi(canvas)
  const ctx = s.ctx, W = s.w, H = s.h
  ctx.clearRect(0, 0, W, H)
  const padL = 44, padB = 48, padT = 30, padR = 16
  const max = Math.max(1, dist.Low, dist.Medium, dist.High)
  const cats = [
    { k: 'Low', c: '#059669' },
    { k: 'Medium', c: '#d97706' },
    { k: 'High', c: '#dc2626' },
  ]
  const slot = (W - padL - padR) / cats.length
  ctx.fillStyle = '#334155'
  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Band counts — ' + modelLabel, W / 2, 16)
  cats.forEach((cat, i) => {
    const v = dist[cat.k]
    const bh = (H - padT - padB) * (v / max)
    const x = padL + i * slot + slot * 0.2
    const bw = slot * 0.6
    const y = H - padB - bh
    ctx.fillStyle = cat.c
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 6)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillText(String(v), x + bw / 2, y - 6)
    ctx.fillStyle = '#475569'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText(cat.k, x + bw / 2, H - padB + 18)
  })
  ctx.strokeStyle = '#e2e8f0'
  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'right'
  ctx.font = '11px Inter, sans-serif'
  for (let g = 0; g <= 4; g++) {
    const gv = Math.round(max * g / 4)
    const gy = H - padB - ((H - padT - padB) * g) / 4
    ctx.beginPath()
    ctx.moveTo(padL, gy)
    ctx.lineTo(W - padR, gy)
    ctx.stroke()
    ctx.fillText(String(gv), padL - 6, gy + 4)
  }
}

function histogram(canvas, probas, modelLabel) {
  const s = setupHiDpi(canvas)
  const ctx = s.ctx, W = s.w, H = s.h
  ctx.clearRect(0, 0, W, H)
  const padL = 44, padB = 48, padT = 30, padR = 16
  const bins = new Array(10).fill(0)
  probas.forEach((p) => {
    const b = Math.min(9, Math.floor(p * 10))
    bins[b]++
  })
  let max = 1
  for (let i = 0; i < 10; i++) max = Math.max(max, bins[i])
  ctx.fillStyle = '#334155'
  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('P(at-risk) — ' + modelLabel, W / 2, 16)
  const slot = (W - padL - padR) / 10
  for (let k = 0; k < 10; k++) {
    const bh = (H - padT - padB) * (bins[k] / max)
    const x = padL + k * slot + 2
    const bw = slot - 4
    const y = H - padB - bh
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 4)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 11px Inter, sans-serif'
    if (bins[k] > 0) ctx.fillText(String(bins[k]), x + bw / 2, y - 5)
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText((k / 10).toFixed(1), x + bw / 2, H - padB + 14)
  }
  ctx.strokeStyle = '#e2e8f0'
  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'right'
  ctx.font = '11px Inter, sans-serif'
  for (let g = 0; g <= 4; g++) {
    const gv = Math.round(max * g / 4)
    const gy = H - padB - ((H - padT - padB) * g) / 4
    ctx.beginPath()
    ctx.moveTo(padL, gy)
    ctx.lineTo(W - padR, gy)
    ctx.stroke()
    ctx.fillText(String(gv), padL - 6, gy + 4)
  }
}

export function Charts({ results, chartModel }) {
  const bandRef = useRef(null)
  const histRef = useRef(null)

  useEffect(() => {
    const bandC = bandRef.current
    const histC = histRef.current
    if (!bandC || !histC) return
    const m = chartModel
    const res = m ? results[m.id] : null
    if (!res || !res.length) {
      empty(bandC, 'No results yet — run predictions.')
      empty(histC, 'No results yet — run predictions.')
      return
    }
    const dist = { Low: 0, Medium: 0, High: 0 }
    const probas = res.map((r) => {
      dist[r.band.name]++
      return r.proba
    })
    bandBar(bandC, dist, m.label)
    histogram(histC, probas, m.label)
  }, [results, chartModel])

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">3</span>
        <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Visuals</p>
      </div>
      <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Risk bands & distribution</h2>
      <div className="mt-1 h-px bg-slate-100" />
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <figure className="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <figcaption className="text-[0.82rem] font-semibold text-slate-700 mb-2">Band distribution</figcaption>
          <canvas ref={bandRef} width="640" height="360" role="img" aria-label="Bar chart of Low, Medium and High band counts" className="w-full h-auto rounded-lg border border-slate-200 bg-white block" />
        </figure>
        <figure className="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <figcaption className="text-[0.82rem] font-semibold text-slate-700 mb-2">Probability histogram · 10 bins</figcaption>
          <canvas ref={histRef} width="640" height="360" role="img" aria-label="Histogram of predicted at-risk probabilities" className="w-full h-auto rounded-lg border border-slate-200 bg-white block" />
        </figure>
      </div>
      <p className="mt-3 text-xs text-slate-500">Bands on P(at-risk): Low 0–0.39 · Medium 0.40–0.69 · High 0.70–1.00.</p>
    </section>
  )
}
