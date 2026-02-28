'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SinglePromptEditorProps {
  prompt: string
  systemContext: string
  onChangePrompt: (value: string) => void
  onChangeSystem: (value: string) => void
  disabled?: boolean
}

export function SinglePromptEditor({
  prompt,
  systemContext,
  onChangePrompt,
  onChangeSystem,
  disabled,
}: SinglePromptEditorProps) {
  return (
    <div className="space-y-3">
      {/* System context */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="system-model" className="text-xs font-medium text-muted-foreground">
            System context
            <span className="ml-1 text-muted-foreground/60 font-normal">(optional)</span>
          </Label>
        </div>
        <Textarea
          id="system-model"
          placeholder="Optional context shared across all models (e.g. 'You are a helpful tutor')…"
          value={systemContext}
          onChange={(e) => onChangeSystem(e.target.value)}
          disabled={disabled}
          rows={2}
          className="font-mono text-xs resize-none"
        />
      </div>

      {/* Prompt */}
      <div className="space-y-1.5">
        <Label htmlFor="prompt-model" className="text-xs font-medium">
          Prompt
        </Label>
        <Textarea
          id="prompt-model"
          placeholder="Write the prompt to test across multiple models…"
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          disabled={disabled}
          rows={5}
          className="font-mono text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This prompt is sent to each selected model alongside each test case input.
        </p>
      </div>
    </div>
  )
}
