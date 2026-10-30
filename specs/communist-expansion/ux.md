# Communist expansion — UX and screen spec

Status: implementation input · 2026-10-30
Spec: `specs/communist-expansion/spec.md` · Plan: `specs/communist-expansion/plan.md`

Scope: the seven screens/flows below for **11–13 players only**. Every 5–10 screen keeps its
current layout, copy and behavior. This is a pass-the-phone, offline companion; all new
secret content is rendered from `GameState`, never from `PublicView`.

## 1. Design constraints

- **Visual language:** existing tokens only (`--surface`, `--gold`, `--blue`, `--red`,
  `--green`, `--line`, `--focus`). Gold remains the primary action. Liberal = blue,
  Fascist = red, Communist = the existing green token plus a **star** icon; no party is
  identified by colour alone — the party name is always visible or in the accessible name.
- **Experimental label:** every entry point that selects 11–13 shows a small outlined chip
  “Experimental fan expansion” and the setup review repeats it. No modal warning.
- **Privacy model:** `GameScreen`'s existing privacy cover and resume shield apply unchanged.
  `shield` is raised for `roleReveal`, `executive`, `communistPower`,
  `radicalisationReveal` and whenever `secretStep(state) !== null`. The public board never
  receives `radicalisation`, `confession` (pending), `party`, a converted flag or deck order.
- **Targets:** every interactive control is at least 48×48 dp. Primary actions are
  full-width on phones; secondary is a text button.
- **Text:** 360 dp width, 200% text and FA/RTL are the reference conditions. Use logical
  spacing (`ms/me`, `ps/pe`), `dir="auto"` on player-entered names, localized digits, and
  allow two-line labels. No fixed-height text containers.
- **Motion:** existing panel/dialog transitions only; respect `prefers-reduced-motion`.
- **No emoji, no official artwork.** The Communist icon is an original inline SVG star.

## 2. Flow 1 — Setup wizard (5–13)

### Step 1: players

- Keep the current 5-step wizard and step indicator.
- Count control becomes a grid of 9 buttons, 5–13, three columns on 360 dp, ≥48 dp each.
- Buttons 11–13 carry a compact top-right dot/star and their accessible name is
  `setup.countExpansionA11y` (“11 players, Communist expansion, experimental”). The visible
  chip sits below the grid, not inside every button.
- No mode toggle: the count is the mode (AC-3). 14 is absent; the engine error uses the
  existing `{min}/{max}` params and now reads 5–13.
- Next is disabled until a count is selected (existing behaviour).

### Step 2: names

Unchanged for all counts. 13 name fields may scroll; keep the existing add/clear behavior.

### Step 3: roles

- 5–10: exactly the current role rows.
- 11–13: four rows, in this order: Liberals, Fascists, Hitler, Communists. Each row has the
  existing icon/token, the localized role name and the count. Hitler’s row says
  “Fascist” as its party, as today.
- A one-line note under the table: `setup.expansionRolesHint` (“Communists know each other
  at 11+; Hitler does not know them.”).

### Step 4: components

- 5–10: unchanged 17-tile summary.
- 11–13:
  - “23 policy tiles: 8 Communist, 5 Liberal, 10 Fascist”.
  - Track summary in three rows: Liberal 5, Fascist 6 (9–10 player board), Communist 6
    (space 6 wins).
  - A compact power strip for the Communist track: blank, Radicalisation, Five-Year Plan,
    Radicalisation, Confession, victory — icon + short label each.
  - `setup.spareTiles` note: “For the physical table, keep 2 spare Communist and 1 spare
    Liberal tile for Five-Year Plan.”

### Step 5: review

- 11–13: expansion banner/chip, all four role counts, the 9–10 Fascist board note, 23 tiles,
  and the start action. 5–10 review is unchanged.
- Starting still requires the existing “create roles” confirmation where present.

**Copy keys:** `setup.expansionChip`, `setup.countExpansionA11y`, `setup.expansionRolesHint`,
`setup.communistRole`, `setup.deckCommunist`, `setup.trackCommunist`, `setup.trackCommunistWin`,
`setup.fascistBoard910`, `setup.spareTiles`, `setup.reviewExpansion`, `setup.powerBlank`,
`setup.powerRadicalise`, `setup.powerFiveYearPlan`, `setup.powerConfession`,
`setup.powerVictory`.

## 3. Flow 2 — Role reveal (11–13)

- Same face-down card and tap-to-reveal interaction as today. The hidden state contains no
  role, party, icon or knowledge (AC-6, AC-17).
- Revealed card:
  - role name (Liberal / Fascist / Hitler / Communist);
  - party line: keep the existing “Team Liberal” / “Team Fascist” labels for
    Liberal/Fascist/Hitler; the Communist card shows `reveal.partyLine` (“Party: Communist”).
  - a distinct card treatment for Communist: green border/star watermark **and** the word
    “Communist”; Liberal/Fascist keep their current skins.
