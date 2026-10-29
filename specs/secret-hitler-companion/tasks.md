# Tasks

Each task leaves the app buildable and tests green. `pnpm test` + `pnpm build` is the stop check
unless stated otherwise.

1. **Scaffold + shell.** Vite/Vue/TS/Tailwind/Tauri config, package scripts, design tokens, base
   styles, one Vitest smoke test, Tauri desktop `cargo check`. AC: build/test green.
2. **Engine I — setup & politics.** Types, role table, RNG, setup validation, nomination/term
   limits, vote outcomes, tracker + chaos, victory, transition guard. Tests: AC-1, AC-4–AC-7,
   AC-10–AC-12, AC-14.
3. **Engine II — cards & powers.** Deck/reshuffle, legislative hand, veto, executive actions,
   special election, knowledge model, public view selector. Tests: AC-2, AC-3, AC-8, AC-9,
   AC-16, AC-21.
4. **Persistence + stores.** Storage adapter, migrations/corruption handling, game store
   save-after-transition, settings store, resume state. Tests: AC-26–AC-31.
5. **i18n + theme + UI kit + menu/settings.** vue-i18n EN/FA, RTL, dark/light tokens, dialog/button/
   card/token components, router, main menu, settings screen. Tests: key parity, theme/locale
   persistence, dialog cancel.
6. **Setup wizard + role reveal.** 5 steps, names/duplicates, distribution, physical components,
   review confirmation, private handoff/reveal/hide, knowledge text, privacy interstitial.
7. **Board.** Per-count variants, tracks, markers, tracker, deck/discard, player strip, executive
   space modal, responsive landscape layout, orientation handling. AC-22–AC-25, AC-36–AC-38.
8. **Gameplay flows.** Nomination, aggregate vote entry, legislative reveal/confirm, president
   discard, chancellor enact/veto, executive resolution, special election, game over. AC-17–AC-20,
   AC-30–AC-32.
9. **Accessibility + how-to-play + privacy/feedback.** 48 dp targets, labels, focus, reduced motion,
   sound/haptics toggles, how-to-play + attribution, privacy cover, safe areas. AC-33–AC-35,
   AC-39–AC-47.
10. **E2E + docs + evidence.** Playwright suite, README (architecture, commands, APK path, Android
    status, asset licenses, limitations), final `pnpm test`, `pnpm build`, `cargo check`, e2e run.
    AC-48–AC-52.
