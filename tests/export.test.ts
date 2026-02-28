import { describe, it, expect } from 'vitest'
import { exportToCSV, exportToJSON, exportModelRunToCSV, exportModelRunToJSON } from '../src/lib/export'
import { EvalRun, ModelEvalRun } from '../src/lib/types'

function makeRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    id: 'run-1',
    timestamp: '2024-01-15T10:30:00.000Z',
    promptA: 'Be concise.',
    promptB: 'Be verbose and thorough.',
    testCases: [
      { id: 'tc-1', name: 'Simple test', input: 'What is 2+2?' },
      { id: 'tc-2', name: 'Complex test', input: 'Explain quantum entanglement.' },
    ],
    results: [
      {
        testCaseId: 'tc-1',
        promptAOutput: '4',
        promptBOutput: 'The answer is 4, as two plus two equals four.',
        promptATokens: { input: 10, output: 2 },
        promptBTokens: { input: 10, output: 12 },
        promptALatencyMs: 500,
        promptBLatencyMs: 800,
        promptAScores: { relevance: 5, conciseness: 5, accuracy: 5 },
        promptBScores: { relevance: 5, conciseness: 3, accuracy: 5 },
        manualRating: { a: 'up', b: null },
      },
      {
        testCaseId: 'tc-2',
        promptAOutput: 'Quantum entanglement is when particles share state.',
        promptBOutput: 'Quantum entanglement is a phenomenon where...',
        promptATokens: { input: 20, output: 10 },
        promptBTokens: { input: 20, output: 50 },
        promptALatencyMs: 1200,
        promptBLatencyMs: 2400,
      },
    ],
    ...overrides,
  }
}

