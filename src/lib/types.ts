export interface TestCase {
  id: string
  name: string
  input: string
}

export interface Scores {
  relevance: number
  conciseness: number
  accuracy: number
  reasoning?: string
}

export interface EvalResult {
  testCaseId: string
  promptAOutput: string
  promptBOutput: string
  promptATokens: { input: number; output: number }
  promptBTokens: { input: number; output: number }
  promptALatencyMs: number
  promptBLatencyMs: number
  promptAScores?: Scores
  promptBScores?: Scores
  manualRating?: { a: 'up' | 'down' | null; b: 'up' | 'down' | null }
}

export interface EvalRun {
  id: string
  timestamp: string
  promptA: string
  promptB: string
  systemContext?: string
  testCases: TestCase[]
  results: EvalResult[]
}

export interface EvaluateRequest {
  promptA: string
  promptB: string
  systemContext?: string
  testCases: TestCase[]
}

export interface StreamEvent {
  type: 'progress' | 'result' | 'error' | 'done'
  testCaseIndex?: number
  prompt?: 'A' | 'B'
  output?: string
  tokens?: { input: number; output: number }
  latencyMs?: number
  total?: number
  completed?: number
  message?: string
}

export interface JudgeRequest {
  prompt: string
  input: string
  output: string
}

export interface JudgeResponse {
  relevance: number
  conciseness: number
  accuracy: number
  reasoning: string
}

// Type guards
export function isTestCase(obj: unknown): obj is TestCase {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as TestCase).id === 'string' &&
    typeof (obj as TestCase).name === 'string' &&
    typeof (obj as TestCase).input === 'string'
  )
}

export function isEvalRun(obj: unknown): obj is EvalRun {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as EvalRun).id === 'string' &&
    typeof (obj as EvalRun).timestamp === 'string' &&
    typeof (obj as EvalRun).promptA === 'string' &&
    typeof (obj as EvalRun).promptB === 'string' &&
    Array.isArray((obj as EvalRun).testCases) &&
    Array.isArray((obj as EvalRun).results)
  )
}

export function isEvaluateRequest(obj: unknown): obj is EvaluateRequest {
  if (typeof obj !== 'object' || obj === null) return false
  const req = obj as EvaluateRequest
  if (typeof req.promptA !== 'string' || req.promptA.trim() === '') return false
  if (typeof req.promptB !== 'string' || req.promptB.trim() === '') return false
  if (!Array.isArray(req.testCases) || req.testCases.length === 0) return false
  if (req.testCases.length > 10) return false
  return req.testCases.every(isTestCase)
}

export function isJudgeRequest(obj: unknown): obj is JudgeRequest {
  if (typeof obj !== 'object' || obj === null) return false
  const req = obj as JudgeRequest
  return (
    typeof req.prompt === 'string' &&
    typeof req.input === 'string' &&
    typeof req.output === 'string'
  )
}

export function validateEvaluateRequest(body: unknown): string | null {
  if (!isEvaluateRequest(body)) {
    return 'Invalid request body'
  }
  return null
}

export function validateJudgeRequest(body: unknown): string | null {
  if (!isJudgeRequest(body)) {
    return 'Invalid request: requires prompt, input, and output strings'
  }
  return null
}
