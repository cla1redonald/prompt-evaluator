'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'
import { EvalResult, TestCase } from '@/lib/types'
import { ResultCell } from './ResultCell'
import { ExportButton } from './ExportButton'
import { EvalRun } from '@/lib/types'

interface ResultsGridProps {
  testCases: TestCase[]
  results: EvalResult[]
  status: 'running' | 'done' | 'idle' | 'error'
  progress: { completed: number; total: number }
  onUpdateRating: (testCaseId: string, prompt: 'a' | 'b', rating: 'up' | 'down' | null) => void
  onReset: () => void
  currentRun?: EvalRun
}

function computeWinner(result: EvalResult): 'A' | 'B' | 'tie' | null {
  const aScore = result.promptAScores
    ? result.promptAScores.relevance + result.promptAScores.conciseness + result.promptAScores.accuracy
    : null
  const bScore = result.promptBScores
    ? result.promptBScores.relevance + result.promptBScores.conciseness + result.promptBScores.accuracy
    : null

  if (aScore === null || bScore === null) {
    // Fall back to manual rating
    if (result.manualRating?.a === 'up' && result.manualRating?.b !== 'up') return 'A'
    if (result.manualRating?.b === 'up' && result.manualRating?.a !== 'up') return 'B'
    return null
  }

  if (aScore > bScore) return 'A'
  if (bScore > aScore) return 'B'
  return 'tie'
}

export function ResultsGrid({
  testCases,
  results,
  status,
  progress,
  onUpdateRating,
  onReset,
  currentRun,
}: ResultsGridProps) {
  if (status === 'idle') return null

  const aWins = results.filter((r) => computeWinner(r) === 'A').length
  const bWins = results.filter((r) => computeWinner(r) === 'B').length
  const ties = results.filter((r) => computeWinner(r) === 'tie').length
  const isRunning = status === 'running'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Results</h2>
          {isRunning ? (
            <Badge variant="outline" className="gap-1.5 animate-pulse border-blue-500/50 text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
              Running {progress.completed}/{progress.total}
            </Badge>
          ) : status === 'done' ? (
            <div className="flex items-center gap-2 flex-wrap">
              {aWins > 0 || bWins > 0 ? (
                <>
                  {aWins >= bWins ? (
                    <Badge className="bg-blue-600 text-white gap-1">
                      <Trophy className="h-3 w-3" />
                      Prompt A leads {aWins}/{testCases.length}
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-600 text-white gap-1">
                      <Trophy className="h-3 w-3" />
                      Prompt B leads {bWins}/{testCases.length}
                    </Badge>
                  )}
                  {ties > 0 && (
                    <Badge variant="secondary">{ties} tie{ties !== 1 ? 's' : ''}</Badge>
                  )}
                </>
              ) : (
                <Badge variant="secondary">Complete — rate outputs to compare</Badge>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {currentRun && status === 'done' && <ExportButton run={currentRun} />}
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            New Eval
          </Button>
        </div>
      </div>

      {/* Results table */}
      <div className="space-y-3">
        {testCases.map((tc, i) => {
          const result = results.find((r) => r.testCaseId === tc.id)
          const winner = result ? computeWinner(result) : null
          const isResultLoading = isRunning && (!result || (!result.promptAOutput && !result.promptBOutput))

          return (
            <Card key={tc.id} className={winner === 'A' ? 'border-blue-500/20' : winner === 'B' ? 'border-purple-500/20' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">#{i + 1}</Badge>
                  <CardTitle className="text-sm">{tc.name || `Test Case ${i + 1}`}</CardTitle>
                  {winner && (
                    <Badge
                      className={
                        winner === 'A'
                          ? 'bg-blue-600 text-white ml-auto'
                          : winner === 'B'
                          ? 'bg-purple-600 text-white ml-auto'
                          : 'bg-muted text-muted-foreground ml-auto'
                      }
                    >
                      {winner === 'tie' ? 'Tie' : `Prompt ${winner} wins`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded mt-1 line-clamp-2">
                  {tc.input}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prompt A */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Badge className="bg-blue-600 text-white text-xs">A</Badge>
                      <span className="text-xs font-medium text-muted-foreground">Prompt A</span>
                    </div>
                    <ResultCell
                      variant="A"
                      output={result?.promptAOutput ?? ''}
                      tokens={result?.promptATokens ?? { input: 0, output: 0 }}
                      latencyMs={result?.promptALatencyMs ?? 0}
                      scores={result?.promptAScores}
                      rating={result?.manualRating?.a}
                      onRate={(r) => result && onUpdateRating(tc.id, 'a', r)}
                      isLoading={isResultLoading}
                    />
                  </div>

                  {/* Prompt B */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Badge className="bg-purple-600 text-white text-xs">B</Badge>
                      <span className="text-xs font-medium text-muted-foreground">Prompt B</span>
                    </div>
                    <ResultCell
                      variant="B"
                      output={result?.promptBOutput ?? ''}
                      tokens={result?.promptBTokens ?? { input: 0, output: 0 }}
                      latencyMs={result?.promptBLatencyMs ?? 0}
                      scores={result?.promptBScores}
                      rating={result?.manualRating?.b}
                      onRate={(r) => result && onUpdateRating(tc.id, 'b', r)}
                      isLoading={isResultLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
