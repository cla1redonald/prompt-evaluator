'use client'

import { ModelId, ModelInfo, SUPPORTED_MODELS } from '@/lib/types'

interface ModelSelectorProps {
  selected: ModelId[]
  onChange: (models: ModelId[]) => void
  disabled?: boolean
}

function ModelCard({
  model,
  checked,
  onToggle,
  disabled,
  canDeselect,
}: {
  model: ModelInfo
  checked: boolean
  onToggle: () => void
  disabled?: boolean
  canDeselect: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || (checked && !canDeselect)}
      className={`
        relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all
        ${
          checked
            ? 'border-blue-500/50 bg-blue-500/10 text-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground'
        }
        ${disabled || (checked && !canDeselect) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
      `}
    >
      {/* Colored provider dot */}
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: model.color }}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight">{model.label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{model.provider}</p>
      </div>
      {/* Checkbox indicator */}
      <span
        className={`ml-auto shrink-0 h-4 w-4 rounded border flex items-center justify-center ${
          checked ? 'bg-blue-600 border-blue-600' : 'border-border bg-background'
        }`}
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function ModelSelector({ selected, onChange, disabled }: ModelSelectorProps) {
  const toggle = (modelId: ModelId) => {
    if (selected.includes(modelId)) {
      if (selected.length <= 2) return // enforce min 2
      onChange(selected.filter((id) => id !== modelId))
    } else {
      onChange([...selected, modelId])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Models to compare</label>
        <span className="text-xs text-muted-foreground">{selected.length} selected (min 2)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SUPPORTED_MODELS.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            checked={selected.includes(model.id)}
            onToggle={() => toggle(model.id)}
            disabled={disabled}
            canDeselect={selected.length > 2}
          />
        ))}
      </div>
    </div>
  )
}
