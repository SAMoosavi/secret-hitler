# Reality redesign — verification

Tree verified: working tree at `50cc089` + uncommitted P0–P3 changes (`git diff --stat`: 22 files,
+912/−499, plus new `src/components/board/DeckPile.vue`). No commits, nothing pushed.

## Gates

| Command | Result | Evidence |
|---|---|---|
| `pnpm test` | **PASS** 148/148 (8 files) | includes `src/contrast.test.ts` extended to the material pairs |
| `pnpm build` | **PASS** (`vue-tsc --noEmit` + `vite build`) | `dist/assets/index-*.css` 51.7 kB (10,693 B gzip), JS 325.1 kB (102.5 kB gzip) |
| `pnpm e2e` | **PASS** 37/37 (chromium) | `e2e/game.spec.ts`, `e2e/communist.spec.ts`, `e2e/settings.spec.ts` |

Layout/screenshot harnesses (throwaway, not committed): `/tmp/opencode/{shots,pile,audit,rtl,zoom,legis,enact,screens}.mjs`,
images in `/tmp/opencode/ui/`. They drive `vite preview` on `http://localhost:4173` with real Chromium
at 360×740, 390×844, 844×390 and 1024×768 in dark/light, EN/FA, normal/high contrast.

## Acceptance criteria

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 no rules/engine/schema change | **PASS** | `src/game/**` untouched (`git diff --name-only`); the only store change is the `orientation` default `landscape` → `auto` (AC-4); i18n gained two display keys (`game.nomineeShort`, present in both locales); save key/schema untouched; all 37 e2e keep their accessible names |
| AC-2 every player visible, no hidden overflow | **PASS** | measured per size: `overflowX 0`, seat rail `scrollWidth === clientWidth` for 4/5/7/13 players; 13-player rows wrap to 140 px tall at 360 (no clip) |
| AC-3 primary action visible, bottom third in portrait | **PASS** | tray top at 586/740, 690/844 (360/390) — `y > 0.55·H`; landscape 844×390 tray 248–385 in view; every phase's tray measured (nomination, vote, legislative, executive, game over) |
| AC-4 portrait supported, `auto` default, no rotate banner | **PASS** | `.rotate-hint` deleted; default `orientation: 'auto'`; e2e plays full games in 360×740 portrait |
| AC-5 board as materials | **PASS** | `/tmp/opencode/ui/b-*`, `e-dark-390x844.png`: die-cut slots, enacted cards seated with tilt, draw/discard piles with plaques, brass tracker pawn, placecards (the APPROVED stamp was removed in round 2, see below) |
| AC-6 physical `PolicyCard`, 3 states | **PASS** | `PolicyCard.vue` + `.policy-card` (5/7, paper texture, keyline `::after`, foil accent, edge highlight); states in hand (`r-*-president-hand.png`), lifted (`.card-pick:hover/:focus-visible/:active`), enacted (`seated` + `.tilt-r`) |
| AC-7 tap-only play, keyboard parity | **PASS** | `LegislativePanel` hand fan → tap card → confirm dialog shows the card face large → seated in slot; e2e keyboard test (Enter/Space) and `revealFirstCard` pass |
| AC-8 no text < 12 px, names ≥ 16 px | **PASS** | DOM audit on menu + game: no text node < 12 px; all `text-[0.6xrem]`/`0.7rem` swept to `text-xs`; `.eyebrow` 0.75 rem; names `text-base` (16 px) |
| AC-9 ≥44×44 hit areas | **PASS (with note)** | only sub-44 interactive element is the `.sr-only` skip link by design; policy slots 48 px @360 / 52 px elsewhere; seat mats `min-h-11` (44 px); deck piles ≥44 px tall; dialog actions `btn` (min-h 3 rem) |
| AC-10 reduced motion / animations off | **PASS** | `[data-animations='off']` + `prefers-reduced-motion` zero out animation/transition; e2e "with animations off the flip completes instantly" |
| AC-11 RTL + Persian digits + 200 % text | **PASS** | `x-fa-*` (390×844 dark/light, 844×390): `dir=rtl`, `overflowX 0`, tray still bottom third; `.seated` tilt mirrored for RTL; `formatNumber` untouched; 200 % text at 360 → `overflowX 0` (vertical scroll only; header wraps, government panel `auto-fit`) |
| AC-12 setup reads as setting the table | **PARTIAL** | player count = nameplate tiles, selected tile filled brass (not a radial "seat ring"); names/roles/components steps unchanged in behaviour; step strip widths 48–90 px at 360 with no clip (`ol > li` `scrollWidth === clientWidth`); 4–13 reachable; `Next` / `Create game` / headings keep accessible names. Ring layout deliberately deferred (see below) |
| AC-13 main menu as table objects | **PASS** | `w-dark-menu.png`: box/board crest, rulebook (How to play, now ghost), deck; names `Start game`, `How to play`, `Settings`, `Resume` unchanged |
| AC-14 budget | **PASS** | no `package.json`/lockfile diff; no new network; gzip delta vs `HEAD` build (same toolchain, worktree at `50cc089`): CSS 9,126 → 10,693 B, JS 102.45 → 102.46 kB ⇒ **+1.57 kB** (limit 15 kB); no `background-attachment: fixed`; no board `zoom`; `backdrop-filter` only on `dialog::backdrop` |
| AC-15 design QA | **PASS (with gap)** | screenshots at all four sizes, dark/light, EN/FA, high contrast; keyboard-only nomination + vote + policy covered by e2e; `pnpm test/build/e2e` green. **axe was not run** — `axe-core` is not a permitted dependency (no-new-deps rule); contrast is covered by `src/contrast.test.ts` on token pairs plus the manual high-contrast passes |


