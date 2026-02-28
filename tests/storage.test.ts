import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveRun, loadRuns, deleteRun, clearAllRuns, getRunById } from '../src/lib/storage'
import { EvalRun, ModelEvalRun } from '../src/lib/types'

function makeRun(id: string, overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    id,
    timestamp: '2024-01-01T00:00:00.000Z',
    promptA: 'Prompt A for run ' + id,
    promptB: 'Prompt B for run ' + id,
    testCases: [{ id: 'tc-1', name: 'Test', input: 'Hello' }],
    results: [],
    ...overrides,
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

beforeEach(() => {
  localStorageMock.clear()
})

describe('loadRuns', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadRuns()).toEqual([])
  })

  it('returns empty array when stored value is invalid JSON', () => {
    localStorage.setItem('prompt-evaluator-history', 'not-json{{{')
    expect(loadRuns()).toEqual([])
  })

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('prompt-evaluator-history', JSON.stringify({ foo: 'bar' }))
    expect(loadRuns()).toEqual([])
  })

  it('filters out invalid runs', () => {
    const run = makeRun('r1')
    localStorage.setItem(
      'prompt-evaluator-history',
      JSON.stringify([run, { invalid: true }, null])
    )
    const loaded = loadRuns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('r1')
  })
})

describe('saveRun', () => {
  it('saves a run to storage', () => {
    const run = makeRun('r1')
    saveRun(run)
    const loaded = loadRuns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('r1')
  })

  it('prepends new runs (newest first)', () => {
    saveRun(makeRun('r1'))
    saveRun(makeRun('r2'))
    const loaded = loadRuns()
    expect(loaded[0].id).toBe('r2')
    expect(loaded[1].id).toBe('r1')
  })

  it('replaces run with same id (deduplication)', () => {
    saveRun(makeRun('r1', { promptA: 'original' }))
    saveRun(makeRun('r1', { promptA: 'updated' }))
    const loaded = loadRuns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].promptA).toBe('updated')
  })

  it('limits to 50 runs', () => {
    for (let i = 0; i < 55; i++) {
      saveRun(makeRun(`r${i}`))
    }
    expect(loadRuns()).toHaveLength(50)
  })
})

describe('deleteRun', () => {
  it('removes a run by id', () => {
    saveRun(makeRun('r1'))
    saveRun(makeRun('r2'))
    deleteRun('r1')
    const loaded = loadRuns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('r2')
  })

  it('does nothing when id not found', () => {
    saveRun(makeRun('r1'))
    deleteRun('does-not-exist')
    expect(loadRuns()).toHaveLength(1)
  })
})

describe('clearAllRuns', () => {
  it('removes all runs', () => {
    saveRun(makeRun('r1'))
    saveRun(makeRun('r2'))
    clearAllRuns()
    expect(loadRuns()).toEqual([])
  })
})

describe('getRunById', () => {
  it('returns the run when found', () => {
    const run = makeRun('r1')
    saveRun(run)
    const found = getRunById('r1')
    expect(found?.id).toBe('r1')
  })

  it('returns null when not found', () => {
    expect(getRunById('does-not-exist')).toBeNull()
  })
})

describe('mixed history (EvalRun + ModelEvalRun)', () => {
  function makeModelRun(id: string): ModelEvalRun {
    return {
      id,
      timestamp: '2024-01-01T00:00:00.000Z',
      runType: 'compare-models',
      prompt: 'Test prompt ' + id,
      models: ['claude-sonnet-4-5', 'gpt-4o'],
      testCases: [{ id: 'tc-1', name: 'Test', input: 'Hello' }],
      results: [],
    }
  }

  it('saves and loads both EvalRun and ModelEvalRun', () => {
    const evalRun = makeRun('r1')
    const modelRun = makeModelRun('r2')
    saveRun(evalRun)
    saveRun(modelRun)
    const loaded = loadRuns()
    expect(loaded).toHaveLength(2)
    const ids = loaded.map((r) => r.id)
    expect(ids).toContain('r1')
    expect(ids).toContain('r2')
  })

  it('preserves runType on ModelEvalRun', () => {
    const modelRun = makeModelRun('r1')
    saveRun(modelRun)
    const loaded = loadRuns()
    const found = loaded.find((r) => r.id === 'r1') as ModelEvalRun
    expect(found?.runType).toBe('compare-models')
    expect(found?.prompt).toBe('Test prompt r1')
  })

  it('filters out invalid runs in mixed storage', () => {
    const evalRun = makeRun('r1')
    const modelRun = makeModelRun('r2')
    localStorage.setItem(
      'prompt-evaluator-history',
      JSON.stringify([evalRun, modelRun, { invalid: true }, null])
    )
    const loaded = loadRuns()
    expect(loaded).toHaveLength(2)
  })
})
