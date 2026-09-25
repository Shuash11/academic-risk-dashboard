import { useMemo } from 'react'

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</dd>
    </div>
  )
}

function Histogram({ title, data, bins, color = '#0f172a' }) {
  const canvasRef = useMemo(() => ({ current: null }), [])
  const ref = (el) => {
    canvasRef.current = el
    if (!el) return
    const dpr = window.devicePixelRatio || 1
    const W = 640, H = 320
    el.width = W * dpr
    el.height = H * dpr
    el.style.aspectRatio = W + ' / ' + H
    const ctx = el.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padB = 48, padT = 32, padR = 16
    const max = Math.max(1, ...bins.map((b) => b.count))
    const slot = (W - padL - padR) / bins.length

    ctx.fillStyle = '#334155'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, W / 2, 18)

    bins.forEach((b, i) => {
      const bh = (H - padT - padB) * (b.count / max)
      const x = padL + i * slot + 2
      const bw = slot - 4
      const y = H - padB - bh
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, bw, bh, 4)
      ctx.fill()
      if (b.count > 0) {
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 10px Inter, sans-serif'
        ctx.fillText(String(b.count), x + bw / 2, y - 5)
      }
      ctx.fillStyle = '#64748b'
      ctx.font = '9px Inter, sans-serif'
      ctx.fillText(b.label, x + bw / 2, H - padB + 14)
    })

    ctx.strokeStyle = '#e2e8f0'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'right'
    ctx.font = '10px Inter, sans-serif'
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
  return <canvas ref={ref} width="640" height="320" className="w-full h-auto rounded-lg border border-slate-200 bg-white block" />
}

function BarChart({ title, data, color = '#0f172a' }) {
  const ref = (el) => {
    if (!el) return
    const dpr = window.devicePixelRatio || 1
    const W = 640, H = 320
    el.width = W * dpr
    el.height = H * dpr
    el.style.aspectRatio = W + ' / ' + H
    const ctx = el.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padB = 60, padT = 32, padR = 16
    const max = Math.max(1, ...data.map((d) => d.value))
    const slot = (W - padL - padR) / data.length

    ctx.fillStyle = '#334155'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, W / 2, 18)

    data.forEach((d, i) => {
      const bh = (H - padT - padB) * (d.value / max)
      const x = padL + i * slot + slot * 0.15
      const bw = slot * 0.7
      const y = H - padB - bh
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, bw, bh, 4)
      ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 10px Inter, sans-serif'
      if (d.value > 0) ctx.fillText(String(d.value), x + bw / 2, y - 5)
      ctx.save()
      ctx.translate(x + bw / 2, H - padB + 10)
      ctx.rotate(-Math.PI / 6)
      ctx.fillStyle = '#475569'
      ctx.font = '9px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(d.label.length > 16 ? d.label.slice(0, 14) + '…' : d.label, 0, 0)
      ctx.restore()
    })
  }
  return <canvas ref={ref} width="640" height="320" className="w-full h-auto rounded-lg border border-slate-200 bg-white block" />
}

function makeNumericStats(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === 'number' && isFinite(v))
  if (vals.length === 0) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const n = sorted.length
  const mean = vals.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
  const min = sorted[0]
  const max = sorted[n - 1]
  const q1 = sorted[Math.floor(n * 0.25)]
  const q3 = sorted[Math.floor(n * 0.75)]
  return { count: n, missing: rows.length - n, mean, median, std, min, max, q1, q3 }
}

function makeHistogramBins(vals, edges) {
  const counts = new Array(edges.length - 1).fill(0)
  vals.forEach((v) => {
    if (!(typeof v === 'number' && isFinite(v))) return
    for (let i = 0; i < edges.length - 1; i++) {
      if (v >= edges[i] && v < edges[i + 1]) { counts[i]++; return }
      if (i === edges.length - 2 && v >= edges[i]) { counts[i]++; return }
    }
  })
  return counts.map((count, i) => ({
    label: `${edges[i]}–${edges[i + 1]}`,
    count,
  }))
}

