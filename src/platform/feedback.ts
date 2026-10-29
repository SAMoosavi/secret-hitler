export type FeedbackKind = 'success' | 'error' | 'reveal' | 'vote' | 'click'

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  return context
}

function tone(frequency: number, duration: number, delay = 0): void {
  const ctx = audioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + delay + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(ctx.currentTime + delay)
  oscillator.stop(ctx.currentTime + delay + duration + 0.02)
}

const patterns: Record<FeedbackKind, number[]> = {
  success: [523, 659],
  error: [196, 146],
  reveal: [392],
  vote: [330],
  click: [440],
}

export function feedback(
  kind: FeedbackKind,
  options: { sound: boolean; haptics: boolean },
): void {
  if (options.sound) {
    try {
      if (kind === 'success') {
        tone(523, 0.09)
        tone(659, 0.12, 0.08)
      } else if (kind === 'error') {
        tone(196, 0.12)
        tone(146, 0.16, 0.1)
      } else {
        tone(patterns[kind][0], 0.06)
      }
    } catch {
      // Audio is optional; a blocked context must never break a transition.
    }
  }
  if (options.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(kind === 'error' ? [30, 40, 30] : 18)
    } catch {
      // optional
    }
  }
}