- Knowledge block:
  - Communist: “Communists: {names}” — all other Communist role names, never Hitler/Fascists;
  - Fascist: current “Fascists / Hitler” block;
  - Hitler at 11–13: “You do not know the Fascists or the Communists.”;
  - Liberal: “You know no one.”;
  - a converted player never sees this screen again; if they did, it would show their
    original role’s knowledge.
- Hide + next-player handoff stays as today. No other player’s name/role is rendered.

**Copy keys:** `reveal.partyLine`, `reveal.partyCommunist`, `reveal.roleCommunist`,
`reveal.knowledgeCommunists`, `reveal.knowledgeNoOne`, `reveal.knowledgeHitlerAlone`,
`reveal.communistCardA11y`.

## 4. Flow 3 — Radicalisation (spaces 2 and 4)

Four private steps; the public view changes only at the end.

### 3a. Public cover

- Full-panel cover (not a modal over the board): eye/closed-eye icon, `radicalise.coverTitle`
  (“Everyone close your eyes”), `radicalise.coverBody` (“Pass the phone to the President.”).
- One button: `radicalise.presidentReady` (“The President has the phone”). This is the only
  live-region announcement in the flow.
- The board behind is hidden/blurred as with the existing privacy cover.

### 3b. President-only picker

- Title `radicalise.pickTitle` (“Radicalisation”).
- Body `radicalise.pickBody` (“Choose one living player. The result stays private.”).
- Grid/list of **all living players**, including the President and existing Communists;
  no party, role, converted or “already Communist” hint; no disabled rows (AC-12, OQ-5).
- Selecting a player opens the existing required confirmation dialog
  (`radicalise.confirmTitle/Body/Confirm`, name included). Confirm emits `radicalise`.
- No back button that would expose the board; cancel returns to the picker only.

### 3c. Seat-order handoff (private)

- After the pick, the screen walks **every living player in seat order** (the engine's
  `livingPlayers` order), starting at index 0. No target name, count or result is shown.
- Each step shows the current player's name (`radicalise.handoffTo` “Pass to {name}”) and a
  reveal button. The table already knows the seat order, so this leaks nothing.
- Revealed content is private:
  - target and actually converted: `radicalise.changed` (“You are now a Communist”) + star;
  - target but no-op (Hitler/already Communist): `radicalise.noChange` (“No change”);
  - every other player: `radicalise.noChange` as well.
- One button `radicalise.hide` (“Hide and pass”) emits `nextRadicalisationReveal`. Content is
  not in a live region and is removed from the DOM before the next player takes the phone.
- Focus returns to the hide button on each handoff; the screen is a focus trap (dialog-like).
- Self-target: the President is in the walk; they see their own result and hand the phone on.

### 3d. Public resolved

- `radicalise.resolvedTitle` (“Radicalisation resolved”) and
  `radicalise.resolvedBody` (“The Communist track has advanced.”).
- Only after the last player hides (derived `secretStep === 'radicaliseDone'`). Button
  `common.continue` emits `finishRadicalisation`.
- No target name, no changed/no-change summary, no party. The track shows the filled space.

**Resume:** reload at 3a–3d re-shows the privacy cover, then the same step. A reload during
3c keeps `revealIndex`, so no player is skipped and no conversion is repeated.

## 5. Flow 4 — Confession (space 5)

- 4a public cover, same pattern as Radicalisation, copy `confession.coverTitle/Body` and
  `confession.presidentReady`.
- 4b private party screen: `confession.title` (“Confession”), `confession.body` (“Show this
  screen to the table.”), a large party word only: `confession.partyLiberal/Fascist/Communist`.
  **No role, no names, no other party.**
- 4c confirmation: `confession.seen` (“The table has seen it”) is the only action and emits
  `acknowledgeConfession`. There is no skip/back; the back gesture is blocked by the existing
  required-action pattern.
- 4d public record: the party appears in the board history and in `view.confessions` after
  the ack. History row: `confession.historyRow` = “Round {round} · {name} · {party}”. It is
  historical; a later conversion never rewrites it (OQ-6).
- The private party screen is not a live region; the history row may be announced once.

## 6. Flow 5 — Five-Year Plan (space 3)

- Public panel, not private: `fyp.title` (“Five-Year Plan”), `fyp.body` (“2 Communist and
  1 Liberal policies were added to the draw deck and shuffled.”), `fyp.deck` (“Draw deck:
  {count}”).
- No card faces, order or discard detail. Button `common.continue` emits
  `acknowledgeFiveYearPlan`.
- Deck growth already happened at enact time; the ack only clears the step. A reload before
  the ack shows the same panel and does not add cards again.

## 7. Flow 6 — Running board at 11–13

- `GameBoard` shows a third `PolicyTrack` only when `view.expansion === 'communist'`
  (equivalently `playerCount >= 11`). 5–10 renders exactly two tracks and no Communist text.
