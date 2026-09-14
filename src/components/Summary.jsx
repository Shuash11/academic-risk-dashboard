import { RiskBands } from '../lib/riskBands.js'

export function Summary({ summary }) {
  const isEmpty = !summary || !summary.length
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">2</span>
        <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Overview</p>
      </div>
      <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Summary</h2>
      <p className="mt-1 text-sm text-slate-600 max-w-[70ch]">Counts and risk-band shares for this run. For monitoring and triage, not a formal evaluation.</p>
      <div className="mt-1 h-px bg-slate-100" />
      {isEmpty ? (
        <p className="mt-6 text-sm text-slate-500 italic rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">No results yet — run predictions to see the summary.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">{s.model}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{s.n} <span className="text-sm font-medium text-slate-500">rows</span></p>
                <p className="mt-1 text-sm tabular-nums"><span className="font-bold text-slate-900">{s.atRisk}</span> <span className="text-slate-600">at-risk</span> <span className="text-slate-500">· {(Math.round(s.rate * 1000) / 10).toFixed(1)}%</span></p>
                <p className="text-xs text-slate-500">mean P = {RiskBands.fmtProba(s.meanProba)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Per-model summary</caption>
              <thead className="bg-slate-900 text-white">
                <tr className="text-left text-[0.72rem] tracking-wide uppercase">
                  <th className="py-3 px-3 font-semibold">Model</th>
                  <th className="py-3 px-3 font-semibold text-right">Rows</th>
                  <th className="py-3 px-3 font-semibold text-right">At-risk</th>
                  <th className="py-3 px-3 font-semibold text-right">Rate</th>
                  <th className="py-3 px-3 font-semibold text-right">Mean P</th>
                  <th className="py-3 px-3 font-semibold text-right">Low</th>
                  <th className="py-3 px-3 font-semibold text-right">Med</th>
                  <th className="py-3 px-3 font-semibold text-right">High</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-900">{s.model}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{s.n}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold">{s.atRisk}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{(Math.round(s.rate * 10000) / 100).toFixed(1)}%</td>
                    <td className="py-3 px-3 text-right tabular-nums">{RiskBands.fmtProba(s.meanProba)}</td>
                    <td className="py-3 px-3 text-right tabular-nums"><span className="inline-flex min-w-[1.6rem] justify-center rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 text-xs font-bold">{s.dist.Low}</span></td>
                    <td className="py-3 px-3 text-right tabular-nums"><span className="inline-flex min-w-[1.6rem] justify-center rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 text-xs font-bold">{s.dist.Medium}</span></td>
                    <td className="py-3 px-3 text-right tabular-nums"><span className="inline-flex min-w-[1.6rem] justify-center rounded-full bg-red-50 text-red-900 border border-red-200 px-1.5 py-0.5 text-xs font-bold">{s.dist.High}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
