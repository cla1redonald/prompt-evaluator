import { describe, it, expect } from 'vitest'
import {
  isTestCase,
  isEvalRun,
  isEvaluateRequest,
  isJudgeRequest,
  TestCase,
  EvalRun,
} from '../src/lib/types'

describe('isTestCase', () => {
  it('returns true for valid test case', () => {
    const tc: TestCase = { id: 'abc', name: 'My Test', input: 'Hello' }
    expect(isTestCase(tc)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isTestCase(null)).toBe(false)
  })

  it('returns false when id is missing', () => {
    expect(isTestCase({ name: 'test', input: 'hi' })).toBe(false)
  })

  it('returns false when name is not a string', () => {
    expect(isTestCase({ id: '1', name: 42, input: 'hi' })).toBe(false)
  })

  it('returns false when input is missing', () => {
    expect(isTestCase({ id: '1', name: 'test' })).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isTestCase('string')).toBe(false)
    expect(isTestCase(42)).toBe(false)
  })
})

describe('isEvalRun', () => {
  const validRun: EvalRun = {
    id: 'run-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    promptA: 'Prompt A text',
    promptB: 'Prompt B text',
    testCases: [{ id: 'tc-1', name: 'Test', input: 'Input' }],
    results: [],
  }

  it('returns true for valid run', () => {
    expect(isEvalRun(validRun)).toBe(true)
  })

  it('returns true with optional systemContext', () => {
    expect(isEvalRun({ ...validRun, systemContext: 'sys' })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isEvalRun(null)).toBe(false)
  })

  it('returns false when id is missing', () => {
    const { id, ...rest } = validRun
    expect(isEvalRun(rest)).toBe(false)
  })

  it('returns false when testCases is not array', () => {
    expect(isEvalRun({ ...validRun, testCases: 'not-array' })).toBe(false)
  })

  it('returns false when results is not array', () => {
    expect(isEvalRun({ ...validRun, results: null })).toBe(false)
  })
})

describe('isEvaluateRequest', () => {
  const validRequest = {
    promptA: 'Prompt A',
    promptB: 'Prompt B',
    testCases: [{ id: '1', name: 'test', input: 'hello' }],
  }

  it('returns true for valid request', () => {
    expect(isEvaluateRequest(validRequest)).toBe(true)
  })

  it('returns true with optional systemContext', () => {
    expect(isEvaluateRequest({ ...validRequest, systemContext: 'ctx' })).toBe(true)
  })

  it('returns false when promptA is empty', () => {
    expect(isEvaluateRequest({ ...validRequest, promptA: '' })).toBe(false)
  })

  it('returns false when promptA is whitespace only', () => {
    expect(isEvaluateRequest({ ...validRequest, promptA: '   ' })).toBe(false)
  })

  it('returns false when promptB is empty', () => {
    expect(isEvaluateRequest({ ...validRequest, promptB: '' })).toBe(false)
  })

  it('returns false when testCases is empty', () => {
    expect(isEvaluateRequest({ ...validRequest, testCases: [] })).toBe(false)
  })

  it('returns false when testCases exceeds 10', () => {
    const manyCases = Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      name: `Case ${i}`,
      input: `Input ${i}`,
    }))
    expect(isEvaluateRequest({ ...validRequest, testCases: manyCases })).toBe(false)
  })

  it('returns false when testCase is invalid', () => {
    expect(isEvaluateRequest({ ...validRequest, testCases: [{ id: 1, name: 'x' }] })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isEvaluateRequest(null)).toBe(false)
  })
})

describe('isJudgeRequest', () => {
  it('returns true for valid request', () => {
    expect(isJudgeRequest({ prompt: 'p', input: 'i', output: 'o' })).toBe(true)
  })

  it('returns false when prompt is missing', () => {
    expect(isJudgeRequest({ input: 'i', output: 'o' })).toBe(false)
  })

  it('returns false when input is missing', () => {
    expect(isJudgeRequest({ prompt: 'p', output: 'o' })).toBe(false)
  })

  it('returns false when output is missing', () => {
    expect(isJudgeRequest({ prompt: 'p', input: 'i' })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isJudgeRequest(null)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isJudgeRequest('string')).toBe(false)
  })
})