- Track layout:
  - ≥560 px landscape: three tracks in one row (liberal / fascist / communist) with equal
    width; the existing two-track layout is unchanged at 5–10.
  - 360 dp portrait: three full-width stacked tracks with compact headers, or two columns +
    full-width third; never horizontal scroll.
  - Each track has a visible title, icon and `aria-label`; the Communist track’s six spaces
    are labelled with icon + short text (blank, Radicalisation, Five-Year Plan,
    Radicalisation, Confession, victory). Colour is never the only cue.
- Confession history: a compact “Confessions” row below the government panel, newest last,
  showing round + name + party. Collapse after two rows with a “show all” control; the
  running board shows only committed records.
- No party badges, converted markers or “Communist” labels on player tokens during play.

## 8. Flow 7 — Game over at 11–13

- Title is driven by `gameOver.winners`:
  - `['liberal']` → `gameOver.liberalWin`;
  - `['fascist']` → `gameOver.fascistWin`;
  - `['communist']` → `gameOver.communistWin`;
  - `['liberal','communist']` → `gameOver.jointWin` (“Liberals and Communists win”).
- Reason line reuses `gameOver.reason*`; the Hitler-executed reason is shared.
- Totals: Liberal / Fascist / Communist enacted counts. 5–10 keeps the existing two totals.
- Final roles list (post-game only): each player’s secret role, current party, and a
  `gameOver.radicalised` chip when `party === 'communist' && role !== 'communist'`.
- Keep the existing “new game” confirmation and summary layout; 5–10 copy is unchanged
  apart from the internal winners array.

## 9. Copy keys (add to both `en.ts` and `fa.ts`)

| Group | Keys |
|---|---|
| setup | `expansionChip`, `countExpansionA11y`, `expansionRolesHint`, `communistRole`, `deckCommunist`, `trackCommunist`, `trackCommunistWin`, `fascistBoard910`, `spareTiles`, `reviewExpansion`, `powerBlank`, `powerRadicalise`, `powerFiveYearPlan`, `powerConfession`, `powerVictory` |
| reveal | `partyLine`, `partyCommunist`, `roleCommunist`, `knowledgeCommunists`, `knowledgeNoOne`, `knowledgeHitlerAlone`, `communistCardA11y` |
| radicalise | `coverTitle`, `coverBody`, `presidentReady`, `pickTitle`, `pickBody`, `confirmTitle`, `confirmBody`, `confirm`, `handoffTo`, `changed`, `noChange`, `hide`, `resolvedTitle`, `resolvedBody` |
| confession | `coverTitle`, `coverBody`, `presidentReady`, `title`, `body`, `partyLiberal`, `partyFascist`, `partyCommunist`, `seen`, `historyRow` |
| fyp | `title`, `body`, `deck` |
| board | `communistTrack`, `confessions`, `showAllConfessions`, `hideConfessions` |
| gameOver | `communistWin`, `jointWin`, `radicalised`, `totalCommunist` |
| a11y | `communistCard`, `communistTrack`, `confessionHistory` |

Rules: no hardcoded user-facing strings; FA must be natural Persian, not copied English;
parity test must pass. `{name}`, `{count}`, `{round}` placeholders are localized with the
existing `formatNumber` helper.

## 10. Accessibility and privacy checklist (AC-25)

- [ ] Every button/row ≥48×48 dp with an accessible name (player rows include the name).
- [ ] Public covers and “resolved”/game-over titles are live regions; private
      Radicalisation/Confession content never is.
- [ ] Dialogs trap focus, restore focus to the invoking control, and are dismissible only by
      the intended action where the spec requires it (Confession has no skip).
- [ ] Party/role/state is always text + icon/shape, never colour alone.
- [ ] High-contrast and light themes preserve contrast for the new green/star treatment.
- [ ] FA/RTL: logical properties, mirrored track flow, no clipped two-line labels at
      360 dp / 200% text; player names use `dir="auto"`.
- [ ] Reload during any secret step shows the privacy cover before the step; the public
      board never contains the target, result, party or deck order.
- [ ] Screenshot blocking (Android) and the existing focus-loss cover remain active.

## 11. Implementation notes

- Reuse `AppDialog` for cover/confirm steps, `PlayerToken` for the picker, `PolicyCard` for
  the Communist face, `PolicyTrack` with `kind="communist"`, and the existing
  `ExecutivePanel` layout patterns.
- New components: `src/components/game/RadicalisationPanel.vue`,
  `src/components/game/ConfessionPanel.vue`; extend `ExecutivePanel.vue` for Five-Year Plan.
- `GameScreen` chooses the panel from `pendingAction.type` / `secretStep(state)` and raises
  the existing `shield` for every private step.
- Do not render `state.players[].party` anywhere except the private picker result, the
  Confession screen, and the post-game final-roles list.

## Open question

None blocking. The seat-order handoff deliberately differs from the spec’s literal “pass to
the target” wording: every living player receives the phone and sees a neutral result, which
is the privacy-preserving reading of AC-15 and the Gate 2 decision. UX copy must avoid
saying “target” in any public step.
