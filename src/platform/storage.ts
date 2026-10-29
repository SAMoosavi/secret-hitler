export interface RawStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

type TauriStore = {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<boolean>
  save(): Promise<void>
}

let nativeStore: Promise<TauriStore | null> | null = null

async function getNativeStore(): Promise<TauriStore | null> {
  if (!inTauri()) return null
  if (!nativeStore) {
    nativeStore = import('@tauri-apps/plugin-store')
      .then(({ load }) => load('secret-hitler.json', { autoSave: false }) as Promise<TauriStore>)
      .catch(() => null)
  }
  return nativeStore
}

/** Tauri store on device, localStorage in the browser/e2e. */
export const storage: RawStorage = {
  async get(key) {
    const native = await getNativeStore()
    if (native) {
      try {
        const value = await native.get<string>(key)
        return value ?? null
      } catch {
        // fall through to the web storage
      }
    }
    return localStorage.getItem(key)
  },
  async set(key, value) {
    const native = await getNativeStore()
    if (native) {
      try {
        await native.set(key, value)
        await native.save()
        return
      } catch {
        // fall through: never lose the write because the native store failed
      }
    }
    localStorage.setItem(key, value)
  },
  async remove(key) {
    const native = await getNativeStore()
    if (native) {
      try {
        await native.delete(key)
        await native.save()
      } catch {
        // ignore: localStorage cleanup below is still attempted
      }
    }
    localStorage.removeItem(key)
  },
}
