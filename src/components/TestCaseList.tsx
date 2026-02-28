'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { TestCase } from '@/lib/types'

interface TestCaseListProps {
  testCases: TestCase[]
  onAdd: () => void
  onUpdate: (id: string, field: keyof Pick<TestCase, 'name' | 'input'>, value: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  disabled?: boolean
}

export function TestCaseList({
  testCases,
  onAdd,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled = false,
}: TestCaseListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Test Cases</h2>
            <Badge variant="secondary">{testCases.length} / 10</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Each test case is a user message that both prompts will be evaluated against</p>
        </div>
        <Button
          onClick={onAdd}
          disabled={disabled || testCases.length >= 10}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Test Case
        </Button>
      </div>

      {testCases.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No test cases yet.</p>
            <p className="text-sm">Add a test case to define what inputs to evaluate your prompts against.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {testCases.map((tc, index) => (
          <TestCaseItem
            key={tc.id}
            testCase={tc}
            index={index}
            isFirst={index === 0}
            isLast={index === testCases.length - 1}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface TestCaseItemProps {
  testCase: TestCase
  index: number
  isFirst: boolean
  isLast: boolean
  onUpdate: (id: string, field: keyof Pick<TestCase, 'name' | 'input'>, value: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  disabled: boolean
}

function TestCaseItem({
  testCase,
  index,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: TestCaseItemProps) {
  return (
    <Card className="group">
      <CardContent className="pt-3 pb-3">
        <div className="flex gap-3">
          {/* Reorder buttons */}
          <div className="flex flex-col gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-40 group-hover:opacity-100"
              onClick={() => onMoveUp(testCase.id)}
              disabled={disabled || isFirst}
              aria-label="Move up"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-40 group-hover:opacity-100"
              onClick={() => onMoveDown(testCase.id)}
              disabled={disabled || isLast}
              aria-label="Move down"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                #{index + 1}
              </Badge>
              <Input
                placeholder="Test case name (e.g. 'Simple greeting')"
                value={testCase.name}
                onChange={(e) => onUpdate(testCase.id, 'name', e.target.value)}
                disabled={disabled}
                className="h-7 text-sm"
              />
            </div>
            <Textarea
              placeholder="User input / test message..."
              value={testCase.input}
              onChange={(e) => onUpdate(testCase.id, 'input', e.target.value)}
              disabled={disabled}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 mt-1 text-muted-foreground opacity-40 group-hover:opacity-100 hover:text-destructive hover:opacity-100"
            onClick={() => onDelete(testCase.id)}
            disabled={disabled}
            aria-label="Delete test case"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
