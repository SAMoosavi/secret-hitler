type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>
  unlock?: () => void
}

function orientation(): LockableOrientation | undefined {
  return typeof screen !== 'undefined' ? (screen.orientation as LockableOrientation) : undefined
}

export async function lockGameOrientation(mode: 'auto' | 'landscape'): Promise<void> {
  if (mode !== 'landscape') return
  try {
    await orientation()?.lock?.('landscape')
  } catch {
    // Devices without an orientation lock keep the responsive portrait fallback.
  }
}

export function unlockGameOrientation(): void {
  try {
    orientation()?.unlock?.()
  } catch {
    // ignore: the API is optional
  }
}
