# Secret Hitler Companion

An offline, pass-and-play companion for the physical **Secret Hitler** board
game. The app handles secret role distribution, elections, policy tracking, and
the executive actions; people still discuss, nominate, vote, and move pieces in
person.

There is no account, backend, analytics, or runtime network access. Roles,
hands, and the deck never appear in the public board view.

## Stack

- **Tauri v2** (Rust shell) targeting Android first, desktop for development
- **Vue 3** + TypeScript + **Pinia** + Vue Router (hash history)
- **Tailwind CSS v4** with CSS custom-property themes
- **vue-i18n**: English and Persian (RTL, Persian digits)
- **Vitest** for unit tests, **Playwright** for browser end-to-end tests

## Commands

```bash
pnpm install            # dependencies
pnpm dev                # Vite dev server on http://localhost:1420
pnpm build              # vue-tsc typecheck + production build to dist/
pnpm test               # unit tests (engine, stores, i18n, contrast)
pnpm e2e                # Playwright against the built app (needs Chromium)
pnpm check:rust         # cargo check for the Tauri shell
pnpm tauri dev          # desktop app with hot reload
pnpm tauri build --no-bundle   # compile the desktop binary only
```

Playwright is configured to launch the system browser at `/usr/bin/chromium`
(override with `CHROMIUM_PATH`). It does not download a browser, which keeps the
test setup usable offline. The suite runs `pnpm build` + `vite preview` itself.

### Android APK

A debug-signed, installable APK is built locally into `apk/` (gitignored — rebuild
with the command below):

```
apk/secret-hitler-companion-0.1.0-arm64-debug.apk   20 MB
sha256 effbec6a206c38deea89f1de5a598b5b293874475018362e34583e4d5c289c92
```

Install over USB or by opening the file on the device (allow unknown sources):

```bash
adb install -r apk/secret-hitler-companion-0.1.0-arm64-debug.apk
```

What the artifact is: package `app.secrethitler.companion`, version `0.1.0`,
`minSdk 24`, `targetSdk 37`, native code for **`arm64-v8a` only** (no x86_64
emulator build), signed with the standard Android **debug** certificate. It is
not a release build: it is debuggable and must not be distributed.

Verified on the built file (not merely configured):

- `apksigner verify` — passes (v2 scheme, `CN=Android Debug`).
- `aapt2 dump badging` — correct package/version/targetSdk, `native-code:
  'arm64-v8a'`, and no `android.permission.INTERNET`.
- The frontend bundle and Vazirmatn fonts are embedded in
  `lib/arm64-v8a/libsecret_hitler_companion_lib.so` (custom protocol, no asset
  server, no network).

Build command (requires JDK 21, Android SDK platform 36 **and** 37, NDK
27.2.12479018, and the `aarch64-linux-android` Rust target):

```bash
CI=1 pnpm tauri android build --debug --apk -t aarch64 --ci
```

Output: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
(copied to `apk/`). For a release APK, run the same command without `--debug`
and sign the unsigned output with your own keystore.

Run `./gradlew clean` in `src-tauri/gen/android/` before rebuilding: an
incremental build can reuse stale dex and produce a 32 MB APK instead of 20 MB.

**Blank-check caveat:** the APK was built and statically verified, but it has
**not been launched on a physical device or emulator** — none was available
here. Runtime behavior on Android is unconfirmed.

### Android hardening (applied in the generated project)

The generated project under `src-tauri/gen/android/` is part of the source:

1. **Screenshots blocked (AC-45).** `MainActivity.kt` sets
   `WindowManager.LayoutParams.FLAG_SECURE`, which blocks screenshots and hides
   the recent-apps thumbnail. Kotlin inlines the constant, so the built dex shows
   `const/16 8192` + `Window.setFlags` rather than the field name (checked with
   `dexdump` on `classes6.dex`).
2. **No network.** `AndroidManifest.xml` has no `INTERNET` permission, and the
   capability file grants only `core:default` and `store:default`.
3. **iOS:** there is no direct `FLAG_SECURE` equivalent. Use an opaque overlay
   when `sceneWillResignActive`/`applicationWillResignActive` fires (or blur the
   snapshot). This is not implemented; the app is Android-first.

## Architecture

```
src/
  game/        pure TypeScript rules engine, deck, constants, RNG (no Vue)
  stores/      Pinia: game (state + save), settings, confirm dialog
  screens/     MainMenu, SetupWizard, RoleReveal, GameScreen, Settings, HowToPlay
  components/  base/ (dialog, button-level primitives, cards, tokens)
               board/ (tracks, tracker, government, player strip)
               game/ (voting, legislative, executive, game over)
  platform/    storage (Tauri store vs localStorage), feedback, orientation, privacy
  i18n/        en.ts, fa.ts, number formatting
  style.css    design tokens, themes, board/card styles
```

