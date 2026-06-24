'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Thin, dismissible early-beta banner. Renders nothing on the server and on first client paint, then
// appears unless previously dismissed — avoids a hydration mismatch on the persisted state.
export function BetaBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    // Read persisted dismissal after mount (SSR-safe: server + first paint render nothing).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setShow(localStorage.getItem('cp_beta_dismissed') !== '1') } catch { setShow(true) }
  }, [])

  if (!show) return null

  return (
    <div className="bg-[#0B1F3A] text-white">
      <div className="container relative mx-auto px-4 h-9 flex items-center justify-center gap-3 text-xs">
        <p className="text-center text-white/90">
          ConvexPi is in <span className="font-medium">early beta</span> —{' '}
          <Link href="/about#contact" className="underline underline-offset-2 hover:text-white">
            reach out with questions or feedback
          </Link>.
        </p>
        <button
          aria-label="Dismiss"
          onClick={() => { try { localStorage.setItem('cp_beta_dismissed', '1') } catch {} ; setShow(false) }}
          className="absolute right-4 text-white/60 hover:text-white text-sm leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
