import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest stubs CSS imports, so read the stylesheet from disk instead.
const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

type Vars = Record<string, string>

function blocks(): Array<{ selectors: string[]; vars: Vars }> {
  const result: Array<{ selectors: string[]; vars: Vars }> = []
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars: Vars = {}
    for (const decl of match[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars[decl[1]] = decl[2].trim()
    }
    if (!Object.keys(vars).length) continue
    const selectors = match[1]
      .split(',')
      .map((selector) => selector.replace(/\s+/g, ''))
      .filter(Boolean)
    result.push({ selectors, vars })
  }
  return result
}

const all = blocks()

function theme(base: string, ...overlays: string[]): Vars {
  const merge = (selector: string): Vars =>
    all
      .filter((block) => block.selectors.includes(selector))
      .reduce<Vars>((vars, block) => ({ ...vars, ...block.vars }), {})
  return overlays.reduce<Vars>((vars, overlay) => ({ ...vars, ...merge(overlay) }), merge(base))
}

const DARK = ':root'
const LIGHT = "[data-theme='light']"
const HIGH = "[data-contrast='high']"
const LIGHT_HIGH = "[data-theme='light'][data-contrast='high']"

const themes: Array<[string, Vars]> = [
  ['dark', theme(DARK)],
  ['light', theme(LIGHT)],
  ['dark high contrast', theme(DARK, HIGH)],
  ['light high contrast', theme(LIGHT, HIGH, LIGHT_HIGH)],
]

function luminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map((pair) => parseInt(pair, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function ratio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

const readable: Array<[string, string]> = [
  ['--ink', '--bg'],
  ['--ink', '--surface'],
  ['--ink-muted', '--bg'],
  ['--ink-muted', '--surface'],
  ['--gold', '--surface'],
  ['--gold', '--bg'],
  ['--danger-text', '--surface'],
  ['--danger-text', '--bg'],
  ['--on-gold', '--gold'],
]

describe('theme contrast', () => {
  for (const [name, vars] of themes) {
    it(`${name} keeps text at WCAG AA`, () => {
      expect(vars['--ink'], `${name} is missing theme tokens`).toBeTruthy()
      for (const [fg, bg] of readable) {
        expect(ratio(vars[fg], vars[bg]), `${name}: --${fg} on --${bg}`).toBeGreaterThanOrEqual(4.5)
      }
      // Danger buttons paint white on the solid token, not the text token.
      expect(ratio('#ffffff', vars['--danger']), `${name}: white on --danger`).toBeGreaterThanOrEqual(4.5)
    })
  }
})