- **Rules engine** (`src/game/engine.ts`): a reducer, `transition(state, action,
  rng)`, covering role tables for 5–10 players, term limits (including the
  exactly-five-player exception), election tracker/chaos, veto after the fifth
  fascist policy, all four executive powers, special elections, and every
  victory path. All randomness is injected (`Rng`), so tests are deterministic.
- **Privacy boundary:** `selectPublicView(state)` strips roles, deck order,
  hands, and private results. Screens receive the public view; only dialogs that
  have been explicitly opened receive the full state.
- **Persistence:** one versioned save (`schemaVersion: 1`) written after every
  successful transition. Web/e2e use `localStorage` (`sh.game`); the Tauri build
  uses `@tauri-apps/plugin-store`. Unknown/newer schema versions are refused
  without touching the save; malformed phase data loads as corrupt.
- **Confirm-first where it matters:** destructive or secret actions (exit,
  delete save, start new game, vote record, revealing a hand, veto, executive
  targets) always open a confirm dialog. Routine ones (nomination, policy
  choice, closing an executive result, hiding a revealed role) ask only while
  **Confirm routine actions** is on — off by default. Cancel leaves state
  untouched. Buttons are disabled while a commit is in flight, so double-taps
  cannot apply an action twice.
- **Privacy:** role reveal is pass-the-phone with an explicit "I am …" tap, then
  a face-down card the player flips; hiding takes one tap. Policy cards stay
  face down until "Reveal cards" is confirmed; resuming a save shows a "pass the
  phone to the operator" cover, and private native dialogs are unmounted until
  it is dismissed.
- **Layout:** phone portrait is a single scrolling column; landscape splits the
  board and the action panel side by side, with compact spacing and a
  user-adjustable board scale (85–110%). Minimum touch targets are 48 dp.

## Features

- Setup wizard for 5–10 players with duplicate-name blocking and a role/board
  review.
- Secret role reveal with per-player knowledge (fascists know each other and
  Hitler; at 5–6 players Hitler also knows the fascists).
- Election flow: nomination eligibility with disabled reasons, aggregate vote
  entry, tracker and chaos resolution.
- Legislative session: hidden cards, explicit reveal confirmation, one tap to
  discard or enact, veto request/response.
- Executive powers: investigate (never the same player twice), peek three,
  special election, execute — each with a private result and explicit close.
- Game-over screen for all victory paths with final policy counts.
- English/Persian, dark/light/high-contrast themes, RTL, Persian digits,
  sound/haptics/animation switches, board scale, orientation preference.
- Full local resume with schema validation and a privacy interstitial.

## Tests

Verified in this environment on 2026-10-29:

- `pnpm test` — 52 unit tests pass: role table over 10,000 runs per player
  count, deck/reshuffle, tracker, term limits, veto, powers, all victories, save
  parsing and phase data validation, settings migration, i18n key parity, and
  WCAG AA theme contrast.
- `pnpm e2e` — 17 Playwright tests pass: setup → reveals → nomination → vote →
  legislative → reload/resume, duplicate names, newer-save refusal, the
  face-down/flip role card (pre-flip absence, keyboard, reduced motion, FA/RTL),
  role-hide and vote-cancel safety, the routine-confirmation toggle, Persian
  RTL/theme persistence, how-to-play, a full five-player UI game to a liberal
  policy victory, and 360×640 dp portrait/landscape layouts without overflow.
- `pnpm build` — typecheck and production build pass.
- `pnpm check:rust` — the Tauri shell compiles on Linux.
- Android debug APK — builds and is statically verified as described above.

Not run: launching the APK on an Android device or emulator, iOS builds, and a
desktop GUI launch. Only the browser app, the Rust compile and the APK packaging
are covered by evidence.

## Limitations

- Requires the physical board game and an in-person group; it is not playable
  remotely.
- No in-app voting: the group votes aloud and the operator records the aggregate
  result, matching the companion role.
- No undo. Deliberate: every action is confirmed, and a persisted rollback would
  add hidden state. Start a new game if the table mis-records a result.
- Single save slot. Starting a new game replaces the saved one after
  confirmation.
- The shipped APK is **arm64-v8a debug-signed**. It runs on modern arm64 phones
  and tablets; it will not install on x86 emulators or 32-bit devices, and it is
  not Play-Store distributable.
- Android runtime behavior is unverified: the APK was built and statically
  checked but never launched on a device.
- Desktop windows are supported for development; only Android is the intended
  shipping target.

## Assets and attribution

- App icon and all in-app artwork are original SVG/PNG assets created for this
  project (`src-tauri/app-icon.svg`, generated icons under `src-tauri/icons/`).
  No official game artwork, logos, or card scans are used.
- **Vazirmatn** font by Saber Rastikerdar, SIL Open Font License 1.1. Files and
  license: `src/assets/fonts/` (see its `README.md` and `OFL-1.1.txt`).
- Rules text is an original summary of the publicly available rulebook; game
  rules as such are not copyrightable. *Secret Hitler* is a trademark of Goat,
  Wolf, & Cabbage LLC. This is an unofficial, non-commercial companion and is
  not affiliated with or endorsed by them.
