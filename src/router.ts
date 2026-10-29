import { createRouter, createWebHashHistory } from 'vue-router'
import MainMenu from './screens/MainMenu.vue'
import HowToPlay from './screens/HowToPlay.vue'
import Settings from './screens/Settings.vue'
import SetupWizard from './screens/SetupWizard.vue'
import RoleReveal from './screens/RoleReveal.vue'
import GameScreen from './screens/GameScreen.vue'
import { useGameStore } from './stores/game'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: MainMenu },
    { path: '/how-to-play', name: 'how-to-play', component: HowToPlay },
    { path: '/settings', name: 'settings', component: Settings },
    { path: '/setup', name: 'setup', component: SetupWizard },
    { path: '/reveal', name: 'reveal', component: RoleReveal },
    { path: '/game', name: 'game', component: GameScreen },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// A saved game is the only way into the table; role reveal and board swap
// places when the phase does not match the screen.
router.beforeEach((to) => {
  const game = useGameStore()
  if (to.path === '/reveal' || to.path === '/game') {
    if (!game.state) return '/'
    if (to.path === '/reveal' && game.state.phase !== 'roleReveal') return '/game'
    if (to.path === '/game' && game.state.phase === 'roleReveal') return '/reveal'
  }
  return true
})
