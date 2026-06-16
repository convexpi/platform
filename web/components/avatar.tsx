'use client'

import { useState } from 'react'
import Image from 'next/image'

interface AvatarProps {
  username: string
  displayName?: string | null
  githubUsername?: string | null
  size?: number
  className?: string
}

export function Avatar({ username, displayName, githubUsername, size = 40, className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initial = (displayName ?? username)[0].toUpperCase()

  if (githubUsername && !imgError) {
    return (
      <Image
        src={`https://avatars.githubusercontent.com/${githubUsername}`}
        alt={displayName ?? username}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
        unoptimized
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}
