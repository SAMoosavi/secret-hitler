/** Uniform float in [0, 1). */
export type Rng = () => number

export function secureRng(): Rng {
  const buffer = new Uint32Array(1)
  return () => {
    globalThis.crypto.getRandomValues(buffer)
    return buffer[0] / 0x1_0000_0000
  }
}

/** Deterministic PRNG for tests and seeded debug runs. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
