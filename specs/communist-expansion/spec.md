# communist-expansion

## Goal

Add an experimental Secret Hitler XL **Communist party** mode for exactly **11–13 players** — a third party with its own policy cards, tracker, powers, conversions and a shared Liberal/Communist victory when Hitler is executed — while every **5–10 player** game keeps the official rules, deck, boards, roles, knowledge and behavior exactly as today.

## Acceptance criteria

### Setup, roles and validation

- **AC-1** The setup player-count step offers 5–13; 11, 12 and 13 are visibly labelled as the Communist expansion (experimental). 14 or more cannot be selected; engine validation accepts 13 and rejects 14+ (and 4 or less) with a readable "5–13 players" error, leaving any saved game unchanged.
- **AC-2** For 11/12/13 the role distribution is exactly: 11 = 5 Liberal + 3 Fascist + 2 Communist + 1 Hitler; 12 = 6/3/2/1; 13 = 6/3/3/1. 10,000 seeded assignments per count produce exactly those counts, one role per player and exactly one Hitler. The 5–10 role table is unchanged.
- **AC-3** Mode is chosen by player count alone: 11–13 always starts the expansion; there is no toggle and no way to start a Communist game at 5–10. A 5–10 game contains no Communist role, card, track, power, party label or expansion banner.
- **AC-4** For 11–13 the setup components step shows 23 policy tiles (8 Communist, 5 Liberal, 10 Fascist) and states the board layout: a 5-space Liberal track, a 6-space Fascist track using the 9–10 player powers, and a 6-space Communist track. It notes that a physical Five-Year Plan needs 2 spare Communist + 1 spare Liberal tile. For 5–10 it still shows 6 Liberal + 11 Fascist = 17 and no Communist content.
- **AC-5** The setup review for 11–13 names the expansion, shows all four role counts and states that the 9–10 player Fascist board is used. For 5–10 the review, role counts and knowledge text are unchanged.
- **AC-6** The role reveal for 11–13 shows the player's secret role and its party: Liberal, Fascist, Hitler (Fascist) or Communist. The Communist card is visually and textually distinct from Liberal/Fascist, and the screen never shows another player's role.

### Knowledge

- **AC-7** Private knowledge at 11–13 is exactly:
  - **Communist** sees the names of all other Communists, and no Hitler or Fascists.
  - **Hitler** sees no Fascists and no Communists.
  - **Fascist** sees all other Fascists and Hitler, and no Communists.
  - **Liberal** sees nobody.
  No role sees a roster it should not, and the 5–10 knowledge rules (including 5–6 fascist/Hitler recognition) are unchanged.

### Deck, trackers and powers

- **AC-8** At 11–13 the policy deck starts as exactly 8 Communist + 5 Liberal + 10 Fascist (23), shuffled. A legislative session draws 3, the President discards 1, the Chancellor enacts 1 of the remaining 2, and the other 2 go to discard. At every point deck + discard + enacted = 23, rising to 26 after Five-Year Plan resolves. The existing reshuffle rule applies, and any government may draw and enact Communist policies.
- **AC-9** The Communist track has 6 spaces, filled in order by enacted Communist policies. Space 1 has no power, 2 Radicalisation, 3 Five-Year Plan, 4 Radicalisation, 5 Confession, 6 Communist victory. Each enacted Communist policy advances it by one and resets the election tracker; a chaos-enacted Communist policy advances it but grants no power; filling space 6 ends the game immediately.
- **AC-10** At 11–13 the Fascist track uses the 9–10 player board: spaces 1–5 are Investigate, Investigate, Special Election, Execution, Execution, and space 6 is the Fascist victory. Liberal victory is 5, Fascist victory 6, and veto unlocks after the 5th Fascist policy. No existing 5–10 power or veto rule changes.
- **AC-11** When Five-Year Plan resolves, exactly 2 Communist and 1 Liberal policy are added to the draw deck and the draw deck is shuffled. The discard pile, hands and enacted counts are untouched; the public deck count rises by 3 and deck + discard + enacted becomes 26. The power resolves once (space 3), reveals no card faces or order, and is the only way the deck grows in this scope.
- **AC-12** Radicalisation on space 2 and on space 4 each convert at most one living player's current party to Communist. The target may be any living player, including the President, Hitler or an existing Communist. Hitler never changes; an existing Communist never changes; a Liberal or Fascist becomes Communist, keeps their secret role, and is told privately. A no-op target (Hitler/already Communist) still resolves the power without an error and without telling the table why.
- **AC-13** Confession on space 5 forces the sitting President to reveal their current party to the whole table: Liberal, Fascist (including Hitler) or Communist (including a converted President). The role itself is never revealed. The reveal is mandatory (no skip), is visible on the public board/history, and remains the party shown at that moment even if the President is converted later.
- **AC-14** A converted player's current party is Communist for every rule: investigation reports Communist, they count as Communist for victory/loss, and their old party's victory does not include them. Their old secret role is retained only for private knowledge (a converted Fascist still sees the Fascists and Hitler) and is used by no rule. They are not automatically told who the original Communists are, and the original Communists are not told who was converted. Other players' private setup knowledge is not rewritten: a converted Fascist still appears as a Fascist to the other Fascists. The final role reveal shows their role, current party and a "radicalised" marker.

