import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('joins multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('drops falsy values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    // twMerge resolves conflicts: bg-red-500 wins over bg-blue-500
    expect(cn('bg-blue-500', 'bg-red-500')).toBe('bg-red-500')
  })

  it('merges conditional classes', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
  })

  it('ignores false conditional classes', () => {
    const isActive = false
    expect(cn('base', isActive && 'active')).toBe('base')
  })

  it('handles object syntax from clsx', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('handles array syntax from clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('deduplicates padding utilities', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })
})
