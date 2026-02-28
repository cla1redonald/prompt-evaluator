import { describe, it, expect } from 'vitest'
import {
  validateEvaluateModelsRequest,
  isModelEvalRun,
  SUPPORTED_MODELS,
} from '../src/lib/types'

describe('validateEvaluateModelsRequest', () => {
  const validBody = {
    prompt: 'You are a helpful assistant.',
    models: ['claude-sonnet-4-5', 'gpt-4o'],
    testCases: [
      { id: 'tc-1', name: 'Greeting', input: 'Hello!' },
    ],
  }

  it('accepts valid request body with 2 models', () => {
    expect(validateEvaluateModelsRequest(validBody)).toBeNull()
  })

  it('accepts all 3 models', () => {
    expect(
      validateEvaluateModelsRequest({
        ...validBody,
        models: ['claude-sonnet-4-5', 'gpt-4o', 'gemini-1-5-pro'],
      })
    ).toBeNull()
  })

  it('accepts request with systemContext', () => {
    expect(
      validateEvaluateModelsRequest({ ...validBody, systemContext: 'You work for Acme.' })
    ).toBeNull()
  })

  it('accepts up to 10 test cases', () => {
    const testCases = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Case ${i}`,
      input: `Input ${i}`,
    }))
    expect(validateEvaluateModelsRequest({ ...validBody, testCases })).toBeNull()
  })

  it('rejects null body', () => {
    expect(validateEvaluateModelsRequest(null)).not.toBeNull()
  })

  it('rejects missing prompt', () => {
    const { prompt, ...rest } = validBody
    expect(validateEvaluateModelsRequest(rest)).not.toBeNull()
  })

  it('rejects empty prompt', () => {
    expect(validateEvaluateModelsRequest({ ...validBody, prompt: '' })).not.toBeNull()
  })

  it('rejects whitespace-only prompt', () => {
    expect(validateEvaluateModelsRequest({ ...validBody, prompt: '   ' })).not.toBeNull()
  })

  it('rejects missing models', () => {
    const { models, ...rest } = validBody
    expect(validateEvaluateModelsRequest(rest)).not.toBeNull()
  })

  it('rejects fewer than 2 models', () => {
    expect(validateEvaluateModelsRequest({ ...validBody, models: ['claude-sonnet-4-5'] })).not.toBeNull()
  })

  it('rejects more than 3 models', () => {
    expect(
      validateEvaluateModelsRequest({
        ...validBody,
        models: ['claude-sonnet-4-5', 'gpt-4o', 'gemini-1-5-pro', 'unknown-model'],
      })
    ).not.toBeNull()
  })

  it('rejects invalid model id', () => {
    expect(
      validateEvaluateModelsRequest({ ...validBody, models: ['claude-sonnet-4-5', 'gpt-5'] })
    ).not.toBeNull()
  })

  it('rejects non-array models', () => {
    expect(validateEvaluateModelsRequest({ ...validBody, models: 'claude-sonnet-4-5' })).not.toBeNull()
  })

  it('rejects missing testCases', () => {
    const { testCases, ...rest } = validBody
    expect(validateEvaluateModelsRequest(rest)).not.toBeNull()
  })

  it('rejects empty testCases array', () => {
    expect(validateEvaluateModelsRequest({ ...validBody, testCases: [] })).not.toBeNull()
  })

  it('rejects more than 10 test cases', () => {
    const testCases = Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      name: `Case ${i}`,
      input: `Input ${i}`,
    }))
    expect(validateEvaluateModelsRequest({ ...validBody, testCases })).not.toBeNull()
  })
})

describe('isModelEvalRun', () => {
  const validModelRun = {
    id: 'run-1',
    timestamp: '2024-01-15T10:30:00.000Z',
    runType: 'compare-models' as const,
    prompt: 'Be helpful',
    models: ['claude-sonnet-4-5', 'gpt-4o'] as const,
    testCases: [{ id: 'tc-1', name: 'Test', input: 'Hello' }],
    results: [],
  }

  it('returns true for valid ModelEvalRun', () => {
    expect(isModelEvalRun(validModelRun)).toBe(true)
  })

  it('returns false for EvalRun (compare-prompts)', () => {
    const evalRun = {
      id: 'run-1',
      timestamp: '2024-01-15T10:30:00.000Z',
      promptA: 'Be concise',
      promptB: 'Be verbose',
      testCases: [],
      results: [],
    }
    expect(isModelEvalRun(evalRun)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isModelEvalRun(null)).toBe(false)
  })

  it('returns false for missing runType', () => {
    const { runType, ...rest } = validModelRun
    expect(isModelEvalRun(rest)).toBe(false)
  })

  it('returns false when runType is not compare-models', () => {
    expect(isModelEvalRun({ ...validModelRun, runType: 'compare-prompts' })).toBe(false)
  })

  it('returns false for missing prompt', () => {
    const { prompt, ...rest } = validModelRun
    expect(isModelEvalRun(rest)).toBe(false)
  })

  it('returns false for missing models array', () => {
    const { models, ...rest } = validModelRun
    expect(isModelEvalRun(rest)).toBe(false)
  })
})

describe('SUPPORTED_MODELS', () => {
  it('contains exactly 3 models', () => {
    expect(SUPPORTED_MODELS).toHaveLength(3)
  })

  it('includes claude-sonnet-4-5', () => {
    expect(SUPPORTED_MODELS.find((m) => m.id === 'claude-sonnet-4-5')).toBeDefined()
  })

  it('includes gpt-4o', () => {
    expect(SUPPORTED_MODELS.find((m) => m.id === 'gpt-4o')).toBeDefined()
  })

  it('includes gemini-1-5-pro', () => {
    expect(SUPPORTED_MODELS.find((m) => m.id === 'gemini-1-5-pro')).toBeDefined()
  })

  it('each model has required fields', () => {
    for (const model of SUPPORTED_MODELS) {
      expect(typeof model.id).toBe('string')
      expect(typeof model.label).toBe('string')
      expect(typeof model.provider).toBe('string')
      expect(typeof model.color).toBe('string')
      expect(typeof model.apiModel).toBe('string')
    }
  })

  it('Anthropic model has correct color', () => {
    const claude = SUPPORTED_MODELS.find((m) => m.id === 'claude-sonnet-4-5')
    expect(claude?.color).toBe('#D97757')
  })

  it('OpenAI model has correct color', () => {
    const gpt = SUPPORTED_MODELS.find((m) => m.id === 'gpt-4o')
    expect(gpt?.color).toBe('#10A37F')
  })

  it('Google model has correct color', () => {
    const gemini = SUPPORTED_MODELS.find((m) => m.id === 'gemini-1-5-pro')
    expect(gemini?.color).toBe('#4285F4')
  })
})
