# Plan — secret-hitler-companion

## Chosen architecture

Tauri v2 shell + Vue 3/TypeScript/Vite frontend + Tailwind CSS v4. The rules engine is pure
TypeScript with no Vue/Tauri imports; one Pinia store owns the single game state and persists after
every confirmed transition. Screens are routed views that read the store and dispatch actions.

Trade-offs: a pure web app would be simpler but cannot lock orientation, protect the recent-apps
preview, or ship as an offline APK; Tauri keeps the UI stack while adding the Android shell. A
game-engine framework or XState was rejected — the phase set is small and an explicit reducer is
easier to test and debug than a library. A backend was rejected by the offline requirement.

## Structure

```
src/
  game/          types, constants (role/board tables), rng, deck, engine, selectors
  stores/        game (single source of truth), settings, confirm service
  i18n/          en.ts, fa.ts, index.ts
  platform/      storage (Tauri store / localStorage), privacy, orientation, feedback
  components/    base/ (button, dialog, card, token), board/, game/
  screens/       MainMenu, HowToPlay, Settings, SetupWizard, RoleReveal, GameScreen
  router.ts, App.vue, main.ts, style.css
e2e/             Playwright specs (system chromium)
src-tauri/       Tauri v2 shell, store plugin, icons, Android project when init runs
```

## Rules engine

- `GameState` holds: schemaVersion, id, playerCount, players (id, name, role, alive), phase,
  presidentId, nomineeId, lastElection, lastPresidentId, lastChancellorId, enacted counts, deck,
  discard, tracker, round, legislative hand, pendingAction, investigated ids, vetoUnlocked,
  specialReturnId, revealIndex, winner.
- Phases: `roleReveal → nomination → voting → legislativePresident → legislativeChancellor →
  executive → nomination … → gameOver`. Veto request is a flag inside the chancellor phase.
- `transition(state, action)` returns `{ok: true, state}` or `{ok: false, state: <same reference>,
  error}`. Every rule check happens there; UI never mutates state.
- RNG is injected (`() => number`) and defaults to `crypto.getRandomValues`; tests use a seeded
  generator. Fisher–Yates shuffle. Roles are assigned only at the final setup confirm.
- Board tables: 5–6 [–,–,Peek,Exec,Exec], 7–8 [–,Investigate,SpecialElection,Exec,Exec],
  9–10 [Investigate,Investigate,SpecialElection,Exec,Exec]; 6th fascist space is the win.
- Term limits use the last *elected* president/chancellor; cleared by a successful policy or the
  third failed election; at exactly 5 living players only the last chancellor is blocked.
- Deck: 17 tiles (6 L, 11 F); draw 3, president discards 1, chancellor enacts 1; reshuffle when
  fewer than 3 remain; chaos enacts the top tile with no power and resets the tracker/term limits.
- Veto unlocks after the 5th fascist policy, not in that session; success discards both tiles and
  advances the tracker.
- Executive actions: investigate (party only, once per player), peek (top 3, unchanged order),
  special election (any other living player; normal order resumes after that term), execute.
- `selectPublicView(state)` returns a deep copy with roles, deck order, hands and peek data
  stripped. Role reveal reads the private store field; the board only ever sees the public view.
- Knowledge: 5–6 the lone fascist and Hitler recognise each other; 7–10 fascists see each other
  and Hitler, Hitler sees no fascist (spec OQ-1 default).

## State, persistence, resume

- Store `commit(action)` → transition → persist JSON → swap state. If persistence fails, state is
  not swapped and the UI shows a save error.
- Adapter: `localStorage` on web/e2e, `@tauri-apps/plugin-store` when `__TAURI_INTERNALS__` is
  present. Keys `sh.game`, `sh.settings`; schemaVersion + migrations; unknown newer version refused
  with a readable message; corrupt save offers a new game.
- Resume shows a privacy interstitial before any sensitive phase; role/card faces never render
  before the explicit reveal confirm.

## UI / platform

- Router: `/`, `/setup`, `/reveal`, `/game`, `/how-to-play`, `/settings`. Back from `/game` and
  mid-setup asks before leaving.
- All mutations go through `confirmAction()` (global dialog) with required/danger flags; the
  confirm button disables while the store commits. Reversible-action preference cannot disable
  secret or destructive confirmations.
- i18n via vue-i18n; FA sets `dir=rtl` and logical CSS properties; locale persisted. Tailwind
  theme tokens are CSS variables switched by `data-theme` on `<html>`.
- Orientation: Screen Orientation API lock on entering the game, unlock on leaving, graceful
  catch; portrait fallback layout with a rotate hint. Safe-area padding via `env(safe-area-inset-*)`.
- Privacy: content cover on `visibilitychange`/window blur; README documents Android FLAG_SECURE
  hook (no Android SDK here) and the iOS limitation.
- Feedback: Web Audio beeps (no assets) and `navigator.vibrate`; both toggleable.
- Base dialogs use native `<dialog>` for focus trapping and Esc handling; icon-only controls get
  `aria-label`; state is conveyed by icon + text, never color alone.

## Testing

- Vitest + jsdom: engine (role table, uniqueness, deck arithmetic, reshuffle, tracker, term limits,
  invalid transitions, all victory paths, veto, executive actions, special election, public view),
  persistence/migrations, settings, a component smoke suite.
- Playwright against `vite preview` with `executablePath: /usr/bin/chromium`: setup → reveal →
  board → nomination/vote → legislative reveal/cancel → resume reload → language switch.

## Deliberate cuts

No digital card mode, no in-app voting, no undo of official transitions (confirm-first instead), no
network/analytics, no extra themes, no card scanning, no generated audio files. APK compilation is
documented but unverified (no Android SDK/JDK on this machine).

## Environment limits

Android-only evidence (APK, FLAG_SECURE, orientation lock, no INTERNET permission) cannot be
executed here. The build, unit tests, web e2e and Linux Tauri build are run; Android steps are
documented with exact commands.
