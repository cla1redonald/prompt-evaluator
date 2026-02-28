// ─── Model types (Compare Models mode) ───────────────────────────────────────

export type ModelId = 'claude-sonnet-4-5' | 'gpt-4o' | 'gemini-1-5-pro'

export interface ModelInfo {
  id: ModelId
  label: string
  provider: string
  color: string
  apiModel: string
}

export const SUPPORTED_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    color: '#D97757',
    apiModel: 'claude-sonnet-4-5-20250929',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    color: '#10A37F',
    apiModel: 'gpt-4o',
  },
  {
    id: 'gemini-1-5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'Google',
    color: '#4285F4',
    apiModel: 'gemini-1.5-pro',
  },
]

export interface ModelOutput {
  modelId: ModelId
  output: string
  tokens: { input: number; output: number }
  latencyMs: number
  scores?: Scores
  manualRating?: 'up' | 'down' | null
}

export interface ModelEvalResult {
  testCaseId: string
  outputs: ModelOutput[]
}

export interface ModelEvalRun {
  id: string
  timestamp: string
  runType: 'compare-models'
  prompt: string
  systemContext?: string
  models: ModelId[]
  testCases: TestCase[]
  results: ModelEvalResult[]
}

export type AnyEvalRun = EvalRun | ModelEvalRun

export interface EvaluateModelsRequest {
  prompt: string
  systemContext?: string
  models: ModelId[]
  testCases: TestCase[]
}

// ─── Original types (Compare Prompts mode) ────────────────────────────────────

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

// Input length limits (server-side validation)
export const MAX_PROMPT_LENGTH = 10000
export const MAX_TEST_CASE_INPUT_LENGTH = 5000
export const MAX_SYSTEM_CONTEXT_LENGTH = 5000

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
  if (req.promptA.length > MAX_PROMPT_LENGTH || req.promptB.length > MAX_PROMPT_LENGTH) return false
  if (req.systemContext && typeof req.systemContext === 'string' && req.systemContext.length > MAX_SYSTEM_CONTEXT_LENGTH) return false
  if (!Array.isArray(req.testCases) || req.testCases.length === 0) return false
  if (req.testCases.length > 10) return false
  if (req.testCases.some((tc: { input?: string }) => typeof tc.input === 'string' && tc.input.length > MAX_TEST_CASE_INPUT_LENGTH)) return false
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

// ─── Model type guards ────────────────────────────────────────────────────────

const VALID_MODEL_IDS: ModelId[] = ['claude-sonnet-4-5', 'gpt-4o', 'gemini-1-5-pro']

export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && VALID_MODEL_IDS.includes(value as ModelId)
}

export function isModelEvalRun(obj: unknown): obj is ModelEvalRun {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ModelEvalRun).id === 'string' &&
    typeof (obj as ModelEvalRun).timestamp === 'string' &&
    (obj as ModelEvalRun).runType === 'compare-models' &&
    typeof (obj as ModelEvalRun).prompt === 'string' &&
    Array.isArray((obj as ModelEvalRun).models) &&
    Array.isArray((obj as ModelEvalRun).testCases) &&
    Array.isArray((obj as ModelEvalRun).results)
  )
}

export function isEvaluateModelsRequest(obj: unknown): obj is EvaluateModelsRequest {
  if (typeof obj !== 'object' || obj === null) return false
  const req = obj as EvaluateModelsRequest
  if (typeof req.prompt !== 'string' || req.prompt.trim() === '') return false
  if (req.prompt.length > MAX_PROMPT_LENGTH) return false
  if (req.systemContext && typeof req.systemContext === 'string' && req.systemContext.length > MAX_SYSTEM_CONTEXT_LENGTH) return false
  if (!Array.isArray(req.models)) return false
  if (req.models.length < 2 || req.models.length > 3) return false
  if (!req.models.every(isModelId)) return false
  if (!Array.isArray(req.testCases) || req.testCases.length === 0) return false
  if (req.testCases.length > 10) return false
  if (req.testCases.some((tc: { input?: string }) => typeof tc.input === 'string' && tc.input.length > MAX_TEST_CASE_INPUT_LENGTH)) return false
  return req.testCases.every(isTestCase)
}

export function validateEvaluateModelsRequest(body: unknown): string | null {
  if (!isEvaluateModelsRequest(body)) {
    return 'Invalid request body'
  }
  return null
}
