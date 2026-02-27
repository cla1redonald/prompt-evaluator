'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, AlertCircle, FlaskConical, History } from 'lucide-react'
import { TestCase, EvalRun } from '@/lib/types'
import { PromptEditor } from '@/components/PromptEditor'
import { TestCaseList } from '@/components/TestCaseList'
import { ResultsGrid } from '@/components/ResultsGrid'
import { HistoryPanel } from '@/components/HistoryPanel'
import { useEvaluation } from '@/hooks/useEvaluation'
import { useHistory } from '@/hooks/useHistory'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const EXAMPLE_PROMPTS = {
  A: "Answer the user's question concisely and accurately. If you don't know the answer, say so.",
  B: "You are a helpful, knowledgeable assistant. Provide thorough, well-structured answers to the user's questions. Include relevant context and examples where appropriate. Always acknowledge uncertainty when present.",
}

export default function HomePage() {
  const [promptA, setPromptA] = useState('')
  const [promptB, setPromptB] = useState('')
  const [systemContext, setSystemContext] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: generateId(), name: '', input: '' },
  ])

  const evaluation = useEvaluation()
  const history = useHistory()

  const isRunning = evaluation.status === 'running'
  const hasResults = evaluation.status === 'done' || evaluation.status === 'running'
  const canRun =
    promptA.trim().length > 0 &&
    promptB.trim().length > 0 &&
    testCases.length > 0 &&
    testCases.every((tc) => tc.input.trim().length > 0)

  const handleAddTestCase = useCallback(() => {
    if (testCases.length >= 10) return
    setTestCases((prev) => [...prev, { id: generateId(), name: '', input: '' }])
  }, [testCases.length])

  const handleUpdateTestCase = useCallback(
    (id: string, field: 'name' | 'input', value: string) => {
      setTestCases((prev) =>
        prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
      )
    },
    []
  )

  const handleDeleteTestCase = useCallback((id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id))
  }, [])

  const handleMoveUp = useCallback((id: string) => {
    setTestCases((prev) => {
      const idx = prev.findIndex((tc) => tc.id === id)
      if (idx <= 0) return prev
      const updated = [...prev]
      const temp = updated[idx - 1]
      updated[idx - 1] = updated[idx]
      updated[idx] = temp
      return updated
    })
  }, [])

  const handleMoveDown = useCallback((id: string) => {
    setTestCases((prev) => {
      const idx = prev.findIndex((tc) => tc.id === id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const updated = [...prev]
      const temp = updated[idx]
      updated[idx] = updated[idx + 1]
      updated[idx + 1] = temp
      return updated
    })
  }, [])

  const handleRun = useCallback(async () => {
    const run = await evaluation.runEvaluation(promptA, promptB, systemContext, testCases)
    if (run) {
      history.addRun(run)
    }
  }, [promptA, promptB, systemContext, testCases, evaluation, history])

  const handleLoadExample = useCallback(() => {
    setPromptA(EXAMPLE_PROMPTS.A)
    setPromptB(EXAMPLE_PROMPTS.B)
    setTestCases([
      { id: generateId(), name: 'Capital city', input: 'What is the capital of France?' },
      { id: generateId(), name: 'Simple math', input: 'What is 15% of 240?' },
      { id: generateId(), name: 'Explanation request', input: 'Explain what a REST API is in simple terms.' },
    ])
    evaluation.reset()
  }, [evaluation])

  const currentRun: EvalRun | undefined =
    evaluation.status === 'done'
      ? {
          id: 'current',
          timestamp: new Date().toISOString(),
          promptA,
          promptB,
          systemContext: systemContext || undefined,
          testCases,
          results: evaluation.results,
        }
      : undefined

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-blue-500" />
            <h1 className="font-semibold text-base">Prompt Evaluator</h1>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              A/B Testing for Prompts
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {!hasResults && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleLoadExample}
              >
                Load example
              </Button>
            )}
            {isRunning ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={evaluation.cancel}
              >
                <Square className="h-3.5 w-3.5" />
                Cancel
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleRun}
                disabled={!canRun || isRunning}
              >
                <Play className="h-3.5 w-3.5" />
                Run Evaluation
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="evaluate">
          <TabsList className="mb-6">
            <TabsTrigger value="evaluate" className="gap-2">
              <FlaskConical className="h-3.5 w-3.5" />
              Evaluate
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-3.5 w-3.5" />
              History
              {history.runs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5">
                  {history.runs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluate" className="space-y-6 mt-0">
            {/* Error banner */}
            {evaluation.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{evaluation.error}</span>
              </div>
            )}

            {/* Prompt editors */}
            <section>
              <PromptEditor
                promptA={promptA}
                promptB={promptB}
                systemContext={systemContext}
                onChangeA={setPromptA}
                onChangeB={setPromptB}
                onChangeSystem={setSystemContext}
                disabled={isRunning}
              />
            </section>

            {/* Test cases — only show before running */}
            {!hasResults && (
              <section>
                <TestCaseList
                  testCases={testCases}
                  onAdd={handleAddTestCase}
                  onUpdate={handleUpdateTestCase}
                  onDelete={handleDeleteTestCase}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  disabled={isRunning}
                />
              </section>
            )}

            {/* Bottom run button */}
            {!hasResults && (
              <div className="flex justify-end pb-2">
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8"
                  onClick={handleRun}
                  disabled={!canRun}
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Run Evaluation
                </Button>
              </div>
            )}

            {/* Results grid */}
            {hasResults && (
              <section>
                <ResultsGrid
                  testCases={testCases}
                  results={evaluation.results}
                  status={evaluation.status as 'running' | 'done' | 'idle' | 'error'}
                  progress={evaluation.progress}
                  onUpdateRating={evaluation.updateRating}
                  onReset={evaluation.reset}
                  currentRun={currentRun}
                />
              </section>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryPanel
              runs={history.runs}
              onDelete={history.removeRun}
              onClearAll={history.clearAll}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
