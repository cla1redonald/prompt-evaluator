import { EvalRun } from './types'

function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  // Escape if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportToCSV(run: EvalRun): string {
  const headers = [
    'Test Case Name',
    'Prompt A Output',
    'Prompt B Output',
    'Prompt A Input Tokens',
    'Prompt A Output Tokens',
    'Prompt B Input Tokens',
    'Prompt B Output Tokens',
    'Prompt A Latency (ms)',
    'Prompt B Latency (ms)',
    'Prompt A Relevance',
    'Prompt A Conciseness',
    'Prompt A Accuracy',
    'Prompt B Relevance',
    'Prompt B Conciseness',
    'Prompt B Accuracy',
    'Manual Rating A',
    'Manual Rating B',
  ]

  const rows = run.results.map((result) => {
    const testCase = run.testCases.find((tc) => tc.id === result.testCaseId)
    return [
      escapeCsvValue(testCase?.name ?? result.testCaseId),
      escapeCsvValue(result.promptAOutput),
      escapeCsvValue(result.promptBOutput),
      escapeCsvValue(result.promptATokens.input),
      escapeCsvValue(result.promptATokens.output),
      escapeCsvValue(result.promptBTokens.input),
      escapeCsvValue(result.promptBTokens.output),
      escapeCsvValue(result.promptALatencyMs),
      escapeCsvValue(result.promptBLatencyMs),
      escapeCsvValue(result.promptAScores?.relevance),
      escapeCsvValue(result.promptAScores?.conciseness),
      escapeCsvValue(result.promptAScores?.accuracy),
      escapeCsvValue(result.promptBScores?.relevance),
      escapeCsvValue(result.promptBScores?.conciseness),
      escapeCsvValue(result.promptBScores?.accuracy),
      escapeCsvValue(result.manualRating?.a ?? ''),
      escapeCsvValue(result.manualRating?.b ?? ''),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export function exportToJSON(run: EvalRun): string {
  return JSON.stringify(run, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCSV(run: EvalRun): void {
  const csv = exportToCSV(run)
  const timestamp = new Date(run.timestamp).toISOString().replace(/[:.]/g, '-')
  downloadFile(csv, `prompt-eval-${timestamp}.csv`, 'text/csv;charset=utf-8;')
}

export function downloadJSON(run: EvalRun): void {
  const json = exportToJSON(run)
  const timestamp = new Date(run.timestamp).toISOString().replace(/[:.]/g, '-')
  downloadFile(json, `prompt-eval-${timestamp}.json`, 'application/json')
}
