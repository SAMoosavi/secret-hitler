# Reality redesign — "the table"

Status: **approved (Gate 1 & 2), 2026-11-01**; round-2 user corrections applied — see
`verification.md` § "Round 2". Those twelve itemised fixes supersede the card-back, stamp,
status-text and communist-legend details described below.
Audit: `specs/reality-redesign/audit.md`

## Goal

Make the companion feel like the physical game on a real table, and make it
usable with one thumb in portrait: a printed board with die-cut policy slots, a
deck and discard pile, a pawn on the election tracker, nameplates for the
government, and a seat mat for every player — all visible at once, with the
current action always in reach.

The redesign changes **presentation and layout only**. Rules, engine, save
schema, privacy model, i18n, themes and offline guarantees stay exactly as they
are.

## Design direction — "Lamplight tabletop"

Not glossy 3D, not neon. One table, real materials, restrained motion:

| Material | Dark theme | Light theme |
|---|---|---|
| Table | dark walnut, warm lamp pool from top-left | pale oak, daylight |
| Board | cream card stock, printed rules, 4 px corners | same cream board |
| Cards | cream paper, letterpress ink, gold foil line | same |
| Metal | aged brass (tracker pawn, deck plaque, primary button) | same brass |
| Party ink | liberal blue, fascist oxblood, communist green | same |

Textures are **procedural** (layered gradients + one inline SVG noise), not
images. No WebGL, no parallax, no new fonts, no new dependency.

### Objects, not panels

1. **Board** — a cream printed board laid on the table. Two (three with the
   expansion) die-cut policy tracks: recessed slots with printed numbers and
   power glyphs. An enacted policy is a **small policy card seated in the
   slot**, 2 px proud, with a soft shadow and a 1° tilt. Liberal/fascist/
   communist colours come from the card, not from painting the whole slot.
2. **Deck & discard** — physical piles on the bottom rail: 3 offset card backs
   with a stamped count on a brass plaque each. Tapping a pile shows its count
   and what it means.
3. **Election tracker** — a brass rail with 3 holes and a pawn. Rejected
   elections slide the pawn; the third rejection shows the chaos card.
4. **Government placecards** — president, chancellor and nominee are small
   folded nameplates clipped to the top rail of the board, with the brass
   presidential seal, a party rosette for the chancellor, and a paper ballot
   for the nominee. Last election result is a rubber stamp (APPROVED /
   REJECTED), not a sentence.
5. **Seats** — one nameplate per player around the board edge, always all
   visible: a small cream card with the player's name, a pawn, and a stamped
   status (eligible / term-limited / dead). President gets the seal, chancellor
   the rosette, nominee the ballot. Dead nameplates lie face-down with a black
   band; term-limited ones carry a red TERM stamp.
6. **Action tray** — the "hand" area: a leather/wood tray at the bottom in
   portrait, a right-hand rail in landscape. It holds the current prompt and
   the primary action, and the legislative hand fans out of it. It never covers
   the board and never scrolls away.

### Layout (one screen, no scroll during play)

Portrait phone (360–430 dp):

```
┌──────────────────────────────┐
│ ‹  ROUND 2 · NOMINATION  ?⚙ │ 44
├──────────────────────────────┤
│  PRESIDENT      CHANCELLOR   │  government placecards
│  NOMINEE        LAST: ✓      │  56
│ ┌ liberal track (5 slots) ─┐ │
│ └──────────────────────────┘ │  86
│ ┌ fascist track (6 slots) ─┐ │
│ └──────────────────────────┘ │ 100
│  ●○○ tracker   ▤17   ▥0      │  48
├──────────────────────────────┤
│  seat mats · 2 rows (7/6)    │ 104
├──────────────────────────────┤
│  ACTION TRAY                 │ 168
│  Nominate a chancellor       │
│  [        Nominate        ]  │
└──────────────────────────────┘
      ≈ 760 dp + safe areas
```

Landscape phone (740–900 × 360–430): board 55–60% left, action rail 40% right,
seats along the bottom edge of the board, no horizontal scroll. Tablet/desktop:
board centred with seats around it; same components, wider.

### Type and targets

- Minimum **12 px** for any printed label or number; names **16 px**; body
  **16 px**; headings unbounded. No `text-[0.58rem]`-style labels.
- All interactive targets **≥ 44×44 px** (policy slots included).
- Max two label weights per row; no all-caps + letter-spacing + 10 px
  combinations.
- Long names truncate with ellipsis; full name stays in the accessible name and
  `title`.

### Interaction

- **Tap only** — no drag requirement. Tap a card/nameplate to lift it; tap the
  target slot/seat to seat it; the confirm dialog shows the chosen object large.
  A lifted card is visibly raised (12 px, shadow, 1.5° tilt).
- Placement animates: lift → travel → settle into the slot (220 ms,
  `cubic-bezier(.2,.8,.2,1)`), with haptic feedback. Reduced motion and
  `[data-animations='off']` skip straight to the final state.
