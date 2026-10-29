let cleanup: (() => void) | null = null

/** Covers sensitive content when the app loses focus or is backgrounded. */
export function installPrivacyCover(onCover: () => void): () => void {
  cleanup?.()
  const onVisibility = () => {
    if (document.hidden) onCover()
  }
  const onBlur = () => onCover()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)
  cleanup = () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    cleanup = null
  }
  return cleanup
}
