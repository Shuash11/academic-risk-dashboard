import { useEffect, useState, useMemo } from 'react'
import { RiskBands } from '../lib/riskBands.js'
import { SignalNotes } from '../lib/signalNotes.js'

function BandPill({ band }) {
  const map = {
    'band-low': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'band-medium': 'bg-amber-50 text-amber-800 border-amber-200 border-dashed',
    'band-high': 'bg-red-50 text-red-800 border-red-200',
  }
  return <span className={`inline-flex items-center gap-1 text-[0.72rem] font-bold tracking-wide rounded-full px-2.5 py-1 border ${map[band.css] || 'bg-slate-50 border-slate-200'}`}>{band.name}</span>
}
function fmtCell(v) { return typeof v === 'number' && isFinite(v) ? String(Math.round(v * 10000) / 10000) : null }

function worstBand(bands) {
  const order = { 'High': 2, 'Medium': 1, 'Low': 0 }
  let worst = bands[0]
  for (const b of bands) { if ((order[b.name] || 0) > (order[worst.name] || 0)) worst = b }
  return worst
}

function StudentGroup({ group, models, results, selectedRow, onSelectRow, isExpanded, onToggle }) {
  const { displayId, indices, rows: groupRows } = group

  const groupSummary = useMemo(() => {
    const bands = []
    let worstProb = 0
    indices.forEach((idx) => {
      models.forEach((m) => {
        const r = results[m.id] ? results[m.id][idx] : null
        if (r) { bands.push(r.band); worstProb = Math.max(worstProb, r.proba) }
      })
    })
    const uniqueBands = [...new Set(bands.map((b) => b.name))]
    const wb = bands.length > 0 ? worstBand(bands) : { name: 'Low', css: 'band-low' }
    return { count: groupRows.length, worstBand: wb, worstProb, bandNames: uniqueBands }
  }, [indices, models, results, groupRows])

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
        <span className="font-bold text-slate-900 text-sm min-w-0 truncate">{displayId}</span>
        <span className="text-xs text-slate-500 shrink-0">{groupRows.length} enrollment{groupRows.length > 1 ? 's' : ''}</span>
        <span className="ml-auto shrink-0"><BandPill band={groupSummary.worstBand} /></span>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                <th className="py-2 px-4 font-semibold">#</th>
                {models.length === 1 ? (
                  <>
                    <th className="py-2 px-4 font-semibold text-right">{models[0].label}</th>
                    <th className="py-2 px-4 font-semibold text-right">P(at-risk)</th>
                    <th className="py-2 px-4 font-semibold">Band</th>
                  </>
                ) : models.map((m) => <th key={m.id} className="py-2 px-4 font-semibold">{m.label}</th>)}
                <th className="py-2 px-4 font-semibold">Program</th>
                <th className="py-2 px-4 font-semibold">Enrollment</th>
                <th className="py-2 px-4 font-semibold">Year</th>
                <th className="py-2 px-4 font-semibold">GWA</th>
                <th className="py-2 px-4 font-semibold text-right" title="Subjects this semester (parsed from Final Grades)">n_subjects_t</th>
                <th className="py-2 px-4 font-semibold text-right" title="Mean final grade (parsed from Final Grades)">mean_grade_t</th>
                <th className="py-2 px-4 font-semibold text-right" title="Failed subjects in grades string (grade exactly 5.0)">n_failed_grades_t</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupRows.map((row, localIdx) => {
                const absIdx = indices[localIdx]
                const sel = selectedRow === absIdx ? 'bg-slate-900/[0.04] ring-1 ring-inset ring-slate-900' : ''
                return (
                  <tr key={absIdx} onClick={() => onSelectRow(absIdx)} className={`cursor-pointer hover:bg-slate-50 transition ${sel}`}>
                    <td className="py-2.5 px-4 tabular-nums text-slate-600 text-right">{localIdx + 1}</td>
                    {models.length === 1 ? (results[models[0].id] ? <>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium">{results[models[0].id][absIdx].label}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{RiskBands.fmtProba(results[models[0].id][absIdx].proba)}</td>
                      <td className="py-2.5 px-4"><BandPill band={results[models[0].id][absIdx].band} /></td>
                    </> : <td colSpan={3} className="py-2.5 px-4 text-slate-500">not run</td>) : models.map((m) => { const rr = results[m.id] ? results[m.id][absIdx] : null; return rr ? <td key={m.id} className="py-2.5 px-4 tabular-nums whitespace-nowrap">{rr.label} · {RiskBands.fmtProba(rr.proba)} <span className="ml-1"><BandPill band={rr.band} /></span></td> : <td key={m.id} className="py-2.5 px-4 text-slate-500">not run</td> })}
                    <td className="py-2.5 px-4 text-xs text-slate-700">{row.program || '—'}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-700">{row.enrollHist || '—'}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-700">{fmtCell(row.year) || '—'}</td>
                    <td className="py-2.5 px-4 text-xs tabular-nums font-medium">{fmtCell(row.gwa) ?? <span className="text-slate-400">—</span>}</td>
                    <td className="py-2.5 px-4 text-xs tabular-nums text-right">{fmtCell(row.nSubjects) ?? <span className="text-slate-400" title="no parsable grades → in-graph median imputation">—</span>}</td>
                    <td className="py-2.5 px-4 text-xs tabular-nums text-right">{fmtCell(row.meanGrade) ?? <span className="text-slate-400" title="no parsable grades → in-graph median imputation">—</span>}</td>
                    <td className="py-2.5 px-4 text-xs tabular-nums text-right">{fmtCell(row.nFailedGrades) ?? <span className="text-slate-400" title="no parsable grades → in-graph median imputation">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ResultsTable({ rows, results, activeModels, allModels, selectedModelId, selectedRow, onSelectRow }) {
  const models = activeModels.length ? activeModels : selectedModelId === 'compare-all' ? allModels : allModels.filter((m) => m.id === selectedModelId)
  const hasRows = rows.length > 0
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    if (!hasRows) return []
    const map = new Map()
    rows.forEach((row, idx) => {
      const key = row.displayId || 'Row ' + (idx + 1)
      if (!map.has(key)) map.set(key, { displayId: key, indices: [], rows: [] })
      const g = map.get(key)
      g.indices.push(idx)
      g.rows.push(row)
    })
    return Array.from(map.values())
  }, [rows, hasRows])

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    return grouped.filter((g) => g.displayId.toLowerCase().includes(q))
  }, [grouped, search])

  const totalGroups = filteredGrouped.length
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = Math.min(start + pageSize, totalGroups)
  const pageGroups = filteredGrouped.slice(start, end)

  useEffect(() => { setPage(1) }, [totalGroups, pageSize, selectedModelId, activeModels.length])
  useEffect(() => {
    if (selectedRow >= 0 && hasRows) {
      const targetId = rows[selectedRow]?.displayId
      if (targetId) {
        const groupIdx = filteredGrouped.findIndex((g) => g.displayId === targetId)
        if (groupIdx >= 0) {
          const neededPage = Math.floor(groupIdx / pageSize) + 1
          if (neededPage !== safePage) setPage(neededPage)
          setExpandedGroups((prev) => new Set([...prev, targetId]))
        }
      }
    }
  }, [selectedRow, pageSize])

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedGroups(new Set(filteredGrouped.map((g) => g.displayId)))
  const collapseAll = () => setExpandedGroups(new Set())

  if (!hasRows) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">4</span>
          <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Details</p>
        </div>
        <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Student predictions</h2>
        <div className="mt-1 h-px bg-slate-100" />
        <p className="mt-4 text-sm text-slate-600">Grouped by Student ID — expand a student to view all their enrollment predictions.</p>
        <p className="mt-6 text-sm text-slate-500 italic rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">No predictions yet.</p>
      </section>
    )
  }

  const pageList = (() => {
    const pages = []
    const delta = 1
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta) || (totalPages <= 7)) pages.push(i)
      else if (pages[pages.length - 1] !== '…') pages.push('…')
    }
    return pages
  })()

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">4</span>
        <p className="m-0 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-slate-500">Details</p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-900">Student predictions</h2>
          <p className="mt-1 text-sm text-slate-600">Grouped by Student ID. Expand a student to view all their enrollment predictions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline">Students per page</span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-200 rounded-full bg-white px-2.5 py-1.5 text-sm font-medium">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" /> {totalGroups} student{totalGroups !== 1 ? 's' : ''} · {rows.length} total rows · page {safePage}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID…"
            className="border border-slate-200 rounded-full bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-300 w-32"
          />
          <button onClick={expandAll} className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-full bg-white border border-slate-200">Expand all</button>
          <button onClick={collapseAll} className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-full bg-white border border-slate-200">Collapse all</button>
        </div>
      </div>
      <div className="mt-1 h-px bg-slate-100" />

      <div className="mt-5 space-y-2">
        {pageGroups.map((group) => (
          <StudentGroup
            key={group.displayId}
            group={group}
            models={models}
            results={results}
            selectedRow={selectedRow}
            onSelectRow={onSelectRow}
            isExpanded={expandedGroups.has(group.displayId)}
            onToggle={() => toggleGroup(group.displayId)}
          />
        ))}
      </div>

      {/* print-only full table — all rows & all columns */}
      <div className="print-only hidden">
        <div className="mt-4 text-xs font-semibold text-slate-700">Student predictions — full ({rows.length} rows, all columns)</div>
        <table className="w-full text-[7pt] border-collapse mt-2">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-1.5 px-2 text-left">#</th>
              <th className="py-1.5 px-2 text-left">ID</th>
              {models.length === 1 ? (
                <>
                  <th className="py-1.5 px-2 text-right">{models[0].label} label</th>
                  <th className="py-1.5 px-2 text-right">P(at-risk)</th>
                  <th className="py-1.5 px-2 text-left">Band</th>
                </>
              ) : models.map((m) => <th key={m.id} className="py-1.5 px-2 text-left">{m.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, i) => (
              <tr key={'print-' + i} className="border-b border-slate-200">
                <td className="py-1 px-2 tabular-nums text-right">{i + 1}</td>
                <td className="py-1 px-2 font-medium">{row.displayId}</td>
                {models.length === 1 ? (results[models[0].id] ? <>
                  <td className="py-1 px-2 text-right">{results[models[0].id][i].label}</td>
                  <td className="py-1 px-2 text-right">{RiskBands.fmtProba(results[models[0].id][i].proba)}</td>
                  <td className="py-1 px-2">{results[models[0].id][i].band.name}</td>
                </> : <td colSpan={3} className="py-1 px-2">not run</td>) : models.map((m) => { const rr = results[m.id] ? results[m.id][i] : null; return rr ? <td key={m.id} className="py-1 px-2">{rr.label} · {RiskBands.fmtProba(rr.proba)} {rr.band.name}</td> : <td key={m.id} className="py-1 px-2">not run</td> })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 screen-only">
        <p className="text-xs text-slate-600">
          Showing <span className="font-semibold text-slate-900">{start + 1}–{end}</span> of <span className="font-semibold text-slate-900">{totalGroups}</span> student{totalGroups !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium disabled:opacity-40 hover:bg-slate-50">‹ Prev</button>
          <div className="hidden sm:flex items-center gap-1 mx-1">
            {pageList.map((p, i) => p === '…' ? <span key={'e' + i} className="px-1 text-slate-400">…</span> : (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-full text-sm font-semibold border ${p === safePage ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{p}</button>
            ))}
          </div>
          <span className="sm:hidden text-xs font-mono bg-slate-100 border border-slate-200 rounded-full px-2 py-1">{safePage} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium disabled:opacity-40 hover:bg-slate-50">Next ›</button>
        </div>
      </div>

      {selectedRow >= 0 && selectedRow < rows.length && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 screen-only" aria-live="polite">
          {(() => { const row = rows[selectedRow]; const perModels = activeModels.length ? activeModels : models; return (
            <>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Row {selectedRow + 1} · {row.displayId}</h3>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">GWA</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.gwa) ?? <span className="text-slate-400 text-xs">missing → in-graph fill</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed / Dropped</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.failed) ?? '—'} / {fmtCell(row.dropped) ?? '—'}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Units / Year</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.units) ?? '—'} / {fmtCell(row.year) ?? '—'}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500" title="Subjects this semester (parsed from Final Grades)">n_subjects_t</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.nSubjects) ?? <span className="text-slate-400 text-xs">no parsable grades → in-graph fill</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500" title="Mean final grade (parsed from Final Grades)">mean_grade_t</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.meanGrade) ?? <span className="text-slate-400 text-xs">no parsable grades → in-graph fill</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500" title="Failed subjects in grades string (grade exactly 5.0)">n_failed_grades_t</dt><dd className="mt-1 font-medium text-slate-900">{fmtCell(row.nFailedGrades) ?? <span className="text-slate-400 text-xs">no parsable grades → in-graph fill</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program</dt><dd className="mt-1 font-medium text-slate-900">{row.program || <span className="text-slate-400 text-xs">missing → in-graph fill</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enrollment</dt><dd className="mt-1 font-medium text-slate-900">{row.enrollHist || <span className="text-slate-400 text-xs">missing</span>}</dd></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous standing</dt><dd className="mt-1 font-medium text-slate-900">{row.prevStanding || <span className="text-slate-400 text-xs">missing</span>}</dd></div>
              </dl>
              <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Model outputs · class 1 = at-risk</p>
                <ul className="mt-2 space-y-2">
                  {perModels.map((m) => { const r = results[m.id] ? results[m.id][selectedRow] : null; return <li key={m.id} className="flex items-center justify-between gap-3 text-sm border border-slate-100 rounded-lg px-3 py-2 bg-slate-50"><span className="font-medium text-slate-800">{m.label}</span>{r ? <span className="flex items-center gap-2 tabular-nums">label <strong>{r.label}</strong> · {RiskBands.fmtProba(r.proba)} <BandPill band={r.band} /></span> : <span className="text-slate-500 text-xs">not run</span>}</li> })}
                </ul>
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-bold text-amber-900">Signals — association only, not model explanations</p>
                <ul className="mt-2 list-disc ml-5 space-y-1 text-sm text-amber-900">
                  {SignalNotes.forRow(row).map((n, idx) => <li key={idx}>{n}</li>)}
                </ul>
              </div>
            </>
          )})()}
        </div>
      )}
    </section>
  )
}