## Round 2 — 12 corrections (second pass)

Gate numbers after this pass: `pnpm test` **148/148**, `pnpm build` OK (CSS 10.80 kB gzip,
JS 102.31 kB gzip), `pnpm e2e` **37/37**.

| # | Correction | What changed | Evidence |
|---|---|---|---|
| 1 | Player-count tile must show the selection | Count tiles use `.nameplate` + `.is-selected` (brass fill, cream ink) instead of a 2 px outline | `w-dark-setup.png`, `w-light-setup.png`; 7 selected reads as a solid brass tile |
| 2 | Real card style | No official artwork: the look is emulated from the printed deck. Faces are full party colour (liberal blue, fascist oxblood, communist green) with cream ink + cream keyline + sun/shield/star emblem; the back is dark stock with a brass crest. New tokens `--card-face-ink`, `--card-liberal/-fascist/-communist`, `--card-back`, `--card-back-ink` (both themes + high contrast) | `s-role-face.png` (fascist role card), `e-dark-390x844.png` / `e-light-390x844.png` (enacted cards), `r-dark-president-hand.png` (backs) |
| 3 | Selecting a chancellor must recolour the player | Seat plates: `.is-pickable` (cream + brass hairline), `.is-selected` (brass fill, `--on-brass` ink), `.is-blocked` (muted plate pressed into the board, lock icon) | `s-selected.png`; measured classes/backgrounds: `is-selected` → `rgb(111,83,24)` on `rgb(253,243,216)` |
| 4 | Four player cards per row | `.seat-grid` is a 4-column grid; 8 columns from 600 px up so landscape does not waste a row | 13 players @360×740 fits (`overflowY 0`); 360×640 landscape e2e passes |
| 5 | Unselectable player card must be easy to read | Same `.is-blocked` state (+ `x` when eliminated, `lock` when term-limited); the faded style and the icon only apply while a seat can actually be picked | `c-blocked.png`: Cara (previous chancellor) muted + lock, Alice/Bob/Dan cream |
| 6 | Do not print role text on the communist cells; tap to show | Communist legend paragraph deleted; every non-liberal power space is a `<button>` that opens `PowerModal`; the modal is track-aware ("Communist track") and documents radicalise / Five-Year Plan / confession | `c13-board.png` (icons only), `c13-power-6.png` ("Communist track · Five-Year Plan · Unlocks after 3 policies") |
| 7 | Failed-vote counter wrong in FA | `.tracker-pawn` mixed a physical `translate(-50%)` with `inset-inline-start`, drifting one hole in RTL; now `margin-inline-start: -0.4rem` + `translateY(-50%)` | measured FA holes 246/230/214 with pawn centres 230 (value 1) and 214 (value 2) — exactly on the hole; `t-fa-2.png` shows two X marks on the right |
| 8 | No "Eligible"/"Term-limited" text; colour + icon | `PlayerToken` is name-only; crown = president, shield = chancellor, ballot = nominee, lock/x = not pickable; the sentence survives in `title` and the spoken label | `c-blocked.png`, `c13-board.png` (13 names, one crown) |
| 9 | Do not hide the UI when leaving the app | Auto privacy cover deleted (`src/platform/privacy.ts`, `App.vue` cover, `privacy` setting + Settings row, `privacy.covered`); the one-time restore shield on a resumed save stays | `grep -r privacy src` → only `privacy.tap`/`restore*` (restore shield); e2e resume tests still pass |
| 10 | Remove the APPROVED label | `.stamp` + the board-header election stamp deleted; the result is still announced by the tray/aria label | `e-dark-390x844.png` (no stamp), `grep -rn game.approved src` → only the aria label in `GameScreen` |
| 11 | Info icon with per-track counts and starting deck | Brass 44 px `.board-btn` in the piles row opens a board-facts dialog: liberal/fascist/communist policies to win, cards in the draw pile, hand size, tracker max | `c13-info.png`: 5 / 6 / 6 · 5 / 10 / 8 · 3 · 3 for 13 players; button box 44×44 |
| 12 | Do not re-verify before hiding a revealed card | `RoleReveal.hide()` no longer calls `confirmAction`; the four `reveal.hide*` keys deleted | e2e "hiding a revealed role needs no dialog and advances to the next player" |