### Secret actions and privacy

- **AC-15** Radicalisation pass-the-phone flow: (a) a public screen tells the table to close their eyes/look away; (b) only the President sees a target picker with no party/role hints; (c) the phone goes to the target (or stays with a self-targeting President) and only the target sees "You are now a Communist" or "No change" plus a hide confirmation; (d) the President never sees whether the target changed unless the President was the target; (e) after hiding, a public screen says only "Radicalisation resolved" and the board shows the filled space. No public view names the target or the result.
- **AC-16** Confession pass-the-phone flow: the President opens a reveal screen containing only their party and shows it to the table; they explicitly confirm the table has seen it; the party then appears on the public board and in the public history. No role, no other player's party and no private knowledge appears on that screen.
- **AC-17** While a game is running, the public model used by the board and menu contains no hidden role, party, converted flag, knowledge, Radicalisation target or deck order at any phase. The only exceptions are a Confession reveal and the post-game final-roles reveal. An automated serialization test covers setup, role reveal, nomination, voting, legislative, every executive/secret step and game over, and fails on any leak outside those exceptions.

### Win and loss

- **AC-18** Filling Communist space 6 ends the game with the Communists as the only winners; the screen says the Communists win and why. Liberals and Fascists lose.
- **AC-19** At 11–13, executing Hitler ends the game with Liberals and Communists as joint winners, regardless of who executed him or how many policies are on any track; the screen names both. At 5–10 the same action still produces a Liberal-only win.
- **AC-20** At 11–13 the other endings are unchanged: 5 Liberal policies → Liberals only; 6 Fascist policies → Fascists only; Hitler elected Chancellor after at least 3 Fascist policies → Fascists only. A converted player follows their current party in every ending: they lose when their old party wins, and win when the Communists win, including the shared Hitler-execution win.
- **AC-21** The game-over screen at 11–13 shows the winning side(s), the reason, all three policy totals, and the final roles with each player's current party and a radicalised marker for converted players. The 5–10 game-over screen still shows a single winner and the existing summary.

### Persistence

- **AC-22** Saves carry an incremented schema version. A v1 (5–10) save loads and plays identically, with each player's party derived from their role and all new fields defaulted. A new Communist save stores and restores exactly: player parties, all three policy counts/tracks, the 23/26-card deck and discard, converted players, Confession history, the pending Radicalisation step and target, and joint winners. An unknown newer version refuses with the existing message; a corrupt save is rejected, not crashed. Killing and relaunching during any secret step resumes at that step after the privacy cover, without losing or repeating a conversion.

### Internationalization, accessibility, regression

- **AC-23** EN and FA have identical keys and no hardcoded user-facing strings. Every new setup, role, party, power, secret-step, public-reveal, game-over and how-to string exists in both languages; FA is RTL and the new screens/labels do not clip at 200% text or 360 dp width. Existing 5–10 rule text still reads correctly; only the player-count range text may change to mention 11–13.
- **AC-24** How-to-play includes an expansion section for 11–13 covering the third party, role distribution, 23-card deck, Communist tracker powers, secret Radicalisation/Confession, converted players and the shared Hitler-execution win. It is reachable from the menu and contextual help, credits Secret Hitler XL and its authors, and bundles no official art.
- **AC-25** New screens meet the app's accessibility/privacy bar: every control is ≥48×48 dp with an accessible name; the close-eyes/public steps are announced; private Radicalisation/Confession content is not put in a live region; focus is trapped in dialogs and returned after hiding; no state is conveyed by color alone; the three tracks are distinguishable by label/icon; the existing privacy mode and resume interstitial cover the new secret screens.
- **AC-26** Regression: all existing 5–10 rule behavior still passes; tests may change only where they hard-code the old 5–10 maximum, and no 5–10 assertion may be weakened. A 5–10 game still uses 17 cards, the official role table, one winner and no Communist UI/state; `pnpm test`, `pnpm build` and the e2e suite pass. The frontend and Rust builds pass, the Android manifest gains no network or other permission, the arm64 target is unchanged, and no new runtime dependency is added without a recorded justification.

## Out of scope

