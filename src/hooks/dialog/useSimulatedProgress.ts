import type { Dispatch, SetStateAction } from "react"
import { useEffect, useRef, useState } from "react"

import type { DialogView } from "~types/dialog"

interface ProgressState {
  progress: number
  setProgress: Dispatch<SetStateAction<number>>
}

interface AnalysisSplashState extends ProgressState {
  quoteIndex: number
  quoteVisible: boolean
}

export function nextSimulatedProgress(current: number, ceiling: number) {
  if (current >= ceiling) return current
  const increment = Math.max(0.3, (ceiling - current) * 0.04)
  return Math.min(ceiling, current + increment)
}

export function useAnalysisSplashState(
  view: DialogView,
  loading: boolean,
  quoteCount: number
): AnalysisSplashState {
  const [progress, setProgress] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * quoteCount)
  )
  const [quoteVisible, setQuoteVisible] = useState(true)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const inProgress = view === "extracting" || loading

    if (inProgress) {
      progressIntervalRef.current = setInterval(() => {
        setProgress((current) => nextSimulatedProgress(current, 90))
      }, 300)

      quoteIntervalRef.current = setInterval(() => {
        setQuoteVisible(false)
        quoteTimeoutRef.current = setTimeout(() => {
          setQuoteIndex((current) => (current + 1) % quoteCount)
          setQuoteVisible(true)
        }, 400)
      }, 8_000)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current)
        quoteIntervalRef.current = null
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
      if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current)
    }
  }, [view, loading, quoteCount])

  return { progress, setProgress, quoteIndex, quoteVisible }
}

export function useDocumentGenerationProgress(loading: boolean): ProgressState {
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) {
      setProgress(0)
      intervalRef.current = setInterval(() => {
        setProgress((current) => nextSimulatedProgress(current, 85))
      }, 300)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loading])

  return { progress, setProgress }
}
