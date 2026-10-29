import { describe, expect, it } from 'vitest'
import en from './en'
import fa from './fa'

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) =>
      child && typeof child === 'object'
        ? keys(child as object, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort()
}

describe('locales', () => {
  it('ship exactly the same message keys in English and Persian', () => {
    expect(keys(fa)).toEqual(keys(en))
  })

  it('does not leave an English string in the Persian locale', () => {
    const allowed = new Set(['appTitle'])
    const english = new Map<string, string>()
    const collect = (value: object, prefix = ''): void => {
      for (const [key, child] of Object.entries(value)) {
        if (child && typeof child === 'object') collect(child as object, `${prefix}${key}.`)
        else english.set(`${prefix}${key}`, String(child))
      }
    }
    collect(en)
    const stray: string[] = []
    const walk = (value: object, prefix = ''): void => {
      for (const [key, child] of Object.entries(value)) {
        const path = `${prefix}${key}`
        if (child && typeof child === 'object') {
          walk(child as object, `${prefix}${key}.`)
        } else if (!allowed.has(path) && english.get(path) === String(child)) {
          stray.push(path)
        }
      }
    }
    walk(fa)
    expect(stray).toEqual([])
  })
})