describe('exportToCSV', () => {
  it('generates a CSV with correct headers', () => {
    const csv = exportToCSV(makeRun())
    const lines = csv.split('\n')
    const headers = lines[0].split(',')
    expect(headers).toContain('Test Case Name')
    expect(headers).toContain('Prompt A Output')
    expect(headers).toContain('Prompt B Output')
    expect(headers).toContain('Prompt A Latency (ms)')
    expect(headers).toContain('Prompt B Latency (ms)')
  })

  it('generates correct number of rows (header + one per result)', () => {
    const run = makeRun()
    const csv = exportToCSV(run)
    const lines = csv.split('\n').filter((l) => l.trim() !== '')
    expect(lines).toHaveLength(1 + run.results.length)
  })

  it('escapes values with commas in double quotes', () => {
    const run = makeRun({
      results: [
        {
          testCaseId: 'tc-1',
          promptAOutput: 'Hello, world',
          promptBOutput: 'Hi there',
          promptATokens: { input: 5, output: 3 },
          promptBTokens: { input: 5, output: 2 },
          promptALatencyMs: 100,
          promptBLatencyMs: 150,
        },
      ],
    })
    const csv = exportToCSV(run)
    expect(csv).toContain('"Hello, world"')
  })

  it('escapes values with double quotes by doubling them', () => {
    const run = makeRun({
      results: [
        {
          testCaseId: 'tc-1',
          promptAOutput: 'He said "hello"',
          promptBOutput: 'Normal output',
          promptATokens: { input: 5, output: 5 },
          promptBTokens: { input: 5, output: 3 },
          promptALatencyMs: 100,
          promptBLatencyMs: 150,
        },
      ],
    })
    const csv = exportToCSV(run)
    expect(csv).toContain('"He said ""hello"""')
  })

  it('escapes values with newlines', () => {
    const run = makeRun({
      results: [
        {
          testCaseId: 'tc-1',
          promptAOutput: 'Line 1\nLine 2',
          promptBOutput: 'Normal',
          promptATokens: { input: 5, output: 5 },
          promptBTokens: { input: 5, output: 3 },
          promptALatencyMs: 100,
          promptBLatencyMs: 150,
        },
      ],
    })
    const csv = exportToCSV(run)
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it('uses test case name in first column', () => {
    const csv = exportToCSV(makeRun())
    const lines = csv.split('\n')
    expect(lines[1]).toMatch(/^Simple test/)
  })

  it('includes scores when present', () => {
    const csv = exportToCSV(makeRun())
    // First data row should have score values
    const lines = csv.split('\n')
    expect(lines[1]).toContain('5') // relevance score
  })

  it('handles missing scores gracefully (empty string)', () => {
    const run = makeRun({
      results: [
        {
          testCaseId: 'tc-1',
          promptAOutput: 'output',
          promptBOutput: 'output',
          promptATokens: { input: 5, output: 3 },
          promptBTokens: { input: 5, output: 3 },
          promptALatencyMs: 100,
          promptBLatencyMs: 100,
          // no scores
        },
      ],
    })
    const csv = exportToCSV(run)
    expect(csv).toBeTruthy()
    // Should not throw, and scores columns should be empty
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2) // header + 1 row
  })
})

function makeModelRun(overrides: Partial<ModelEvalRun> = {}): ModelEvalRun {
  return {
    id: 'model-run-1',
    timestamp: '2024-01-15T10:30:00.000Z',
    runType: 'compare-models',
    prompt: 'Explain this concept clearly.',
    models: ['claude-sonnet-4-5', 'gpt-4o'],
    testCases: [
      { id: 'tc-1', name: 'Simple test', input: 'What is 2+2?' },
    ],
    results: [
      {
        testCaseId: 'tc-1',
        outputs: [
          {
            modelId: 'claude-sonnet-4-5',
            output: 'The answer is 4.',
            tokens: { input: 10, output: 5 },
            latencyMs: 500,
            scores: { relevance: 5, conciseness: 5, accuracy: 5 },
            manualRating: 'up',
          },
          {
            modelId: 'gpt-4o',
            output: '2 + 2 = 4',
            tokens: { input: 8, output: 4 },
            latencyMs: 400,
            scores: { relevance: 5, conciseness: 5, accuracy: 5 },
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('exportModelRunToCSV', () => {
  it('generates a CSV with test case name and model columns', () => {
    const csv = exportModelRunToCSV(makeModelRun())
    const lines = csv.split('\n')
    const headers = lines[0]
    expect(headers).toContain('Test Case Name')
    expect(headers).toContain('Claude Sonnet 4.5 Output')
    expect(headers).toContain('GPT-4o Output')
  })

  it('generates correct number of rows (header + one per result)', () => {
    const run = makeModelRun()
    const csv = exportModelRunToCSV(run)
    const lines = csv.split('\n').filter((l) => l.trim() !== '')
    expect(lines).toHaveLength(1 + run.results.length)
  })

  it('includes latency and token columns per model', () => {
    const csv = exportModelRunToCSV(makeModelRun())
    expect(csv).toContain('Latency (ms)')
    expect(csv).toContain('Input Tokens')
    expect(csv).toContain('Output Tokens')
  })

  it('includes scores when present', () => {
    const csv = exportModelRunToCSV(makeModelRun())
    expect(csv).toContain('Relevance')
    expect(csv).toContain('Conciseness')
    expect(csv).toContain('Accuracy')
  })

  it('includes manual rating column', () => {
    const csv = exportModelRunToCSV(makeModelRun())
    expect(csv).toContain('Rating')
  })

  it('uses test case name in first column', () => {
    const csv = exportModelRunToCSV(makeModelRun())
    const lines = csv.split('\n')
    expect(lines[1]).toMatch(/^Simple test/)
  })
})

describe('exportModelRunToJSON', () => {
  it('produces valid JSON', () => {
    const run = makeModelRun()
    const json = exportModelRunToJSON(run)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('round-trips the run data exactly', () => {
    const run = makeModelRun()
    const json = exportModelRunToJSON(run)
    const parsed = JSON.parse(json)
    expect(parsed.id).toBe(run.id)
    expect(parsed.prompt).toBe(run.prompt)
    expect(parsed.runType).toBe('compare-models')
    expect(parsed.models).toEqual(run.models)
    expect(parsed.results).toHaveLength(run.results.length)
  })
})

describe('exportToJSON', () => {
  it('produces valid JSON', () => {
    const run = makeRun()
    const json = exportToJSON(run)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('round-trips the run data exactly', () => {
    const run = makeRun()
    const json = exportToJSON(run)
    const parsed = JSON.parse(json)
    expect(parsed.id).toBe(run.id)
    expect(parsed.promptA).toBe(run.promptA)
    expect(parsed.promptB).toBe(run.promptB)
    expect(parsed.testCases).toHaveLength(run.testCases.length)
    expect(parsed.results).toHaveLength(run.results.length)
  })

  it('is pretty-printed (indented)', () => {
    const run = makeRun()
    const json = exportToJSON(run)
    // Should have newlines and indentation
    expect(json).toContain('\n')
    expect(json).toContain('  ')
  })
})
