'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ThumbsUp, ThumbsDown, Maximize2, Clock, Coins } from 'lucide-react'
import { Scores } from '@/lib/types'

interface ResultCellProps {
  variant: 'A' | 'B'
  output: string
  tokens: { input: number; output: number }
  latencyMs: number
  scores?: Scores
  rating?: 'up' | 'down' | null
  onRate?: (rating: 'up' | 'down' | null) => void
  isLoading?: boolean
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 4
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : value >= 3
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${color}`}>
      {label}: {value}
    </span>
  )
}

export function ResultCell({
  variant,
  output,
  tokens,
  latencyMs,
  scores,
  rating,
  onRate,
  isLoading = false,
}: ResultCellProps) {
  const [expanded, setExpanded] = useState(false)

  const variantColor = variant === 'A' ? 'text-blue-400' : 'text-purple-400'

  return (
    <>
      <div className="space-y-2">
        {/* Output text */}
        {isLoading ? (
          <div className="animate-pulse space-y-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5" />
            <div className="h-3 bg-muted rounded w-3/5" />
          </div>
        ) : output ? (
          <div className="relative">
            <div className="max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap pr-1 text-foreground/90">
              {output}
            </div>
            {output.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-0 right-0 h-5 px-1 text-xs gap-1 bg-background/80 hover:bg-background"
                onClick={() => setExpanded(true)}
              >
                <Maximize2 className="h-3 w-3" />
                Expand
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No output</p>
        )}

        {/* Metrics */}
        {!isLoading && output && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(1)}s` : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {tokens.output > 0 ? `${tokens.input}↑ ${tokens.output}↓` : '—'}
              </span>
            </div>

            {/* Auto scores */}
            {scores && (
              <div className="flex flex-wrap gap-1">
                <ScoreBadge label="Rel" value={scores.relevance} />
                <ScoreBadge label="Con" value={scores.conciseness} />
                <ScoreBadge label="Acc" value={scores.accuracy} />
              </div>
            )}

            {/* Manual rating */}
            {onRate && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${rating === 'up' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground'}`}
                  onClick={() => onRate(rating === 'up' ? null : 'up')}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${rating === 'down' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                  onClick={() => onRate(rating === 'down' ? null : 'down')}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className={`${variantColor}`}>Prompt {variant} Output</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
          </div>
          {scores && (
            <div className="flex gap-2 pt-2 border-t">
              <ScoreBadge label="Relevance" value={scores.relevance} />
              <ScoreBadge label="Conciseness" value={scores.conciseness} />
              <ScoreBadge label="Accuracy" value={scores.accuracy} />
              {scores.reasoning && (
                <p className="text-xs text-muted-foreground ml-2 italic">{scores.reasoning}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
