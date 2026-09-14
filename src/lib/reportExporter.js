import { AppConfig } from '../config.js'
import { RiskBands } from './riskBands.js'
import { SignalNotes } from './signalNotes.js'

export const ReportExporter = {
  stampLines() {
    return {
      title: AppConfig.reportTitle,
      bands: 'Low 0–0.39 / Medium 0.40–0.69 / High 0.70–1.00 (on P(at-risk), class 1 = at-risk)',
      generatedAt: new Date().toISOString(),
    }
  },
  csvCell(v) {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  },
  numCell(v) {
    return typeof v === 'number' && isFinite(v) ? String(Math.round(v * 10000) / 10000) : ''
  },
  buildCsv(state) {
    const head = [
      'row',
      'display_id',
      'GWA',
      'Number_of_Failed_Courses',
      'Number_of_Dropped_Courses',
      'Total_Units_Taken',
      'Year_Level',
      'Course_Program_Enrolled',
      'Enrollment_History',
      'Previous_Academic_Standing',
    ]
    state.activeModels.forEach((m) => {
      head.push(m.id + '_label', m.id + '_proba_at_risk', m.id + '_band')
    })
    head.push('note')
    const lines = [head.map(ReportExporter.csvCell).join(',')]
    state.rows.forEach((row, i) => {
      const cells = [
        i + 1,
        row.displayId,
        ReportExporter.numCell(row.gwa),
        ReportExporter.numCell(row.failed),
        ReportExporter.numCell(row.dropped),
        ReportExporter.numCell(row.units),
        ReportExporter.numCell(row.year),
        row.program,
        row.enrollHist,
        row.prevStanding,
      ]
      state.activeModels.forEach((m) => {
        const r = state.results[m.id] ? state.results[m.id][i] : null
        cells.push(r ? r.label : '', r ? RiskBands.fmtProba(r.proba) : '', r ? r.band.name : '')
      })
      cells.push('')
      lines.push(cells.map(ReportExporter.csvCell).join(','))
    })
    return lines.join('\r\n') + '\r\n'
  },
  buildJson(state) {
    const meta = ReportExporter.stampLines()
    return JSON.stringify(
      {
        title: meta.title,
        generated_at: meta.generatedAt,
        bands: meta.bands,
        contract: {
          inputs: '8 in order: 5 float32 [N,1] + 3 string [N,1]',
          outputs: 'label [N] (classes [0,1], 1 = at-risk), probabilities [N,2]',
          missing: "numerics NaN (median-imputed in-graph), categoricals '' (most-frequent fill in-graph)",
        },
        models: state.activeModels.map((m) => ({ id: m.id, file: m.file })),
        summary: state.summary,
        rows: state.rows.map((row, i) => {
          const perModel = {}
          state.activeModels.forEach((m) => {
            const r = state.results[m.id] ? state.results[m.id][i] : null
            perModel[m.id] = r ? { label: r.label, proba_at_risk: r.proba, band: r.band.name } : null
          })
          return {
            display_id: row.displayId,
            features: {
              GWA: isFinite(row.gwa) ? row.gwa : null,
              Number_of_Failed_Courses: isFinite(row.failed) ? row.failed : null,
              Number_of_Dropped_Courses: isFinite(row.dropped) ? row.dropped : null,
              Total_Units_Taken: isFinite(row.units) ? row.units : null,
              Year_Level: isFinite(row.year) ? row.year : null,
              Course_Program_Enrolled: row.program || null,
              Enrollment_History: row.enrollHist || null,
              Previous_Academic_Standing: row.prevStanding || null,
            },
            signals: SignalNotes.forRow(row),
            predictions: perModel,
          }
        }),
      },
      null,
      2
    )
  },
  download(filename, content, mime) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 500)
  },
}