### Follow-ups found during the same pass

- Seat plates only show the blocked state while picking (`selectable`), so the legislative phase no
  longer fades the just-elected chancellor's plate.
- `PowerModal` said "Unlocks after N **fascist** policies" on communist spaces — now "Unlocks after N
  policies"; the redundant "Close" helper line was removed; auto powers no longer claim an
  "ELIGIBLE" row.
- `LegislativePanel` reused the role-handoff footnote ("…until the role is hidden") for policy
  cards — now `legislative.privacy` ("…until the cards are hidden").
- Seat grid: 4 columns fixed until 600 px, then 8 — the fixed 4 overflowed 360×640 landscape by
  27 px (caught by e2e) because 7 seats wrapped to two rows.
- FA/EN contrast test extended with the card-face pairs (`--card-face-ink` on each party face,
  `--card-back-ink` on the back).

## Notes / deviations

- **AC-12 seat ring**: the count step uses cream nameplate tiles in a 3-column grid instead of a
  round table with seats. A radial ring at 360 px forced either a scroll or sub-44 px seats, so the
  tile grid was chosen; the "table" reading comes from the material, not the geometry. Recorded as a
  known shortfall, not silently dropped.
- **axe**: not available offline without a new dependency. Replaced by the extended contrast unit
  test, DOM font-size/hit-target audit, and full keyboard play.
- **Empty table in small games**: with 5–7 players the board and seats occupy the top ~55 % and the
  tray is anchored to the bottom edge, leaving visible walnut between. Intentional (thumb reach);
  centring the board was tried and looked like a floating island, so it was reverted.
- **Dead CSS removed** in this pass: `.game-layout` block, `.board-surface`, `.table-surface`,
  `.page-wide`, `.token`, `.marker-*`, `.card-face/.card-back`, `.scroll-x/.no-scrollbar`,
  `.rotate-hint`, `.display`, `.hairline`.
