import { EvalRun, isEvalRun } from './types'

const STORAGE_KEY = 'prompt-evaluator-history'

export function saveRun(run: EvalRun): void {
  if (typeof window === 'undefined') return
  const existing = loadRuns()
  const updated = [run, ...existing.filter((r) => r.id !== run.id)]
  // Keep max 50 runs
  const trimmed = updated.slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function loadRuns(): EvalRun[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEvalRun)
  } catch {
    return []
  }
}

export function deleteRun(id: string): void {
  if (typeof window === 'undefined') return
  const existing = loadRuns()
  const updated = existing.filter((r) => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearAllRuns(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function getRunById(id: string): EvalRun | null {
  const runs = loadRuns()
  return runs.find((r) => r.id === id) ?? null
}
