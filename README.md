# Secret Hitler: Extended Edition

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

An installable release APK is published on the
[Releases page](https://github.com/SAMoosavi/secret-hitler/releases) by CI, and
can be built locally into `apk/` (gitignored) with the command below.

Install by opening the release on the phone, downloading the APK, allowing
installs from that source, and tapping the file. For a USB install:

```bash
adb install -r secret-hitler-companion-0.4.0-arm64-release.apk
```

What the artifact is: package `app.secrethitler.companion`, version `0.4.0`
(versionCode 4000), `minSdk 24`, `targetSdk 37`, native code for **`arm64-v8a`
only** (no x86_64 emulator build), R8-minified and **not debuggable** — a real
release build. It is signed with the project's Android **debug** key (same
certificate as the earlier debug builds) so it installs over them; it is still
not Play-Store distributable.

Static checks on the published file:

- `apksigner verify --print-certs` — v2 scheme, cert SHA-256 `da9d93d2…cfd2`
  (the workflow refuses to publish a different key).
- `aapt2 dump badging` — package/version `0.4.0` (versionCode 4000),
  `minSdkVersion 24`, `targetSdkVersion 37`, `native-code: 'arm64-v8a'`, no
  `debuggable` flag, and no `android.permission.INTERNET`.
- The frontend bundle and Vazirmatn fonts are embedded in
  `lib/arm64-v8a/libsecret_hitler_companion_lib.so` (custom protocol, no asset
  server, no network).

Build command (requires JDK 21, Android SDK platform 36 **and** 37, NDK
27.2.12479018, and the `aarch64-linux-android` Rust target):

```bash
CI=1 pnpm tauri android build --apk -t aarch64 --ci
```

Output:
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`
(copied to `apk/`). The release build type reuses the debug signing config, set
in `src-tauri/gen/android/app/build.gradle.kts`, so no keystore is needed
locally.

Run `./gradlew clean` in `src-tauri/gen/android/` before rebuilding: an
incremental build can reuse stale dex and produce a much larger APK.

**Blank-check caveat:** the APK was built and statically verified, but it has
**not been launched on a physical device or emulator** — none was available
here. Runtime behavior on Android is unconfirmed.

### GitHub releases (CI)

`.github/workflows/release.yml` builds the same arm64 **release** APK and
attaches it to a GitHub Release whenever a pull request is **merged into
`main`** (or when run manually from the Actions tab). The release tag is
`v<package version>-build.<run number>` and the assets are
`secret-hitler-companion-<version>-arm64-release.apk` plus its `.sha256`.

Install from a release: open the release on the phone, download the APK, allow
installing from that source, tap the file. It is the same release build as the
local `apk/` artifact — arm64-v8a only, Android 7.0+ (`minSdk 24`), no Internet
permission, not a store build.

CI runs `pnpm install --frozen-lockfile`, `pnpm test`, then
`pnpm tauri android build --apk -t aarch64` with Node 24, JDK 21, Rust
stable + `aarch64-linux-android`, Android platform 37.0, build-tools 37.0.0 and NDK
27.2.12479018. It does not run Playwright (no browser download in CI) and it
cannot launch the APK.

**Update signature:** the release build is signed with the project's Android
debug key so it installs over the earlier debug-signed builds. The runner
generates a fresh debug keystore per run, so without a stored key each release
has a different signature and Android refuses to install it over the previous
one. Store the local debug keystore once as a repository secret (it is not a
secret in the security sense — the password is the well-known `android` — but it
must be the same key every run):

```bash
base64 -w0 ~/.android/debug.keystore | gh secret set ANDROID_DEBUG_KEYSTORE_BASE64
```

The workflow restores the key to both `~/.android` and `$XDG_CONFIG_HOME/.android`
(where AGP looks on Linux) and refuses to publish if the built APK is signed by
any other key.

PRs opened from a fork get a read-only token and cannot publish a release; merge
from a branch in this repository. The first run after this workflow landed is
the test: it was written but never executed locally.

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
  rng)`, covering role tables for 4–13 players, term limits (including the
  exactly-five-survivors exception), election tracker/chaos, veto after the
  fifth fascist policy, all four executive powers, special elections, and every
  victory path. At 4 players it runs a fan-made house variant with 2 liberals,
  1 fascist and Hitler on a 4-space liberal and 5-space fascist track. At 11–13 players it also runs the fan-made Communist expansion
  (`src/game/expansion.ts`): a third party, a shared Communist policy track,
  Radicalisation, Confession, Five-Year Plan, and the joint Hitler-execution
  victory. All randomness is injected (`Rng`), so tests are deterministic.
