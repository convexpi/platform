'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

// Approve / reject a paper. Rejected papers drop out of the public library (it shows
// candidate/approved only); approved are protected from the automated relevance sweep.
export async function setCuration(fd: FormData) {
  await requireAdmin()
  const status = String(fd.get('status'))
  if (!['approved', 'candidate', 'rejected'].includes(status)) return
  await createAdminClient().from('papers').update({ curation_status: status }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/papers')
}

// Attach a manually-found public PDF link to a paper. We fetch it server-side to
// confirm it's a real PDF, then record it (manual_pdf_url + fulltext_source='manual').
// The full-text grounding/verification pass then reads from this URL.
export async function setPaperUrl(fd: FormData): Promise<void> {
  await requireAdmin()
  const id = String(fd.get('id'))
  const url = String(fd.get('url') || '').trim()
  const db = createAdminClient()

  if (!url) {                                   // empty = clear the link
    await db.from('papers').update({ manual_pdf_url: null }).eq('id', id)
    revalidatePath('/admin/papers')
    return
  }
  if (!/^https?:\/\//i.test(url)) {
    redirect(`/admin/papers?view=wiki_no_ft&err=${encodeURIComponent('Not a valid http(s) URL')}`)
  }

  // Confirm the link actually resolves to a PDF before trusting it.
  let isPdf = false
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 convexpi-admin', Accept: 'application/pdf,*/*' },
      signal: AbortSignal.timeout(30_000),
    })
    const ct = (r.headers.get('content-type') || '').toLowerCase()
    if (r.ok) {
      if (ct.includes('pdf')) {
        isPdf = true
      } else {
        const head = new Uint8Array(await r.arrayBuffer()).slice(0, 5)
        isPdf = String.fromCharCode(...head) === '%PDF-'
      }
    }
  } catch {
    isPdf = false
  }

  if (!isPdf) {
    // Save the URL anyway (pending) so it isn't lost, but don't mark it as full text.
    await db.from('papers').update({ manual_pdf_url: url }).eq('id', id)
    redirect(`/admin/papers?view=wiki_no_ft&err=${encodeURIComponent('Saved, but the link did not return a PDF — check it.')}`)
  }

  await db.from('papers').update({ manual_pdf_url: url, fulltext_source: 'manual' }).eq('id', id)
  revalidatePath('/admin/papers')
}
