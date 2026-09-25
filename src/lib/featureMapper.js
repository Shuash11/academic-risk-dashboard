import { GradeParser } from './gradeParser.js'

// Shared, stateless parser instance (mirrors training's DatasetBuilder.parser).
const gradeParser = new GradeParser()

export const FeatureMapper = {
  FEATURES: ['gwa', 'failed', 'dropped', 'units', 'year', 'finalGrades', 'program', 'enrollHist', 'prevStanding'],
  NUMERIC_KEYS: ['gwa', 'failed', 'dropped', 'units', 'year'],

  ALIASES: {
    gwa: ['gwa', 'grade weighted average', 'general weighted average', 'weighted average'],
    failed: [
      'number of failed courses',
      'no of failed courses',
      'num of failed courses',
      'failed courses',
      'num failed',
      'number of failed subjects',
      'failed subjects',
    ],
    dropped: ['number of dropped courses', 'no of dropped courses', 'dropped courses', 'num dropped'],
    units: ['total units taken', 'total units', 'units taken', 'units', 'total unit'],
    year: ['year level', 'year', 'yr level', 'yr', 'level'],
    finalGrades: ['final grades', 'final grade', 'grades'],
    program: [
      'course program enrolled',
      'course enrolled',
      'program enrolled',
      'program',
      'course',
      'degree program',
      'degree',
      'course program',
    ],
    enrollHist: [
      'enrollment history',
      'enrolment history',
      'enrollment no',
      'enrollment count',
      'enrollment number',
      'enrolment no',
    ],
    prevStanding: [
      'previous academic standing',
      'academic standing',
      'previous standing',
      'prior standing',
      'prior academic standing',
      'standing',
    ],
    displayId: ['student id', 'studentid', 'id', 'student no', 'student number', 'student code'],
  },

  normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[_/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  },

  mapHeaders(headers) {
    const norm = headers.map(FeatureMapper.normalize)
    const mapping = {}
    Object.keys(FeatureMapper.ALIASES).forEach((key) => {
      const aliases = FeatureMapper.ALIASES[key]
      for (let c = 0; c < norm.length; c++) {
        if (aliases.indexOf(norm[c]) !== -1 && mapping[key] === undefined) {
          mapping[key] = c
          break
        }
      }
    })
    return mapping
  },

  parseNumeric(raw) {
    const s = String(raw == null ? '' : raw).trim()
    if (s === '' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'na' || s === '-') return NaN
    const v = Number(s.replace(/,/g, ''))
    return isFinite(v) ? v : NaN
  },

  parseYearLevel(raw) {
    const s = String(raw == null ? '' : raw).trim()
    if (s === '') return NaN
    const m = s.match(/\d+/)
    if (m) return Number(m[0])
    return FeatureMapper.parseNumeric(s)
  },

  parseCategorical(raw) {
    const s = String(raw == null ? '' : raw).trim()
    return s
  },

  toModelRows(headers, records, mapping) {
    let missingNumeric = 0
    let missingCat = 0
    let badNumeric = 0
    let gradeSkipped = 0
    const rows = records.map((rec, r) => {
      function cell(key) {
        const ci = mapping[key]
        if (ci === undefined || ci >= rec.length) return ''
        return rec[ci]
      }
      const gwaRaw = cell('gwa')
      const failRaw = cell('failed')
      const dropRaw = cell('dropped')
      const unitsRaw = cell('units')
      const yearRaw = cell('year')
      const gwa = FeatureMapper.parseNumeric(gwaRaw)
      const failed = FeatureMapper.parseNumeric(failRaw)
      const dropped = FeatureMapper.parseNumeric(dropRaw)
      const units = FeatureMapper.parseNumeric(unitsRaw)
      const year = FeatureMapper.parseYearLevel(yearRaw)
      ;[gwaRaw, failRaw, dropRaw, unitsRaw, yearRaw].forEach((raw, k) => {
        const s = String(raw == null ? '' : raw).trim()
        const vals = [gwa, failed, dropped, units, year]
        if (s === '') missingNumeric++
        else if (isNaN(vals[k])) badNumeric++
      })
      // Final Grades string -> time-t aggregates (exact GradeParser semantics).
      // Missing/unparseable -> NaN for all three; the graphs median-impute in-graph.
      const grades = gradeParser.parse(cell('finalGrades'))
      gradeSkipped += grades.skipped
      const program = FeatureMapper.parseCategorical(cell('program'))
      const enrollHist = FeatureMapper.parseCategorical(cell('enrollHist'))
      const prevStanding = FeatureMapper.parseCategorical(cell('prevStanding'))
      ;[program, enrollHist, prevStanding].forEach((v) => {
        if (v === '') missingCat++
      })
      const idCell = mapping.displayId !== undefined && mapping.displayId < rec.length ? String(rec[mapping.displayId]).trim() : ''
      return {
        index: r,
        displayId: idCell || 'Row ' + (r + 1),
        synthetic: false,
        gwa,
        failed,
        dropped,
        units,
        year,
        nSubjects: grades.nSubjects,
        meanGrade: grades.meanGrade,
        nFailedGrades: grades.nFailedGrades,
        program,
        enrollHist,
        prevStanding,
      }
    })
    return { rows, missingNumeric, missingCat, badNumeric, gradeSkipped }
  },
}
