// GradeParser — JS replication of training/dataset_builder.py::GradeParser.
//
// Parses a "SUBJECT: grade; SUBJECT: grade; ..." string into semester-t aggregates:
//   n_subjects_t      = count of parsed grade values
//   mean_grade_t      = mean of parsed grade values
//   n_failed_grades_t = count of values exactly equal to 5 (Philippine 1.0-5.0
//                       scale verified from the data: only 5.0 denotes a failed subject)
//
// Semantics replicated exactly from the Python source:
//   - split the string on ";", trim each segment, skip empty segments
//   - match the trailing grade with /:\s*([0-9]+(?:\.[0-9]+)?)\s*$/
//   - segments without a trailing grade are skipped and COUNTED (auditable coverage)
//   - if no values parse at all -> NaN for all three (the ONNX graphs
//     median-impute in-graph: n_subjects_t 9.0, mean_grade_t ~1.7333, n_failed_grades_t 0.0)

const GRADE_RE = /:\s*([0-9]+(?:\.[0-9]+)?)\s*$/
const FAILING_GRADE = 5.0

const EMPTY_RESULT = Object.freeze({ nSubjects: NaN, meanGrade: NaN, nFailedGrades: NaN, skipped: 0 })

export class GradeParser {
  parse(raw) {
    // Python: None / NaN -> (None, None, None) with no skipped counting.
    if (raw == null || (typeof raw === 'number' && isNaN(raw))) return { ...EMPTY_RESULT }

    const values = []
    let skipped = 0
    const segments = String(raw).split(';')
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].trim()
      if (!segment) continue
      const match = segment.match(GRADE_RE)
      if (!match) { skipped++; continue }
      // Regex guarantees digits only, so Number() is exact and finite here.
      values.push(Number(match[1]))
    }

    if (values.length === 0) {
      return { nSubjects: NaN, meanGrade: NaN, nFailedGrades: NaN, skipped }
    }

    let sum = 0
    let nFailed = 0
    for (let i = 0; i < values.length; i++) {
      sum += values[i]
      if (values[i] === FAILING_GRADE) nFailed++
    }

    return {
      nSubjects: values.length,
      meanGrade: sum / values.length,
      nFailedGrades: nFailed,
      skipped,
    }
  }
}
