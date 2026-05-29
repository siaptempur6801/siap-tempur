export function parseCsvRows(csv: string): Record<string, string>[] {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let index = 0; index < csv.length; index++) {
        const char = csv[index]
        const nextChar = csv[index + 1]

        if (char === '"' && inQuotes && nextChar === '"') {
            currentCell += '"'
            index++
            continue
        }

        if (char === '"') {
            inQuotes = !inQuotes
            continue
        }

        if (char === ',' && !inQuotes) {
            currentRow.push(currentCell)
            currentCell = ''
            continue
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                index++
            }
            currentRow.push(currentCell)
            if (currentRow.some((cell) => cell.trim() !== '')) {
                rows.push(currentRow)
            }
            currentRow = []
            currentCell = ''
            continue
        }

        currentCell += char
    }

    currentRow.push(currentCell)
    if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow)
    }

    const [headers, ...dataRows] = rows
    if (!headers) return []

    const normalizedHeaders = headers.map((header) => header.trim())

    return dataRows.map((row) => {
        return Object.fromEntries(
            normalizedHeaders.map((header, index) => [header, row[index]?.trim() ?? ''])
        )
    })
}

export function csvEscape(value: unknown) {
    const text = value == null ? '' : String(value)
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }
    return text
}

export function toCsv(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    return [
        headers.map(csvEscape).join(','),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ].join('\r\n')
}
