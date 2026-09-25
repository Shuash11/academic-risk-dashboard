export const SignalNotes = {
  forRow(row) {
    const notes = []
    function num(v) {
      return typeof v === 'number' && isFinite(v) ? v : null
    }
    const gwa = num(row.gwa)
    const failed = num(row.failed)
    const dropped = num(row.dropped)
    const units = num(row.units)
    const year = num(row.year)
    if (gwa !== null && gwa >= 2.5) notes.push('Elevated GWA (' + gwa + ') — higher GWA values co-occur with at-risk outputs.')
    if (gwa !== null && gwa < 1.75) notes.push('GWA below the median reference (1.75) — co-occurs with not-at-risk outputs.')
    if (failed !== null && failed > 0) notes.push(failed + ' failed course(s) recorded.')
    if (dropped !== null && dropped > 0) notes.push(dropped + ' dropped course(s) recorded.')
    if (row.prevStanding && /fail/i.test(row.prevStanding)) notes.push('Previous standing mentions failed courses.')
    if (row.prevStanding && /drop/i.test(row.prevStanding)) notes.push('Previous standing mentions dropped courses.')
    if (row.prevStanding && /new|no previous/i.test(row.prevStanding)) notes.push('No previous record — less history available.')
    if (units !== null && units < 18) notes.push('Low unit load (' + units + ').')
    if (year !== null && year >= 4) notes.push('Upper year level (' + year + ').')
    const missing =
      [row.gwa, row.failed, row.dropped, row.units, row.year, row.nSubjects, row.meanGrade, row.nFailedGrades].filter((v) => !(typeof v === 'number' && isFinite(v))).length +
      [row.program, row.enrollHist, row.prevStanding].filter((v) => !v).length
    if (missing > 0) notes.push(missing + ' field(s) missing — filled in-graph (numeric medians / most-frequent categories).')
    if (notes.length === 0) notes.push('No strong heuristic signals in this row.')
    return notes
  },
}
