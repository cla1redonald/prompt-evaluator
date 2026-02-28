'use client'

import { useState, useRef, useCallback } from 'react'
import { TestCase, ModelId, ModelEvalResult, ModelEvalRun } from '@/lib/types'

export type ModelEvalStatus = 'idle' | 'running' | 'done' | 'error'

interface ModelEvalState {
  status: ModelEvalStatus
  results: ModelEvalResult[]
  progress: { completed: number; total: number }
  error: string | null
}

export function useModelEvaluation() {
  const [state, setState] = useState<ModelEvalState>({
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

  const runModelEvaluation = useCallback(
    async (
      prompt: string,
      systemContext: string,
      models: ModelId[],
      testCases: TestCase[]
    ): Promise<ModelEvalRun | null> => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const total = testCases.length * models.length

      // Initialize empty results
      const localResults: ModelEvalResult[] = testCases.map((tc) => ({
        testCaseId: tc.id,
        outputs: models.map((modelId) => ({
          modelId,
          output: '',
          tokens: { input: 0, output: 0 },
          latencyMs: 0,
        })),
      }))

      setState({
        status: 'running',
        results: localResults,
        progress: { completed: 0, total },
        error: null,
      })

      try {
        const response = await fetch('/api/evaluate-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, systemContext, models, testCases }),
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
                const resultIdx = localResults.findIndex((r) => r.testCaseId === event.testCaseId)
                if (resultIdx >= 0) {
                  const outputIdx = localResults[resultIdx].outputs.findIndex(
                    (o) => o.modelId === event.modelId
                  )
                  if (outputIdx >= 0) {
                    localResults[resultIdx] = {
                      ...localResults[resultIdx],
                      outputs: localResults[resultIdx].outputs.map((o, i) =>
                        i === outputIdx
                          ? {
                              ...o,
                              output: event.output,
                              tokens: event.tokens,
                              latencyMs: event.latencyMs,
                            }
                          : o
                      ),
                    }
                    setState((prev) => ({ ...prev, results: [...localResults] }))
                  }
                }
              } else if (event.type === 'error') {
                // Non-fatal: log but continue
                console.error('Model evaluation error:', event.message)
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        // Run judge scoring for each model output
        const finalResults = await runJudgeScoringForModels(
          localResults,
          prompt,
          testCases,
          controller.signal,
          setState
        )

        const run: ModelEvalRun = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          runType: 'compare-models',
          prompt,
          systemContext: systemContext || undefined,
          models,
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
    (testCaseId: string, modelId: ModelId, rating: 'up' | 'down' | null) => {
      setState((prev) => {
        const updated = prev.results.map((r) => {
          if (r.testCaseId !== testCaseId) return r
          return {
            ...r,
            outputs: r.outputs.map((o) =>
              o.modelId === modelId ? { ...o, manualRating: rating } : o
            ),
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
    runModelEvaluation,
    cancel,
    updateRating,
    reset,
  }
}

async function runJudgeScoringForModels(
  results: ModelEvalResult[],
  prompt: string,
  testCases: TestCase[],
  signal: AbortSignal,
  setState: React.Dispatch<React.SetStateAction<ModelEvalState>>
): Promise<ModelEvalResult[]> {
  const updatedResults = results.map((r) => ({ ...r, outputs: [...r.outputs] }))

  for (let i = 0; i < updatedResults.length; i++) {
    if (signal.aborted) break
    const result = updatedResults[i]
    const testCase = testCases.find((tc) => tc.id === result.testCaseId)
    if (!testCase) continue

    const scoringPromises = result.outputs.map(async (output, j) => {
      if (!output.output) return
      try {
        const resp = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            input: testCase.input,
            output: output.output,
          }),
          signal,
        })
        const scores = await resp.json()
        if (!scores.error) {
          updatedResults[i].outputs[j] = { ...updatedResults[i].outputs[j], scores }
        }
      } catch {
        // Judge scoring is non-critical
      }
    })

    await Promise.all(scoringPromises)

    setState((prev) => ({
      ...prev,
      results: updatedResults.map((r) => ({ ...r, outputs: [...r.outputs] })),
    }))
  }

  return updatedResults
}
