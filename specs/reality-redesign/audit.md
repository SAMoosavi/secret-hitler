# UI/UX audit — current app

Date: 2026-11-01 · Build: 0.4.0 · Evidence: `/tmp/opencode/ui/*.png`,
`/tmp/opencode/measure.json`, source review.

Reviewed at **390×844** (phone portrait), **844×390** (phone landscape, the
supported game orientation), **1024×768** (tablet), dark and light, plus the
setup wizard, role reveal, hand/discard dialog and the enacted board.

## What the app is

A pass-the-phone companion for the physical Secret Hitler board. It records
roles, elections, policy tracks and executive actions; the table still talks,
votes and moves physical pieces. So the screen's job is to be **the table's
shared board**, not a form.

## Findings (ranked by user impact)

### 1. BLOCKER — the player rail hides most of the table

`PlayerStrip` puts 7 nameplates (131–141 px each = **965 px** of content) in a
470 px rail on an 844 px-wide landscape phone. Measured `scrollWidth 965` vs
`clientWidth 470`: **only 3.5 of 7 players are visible**; the rest need a
horizontal swipe with the scrollbar hidden (`no-scrollbar`), so there is no
affordance that they exist. In portrait it is 965 px inside 340 px: **5 of 7
players are off-screen**. Nomination is exactly the phase where the president
must see and pick every eligible player.

Evidence: `src/components/board/PlayerStrip.vue:29`, `PlayerToken.vue:71`,
`/tmp/opencode/ui/dark-board-landscape.png`.

### 2. BLOCKER — primary action falls below the fold on a common phone

At 360×740 the page is **915 px tall**; the board is 541 px and the action
panel starts at 670 px, with **Nominate at y=806–854** — 66 px below the
viewport. The player must scroll before every nomination. At 390×844 it just
barely fits (882 px page, Nominate at 773), with the privacy note clipped.

Evidence: `measure.json`; `GameScreen.vue:183–239`.

### 3. HIGH — portrait is treated as a degraded mode

`settings.orientation` defaults to `'landscape'` and the game locks the screen
to landscape (`src/stores/settings.ts:32`, `src/platform/orientation.ts`).
Portrait shows a persistent "Rotate the phone" banner. Phones are picked up and
passed in portrait; the app fights the hand holding it.

### 4. HIGH — the board reads as a dashboard, not a board

- Policy tracks are 5–6 identical rounded rectangles with a number, i.e. a
  progress bar. There are no slots, no seated cards, no card stock depth.
- Deck (17) and discard (0) are two tiny chips; the deck and discard are the
  most physical objects in the game and are invisible as objects.
- Election tracker is three boxes; the physical tracker is a rail with a pawn.
- Government is a 2×2 text grid. President/chancellor/nominee should be
  placecards on the board rail.
- Enacted state = a border tint + check icon, not a policy card sitting in a
  die-cut slot.

Evidence: `PolicyTrack.vue`, `GovernmentPanel.vue`,
`/tmp/opencode/ui/dark-board-landscape.png`.

### 5. HIGH — text is below the legible floor

Measured computed sizes in one game view: **9.28 px** (track numbers),
**9.92 px**, **10.4 px**, **11.52 px** (eyebrows). Eight leaf text nodes under
12 px are visible at once. Board labels, counts and state chips are the
smallest and most important text on the screen.

Evidence: `measure.json` `eyebrowSizes`, `tinyText`; `PolicyTrack.vue:172`,
`GovernmentPanel.vue:56–81`.

### 6. HIGH — no material language

Background is a diagonal cross-hatch overlay on a flat gradient; every surface
is the same rounded gradient panel with a 1 px border. There is no paper, card
stock, wood, felt, brass or ink. The one physical moment — the role card — is a
flat gradient rectangle with a 1 px outline.

Evidence: `style.css:150–160` (cross-hatch), `.panel`, `.policy-card`.

### 7. MEDIUM — duplicated chrome eats the board

Round + phase appear in the page header and again in `.gov-chips`; enacted
counts appear in each track header and again as chips; deck/discard are both
chips and would be piles. On a 390 px-tall landscape screen this duplication
costs real board space.

### 8. MEDIUM — setup is a settings form, not "setting the table"

Player count is 13 equal tiles (4–13) in a generic form; the 5-step tab strip
clips "COMPONENTS / REVIEW" at 390 px. This is the first impression of a game
and it feels like a preferences page.

Evidence: `/tmp/opencode/ui/dark-setup-mode.png`, `SetupWizard.vue:173–180`.

### 9. MEDIUM — main menu is a generic app shell

Centred logo + three stacked full-width buttons. No board, cards or table; no
sense of a game waiting to be played.

### 10. MEDIUM — card moments are under-sold

The legislative hand is a good modal but the cards are flat 5:7 gradients; the
hand does not fan or lift; placement is a confirm dialog with no physical
result on the board. Motion is limited to a 120 ms button press and a dialog
fade.

### 11. LOW — performance smells

`background-attachment: fixed` (janky on mobile), a fixed full-screen pattern
overlay, `zoom` used to scale the board, `backdrop-filter` on the dialog
backdrop. Small individually, bad together on low-end Android.

## What to keep (do not redesign)

- Palette and contrast work: navy/gold/cream, liberal blue, fascist red,
  communist green, and the `contrast.test.ts` AA gate.
- Gold as the single primary action.
- Privacy model: pass-the-phone covers, resume shield, confirmations.
- Role reveal flip, 5:7 card ratio, "what you know" step.
- i18n (EN/FA, RTL, Persian digits), high-contrast mode, reduced-motion,
  offline/no-network guarantees, save schema.
- Original iconography (sun, crest, star, dagger) — no official artwork.
