'use client'

import { useState, useEffect, useCallback } from 'react'
import { EvalRun } from '@/lib/types'
import { loadRuns, saveRun, deleteRun, clearAllRuns } from '@/lib/storage'

export function useHistory() {
  const [runs, setRuns] = useState<EvalRun[]>([])

  useEffect(() => {
    setRuns(loadRuns())
  }, [])

  const addRun = useCallback((run: EvalRun) => {
    saveRun(run)
    setRuns(loadRuns())
  }, [])

  const removeRun = useCallback((id: string) => {
    deleteRun(id)
    setRuns((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    clearAllRuns()
    setRuns([])
  }, [])

  const refresh = useCallback(() => {
    setRuns(loadRuns())
  }, [])

  return { runs, addRun, removeRun, clearAll, refresh }
}
