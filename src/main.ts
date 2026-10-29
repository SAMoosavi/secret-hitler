import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './i18n'
import { router } from './router'
import { useGameStore } from './stores/game'
import { useSettingsStore } from './stores/settings'
import './style.css'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(i18n)

  // Both stores must be ready before the router's first navigation runs: the
  // guards read the loaded save synchronously to restore the current screen.
  await useSettingsStore(pinia).init()
  await useGameStore(pinia).init()

  app.use(router)
  app.mount('#app')
}

void bootstrap()
