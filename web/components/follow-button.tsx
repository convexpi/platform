'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  targetId: string
  initialIsFollowing: boolean
  initialFollowerCount: number
  hideCount?: boolean
}

export function FollowButton({ targetId, initialIsFollowing, initialFollowerCount, hideCount }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [count, setCount] = useState(initialFollowerCount)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const action = isFollowing ? 'unfollow' : 'follow'
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, action }),
      })
      if (res.ok) {
        setIsFollowing(!isFollowing)
        setCount(c => isFollowing ? c - 1 : c + 1)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        onClick={toggle}
        disabled={isPending}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
      {!hideCount && count > 0 && (
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  )
}