- Capitalist, Anarchist, Monarchist, Nationalist, Dictator, Chairman and Rote Kapelle/decoy roles; any fix for the converted-Fascist balance problem → follow-up: separate design/playtest.
- Anti-policies, emergency powers, Bugging, Congress, the short-game 3-slot tracker and any other XL module not listed in the Goal → follow-up: full XL spec if 14+ is ever pursued.
- 14–20 players; Communist mode at 6–10; the 4-player house variant → follow-up: separate specs.
- Changing the official 5–10 balance: role table, 17-card deck, 5/6 tracks, boards, powers, knowledge, veto or victory rules.
- Online/remote play, multi-device secret actions, accounts or a server → follow-up: separate product.
- Custom house rules, balance patches, or a claim that this mode is playtested/balanced.
- New artwork, paid assets or changes to the licensing model; localization beyond EN/FA.
- An in-game role-reminder or "check my party again" screen; spectator mode; physical component scanning.
- Detailed visual/motion design of the new setup, secret-action, public-reveal and game-over screens → follow-up: ux-designer, constrained by AC-15, AC-16 and AC-25.

## Constraints

- May touch: `src/game/{types,constants,engine,deck}.ts`; `src/stores/game.ts`; `src/screens/{SetupWizard,RoleReveal,GameScreen,HowToPlay,Settings}.vue`; `src/components/board/*`, `src/components/game/*`; `src/i18n/{en,fa}.ts`; unit/e2e tests; this spec.
- Do not weaken the existing domain vocabulary: `Role`, `Party`, `Policy`, `Power`, `Winner`, `WinReason` are strict unions and gain new values; do not replace them with free strings. `Player` currently has no party and `GameOver` has a single `Winner`; the expansion requires a saved current party per player and a game-over result that can name joint winners. v1 saves derive party from role and map the old single winner.
- Save migration must be safe: bump the schema version, keep v1 save loading, default every new field, refuse newer versions, and reject corrupt saves. Commit a conversion and its pending private notification atomically so a crash cannot lose or duplicate it.
- Privacy boundary: `selectPublicView` (or its replacement) remains the only source for the board/menu; hidden roles, parties, targets and knowledge never enter it. The existing pass-the-phone, privacy-cover and screenshot-blocking patterns apply to all new secret screens.
- Offline only. No new network or Android permission, no new runtime dependency unless it is unavoidable and justified in review. The arm64 Android target must remain supported and buildable. Tauri capabilities should not expand.
- Honor prior decisions: digital deck tracking, EN/FA parity, RTL, 48 dp targets, no color-only state, confirmation for secret/destructive actions, save-on-every-transition.
- Rules source of truth: `research/secret-hitler-expansions-and-player-counts.md`. Use the 9–10 Fascist board for 11–13, the 23-card XL deck, the 11+ Communist power order, and no Chairman/Bugging/Congress.
- Label 11–13 as an experimental fan expansion and credit Secret Hitler XL (Bo-Jivan Parker and contributors) in About/how-to-play; do not imply endorsement. No official rulebook pages or artwork.
- Existing 5–10 acceptance criteria in `specs/secret-hitler-companion/spec.md` remain binding and must not be edited; extend tests rather than loosening them.

## Open questions

| ID | Question | Recommended default |
|---|---|---|
| OQ-1 | Who performs Radicalisation? | The sitting President, like every other executive power and like Confession's wording. Handing the phone to a secret Communist would leak that player. |
| OQ-2 | Does a converted player learn the original Communists, and do the original Communists learn the target? | No roster exchange. The converted player learns only their new party; existing Communists learn only that the power resolved. Congress is the XL mechanism for this and is out of scope; flag the blind-converted-player experience for playtesting. |
| OQ-3 | Party vs role display. | Secret role card shows role + party; investigation and Confession show party only; final reveal shows role + current party + radicalised marker. |
| OQ-4 | How to represent the shared Hitler-execution win. | Game over names both Liberal and Communist as winners with the existing Hitler-executed reason; no new combined "liberalCommunist" value. Old single-winner saves map to a one-element winner set. |
| OQ-5 | Should the app filter Hitler/already-Communist players out of the Radicalisation picker? | No. Every living player is selectable and the private result is neutral, otherwise the picker leaks who is Hitler or already Communist. |
| OQ-6 | Does a Confession update if the President is converted later? | No. It is a historical public record: show the party revealed at that moment, never the later party. |
| OQ-7 | Does a chaos-enacted Communist policy grant its power? | No, matching base chaos. It still advances the Communist track and can win on space 6. |
| OQ-8 | Physical tiles for Five-Year Plan. | The digital deck adds the 3 cards automatically; setup tells physical tables to keep 2 spare Communist + 1 spare Liberal tile available. |

## Decision log

- 2026-10-30 — Scope fixed to XL-lite 11–13 only: 9–10 Fascist board, 23-card deck (8C/5L/10F), Communist powers at slots 1–6 as specified, no Bugging/Congress/Chairman. Hitler execution is a joint Liberal/Communist win; party membership is saved per player and conversion is permanent. Save schema bumps with a v1 migration; official 5–10 behavior is untouched.
