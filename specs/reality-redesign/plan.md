# Reality redesign — plan

Status: **approved (Gate 2) and implemented** — AC-by-AC evidence in
`specs/reality-redesign/verification.md` (AC-12 partial, axe not run: see notes).
Spec: `specs/reality-redesign/spec.md` · Audit: `specs/reality-redesign/audit.md`

## Approach

Build the material system once, then rebuild the screens on it in small
shippable phases. No phase changes game logic. Each phase ends with the full
unit suite + typecheck, and P1/P2 also re-run the Playwright flow to prove the
game is still playable.

**Writer ≠ approver**: implementation by `developer` (one task at a time),
verification by `tester` (AC coverage + suite), then `code-qa ∥ reviewer` on the
frozen diff. Design evidence (screenshots + a11y) is required at every UI gate;
a `REQUIRED, FAILING` design gate is a FAIL.

## P0 — Materials and primitives (foundation)

Goal: a token/primitive layer that makes "physical" cheap everywhere.

- Extend `src/style.css` tokens: table (walnut/oak), board paper, card paper,
  ink-on-paper, brass, oxblood, edge highlights, `--shadow-card`,
  `--shadow-lift`, `--radius-card`, `--surface-noise` (inline SVG data URI).
- Replace the cross-hatch `body::before` with table grain + lamp pool; remove
  `background-attachment: fixed`.
- New primitives: `.table`, `.board`, `.board-slot` (recessed), `.paper`,
  `.card-face`, `.card-back`, `.nameplate`, `.pawn`, `.brass-plaque`,
  `.tray`, `.stamp`.
- Type scale: label 12 px min, name 16 px, body 16 px; remove all 9–11 px
  classes in game/setup/menu.
- Extend `src/contrast.test.ts` with the new material pairs.
- Keep `.panel`, `.btn*`, `.input` as compatibility aliases during migration;
  delete them in P4 when nothing uses them.

Files: `src/style.css`, `src/contrast.test.ts`.
Gate: unit + contrast green; a static "materials" page is not shipped — verify
through P1 screenshots.

## P1 — Board, seats and action tray (the usability fix)

Goal: one screen, all players visible, action in reach, real board.

Tasks (one developer session each):

1. **Board shell** — `GameBoard.vue` becomes the table + cream board; header
   printed on the board; remove duplicated round/phase chips. Keep
   `aria-label` and live region.
2. **Policy tracks** — rewrite `PolicyTrack.vue` as printed tracks with
   die-cut slots, printed power glyphs, seated enacted cards, and a legend only
   where the expansion needs one. 44 px targets, 12 px numbers.
3. **Board rail objects** — deck and discard piles
   (`DeckPile.vue`, new), `ElectionTracker.vue` as brass rail + pawn,
   `GovernmentPanel.vue` as placecards + result stamp.
4. **Seat mats** — `PlayerStrip.vue` → a grid of nameplates (`PlayerToken.vue`
   becomes the nameplate): 2 rows portrait (7/6), 1–2 rows landscape, no
   horizontal scroll, status stamps, 44 px targets. All 4–13 players visible.
5. **Action tray + layouts** — `GameScreen.vue` grid: portrait bottom tray,
   landscape right rail; remove the rotate banner; set default
   `orientation: 'auto'` and update `Settings` copy; ensure every phase's action
   is visible at 360×740.
6. **Phase panels** — restyle `VotingPanel`, `LegislativePanel`,
   `ExecutivePanel`, `RadicalisationPanel`, `ConfessionPanel`,
   `GameOverPanel` to sit in the tray/paper slips; keep all labels and flows.

Files: `src/screens/GameScreen.vue`, `src/components/board/*`,
`src/components/game/*`, `src/stores/settings.ts`, `src/i18n/{en,fa}.ts`
(remove rotate copy, orientation label), `src/style.css`.
Gate: AC-2/3/4/5/8/9; Playwright game flow green; screenshots at 4 viewports ×
2 themes.

## P2 — Cards and deal

Goal: cards are cards.

- `PolicyCard.vue`: paper stock, keyline, crest wordmark, emblem, party name,
  POLICY footer, back pattern; `lifted` and `seated` variants.
- `LegislativePanel.vue`: fan the hand in the tray; tap lifts; confirm shows
  the chosen card large; after commit the card animates into the board slot.
- `RoleReveal.vue`: keep flip, add deal-in from the deck, card thickness/shadow,
  knowledge note as a clipped paper slip.
