'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, Clock, Eye, AlertTriangle, GitCompare, Cpu } from 'lucide-react'
import { AnyEvalRun, EvalRun, ModelEvalRun, isModelEvalRun, SUPPORTED_MODELS } from '@/lib/types'
import { ResultsGrid } from './ResultsGrid'
import { ModelResultsGrid } from './ModelResultsGrid'
import { ExportButton } from './ExportButton'

interface HistoryPanelProps {
  runs: AnyEvalRun[]
  onDelete: (id: string) => void
  onClearAll: () => void
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

export function HistoryPanel({ runs, onDelete, onClearAll }: HistoryPanelProps) {
  const [viewingRun, setViewingRun] = useState<AnyEvalRun | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  if (runs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No evaluation history yet</p>
          <p className="text-xs mt-1">Run an evaluation to see results here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">History</h2>
            <Badge variant="secondary">{runs.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive gap-2 text-xs"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>

        {runs.map((run) => {
          const isModel = isModelEvalRun(run)
          const evalRun = run as EvalRun
          const modelRun = run as ModelEvalRun
          return (
            <Card key={run.id} className="group">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs gap-1">
                        {isModel ? (
                          <Cpu className="h-3 w-3" />
                        ) : (
                          <GitCompare className="h-3 w-3" />
                        )}
                        {isModel ? 'Compare Models' : 'Compare Prompts'}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {run.testCases.length} test{run.testCases.length !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(run.timestamp)}
                      </span>
                    </div>

                    {isModel ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Prompt</p>
                        <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                          {truncate(modelRun.prompt, 120)}
                        </p>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {modelRun.models.map((modelId) => {
                            const info = SUPPORTED_MODELS.find((m) => m.id === modelId)
                            return (
                              <span
                                key={modelId}
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border"
                                style={{ borderColor: info?.color + '60', color: info?.color }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: info?.color }}
                                />
                                {info?.label ?? modelId}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-blue-600 text-white text-center text-[9px] leading-3">A</span>
                            Prompt A
                          </p>
                          <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                            {truncate(evalRun.promptA, 80)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-purple-600 text-white text-center text-[9px] leading-3">B</span>
                            Prompt B
                          </p>
                          <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                            {truncate(evalRun.promptB, 80)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <ExportButton run={run} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewingRun(run)}
                      title="View results"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                      onClick={() => onDelete(run.id)}
                      title="Delete run"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* View run dialog */}
      <Dialog open={!!viewingRun} onOpenChange={(o) => !o && setViewingRun(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingRun && `Run from ${formatTimestamp(viewingRun.timestamp)}`}
            </DialogTitle>
          </DialogHeader>
          {viewingRun && isModelEvalRun(viewingRun) ? (
            <ModelResultsGrid
              testCases={viewingRun.testCases}
              results={viewingRun.results}
              status="done"
              progress={{ completed: 0, total: 0 }}
              selectedModels={viewingRun.models}
              onUpdateRating={() => {}}
              onReset={() => setViewingRun(null)}
              currentRun={viewingRun}
            />
          ) : viewingRun ? (
            <ResultsGrid
              testCases={viewingRun.testCases}
              results={(viewingRun as EvalRun).results}
              status="done"
              progress={{ completed: 0, total: 0 }}
              onUpdateRating={() => {}}
              onReset={() => setViewingRun(null)}
              currentRun={viewingRun as EvalRun}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirm clear dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Clear all history?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete {runs.length} evaluation run{runs.length !== 1 ? 's' : ''}.
            This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClearAll()
                setConfirmClear(false)
              }}
            >
              Clear All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
