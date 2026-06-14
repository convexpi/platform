'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { MissionId } from '@/app/api/tutor/route'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface TutorChatProps {
  missionId?: MissionId
  submissionId?: string    // latest submission ID for grade report context
  className?: string
}

const MISSION_LABELS: Record<string, string> = {
  mission_01_overfitting:         'Mission 1 — Overfitting',
  mission_02_marketmaker:         'Mission 2 — Market Maker',
  mission_03_alpha_discovery:     'Mission 3 — Alpha Discovery',
  general:                        'General',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TutorChat({ missionId = 'general', submissionId, className = '' }: TutorChatProps) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef                  = useRef<AbortController | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    scrollToBottom()

    // Placeholder for assistant
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId, message: text, submissionId }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let partial = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        partial += decoder.decode(value, { stream: true })

        const lines = partial.split('\n')
        partial = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
              scrollToBottom()
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'Sorry, something went wrong. Please try again.',
          }
          return updated
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Card className={`flex flex-col h-[520px] ${className}`}>
      <CardHeader className="pb-3 pt-4 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="text-base">🎓</span>
          AI Tutor
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {MISSION_LABELS[missionId] ?? 'General'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask me anything about this mission.<br />
            I&apos;ll coach you — not solve it for you.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-foreground/40 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0 gap-2">
        <textarea
          className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          placeholder="Ask a question… (Shift+Enter for newline)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming}
          rows={2}
        />
        <Button
          size="sm"
          onClick={streaming ? () => abortRef.current?.abort() : send}
          variant={streaming ? 'outline' : 'default'}
          className="self-end"
          disabled={!streaming && !input.trim()}
        >
          {streaming ? 'Stop' : 'Send'}
        </Button>
      </CardFooter>
    </Card>
  )
}
