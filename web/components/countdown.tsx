'use client'

import { useEffect, useState } from 'react'

// Ticking countdown to an ISO target (e.g. the next US market close).
export function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number>(() => Math.max(0, +new Date(target) - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, +new Date(target) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [target])

  const s = Math.floor(left / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return <span className="font-mono tabular-nums">{h}:{m}:{sec}</span>
}
