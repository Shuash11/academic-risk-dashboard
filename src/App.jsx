import { useEffect, useRef, useState, useMemo } from 'react'
import { AppConfig, SAMPLE_HEADERS, SAMPLE_ROWS } from './config.js'
import { CsvParser } from './lib/csvParser.js'
import { FeatureMapper } from './lib/featureMapper.js'
import { RiskBands } from './lib/riskBands.js'
import { ReportExporter } from './lib/reportExporter.js'
import { OnnxRunner } from './lib/onnxRunner.js'
import { Header } from './components/Header.jsx'
import { Nav } from './components/Nav.jsx'
import { About } from './pages/About.jsx'
import { Compare } from './pages/Compare.jsx'
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

  const loadSampleRows = () => {
    const newRows = SAMPLE_ROWS.map((s, i) => ({
      index: i,
      displayId: s.id,
      synthetic: true,
      gwa: s.gwa,
      failed: s.failed,
      dropped: s.dropped,
      units: s.units,
      year: s.year,
      program: s.program,
      enrollHist: s.enrollHist,
      prevStanding: s.prevStanding,
    }))
    setRows(newRows)
    setResults({})
    setSummary(null)
    setSelectedRow(-1)
    setActiveModels([])
    setUploadedFile({ name: 'Sample rows', count: newRows.length, isSample: true })
    info('Loaded <strong>3 sample rows</strong> (SAMPLE-01…03). Row 03 has empty fields to show in-graph imputation. Press Run.')
    setActiveTab('dashboard')
  }

  const sampleCsvText = () => {
    function f(v) { return typeof v === 'number' && !isFinite(v) ? '' : v }
    const lines = [SAMPLE_HEADERS.map(ReportExporter.csvCell).join(',')]
    const meta = [
      ['2024-2025', '1st Semester', ''],
      ['2024-2025', '2nd Semester', ''],
      ['2024-2025', '1st Semester', ''],
    ]
    SAMPLE_ROWS.forEach((s, i) => {
      lines.push([s.id, meta[i][0], meta[i][1], meta[i][2], f(s.gwa), s.failed, s.dropped, s.program, s.year, s.enrollHist, s.units, s.prevStanding].map(ReportExporter.csvCell).join(','))
    })
    return lines.join('\r\n') + '\r\n'
  }

  const downloadSampleCsv = () => {
    ReportExporter.download('sample_rows.csv', sampleCsvText(), 'text/csv')
    note('Downloaded the 3-row sample CSV.')
  }

  const clearAll = () => {
    setRows([])
    setResults({})
    setSummary(null)
    setSelectedRow(-1)
    setActiveModels([])
    setUploadedFile(null)
    if (fileRef.current) fileRef.current.value = ''
    note('Cleared all rows and results.')
  }

  const ingestCsv = (text, name) => {
    const parsed = CsvParser.parse(text)
    if (parsed.headers.length === 0 || parsed.records.length === 0) {
      error('Cannot parse CSV (<code>' + name + '</code>): no header or data rows found. Expect headers like GWA, Failed Courses, …')
      return
    }
    const mapping = FeatureMapper.mapHeaders(parsed.headers)
    const missing = FeatureMapper.FEATURES.filter((k) => mapping[k] === undefined)
    if (missing.length === FeatureMapper.FEATURES.length) {
      error('No expected headers found in <code>' + name + '</code>. Got: <code>' + parsed.headers.join(' | ') + '</code>.')
      return
    }
    if (missing.length > 0) warn('Missing columns [' + missing.join(', ') + '] — those inputs will be imputed in-graph.')
    let converted = FeatureMapper.toModelRows(parsed.headers, parsed.records, mapping)
    if (converted.rows.length > AppConfig.maxRows) {
      warn('CSV has ' + converted.rows.length + ' rows; truncated to ' + AppConfig.maxRows + '.')
      converted.rows = converted.rows.slice(0, AppConfig.maxRows)
    }
    setRows(converted.rows)
    setResults({})
    setSummary(null)
    setSelectedRow(-1)
    setActiveModels([])
    setUploadedFile({ name, count: converted.rows.length, isSample: false })
    info('Imported <strong>' + converted.rows.length + ' row(s)</strong> from <code>' + name + '</code>. Mapped ' + (FeatureMapper.FEATURES.length - missing.length) + '/8 features. Missing numerics: ' + converted.missingNumeric + ' → NaN; categoricals: ' + converted.missingCat + ' → ""; bad numerics: ' + converted.badNumeric + ' → NaN. Press Run.')
    setActiveTab('dashboard')
  }

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { ingestCsv(String(reader.result || ''), file.name) } catch (err) { error('Could not parse CSV: ' + err.message) }
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
    if (rows.length === 0) { error('Nothing to run — load sample rows or import a CSV first.'); return }
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
        // chunked inference to keep UI responsive (5000 rows in one go blocks main thread)
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
          // yield to browser so Activity log stays scrollable
          await new Promise((r) => setTimeout(r, 0))
          // allow React to paint progress
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
      <Header />
      <Nav active={activeTab} onChange={setActiveTab} />
      {activeTab === 'dashboard' && (
        <main id="main" tabIndex={-1} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-6">
            <Controls selectedModel={selectedModel} onModelChange={setSelectedModel} onFileChange={handleFile} onLoadSample={loadSampleRows} onDownloadSampleCsv={downloadSampleCsv} onClear={clearAll} onRun={run} isRunning={isRunning} runProgress={runProgress} fileInputRef={fileRef} uploadedFile={uploadedFile} rowCount={rows.length} />
            <StatusLog entries={status} onClear={clearLog} />
            <Summary summary={summary} />
            <Charts results={results} chartModel={chartModel} />
            <ResultsTable rows={rows} results={results} activeModels={activeModels} allModels={allModels} selectedModelId={selectedModel} selectedRow={selectedRow} onSelectRow={setSelectedRow} />
            <ExportSection onPrint={() => window.print()} onCsv={exportCsv} onJson={exportJson} />
          </div>
        </main>
      )}
      {activeTab === 'about' && <About />}
      {activeTab === 'compare' && <Compare />}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-slate-900">Academic Risk Dashboard</p>
          <p className="text-slate-500 text-xs">© 2026 · All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
