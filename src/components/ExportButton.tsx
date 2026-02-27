'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Download, FileJson, FileText } from 'lucide-react'
import { EvalRun } from '@/lib/types'
import { downloadCSV, downloadJSON } from '@/lib/export'

interface ExportButtonProps {
  run: EvalRun
}

export function ExportButton({ run }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Results</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            className="flex flex-col h-20 gap-2"
            onClick={() => {
              downloadJSON(run)
              setOpen(false)
            }}
          >
            <FileJson className="h-5 w-5 text-blue-500" />
            <span className="text-sm">JSON</span>
            <span className="text-xs text-muted-foreground">Full structured data</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-20 gap-2"
            onClick={() => {
              downloadCSV(run)
              setOpen(false)
            }}
          >
            <FileText className="h-5 w-5 text-green-500" />
            <span className="text-sm">CSV</span>
            <span className="text-xs text-muted-foreground">Flattened table</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
