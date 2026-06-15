'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Profile = {
  username: string
  display_name: string | null
  university: string | null
  bio: string | null
  github_username: string | null
  website_url: string | null
}

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [university, setUniversity] = useState(profile.university ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [githubUsername, setGithubUsername] = useState(profile.github_username ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); setSaving(false); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name:    displayName.trim()    || null,
        university:      university.trim()     || null,
        bio:             bio.trim()            || null,
        github_username: githubUsername.trim() || null,
        website_url:     websiteUrl.trim()     || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/profile/${profile.username}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={profile.username}
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          Shown on your profile and leaderboards. Defaults to your username.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="university">University / institution</Label>
        <Input
          id="university"
          value={university}
          onChange={e => setUniversity(e.target.value)}
          placeholder="e.g. University of Cincinnati"
          maxLength={120}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A sentence or two about your background or research interests."
          rows={3}
          maxLength={280}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{bio.length}/280</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="github_username">GitHub username</Label>
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">
            github.com/
          </span>
          <Input
            id="github_username"
            value={githubUsername}
            onChange={e => setGithubUsername(e.target.value)}
            placeholder="yourusername"
            maxLength={39}
            className="rounded-l-none"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Shown on your profile so others can find your public research code.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="website_url">Website</Label>
        <Input
          id="website_url"
          type="url"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://yoursite.com"
          maxLength={200}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline"
          onClick={() => router.push(`/profile/${profile.username}`)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
