'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'
import { ModelEvalResult, ModelId, TestCase, ModelEvalRun, SUPPORTED_MODELS } from '@/lib/types'
import { ResultCell } from './ResultCell'
import { ExportButton } from './ExportButton'

interface ModelResultsGridProps {
  testCases: TestCase[]
  results: ModelEvalResult[]
  status: 'running' | 'done' | 'idle' | 'error'
  progress: { completed: number; total: number }
  selectedModels: ModelId[]
  onUpdateRating: (testCaseId: string, modelId: ModelId, rating: 'up' | 'down' | null) => void
  onReset: () => void
  currentRun?: ModelEvalRun
}

function computeModelWinner(result: ModelEvalResult): ModelId | 'tie' | null {
  const scored = result.outputs.filter((o) => o.scores)
  if (scored.length < 2) {
    // Fallback to manual ratings
    const thumbsUp = result.outputs.filter((o) => o.manualRating === 'up')
    if (thumbsUp.length === 1) return thumbsUp[0].modelId
    return null
  }

  let maxScore = -Infinity
  let winner: ModelId | null = null
  let tie = false

  for (const output of result.outputs) {
    if (!output.scores) continue
    const score = output.scores.relevance + output.scores.conciseness + output.scores.accuracy
    if (score > maxScore) {
      maxScore = score
      winner = output.modelId
      tie = false
    } else if (score === maxScore) {
      tie = true
    }
  }

  if (tie) return 'tie'
  return winner
}

export function ModelResultsGrid({
  testCases,
  results,
  status,
  progress,
  selectedModels,
  onUpdateRating,
  onReset,
  currentRun,
}: ModelResultsGridProps) {
  if (status === 'idle') return null

  const isRunning = status === 'running'

  // Count wins per model
  const winCounts: Record<string, number> = {}
  for (const modelId of selectedModels) {
    winCounts[modelId] = 0
  }
  let tieCount = 0

  for (const result of results) {
    const winner = computeModelWinner(result)
    if (winner === 'tie') {
      tieCount++
    } else if (winner) {
      winCounts[winner] = (winCounts[winner] ?? 0) + 1
    }
  }

  const overallWinner = selectedModels.reduce(
    (best, modelId) => {
      if (!best || winCounts[modelId] > winCounts[best]) return modelId
      return best
    },
    null as ModelId | null
  )

  const overallWinnerInfo = overallWinner
    ? SUPPORTED_MODELS.find((m) => m.id === overallWinner)
    : null

  const overallWinnerCount = overallWinner ? winCounts[overallWinner] : 0
  const hasScores = results.some((r) => r.outputs.some((o) => o.scores))

  // Column count (2 or 3)
  const colCount = selectedModels.length
  const gridClass =
    colCount === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
      : 'grid grid-cols-1 md:grid-cols-3 gap-4'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Results</h2>
          {isRunning ? (
            <Badge
              variant="outline"
              className="gap-1.5 animate-pulse border-blue-500/50 text-blue-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
              Running {progress.completed}/{progress.total}
            </Badge>
          ) : status === 'done' && hasScores && overallWinnerInfo ? (
            <Badge className="gap-1.5 text-white" style={{ backgroundColor: overallWinnerInfo.color }}>
              <Trophy className="h-3 w-3" />
              {overallWinnerInfo.label} leads {overallWinnerCount}/{testCases.length}
            </Badge>
          ) : status === 'done' ? (
            <Badge variant="secondary">Complete — rate outputs to compare</Badge>
          ) : null}
          {tieCount > 0 && status === 'done' && (
            <Badge variant="secondary">
              {tieCount} tie{tieCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {currentRun && status === 'done' && <ExportButton run={currentRun} />}
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            New Eval
          </Button>
        </div>
      </div>

      {/* Per test case cards */}
      <div className="space-y-3">
        {testCases.map((tc, i) => {
          const result = results.find((r) => r.testCaseId === tc.id)
          const winner = result ? computeModelWinner(result) : null
          const winnerInfo =
            winner && winner !== 'tie'
              ? SUPPORTED_MODELS.find((m) => m.id === winner)
              : null

          return (
            <Card key={tc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{i + 1}
                  </Badge>
                  <CardTitle className="text-sm">{tc.name || `Test Case ${i + 1}`}</CardTitle>
                  {winner && (
                    <Badge
                      className="ml-auto text-white"
                      style={{
                        backgroundColor:
                          winner === 'tie'
                            ? undefined
                            : winnerInfo?.color,
                      }}
                      variant={winner === 'tie' ? 'secondary' : 'default'}
                    >
                      {winner === 'tie' ? 'Tie' : `${winnerInfo?.label ?? winner} wins`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded mt-1 line-clamp-2">
                  {tc.input}
                </p>
              </CardHeader>
              <CardContent>
                <div className={gridClass}>
                  {selectedModels.map((modelId) => {
                    const modelInfo = SUPPORTED_MODELS.find((m) => m.id === modelId)
                    const output = result?.outputs.find((o) => o.modelId === modelId)
                    const isOutputLoading = isRunning && !output?.output

                    return (
                      <div key={modelId} className="space-y-1">
                        {/* Model header */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: modelInfo?.color }}
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {modelInfo?.label ?? modelId}
                          </span>
                        </div>
                        <ResultCell
                          variant="A"
                          output={output?.output ?? ''}
                          tokens={output?.tokens ?? { input: 0, output: 0 }}
                          latencyMs={output?.latencyMs ?? 0}
                          scores={output?.scores}
                          rating={output?.manualRating}
                          onRate={(r) => onUpdateRating(tc.id, modelId, r)}
                          isLoading={isOutputLoading}
                          accentColor={modelInfo?.color}
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
