'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, AlertCircle, FlaskConical, History, ArrowRight, GitCompare, Cpu } from 'lucide-react'
import { TestCase, EvalRun, ModelId, ModelEvalRun } from '@/lib/types'
import { PromptEditor } from '@/components/PromptEditor'
import { SinglePromptEditor } from '@/components/SinglePromptEditor'
import { ModelSelector } from '@/components/ModelSelector'
import { TestCaseList } from '@/components/TestCaseList'
import { ResultsGrid } from '@/components/ResultsGrid'
import { ModelResultsGrid } from '@/components/ModelResultsGrid'
import { HistoryPanel } from '@/components/HistoryPanel'
import { useEvaluation } from '@/hooks/useEvaluation'
import { useModelEvaluation } from '@/hooks/useModelEvaluation'
import { useHistory } from '@/hooks/useHistory'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const EXAMPLE_PROMPTS = {
  A: "Answer the user's question concisely and accurately. If you don't know the answer, say so.",
  B: "You are a helpful, knowledgeable assistant. Provide thorough, well-structured answers to the user's questions. Include relevant context and examples where appropriate. Always acknowledge uncertainty when present.",
}

const MODEL_EXAMPLE = {
  prompt: "Explain quantum entanglement to a 10-year-old using an analogy they'd understand.",
  testCases: [
    { name: 'Direct question', input: 'Explain quantum entanglement to a 10-year-old.' },
    { name: 'Follow-up', input: 'But how do the particles know what the other one is doing?' },
  ],
}

