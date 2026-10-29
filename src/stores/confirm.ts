import { ref } from 'vue'
import { useSettingsStore } from './settings'

export interface ConfirmOptions {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Secret or destructive actions cannot be auto-confirmed by settings. */
  required?: boolean
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const current = ref<ConfirmRequest | null>(null)

export function useConfirmState() {
  return current
}

export function confirmAction(options: ConfirmOptions = {}): Promise<boolean> {
  const settings = useSettingsStore()
  if (!options.required && !settings.settings.confirmReversible) {
    return Promise.resolve(true)
  }
  current.value?.resolve(false)
  return new Promise<boolean>((resolve) => {
    current.value = { ...options, resolve }
  })
}

export function resolveConfirm(value: boolean): void {
  const request = current.value
  current.value = null
  request?.resolve(value)
}
