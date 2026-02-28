import { EvalRun, AnyEvalRun, isEvalRun, isModelEvalRun } from './types'

const STORAGE_KEY = 'prompt-evaluator-history'

function isAnyEvalRun(obj: unknown): obj is AnyEvalRun {
  return isEvalRun(obj) || isModelEvalRun(obj)
}

export function saveRun(run: AnyEvalRun): void {
  if (typeof window === 'undefined') return
  const existing = loadRuns()
  const updated = [run, ...existing.filter((r) => r.id !== run.id)]
  // Keep max 50 runs
  const trimmed = updated.slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function loadRuns(): AnyEvalRun[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAnyEvalRun)
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

export function getRunById(id: string): AnyEvalRun | null {
  const runs = loadRuns()
  return runs.find((r) => r.id === id) ?? null
}

// Keep backward-compatible typed accessor
export function getEvalRunById(id: string): EvalRun | null {
  const run = getRunById(id)
  return run && isEvalRun(run) ? run : null
}
