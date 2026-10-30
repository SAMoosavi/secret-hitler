# 4-player house variant

## Goal

Let a table of **four** people play a complete game: 2 Liberals against 1 Fascist and Hitler,
on shorter policy tracks, with the existing engine and the official 5–13 player modes
unchanged. Player count alone selects the mode; there is no toggle. The variant is fan-made
and labelled as a house variant in the UI.

## Rules

| | 4 players (house variant) | 5+ players (unchanged) |
|---|---|---|
| Roles | 2 Liberal, 1 Fascist, 1 Hitler | official table |
| Liberal victory | 4 liberal policies | 5 |
| Fascist victory | 5 fascist policies | 6 |
| Fascist board | spaces 1–4: blank, blank, peek, execute; space 5 is victory | official boards |
| Investigation | not on the board | per count |
| Veto | never unlocks (needs a 5th fascist policy, which ends the game) | after the 5th fascist policy |
| Deck | the same 17 tiles (6 liberal + 11 fascist) | 17 or the 23/26 XL deck |
| Knowledge | lone fascist and Hitler recognise each other | unchanged, 4–6 rule |
| Term limits | the last president stays eligible (small table) | unchanged |

Hitler still wins on election after the third fascist policy. Chaos, the tracker, executive
targets and the privacy boundary are unchanged. Because the deck stays 17 tiles, the mode
favours the fascists; it is a short experiment, not a balanced tournament mode.

## Acceptance criteria

- **AC-1** The setup player-count step offers 4–13. The 4 button is labelled as a house
  variant in visible copy and in its accessible name; 3 or fewer cannot be selected, and
  `validateSetup` rejects 3 and accepts 4.
- **AC-2** The role distribution at 4 is exactly 2 Liberal + 1 Fascist + 1 Hitler over
  1,000 seeded deals; the 5–13 rows are byte-identical to before.
- **AC-3** A 4-player game uses the 17-tile deck (6 liberal, 11 fascist, no communist), the
  5–6 knowledge rule (the lone fascist and Hitler recognise each other) and
  `expansion: null` in the save and public view.
- **AC-4** The 4-player tracks are 4 liberal and 5 fascist spaces. The liberal track ends the
  game at 4 enacted liberal policies, the fascist track at 5 enacted fascist policies, and
  neither ending fires one policy early.
- **AC-5** The 4-player fascist board is `none, none, peek, execute` on spaces 1–4;
  space 5 is victory. No investigation power exists at 4, and `powerFor(4, 5)` is `none`.
- **AC-6** With 3 living players (after the 4-player execution), the last chancellor is
  still term-limited and the last president is eligible, so a nomination is always
  possible. The 5+ behaviour (`exactly five live` exception) is unchanged.
- **AC-7** Setup, components, review and how-to-play state the 4-player role split, the
  4/5 tracks, the four-power board and the untested balance in both English and Persian.
  The setup review names the variant as the board.
- **AC-8** The running board, game-over totals and save validation use the per-count tracks,
  so a 4-player save with 4 liberal or 5 fascist policies and a non-game-over phase loads as
  corrupt.
- **AC-9** Every 5–13 player game keeps its current behaviour: roles, deck, boards, powers,
  veto, term limits, knowledge, victory paths and save schema 2.

## Out of scope

- 2- and 3-player modes.
- Any change to the 17-tile deck for the small table, and any rebalancing beyond the
  shorter tracks.
- A mode toggle, a new save schema, or new roles.
- On-device verification of the APK.

## Constraints

- Offline only: arm64-v8a, `minSdk 24`, no `INTERNET` permission.
- The variant is a house rule, not an official rule; the copy must say so (no "official"
  claim, no experimental label — matching 0.2.0's wording policy).
- Saves stay schema 2; no migration.
