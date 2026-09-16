import { useEffect, useRef, useState, useMemo } from 'react'
import { AppConfig } from './config.js'
import { CsvParser } from './lib/csvParser.js'
import { FeatureMapper } from './lib/featureMapper.js'
import { RiskBands } from './lib/riskBands.js'
import { ReportExporter } from './lib/reportExporter.js'
import { OnnxRunner } from './lib/onnxRunner.js'
import { Header } from './components/Header.jsx'
import { Nav } from './components/Nav.jsx'
import { Overlay } from './components/Overlay.jsx'
import { About } from './pages/About.jsx'
import { Compare } from './pages/Compare.jsx'
import { AcademicProfile } from './pages/AcademicProfile.jsx'
import { ModelEvaluation } from './pages/ModelEvaluation.jsx'
import { FeatureImportance } from './pages/FeatureImportance.jsx'
import { InterventionFramework } from './pages/InterventionFramework.jsx'
import { Performance } from './pages/Performance.jsx'
import { Controls } from './components/Controls.jsx'
import { StatusLog } from './components/StatusLog.jsx'
import { Summary } from './components/Summary.jsx'
import { Charts } from './components/Charts.jsx'
import { ResultsTable } from './components/ResultsTable.jsx'
import { ExportSection } from './components/ExportSection.jsx'