- **Privacy boundary:** `selectPublicView(state)` strips roles, deck order,
  hands, and private results. Screens receive the public view; only dialogs that
  have been explicitly opened receive the full state.
- **Persistence:** one versioned save (`schemaVersion: 2`) written after every
  successful transition. Web/e2e use `localStorage` (`sh.game`); the Tauri build
  uses `@tauri-apps/plugin-store`. Version 1 saves migrate in place; unknown or
  newer schema versions are refused without touching the save; malformed phase
  data loads as corrupt.
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

- Setup wizard for 4–13 players with duplicate-name blocking and a role/board
  review. The 4-player house variant and the 11–13 player Communist expansion
  switch on automatically by player count.
- Secret role reveal with per-player knowledge (fascists know each other and
  Hitler; at 4–6 players Hitler also knows the fascists). At 11–13 players
  Communists know each other and their secret step; fascists do not see them.
- Election flow: nomination eligibility with disabled reasons, aggregate vote
  entry, tracker and chaos resolution.
- Legislative session: hidden cards, explicit reveal confirmation, one tap to
  discard or enact, veto request/response.
- Executive powers: investigate (never the same player twice), peek three,
  special election, execute — each with a private result and explicit close.
- Communist expansion at 11–13 players: a 26-card deck (Fascist and Communist
  policies), a separate Communist track with its own powers, the secret
  Radicalisation and Confession steps, Five-Year Plan, and the joint
  Hitler-execution victory for Communists and Liberals.
- 4-player house variant: 2 liberals against 1 fascist and Hitler, a 17-tile
  deck, 4 liberal / 5 fascist policy victories, a four-power fascist board
  (blank, blank, peek, execute — no investigation) and no veto.
- Game-over screen for all victory paths with final policy counts.
- English/Persian, dark/light/high-contrast themes, RTL, Persian digits,
  sound/haptics/animation switches, board scale, orientation preference.
- Full local resume with schema validation and a privacy interstitial.

## Tests

Verified in this environment on 2026-10-30:

- `pnpm test` — 148 unit tests pass: role table over 10,000 runs per player
  count (and over 1,000 at 4), deck/reshuffle, tracker, term limits, veto,
  powers, all victories, the 4-player short tracks and board, expansion rules
  (Communist track, Radicalisation, Confession, Five-Year Plan, joint victory),
  public-view privacy, save v1→v2 migration and phase data validation, settings
  migration, i18n key parity, and WCAG AA theme contrast.
- `pnpm e2e` — 37 Playwright tests pass: setup → reveals → nomination → vote →
  legislative → reload/resume, the 4-player house variant, duplicate names,
  newer-save refusal, the
  face-down/flip role card (pre-flip absence, keyboard, reduced motion, FA/RTL),
  role-hide and vote-cancel safety, the routine-confirmation toggle, Persian
  RTL/theme persistence, how-to-play, a full five-player UI game to a liberal
  policy victory, the 11–13 player expansion flows in both languages, and
  360×640 dp portrait/landscape layouts without overflow (the 13-player board
  scrolls vertically in landscape, by design).
- `pnpm build` — typecheck and production build pass.
- `pnpm check:rust` — the Tauri shell compiles on Linux.
- Android release APK — built by CI and statically verified as described above.

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
- The shipped APK is an **arm64-v8a release build signed with the debug key**.
  It runs on modern arm64 phones and tablets; it will not install on x86
  emulators or 32-bit devices, and it is not Play-Store distributable.
- Android runtime behavior is unverified: the APK was built and statically
  checked but never launched on a device.
- The 11–13 player expansion and the 4-player house variant are fan-made and
  have had less table testing than the base game. The 4-player mode is a quick
  house experiment: the 17-tile deck still favours the fascists, so expect
  short, lopsided games. The 13-player board needs vertical scrolling in a
  640×360 landscape viewport (no horizontal overflow).
- Desktop windows are supported for development; only Android is the intended
  shipping target.

## Assets and attribution

- The app icon is the project owner's own artwork (`src-tauri/app-icon.png`);
  platform icons under `src-tauri/icons/` are generated from it with
  `pnpm tauri icon`. In-app artwork is original SVG. No official game artwork,
  logos, or card scans are used.
- **Vazirmatn** font by Saber Rastikerdar, SIL Open Font License 1.1. Files and
  license: `src/assets/fonts/` (see its `README.md` and `OFL-1.1.txt`).
- Rules text is an original summary of the publicly available rulebook; game
  rules as such are not copyrightable. *Secret Hitler* is a trademark of Goat,
  Wolf, & Cabbage LLC. This is an unofficial, non-commercial companion and is
  not affiliated with or endorsed by them.
