import { describe, it, expect } from 'vitest'
import { isJudgeRequest, validateJudgeRequest } from '../src/lib/types'

describe('judge API input validation', () => {
  const validBody = {
    prompt: 'Be a helpful assistant.',
    input: 'What is the capital of France?',
    output: 'The capital of France is Paris.',
  }

  it('accepts valid request', () => {
    expect(validateJudgeRequest(validBody)).toBeNull()
  })

  it('accepts empty strings (judge any output)', () => {
    // Empty strings are technically valid strings - judge can score them
    expect(
      isJudgeRequest({ prompt: '', input: '', output: '' })
    ).toBe(true)
  })

  it('rejects null body', () => {
    expect(validateJudgeRequest(null)).not.toBeNull()
  })

  it('rejects missing prompt', () => {
    const { prompt, ...rest } = validBody
    expect(validateJudgeRequest(rest)).not.toBeNull()
  })

  it('rejects missing input', () => {
    const { input, ...rest } = validBody
    expect(validateJudgeRequest(rest)).not.toBeNull()
  })

  it('rejects missing output', () => {
    const { output, ...rest } = validBody
    expect(validateJudgeRequest(rest)).not.toBeNull()
  })

  it('rejects non-string prompt', () => {
    expect(validateJudgeRequest({ ...validBody, prompt: 42 })).not.toBeNull()
  })

  it('rejects non-string input', () => {
    expect(validateJudgeRequest({ ...validBody, input: true })).not.toBeNull()
  })

  it('rejects non-string output', () => {
    expect(validateJudgeRequest({ ...validBody, output: null })).not.toBeNull()
  })

  it('rejects array', () => {
    expect(validateJudgeRequest([])).not.toBeNull()
  })

  it('rejects primitive', () => {
    expect(validateJudgeRequest('not-an-object')).not.toBeNull()
    expect(validateJudgeRequest(123)).not.toBeNull()
  })
})

describe('isJudgeRequest edge cases', () => {
  it('accepts prompts with unicode characters', () => {
    expect(
      isJudgeRequest({
        prompt: 'Respond in 日本語',
        input: 'こんにちは',
        output: 'はい、こんにちは！',
      })
    ).toBe(true)
  })

  it('accepts multiline output', () => {
    expect(
      isJudgeRequest({
        prompt: 'Be helpful',
        input: 'List three things',
        output: '1. First thing\n2. Second thing\n3. Third thing',
      })
    ).toBe(true)
  })

  it('accepts very long output', () => {
    expect(
      isJudgeRequest({
        prompt: 'Be verbose',
        input: 'Tell me everything',
        output: 'A'.repeat(10000),
      })
    ).toBe(true)
  })

  it('handles object with extra fields (still valid)', () => {
    expect(
      isJudgeRequest({
        prompt: 'p',
        input: 'i',
        output: 'o',
        extraField: 'ignored',
      })
    ).toBe(true)
  })
})
