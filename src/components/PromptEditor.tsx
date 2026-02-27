'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface PromptEditorProps {
  promptA: string
  promptB: string
  systemContext: string
  onChangeA: (value: string) => void
  onChangeB: (value: string) => void
  onChangeSystem: (value: string) => void
  disabled?: boolean
}

function CharCount({ value, max = 10000 }: { value: string; max?: number }) {
  const count = value.length
  const isOver = count > max
  return (
    <span className={`text-xs tabular-nums ${isOver ? 'text-destructive' : 'text-muted-foreground'}`}>
      {count.toLocaleString()} chars
    </span>
  )
}

function VariableHints({ value }: { value: string }) {
  const matches = value.match(/\{\{(\w+)\}\}/g)
  if (!matches || matches.length === 0) return null
  const unique = [...new Set(matches)]
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="text-xs text-muted-foreground">Variables:</span>
      {unique.map((v) => (
        <Badge key={v} variant="secondary" className="text-xs font-mono px-1 py-0">
          {v}
        </Badge>
      ))}
    </div>
  )
}

export function PromptEditor({
  promptA,
  promptB,
  systemContext,
  onChangeA,
  onChangeB,
  onChangeSystem,
  disabled = false,
}: PromptEditorProps) {
  return (
    <div className="space-y-4">
      {/* System context */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              System Context
              <span className="ml-2 text-xs font-normal normal-case">(optional, applied to both prompts)</span>
            </CardTitle>
            <CharCount value={systemContext} />
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g. You are a helpful customer service assistant for Acme Corp. Be concise and friendly."
            value={systemContext}
            onChange={(e) => onChangeSystem(e.target.value)}
            disabled={disabled}
            rows={2}
            className="resize-none font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Side-by-side editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prompt A */}
        <Card className="border-blue-500/30 bg-blue-950/10 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-xs">A</Badge>
                <CardTitle className="text-sm">Prompt A</CardTitle>
              </div>
              <CharCount value={promptA} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="Enter your first prompt variant here. Use {{variable}} syntax for dynamic inputs."
              value={promptA}
              onChange={(e) => onChangeA(e.target.value)}
              disabled={disabled}
              rows={8}
              className="resize-y font-mono text-sm min-h-[160px]"
            />
            <VariableHints value={promptA} />
          </CardContent>
        </Card>

        {/* Prompt B */}
        <Card className="border-purple-500/30 bg-purple-950/10 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white text-xs">B</Badge>
                <CardTitle className="text-sm">Prompt B</CardTitle>
              </div>
              <CharCount value={promptB} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="Enter your second prompt variant here. Use {{variable}} syntax for dynamic inputs."
              value={promptB}
              onChange={(e) => onChangeB(e.target.value)}
              disabled={disabled}
              rows={8}
              className="resize-y font-mono text-sm min-h-[160px]"
            />
            <VariableHints value={promptB} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
