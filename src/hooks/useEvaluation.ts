'use client'

import { useState, useRef, useCallback, Dispatch, SetStateAction } from 'react'
import { TestCase, EvalResult, EvalRun } from '@/lib/types'

export type EvalStatus = 'idle' | 'running' | 'done' | 'error'

interface EvalState {
  status: EvalStatus
  results: EvalResult[]
  progress: { completed: number; total: number }
  error: string | null
}

export function useEvaluation() {
  const [state, setState] = useState<EvalState>({
    status: 'idle',
    results: [],
    progress: { completed: 0, total: 0 },
    error: null,
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const runEvaluation = useCallback(
    async (
      promptA: string,
      promptB: string,
      systemContext: string,
      testCases: TestCase[]
    ): Promise<EvalRun | null> => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const total = testCases.length * 2

      // Initialize results locally so we can read them after streaming
      const localResults: EvalResult[] = testCases.map((tc) => ({
        testCaseId: tc.id,
        promptAOutput: '',
        promptBOutput: '',
        promptATokens: { input: 0, output: 0 },
        promptBTokens: { input: 0, output: 0 },
        promptALatencyMs: 0,
        promptBLatencyMs: 0,
      }))

      setState({
        status: 'running',
        results: localResults,
        progress: { completed: 0, total },
        error: null,
      })

      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptA, promptB, systemContext, testCases }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Evaluation failed' }))
          throw new Error(err.error || 'Evaluation failed')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data)

              if (event.type === 'progress') {
                setState((prev) => ({
                  ...prev,
                  progress: { completed: event.completed, total: event.total },
                }))
              } else if (event.type === 'result') {
                const idx = localResults.findIndex((r) => r.testCaseId === event.testCaseId)
                if (idx >= 0) {
                  if (event.prompt === 'A') {
                    localResults[idx] = {
                      ...localResults[idx],
                      promptAOutput: event.output,
                      promptATokens: event.tokens,
                      promptALatencyMs: event.latencyMs,
                    }
                  } else {
                    localResults[idx] = {
                      ...localResults[idx],
                      promptBOutput: event.output,
                      promptBTokens: event.tokens,
                      promptBLatencyMs: event.latencyMs,
                    }
                  }
                  setState((prev) => ({ ...prev, results: [...localResults] }))
                }
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        // Now run judge scoring for all results
        const finalResults = await runJudgeScoring(
          localResults,
          promptA,
          promptB,
          testCases,
          controller.signal,
          setState
        )

        const run: EvalRun = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          promptA,
          promptB,
          systemContext: systemContext || undefined,
          testCases,
          results: finalResults,
        }

        setState((prev) => ({
          ...prev,
          status: 'done',
          results: finalResults,
        }))

        return run
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return null
        }
        const message = err instanceof Error ? err.message : 'Evaluation failed'
        setState((prev) => ({ ...prev, status: 'error', error: message }))
        return null
      }
    },
    []
  )

  const updateRating = useCallback(
    (testCaseId: string, prompt: 'a' | 'b', rating: 'up' | 'down' | null) => {
      setState((prev) => {
        const updated = prev.results.map((r) => {
          if (r.testCaseId !== testCaseId) return r
          return {
            ...r,
            manualRating: {
              a: r.manualRating?.a ?? null,
              b: r.manualRating?.b ?? null,
              [prompt]: rating,
            },
          }
        })
        return { ...prev, results: updated }
      })
    },
    []
  )

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      results: [],
      progress: { completed: 0, total: 0 },
      error: null,
    })
  }, [])

  return {
    ...state,
    runEvaluation,
    cancel,
    updateRating,
    reset,
  }
}

async function runJudgeScoring(
  results: EvalResult[],
  promptA: string,
  promptB: string,
  testCases: TestCase[],
  signal: AbortSignal,
  setState: Dispatch<SetStateAction<EvalState>>
): Promise<EvalResult[]> {
  const updatedResults = [...results]

  for (let i = 0; i < updatedResults.length; i++) {
    if (signal.aborted) break
    const result = updatedResults[i]
    const testCase = testCases.find((tc) => tc.id === result.testCaseId)
    if (!testCase) continue

    try {
      const [scoresA, scoresB] = await Promise.all([
        result.promptAOutput
          ? fetch('/api/judge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: promptA,
                input: testCase.input,
                output: result.promptAOutput,
              }),
              signal,
            }).then((r) => r.json())
          : null,
        result.promptBOutput
          ? fetch('/api/judge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: promptB,
                input: testCase.input,
                output: result.promptBOutput,
              }),
              signal,
            }).then((r) => r.json())
          : null,
      ])

      updatedResults[i] = {
        ...result,
        promptAScores: scoresA && !scoresA.error ? scoresA : undefined,
        promptBScores: scoresB && !scoresB.error ? scoresB : undefined,
      }

      setState((prev) => ({
        ...prev,
        results: [...updatedResults],
      }))
    } catch {
      // Judge scoring is non-critical, skip on error
    }
  }

  return updatedResults
}
