# Secret Hitler: Extended Edition — 0.4.0 branding

## Goal

Ship 0.4.0 under the name **Secret Hitler: Extended Edition** with the
project owner's supplied logo, without changing gameplay, package identity,
permissions or the offline guarantees.

## Acceptance criteria

- **AC-1** The launcher label on Android, the desktop window title, the browser
  `<title>` and the in-app menu heading all read
  "Secret Hitler: Extended Edition" (Persian: "هیتلر مخفی: نسخه گسترده").
- **AC-2** `src-tauri/app-icon.png` is the supplied artwork and every platform
  icon in `src-tauri/icons/**` and the Android `mipmap-*` resources is
  regenerated from it with `pnpm tauri icon`.
- **AC-3** Version is `0.4.0` in `package.json`, `src-tauri/tauri.conf.json`,
  `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`; the Android build derives
  `versionName 0.4.0` / `versionCode 4000`.
- **AC-4** Package id `app.secrethitler.companion`, `minSdk 24`, arm64-v8a only,
  no `INTERNET` permission; the APK still installs over 0.3.0.
- **AC-5** `pnpm test`, `pnpm e2e`, `pnpm build` and `pnpm check:rust` pass, and
  the CI release title is `0.4.0` (no build number).

## Out of scope

- Gameplay, rule, copy or layout changes.
- Renaming the package, Cargo crate, repository or APK asset filename.
- Store distribution and a non-debug signing key.

## Constraints and decisions

- Tauri's `productName` schema forbids `:`, so the bundle name is
  "Secret Hitler Extended Edition"; every user-visible string uses the colon
  form. Internal identifiers stay unchanged so the APK installs over earlier
  releases.
- The supplied logo is used as given. It contains a swastika card, which is
  illegal to display in some jurisdictions (e.g. Germany, StGB §86a); that risk
  was raised to the project owner, who chose to keep the artwork.
