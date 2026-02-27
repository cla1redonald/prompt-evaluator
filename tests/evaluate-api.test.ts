import { describe, it, expect } from 'vitest'
import { isEvaluateRequest, validateEvaluateRequest } from '../src/lib/types'

describe('evaluate API input validation', () => {
  const validBody = {
    promptA: 'You are a helpful assistant.',
    promptB: 'You are a concise assistant. Be brief.',
    testCases: [
      { id: 'tc-1', name: 'Greeting', input: 'Hello!' },
    ],
  }

  it('accepts valid request body', () => {
    expect(validateEvaluateRequest(validBody)).toBeNull()
  })

  it('accepts request with system context', () => {
    expect(
      validateEvaluateRequest({ ...validBody, systemContext: 'You work for Acme.' })
    ).toBeNull()
  })

  it('accepts up to 10 test cases', () => {
    const testCases = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Case ${i}`,
      input: `Input ${i}`,
    }))
    expect(validateEvaluateRequest({ ...validBody, testCases })).toBeNull()
  })

  it('rejects null body', () => {
    expect(validateEvaluateRequest(null)).not.toBeNull()
  })

  it('rejects missing promptA', () => {
    const { promptA, ...rest } = validBody
    expect(validateEvaluateRequest(rest)).not.toBeNull()
  })

  it('rejects empty promptA', () => {
    expect(validateEvaluateRequest({ ...validBody, promptA: '' })).not.toBeNull()
  })

  it('rejects whitespace-only promptA', () => {
    expect(validateEvaluateRequest({ ...validBody, promptA: '   ' })).not.toBeNull()
  })

  it('rejects missing promptB', () => {
    const { promptB, ...rest } = validBody
    expect(validateEvaluateRequest(rest)).not.toBeNull()
  })

  it('rejects empty promptB', () => {
    expect(validateEvaluateRequest({ ...validBody, promptB: '' })).not.toBeNull()
  })

  it('rejects missing testCases', () => {
    const { testCases, ...rest } = validBody
    expect(validateEvaluateRequest(rest)).not.toBeNull()
  })

  it('rejects empty testCases array', () => {
    expect(validateEvaluateRequest({ ...validBody, testCases: [] })).not.toBeNull()
  })

  it('rejects more than 10 test cases', () => {
    const testCases = Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      name: `Case ${i}`,
      input: `Input ${i}`,
    }))
    expect(validateEvaluateRequest({ ...validBody, testCases })).not.toBeNull()
  })

  it('rejects test case missing id', () => {
    expect(
      validateEvaluateRequest({
        ...validBody,
        testCases: [{ name: 'Test', input: 'Hello' }],
      })
    ).not.toBeNull()
  })

  it('rejects test case missing input', () => {
    expect(
      validateEvaluateRequest({
        ...validBody,
        testCases: [{ id: '1', name: 'Test' }],
      })
    ).not.toBeNull()
  })

  it('rejects non-string test case id', () => {
    expect(
      validateEvaluateRequest({
        ...validBody,
        testCases: [{ id: 123, name: 'Test', input: 'Hello' }],
      })
    ).not.toBeNull()
  })
})

describe('isEvaluateRequest edge cases', () => {
  it('handles non-object types', () => {
    expect(isEvaluateRequest('string')).toBe(false)
    expect(isEvaluateRequest(42)).toBe(false)
    expect(isEvaluateRequest([])).toBe(false)
    expect(isEvaluateRequest(undefined)).toBe(false)
  })

  it('accepts prompts with special characters', () => {
    expect(
      isEvaluateRequest({
        promptA: 'Use "quotes" and <html> tags freely',
        promptB: "It's okay to use apostrophes & ampersands",
        testCases: [{ id: '1', name: 'test', input: 'input' }],
      })
    ).toBe(true)
  })

  it('accepts very long prompts', () => {
    const longPrompt = 'A'.repeat(5000)
    expect(
      isEvaluateRequest({
        promptA: longPrompt,
        promptB: longPrompt,
        testCases: [{ id: '1', name: 'test', input: 'input' }],
      })
    ).toBe(true)
  })
})
