import { NextResponse } from 'next/server'
import { loadContentIndex } from '@/lib/content'

export const revalidate = 3600

export async function GET() {
  const index = await loadContentIndex()
  return NextResponse.json(index)
}