- Board state changes are announced through the existing live region.

### Themes

- **Dark**: walnut table, lamp pool, cream board. The board stays cream in dark
  mode — that is what a real board looks like under a lamp, and it keeps the
  board readable at arm's length.
- **Light**: oak table, cream board, darker ink.
- **High contrast**: same objects, forced ink/border tokens, no textures.

## Acceptance criteria

- **AC-1** No rules, engine, save-schema or privacy change. (Round 2 item 9 removed the automatic
  privacy cover on app blur at the user's request; the settings-privacy model otherwise stands.)
  `src/game/**` and
  `src/stores/game.ts` are untouched except where layout needs a getter; all
  existing unit and e2e tests keep their observable behaviour and accessible
  names.
- **AC-2** Every player is visible without horizontal scrolling at 360×740,
  390×844, 844×390 and 1024×768, for 4–13 players. The seat rail has no hidden
  overflow (`scrollWidth === clientWidth`) and no clipped nameplate.
- **AC-3** The primary action for every phase is visible without scrolling at
  360×740, 390×844 and 844×390, and sits in the bottom third in portrait.
- **AC-4** Portrait is a supported game layout: default `orientation` is
  `auto`, the rotate banner is removed, and every phase is playable in portrait
  (no scroll to act, no clipped board).
- **AC-5** The board renders as materials, not panels: die-cut slots, enacted
  policy cards seated in slots, deck and discard piles with counts, a pawn on
  the election tracker, government placecards. All of it remains legible and
  AA-contrast in dark, light and high contrast.
- **AC-6** `PolicyCard` is a physical card: 5:7, paper texture, inner keyline,
  top crest/wordmark, large party emblem, party name, "POLICY" footer, edge
  highlight and drop shadow; a card back with an engraved crest. It has at
  least three visual states: in hand, lifted, enacted.
- **AC-7** Selecting and playing a card works with tap only, from any hand size:
  tap card → lift + action label; confirm shows the chosen card face large;
  after commit the card is seated in the board slot. Keyboard: focus, Enter,
  then the same path.
- **AC-8** No rendered text below 12 px in the game, setup or menu; body text
  ≥16 px; player names ≥16 px. The contrast test is extended to the new
  material pairs (ink on paper/board, muted on table, gold on board, white on
  oxblood).
- **AC-9** Every interactive element has a ≥44×44 px hit area, including
  policy slots, seat mats, deck/discard piles and dialog actions.
- **AC-10** With reduced motion or animations off, all deal/flip/place/track
  animations are skipped; the resulting state is still unambiguous.
- **AC-11** RTL mirrors the board, seats and tray; Persian digits still flow
  through `formatNumber`; no string is clipped at 200% text on 360 px.
- **AC-12** Setup reads as setting the table (seat ring for player count,
  nameplates for names), at 360 px the step strip does not clip, 4–13 remain
  reachable, and `Next` / `Create game` / step headings keep their accessible
  names.
- **AC-13** Main menu is table objects (box/board, rulebook, deck) with the
  existing accessible names `Start game`, `How to play`, `Settings`, `Resume`.
- **AC-14** Budget: no new runtime dependency, no new network request, added
  CSS+JS ≤ 15 KB gzipped, no `background-attachment: fixed`, no board `zoom`,
  no backdrop-filter outside dialogs, and no interaction frame over 50 ms on a
  mid-range Android profile.
- **AC-15** Design QA passes: screenshots at 360×740, 390×844, 844×390,
  1024×768 in dark/light, axe with no serious violations on the game screen,
  keyboard-only play of a nomination + vote + policy, and the existing
  `pnpm test`, `pnpm build`, `pnpm e2e` suites green.

## Out of scope

- Rules, engine, roles, deck, tracks, victory logic, save schema.
- New screens, online play, accounts, sound design (haptics only).
- Official Secret Hitler artwork, logos or card faces; the supplied app icon
  stays as-is. No new swastika imagery is introduced in the UI.
- A native Android widget, tablet-specific split view, or desktop-only chrome.
- Reworking Settings / How to play beyond inheriting the new tokens.
- Store packaging, signing, permissions.

## Constraints

- Offline, arm64, `minSdk 24`, no network permission.
- Bundled fonts only (Georgia/system serif + Vazirmatn); no font download.
- All textures procedural or inline SVG; total new assets ≤ 30 KB.
- Existing accessible names used by Playwright (`Start game`, `Nominate`,
  `Record approval`, `Reveal cards`, step headings, `Shuffle and start`) are
  preserved.
- Persian is a first-class layout, not a mirror afterthought.
- Contrast AA in every theme, including high contrast.

## Decisions (approved by owner, 2026-11-01)

1. **Portrait-first, auto** — default orientation `auto`, portrait fully laid
   out, landscape still excellent; rotate banner removed.
2. **Cream board in dark mode** — the board stays cream card stock on a walnut
   table; the UI around it stays dark.
3. **Full redesign, phased** — P0 → P4 as in `plan.md`.