- Deck/discard interaction: tapping shows the count and a one-line explanation
  (reuse existing keys; add only if a key is missing).
- Motion primitives + reduced-motion guards; haptic on place/flip.

Files: `src/components/base/PolicyCard.vue`, `src/components/game/
LegislativePanel.vue`, `src/screens/RoleReveal.vue`, `src/components/board/
DeckPile.vue`, `src/style.css`.
Gate: AC-6/7/10; keyboard card flow; screenshots of 2- and 3-card hands.

## P3 — Menu, setup, dialogs

Goal: the game starts at a table.

- `MainMenu.vue`: table with a closed box/board (Start), rulebook (How to
  play), deck/settings objects; resume as a game in progress on the table.
  Keep accessible names.
- `SetupWizard.vue`: "set the table" — player count as an empty seat ring
  (4–13), names as nameplates, roles/components/review as printed board cards;
  step strip as tabs that fit at 360 px without clipping.
- `AppDialog.vue` / `ConfirmDialog.vue`: paper slip with a wax seal, actions
  ≥44 px, same focus trap and confirm semantics.
- Settings/HowToPlay: inherit tokens only; no structural change.

Files: `src/screens/MainMenu.vue`, `src/screens/SetupWizard.vue`,
`src/components/base/AppDialog.vue`, `src/components/base/ConfirmDialog.vue`,
`src/style.css`.
Gate: AC-8/9/11/12/13; e2e setup flow green; 360 px step strip screenshot.

## P4 — Polish and proof

- Motion timing pass (deal 260 ms, place 220 ms, stamp 180 ms), haptics parity.
- RTL pass: board, slots, seat grid, tray, card tilt mirrored.
- High-contrast pass; 200% text pass at 360 px.
- Performance: remove `zoom`, fixed attachment, unused `.panel` aliases;
  measure bundle delta and one interaction profile.
- Delete dead CSS/classes; no compatibility aliases left.
- Final evidence pack: screenshots (4 viewports × dark/light), axe report,
  keyboard transcript, bundle delta, suite results.

Gate: AC-14/15 + full suite; `tester` AC map PASS; `code-qa ∥ reviewer` PASS;
design gate PASS before reporting done.

## Task split (for the board)

| # | Task | Phase | Depends on | Est. |
|---|---|---|---|---|
| 1 | Tokens, table/board primitives, type scale | P0 | — | S |
| 2 | Contrast test extension | P0 | 1 | S |
| 3 | Board shell | P1 | 1 | M |
| 4 | Policy tracks + slots | P1 | 1,3 | M |
| 5 | Deck/discard piles + tracker pawn | P1 | 1,3 | M |
| 6 | Government placecards + stamp | P1 | 1,3 | S |
| 7 | Seat mats, all players visible | P1 | 1,3 | M |
| 8 | Action tray + portrait/landscape layouts | P1 | 3–7 | M |
| 9 | Phase panels restyle | P1 | 8 | M |
| 10 | PolicyCard physical | P2 | 1 | M |
| 11 | Legislative hand + placement | P2 | 8,10 | M |
| 12 | Role reveal deal/flip | P2 | 10 | S |
| 13 | Main menu table | P3 | 1 | M |
| 14 | Setup "set the table" | P3 | 1 | L |
| 15 | Dialog paper slip | P3 | 1 | S |
| 16 | RTL + high contrast + 200% text | P4 | 3–15 | M |
| 17 | Motion/haptics/perf + dead CSS | P4 | all | M |
| 18 | Evidence pack + final gates | P4 | all | S |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| 13-player seat mats cannot fit | 2 rows with 44 px height, truncated names + full a11y name; test 13 explicitly before accepting P1 task 7. |
| Landscape 390 px height too tight | Fixed rail widths, no vertical padding, board tracks stacked; verify 844×390 before P2. |
| Cream board in dark mode too bright at night | Board at 92% paper lightness, lamp vignette, no pure white; user decision in Gate 1. |
| Physical effects hurt low-end performance | CSS-only, transform/opacity only, no blur outside dialogs, no WebGL; profile in P4. |
| Playwright selectors break | Keep all accessible names; only change visual containers. Run e2e after every P1 task. |
| RTL mirroring breaks card tilt/placement | Use logical properties and `[dir='rtl']` overrides; dedicated P4 task. |
| Scope creep into rules | P0–P4 touch presentation files only; any engine change stops the task. |

## Definition of done

All 15 ACs pass with evidence, full suite green, design gate PASS, and the game
playable with one thumb in portrait and landscape on a 360 px-wide phone.
