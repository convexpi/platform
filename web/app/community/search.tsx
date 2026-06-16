'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'

export function CommunitySearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(initialQuery)

  useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    startTransition(() => {
      const params = new URLSearchParams()
      if (v.trim()) params.set('q', v.trim())
      router.replace(`/community${params.size ? `?${params}` : ''}`)
    })
  }

  return (
    <div className="relative max-w-sm">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search by name, username, or university…"
        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
