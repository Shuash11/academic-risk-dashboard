export const CsvParser = {
  parse(text) {
    let rows = []
    let row = []
    let field = ''
    let inQuotes = false
    let n = text.length
    if (n > 0 && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
      n = text.length
    }
    for (let i = 0; i < n; i++) {
      const c = text[i]
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"'
            i++
          } else inQuotes = false
        } else field += c
      } else if (c === '"') inQuotes = true
      else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field)
        field = ''
        if (row.length > 1 || row[0].trim() !== '') rows.push(row)
        row = []
      } else field += c
    }
    row.push(field)
    if (row.length > 1 || row[0].trim() !== '') rows.push(row)
    if (rows.length === 0) return { headers: [], records: [] }
    const headers = rows[0].map((h) => h.trim())
    const records = rows.slice(1).filter((r) => r.some((v) => String(v).trim() !== ''))
    return { headers, records }
  },
}