function makeCategoryBreakdown(rows, key) {
  const counts = {}
  rows.forEach((r) => {
    const v = r[key]
    const k = (typeof v === 'string' && v.trim()) ? v.trim() : '(empty)'
    counts[k] = (counts[k] || 0) + 1
  })
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function fmt(v, decimals = 2) {
  if (v === null || v === undefined) return '—'
  return typeof v === 'number' ? v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : String(v)
}

export function AcademicProfile({ rows }) {
  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null

    const gwaStats = makeNumericStats(rows, 'gwa')
    const failedStats = makeNumericStats(rows, 'failed')
    const droppedStats = makeNumericStats(rows, 'dropped')
    const unitsStats = makeNumericStats(rows, 'units')
    const yearStats = makeNumericStats(rows, 'year')

    const programBreakdown = makeCategoryBreakdown(rows, 'program')
    const standingBreakdown = makeCategoryBreakdown(rows, 'prevStanding')
    const enrollBreakdown = makeCategoryBreakdown(rows, 'enrollHist')

    const gwaBins = makeHistogramBins(rows.map((r) => r.gwa), [0, 1.0, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 5.0])

    // Same-semester fail/drop counts — descriptive context only, NOT the model's
    // t+1 target (the models predict at-risk on the student's NEXT record).
    const failedDropCount = rows.filter((r) => {
      const failed = typeof r.failed === 'number' && isFinite(r.failed) ? r.failed : 0
      const dropped = typeof r.dropped === 'number' && isFinite(r.dropped) ? r.dropped : 0
      return failed > 0 || dropped > 0
    }).length

    return {
      totalRows: rows.length,
      gwaStats, failedStats, droppedStats, unitsStats, yearStats,
      programBreakdown, standingBreakdown, enrollBreakdown,
      gwaBins, failedDropCount, failedDropRate: rows.length ? failedDropCount / rows.length : 0,
    }
  }, [rows])

  if (!stats) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Academic Profile</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Descriptive statistics and analysis of student academic records.</p>
        <p className="mt-6 text-sm text-slate-500 italic rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">No data loaded — import a CSV or load sample rows on the Dashboard tab to view the academic profile.</p>
      </div>
    )
  }

  const numericTable = [
    { label: 'GWA', s: stats.gwaStats },
    { label: 'Failed Courses', s: stats.failedStats },
    { label: 'Dropped Courses', s: stats.droppedStats },
    { label: 'Total Units', s: stats.unitsStats },
    { label: 'Year Level', s: stats.yearStats },
  ].filter((r) => r.s)

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Academic Profile</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Descriptive statistics and distribution analysis of the loaded student dataset. Computed in-browser from the imported CSV.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Total Records" value={stats.totalRows.toLocaleString()} />
        <Stat label="Unique Programs" value={stats.programBreakdown.length} />
        <Stat label="Failed/Drop Records" value={stats.failedDropCount.toLocaleString()} />
        <Stat label="Failed/Drop Rate" value={(stats.failedDropRate * 100).toFixed(1) + '%'} />
        <Stat label="Missing GWA" value={stats.gwaStats ? stats.gwaStats.missing.toLocaleString() : '0'} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Failed/Drop counts describe the current semester's records — rows with at least one failed or dropped course. Descriptive context only, not the model's t+1 target.
      </p>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white">
          <h2 className="text-sm font-bold tracking-wide uppercase">Numeric Feature Statistics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 px-4 font-semibold">Feature</th>
                <th className="py-3 px-4 font-semibold text-right">Count</th>
                <th className="py-3 px-4 font-semibold text-right">Missing</th>
                <th className="py-3 px-4 font-semibold text-right">Mean</th>
                <th className="py-3 px-4 font-semibold text-right">Median</th>
                <th className="py-3 px-4 font-semibold text-right">Std</th>
                <th className="py-3 px-4 font-semibold text-right">Min</th>
                <th className="py-3 px-4 font-semibold text-right">Q1</th>
                <th className="py-3 px-4 font-semibold text-right">Q3</th>
                <th className="py-3 px-4 font-semibold text-right">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {numericTable.map(({ label, s }) => (
                <tr key={label} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{label}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{s.count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-amber-700">{s.missing.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.mean)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.median)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.std)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.min)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.q1)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.q3)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{fmt(s.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-5">
          <figcaption className="text-sm font-bold text-slate-900 mb-3">GWA Distribution</figcaption>
          <Histogram title="GWA histogram (all records)" data={stats.gwaBins.map((b) => b.count)} bins={stats.gwaBins} color="#1d4e89" />
        </figure>
        <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-5">
          <figcaption className="text-sm font-bold text-slate-900 mb-3">Program Enrollment</figcaption>
          <BarChart title="Students by program" data={stats.programBreakdown.slice(0, 12)} color="#1f7a4d" />
        </figure>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-5">
          <figcaption className="text-sm font-bold text-slate-900 mb-3">Previous Academic Standing</figcaption>
          <BarChart title="Standing distribution" data={stats.standingBreakdown} color="#d97706" />
        </figure>
        <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-5">
          <figcaption className="text-sm font-bold text-slate-900 mb-3">Enrollment History</figcaption>
          <BarChart title="Enrollment count distribution" data={stats.enrollBreakdown} color="#7c3aed" />
        </figure>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">About this profile</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc ml-5 marker:text-slate-400">
          <li>All statistics are computed in-browser from the imported CSV data — no data is sent anywhere.</li>
          <li>The models predict at-risk on the student's NEXT record (t+1): failing or dropping courses on the next enrollment. The same-semester counts above are descriptive context only — the earlier candidate target (next-semester academic standing) was audited, found exactly re-derivable from same-semester data, and rejected (see prediction_design in <code className="bg-slate-100 border border-slate-200 rounded px-1">model_metrics.json</code>).</li>
          <li>GWA values range from 1.0 (highest) to 5.0 (lowest) in the Philippine grading system; only exactly 5.0 denotes a failed subject.</li>
          <li>Missing values are shown separately — the ONNX models handle imputation internally.</li>
        </ul>
      </div>
    </div>
  )
}