function stamp() {
  const d = new Date()
  const p = (x) => (x < 10 ? '0' : '') + x
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes())
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [rows, setRows] = useState([])
  const [results, setResults] = useState({})
  const [summary, setSummary] = useState(null)
  const [activeModels, setActiveModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('compare-all')
  const [selectedRow, setSelectedRow] = useState(-1)
  const [status, setStatus] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [rowLimit, setRowLimit] = useState(AppConfig.maxRows)
  const fileRef = useRef(null)
  const runnerRef = useRef(null)
  const hasInit = useRef(false)

  const pushStatus = (type, html) => setStatus((prev) => {
    if (prev.length && prev[prev.length - 1].html === html && prev[prev.length - 1].type === type) return prev
    const next = [...prev, { type, html }]
    return next.length > 80 ? next.slice(-80) : next
  })
  const info = (m) => pushStatus('ok', m)
  const warn = (m) => pushStatus('warn', 'Warning: ' + m)
  const error = (m) => pushStatus('err', 'Error: ' + m)
  const note = (m) => pushStatus('', m)
  const clearLog = () => setStatus([])

  useEffect(() => {
    if (hasInit.current) return
    hasInit.current = true
    const runner = new OnnxRunner({})
    runnerRef.current = runner
    import('onnxruntime-web').then((mod) => {
      const ort = mod.default || mod
      if (!ort || !ort.InferenceSession) {
        error('onnxruntime-web failed to load (<code>' + AppConfig.ortCdn + '</code>). Check your connection and reload. CSV import still works for inspection.')
      } else {
        note('Runtime ready — models load on demand (CPU/WASM). No data leaves your device.')
      }
    }).catch(() => {
      error('onnxruntime-web failed to load (<code>' + AppConfig.ortCdn + '</code>). Check your connection and reload.')
    })
  }, [])

  const allModels = AppConfig.models
  const resolveActiveModels = (sel) => (sel === 'compare-all' ? allModels.slice() : allModels.filter((m) => m.id === sel))
  const chartModel = useMemo(() => {
    if (selectedModel !== 'compare-all') return allModels.find((m) => m.id === selectedModel) || allModels[0]
    const pref = ['random_forest', 'decision_tree', 'logistic_regression', 'naive_bayes']
    for (const id of pref) if (results[id]) return allModels.find((m) => m.id === id)
    return allModels[0]
  }, [selectedModel, results])

  const clearAll = () => {
    setRows([])
    setResults({})
    setSummary(null)
    setSelectedRow(-1)
    setActiveModels([])
    setUploadedFile(null)
    setStatus([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const ingestCsv = async (text, name) => {
    setIsImporting(true)
    setImportProgress({ current: 1, total: 3, phase: 'Parsing CSV…', detail: 'Reading file and mapping headers' })
    await new Promise((r) => setTimeout(r, 60))

    let parsed
    try {
      parsed = CsvParser.parse(text)
    } catch (e) {
      setIsImporting(false)
      setImportProgress(null)
      error('Could not parse CSV: ' + e.message)
      return
    }

    if (parsed.headers.length === 0 || parsed.records.length === 0) {
      setIsImporting(false)
      setImportProgress(null)
      error('Cannot parse CSV (<code>' + name + '</code>): no header or data rows found. Expect headers like GWA, Failed Courses, …')
      return
    }

    setImportProgress({ current: 2, total: 3, phase: 'Mapping features…', detail: 'Matching columns to model inputs' })
    await new Promise((r) => setTimeout(r, 40))

    const mapping = FeatureMapper.mapHeaders(parsed.headers)
    const missing = FeatureMapper.FEATURES.filter((k) => mapping[k] === undefined)
    if (missing.length === FeatureMapper.FEATURES.length) {
      setIsImporting(false)
      setImportProgress(null)
      error('No expected headers found in <code>' + name + '</code>. Got: <code>' + parsed.headers.join(' | ') + '</code>.')
      return
    }
    if (missing.length > 0) warn('Missing columns [' + missing.join(', ') + '] — those inputs will be imputed in-graph.')

    setImportProgress({ current: 3, total: 3, phase: 'Converting rows…', detail: 'Processing ' + parsed.records.length.toLocaleString() + ' records' })
    await new Promise((r) => setTimeout(r, 40))

    let converted = FeatureMapper.toModelRows(parsed.headers, parsed.records, mapping)
    if (rowLimit > 0 && converted.rows.length > rowLimit) {
      warn('CSV has ' + converted.rows.length + ' rows; truncated to ' + rowLimit + '.')
      converted.rows = converted.rows.slice(0, rowLimit)
    }
    let mn = 0, mc = 0
    converted.rows.forEach((r) => {
      ;[r.gwa, r.failed, r.dropped, r.units, r.year].forEach((v) => { if (!(typeof v === 'number' && isFinite(v))) mn++ })
      ;[r.program, r.enrollHist, r.prevStanding].forEach((v) => { if (!v) mc++ })
    })
    converted = { ...converted, missingNumeric: mn, missingCat: mc, badNumeric: 0 }

    setRows(converted.rows)
    setResults({})
    setSummary(null)
    setSelectedRow(-1)
    setActiveModels([])
    setUploadedFile({ name, count: converted.rows.length, isSample: false })
    info('Imported <strong>' + converted.rows.length + ' row(s)</strong> from <code>' + name + '</code>. Mapped ' + (FeatureMapper.FEATURES.length - missing.length) + '/8 features. Missing numeric cells: ' + converted.missingNumeric + ' (will use median imputation); missing categorical cells: ' + converted.missingCat + ' (will use most-frequent fill). Press Run.')
    setActiveTab('dashboard')

    setIsImporting(false)
    setImportProgress(null)
  }

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      ingestCsv(String(reader.result || ''), file.name)
    }
    reader.onerror = () => error('Could not read <code>' + file.name + '</code>.')
    reader.readAsText(file)
  }

  const buildSummary = (active, res) => active.map((m) => {
    const r = res[m.id] || []
    const dist = { Low: 0, Medium: 0, High: 0 }
    let atRisk = 0, sum = 0
    r.forEach((rr) => { if (rr.label === 1) atRisk++; sum += rr.proba; dist[rr.band.name]++ })
    return { model: m.label, id: m.id, n: r.length, atRisk, rate: r.length ? atRisk / r.length : 0, meanProba: r.length ? sum / r.length : 0, dist }
  })

  const run = async () => {
    if (rows.length === 0) { error('Nothing to run — import a CSV first.'); return }
    try { await runnerRef.current.ensureOrt() } catch (err) { error(err.message); return }
    const models = resolveActiveModels(selectedModel)
    setActiveModels(models)
    setIsRunning(true)
    setRunProgress({ current: 0, total: models.length, label: 'Preparing…' })
    note('Running inference on <strong>' + rows.length + ' row(s)</strong> × ' + models.length + ' model(s) — CPU/WASM, local only…')
    const newResults = { ...results }
    const CHUNK = 800
    try {
      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        setRunProgress({ current: i + 1, total: models.length, label: m.label })
        note('Loading <code>' + m.file + '</code> …')
        await new Promise((r) => setTimeout(r, 30))
        await runnerRef.current.ensureModel(m.id)
        const chunkCount = Math.ceil(rows.length / CHUNK)
        let allLabels = []
        let allProba = []
        for (let c = 0; c < chunkCount; c++) {
          const start = c * CHUNK
          const end = Math.min(start + CHUNK, rows.length)
          if (chunkCount > 1) {
            setRunProgress({ current: i + 1, total: models.length, label: `${m.label} ${end}/${rows.length}` })
          }
          const chunk = rows.slice(start, end)
          const out = await runnerRef.current.predict(m.id, chunk)
          allLabels.push(...out.labels)
          allProba.push(...out.proba)
          await new Promise((r) => setTimeout(r, 0))
          await new Promise((r) => requestAnimationFrame(() => r()))
        }
        const packed = allLabels.map((label, idx) => ({ label, proba: allProba[idx][AppConfig.atRiskClass], band: RiskBands.bandOf(allProba[idx][AppConfig.atRiskClass]) }))
        newResults[m.id] = packed
        setResults({ ...newResults })
        info('<strong>' + m.label + '</strong>: ' + packed.length + ' prediction(s) ready.')
        await new Promise((r) => setTimeout(r, 16))
      }
      setSummary(buildSummary(models, newResults))
      info('Done — all models completed.')
    } catch (err) { error((err && err.message) ? err.message : String(err)) } finally { setIsRunning(false); setRunProgress(null) }
  }

  const exportCsv = () => {
    if (!rows.length || !activeModels.length || !summary) { error('Nothing to export — run predictions first.'); return }
    ReportExporter.download('report_' + stamp() + '.csv', ReportExporter.buildCsv({ rows, results, activeModels, summary }), 'text/csv')
    info('Downloaded predictions CSV.')
  }
  const exportJson = () => {
    if (!rows.length || !activeModels.length || !summary) { error('Nothing to export — run predictions first.'); return }
    ReportExporter.download('report_' + stamp() + '.json', ReportExporter.buildJson({ rows, results, activeModels, summary }), 'application/json')
    info('Downloaded report JSON.')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Overlay show={isImporting} label="Importing data…" sub={importProgress?.phase || 'Processing CSV file'} progress={importProgress} />
      <Overlay show={isRunning} label="Running predictions…" sub="Processing models locally in your browser" progress={runProgress ? { current: runProgress.current, total: runProgress.total, phase: runProgress.label, detail: `${rows.length.toLocaleString()} rows × ${activeModels.length || resolveActiveModels(selectedModel).length} model(s)` } : null} />
      <Header />
      <Nav active={activeTab} onChange={setActiveTab} />
      {activeTab === 'dashboard' && (
        <main id="main" tabIndex={-1} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-6">
            <Controls selectedModel={selectedModel} onModelChange={setSelectedModel} onFileChange={handleFile} onClear={clearAll} onRun={run} isRunning={isRunning} runProgress={runProgress} fileInputRef={fileRef} uploadedFile={uploadedFile} rowCount={rows.length} onShowActivity={() => setShowActivityModal(true)} activityCount={status.length} rowLimit={rowLimit} onRowLimitChange={setRowLimit} />
            <Summary summary={summary} />
            <Charts results={results} chartModel={chartModel} />
            <ResultsTable rows={rows} results={results} activeModels={activeModels} allModels={allModels} selectedModelId={selectedModel} selectedRow={selectedRow} onSelectRow={setSelectedRow} />
            <ExportSection onPrint={() => window.print()} onCsv={exportCsv} onJson={exportJson} />
          </div>
        </main>
      )}
      {activeTab === 'performance' && <Performance />}
      {activeTab === 'about' && <About />}
      {activeTab === 'compare' && <Compare />}
      {activeTab === 'profile' && <AcademicProfile rows={rows} />}
      {activeTab === 'evaluation' && <ModelEvaluation />}
      {activeTab === 'predictors' && <FeatureImportance />}
      {activeTab === 'intervention' && <InterventionFramework />}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-slate-900">Academic Risk Dashboard</p>
          <p className="text-slate-500 text-xs">© 2026 · All rights reserved.</p>
        </div>
      </footer>

      {showActivityModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowActivityModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-slate-700">Activity Log</h2>
                <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 font-mono text-slate-600">{status.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearLog} disabled={status.length === 0} className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 px-2 py-1">Clear</button>
                <button onClick={() => setShowActivityModal(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <StatusLog entries={status} onClear={clearLog} compact />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
