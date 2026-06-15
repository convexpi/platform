'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyProfileLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/profile/${username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
      {copied ? 'Copied!' : 'Share profile'}
    </Button>
  )
}