export default function HomePage() {
  // ─── Shared state ──────────────────────────────────────────────────
  const [evalMode, setEvalMode] = useState<'compare-prompts' | 'compare-models'>('compare-prompts')
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: generateId(), name: '', input: '' },
  ])

  // ─── Compare Prompts state ─────────────────────────────────────────
  const [promptA, setPromptA] = useState('')
  const [promptB, setPromptB] = useState('')
  const [systemContext, setSystemContext] = useState('')

  // ─── Compare Models state ──────────────────────────────────────────
  const [singlePrompt, setSinglePrompt] = useState('')
  const [modelSystemContext, setModelSystemContext] = useState('')
  const [selectedModels, setSelectedModels] = useState<ModelId[]>([
    'claude-sonnet-4-5',
    'gpt-4o',
    'gemini-1-5-pro',
  ])

  const evaluation = useEvaluation()
  const modelEvaluation = useModelEvaluation()
  const history = useHistory()

  // ─── Derived state ─────────────────────────────────────────────────
  const isComparePrompts = evalMode === 'compare-prompts'
  const activeEval = isComparePrompts ? evaluation : modelEvaluation
  const isRunning = activeEval.status === 'running'
  const hasResults = activeEval.status === 'done' || activeEval.status === 'running'

  const canRun = isComparePrompts
    ? promptA.trim().length > 0 &&
      promptB.trim().length > 0 &&
      testCases.length > 0 &&
      testCases.every((tc) => tc.input.trim().length > 0)
    : singlePrompt.trim().length > 0 &&
      selectedModels.length >= 2 &&
      testCases.length > 0 &&
      testCases.every((tc) => tc.input.trim().length > 0)

  // ─── Test case handlers (shared) ───────────────────────────────────
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

  // ─── Run handlers ──────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (isComparePrompts) {
      const run = await evaluation.runEvaluation(promptA, promptB, systemContext, testCases)
      if (run) history.addRun(run)
    } else {
      const run = await modelEvaluation.runModelEvaluation(
        singlePrompt,
        modelSystemContext,
        selectedModels,
        testCases
      )
      if (run) history.addRun(run)
    }
  }, [
    isComparePrompts,
    promptA,
    promptB,
    systemContext,
    singlePrompt,
    modelSystemContext,
    selectedModels,
    testCases,
    evaluation,
    modelEvaluation,
    history,
  ])

  const handleCancel = useCallback(() => {
    activeEval.cancel()
  }, [activeEval])

  const handleLoadExample = useCallback(() => {
    if (isComparePrompts) {
      setPromptA(EXAMPLE_PROMPTS.A)
      setPromptB(EXAMPLE_PROMPTS.B)
      setTestCases([
        { id: generateId(), name: 'Capital city', input: 'What is the capital of France?' },
        { id: generateId(), name: 'Simple math', input: 'What is 15% of 240?' },
        { id: generateId(), name: 'Explanation request', input: 'Explain what a REST API is in simple terms.' },
      ])
      evaluation.reset()
    } else {
      setSinglePrompt(MODEL_EXAMPLE.prompt)
      setTestCases(
        MODEL_EXAMPLE.testCases.map((tc) => ({ id: generateId(), ...tc }))
      )
      modelEvaluation.reset()
    }
  }, [isComparePrompts, evaluation, modelEvaluation])

  const handleModeSwitch = useCallback(
    (mode: 'compare-prompts' | 'compare-models') => {
      if (mode === evalMode) return
      // Reset both evals when switching
      evaluation.reset()
      modelEvaluation.reset()
      setEvalMode(mode)
    },
    [evalMode, evaluation, modelEvaluation]
  )

  // ─── Current run for export ────────────────────────────────────────
  const currentEvalRun: EvalRun | undefined =
    isComparePrompts && evaluation.status === 'done'
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

  const currentModelRun: ModelEvalRun | undefined =
    !isComparePrompts && modelEvaluation.status === 'done'
      ? {
          id: 'current',
          timestamp: new Date().toISOString(),
          runType: 'compare-models',
          prompt: singlePrompt,
          systemContext: modelSystemContext || undefined,
          models: selectedModels,
          testCases,
          results: modelEvaluation.results,
        }
      : undefined

  const activeError = isComparePrompts ? evaluation.error : modelEvaluation.error

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
                onClick={handleCancel}
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
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => handleModeSwitch('compare-prompts')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isComparePrompts
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Compare Prompts
              </button>
              <button
                onClick={() => handleModeSwitch('compare-models')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !isComparePrompts
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                Compare Models
              </button>
            </div>

            {/* How it works — shown when inputs are empty and no results */}
            {isComparePrompts && !promptA && !promptB && !hasResults && (
              <div className="rounded-lg border border-border/50 bg-card/50 p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">How it works</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</span>
                    <span>Write two prompt variants</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 hidden sm:block shrink-0 text-muted-foreground/50" />
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</span>
                    <span>Add test cases to evaluate against</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 hidden sm:block shrink-0 text-muted-foreground/50" />
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">3</span>
                    <span>Run and compare — auto-scored by AI</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  Both prompts are sent to Claude for each test case. A judge model scores outputs on relevance, conciseness, and accuracy.
                  {' '}<button onClick={handleLoadExample} className="text-blue-500 hover:underline">Try the example</button> to see it in action.
                </p>
              </div>
            )}

            {!isComparePrompts && !singlePrompt && !hasResults && (
              <div className="rounded-lg border border-border/50 bg-card/50 p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">How it works</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</span>
                    <span>Write one prompt</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 hidden sm:block shrink-0 text-muted-foreground/50" />
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</span>
                    <span>Select models to compare</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 hidden sm:block shrink-0 text-muted-foreground/50" />
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">3</span>
                    <span>See outputs side by side — auto-scored</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  The same prompt is sent to Claude, GPT-4o, and Gemini for each test case. A judge model scores outputs.
                  {' '}<button onClick={handleLoadExample} className="text-blue-500 hover:underline">Try the example</button> to see it in action.
                </p>
              </div>
            )}

            {/* Error banner */}
            {activeError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            {/* ─── Compare Prompts mode ─── */}
            {isComparePrompts && (
              <>
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

                {hasResults && (
                  <section>
                    <ResultsGrid
                      testCases={testCases}
                      results={evaluation.results}
                      status={evaluation.status as 'running' | 'done' | 'idle' | 'error'}
                      progress={evaluation.progress}
                      onUpdateRating={evaluation.updateRating}
                      onReset={evaluation.reset}
                      currentRun={currentEvalRun}
                    />
                  </section>
                )}
              </>
            )}

            {/* ─── Compare Models mode ─── */}
            {!isComparePrompts && (
              <>
                <section className="space-y-4">
                  <SinglePromptEditor
                    prompt={singlePrompt}
                    systemContext={modelSystemContext}
                    onChangePrompt={setSinglePrompt}
                    onChangeSystem={setModelSystemContext}
                    disabled={isRunning}
                  />
                  <ModelSelector
                    selected={selectedModels}
                    onChange={setSelectedModels}
                    disabled={isRunning}
                  />
                </section>

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

                {hasResults && (
                  <section>
                    <ModelResultsGrid
                      testCases={testCases}
                      results={modelEvaluation.results}
                      status={modelEvaluation.status as 'running' | 'done' | 'idle' | 'error'}
                      progress={modelEvaluation.progress}
                      selectedModels={selectedModels}
                      onUpdateRating={modelEvaluation.updateRating}
                      onReset={modelEvaluation.reset}
                      currentRun={currentModelRun}
                    />
                  </section>
                )}
              </>
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
