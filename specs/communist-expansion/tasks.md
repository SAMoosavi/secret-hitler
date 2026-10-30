# Tasks — communist-expansion

Each task is one session and leaves `pnpm test` + `pnpm build` green unless it says otherwise.
Every stop condition is a yes/no check. No task adds a runtime dependency or a Tauri capability.
Read `plan.md` before starting; the AC numbers refer to `spec.md`.

---

## 1. Domain scaffold: expansion vocabulary, tables, party field, save v2 defaults

**Goal:** Add all expansion types/constants and the saved current party without changing any 5–10
rule or screen.

**Scope:** Extend `Role`, `Party`, `Policy`, `Power`, `Winner`, `WinReason`, `GameOver`, `Player`,
`GameState`, `PublicView`, `KnowledgeEntry`, `GameAction` exactly as in plan §2.1. Add the
11–13 rows to `ROLE_TABLE`, XL deck constants, `COMMUNIST_TRACK`/`COMMUNIST_POWERS`,
`isExpansion`, `partyForRole`, `deckRecipeFor`, `communistPowerFor`, `secretStep(state)`; widen
`roleCounts` / `rolesFor`; make `powerFor` read the 9–10 board above 10. Change
`makeDeck(playerCount)`, set `player.party` in `createGame`, initialise `enactedCommunist = 0`,
`confessions = []`, and handle a `'communist'` card in `enactPolicy` (increment only). Set
`SAVE_VERSION = 2` and add v1→v2 defaults in `parseSave` (party from role, winners from the old
single winner, new fields defaulted, v0 chained through v1); widen its `ROLES`/`POLICIES`/`POWERS`
lists, its 5–10 count bound to 13, and its `gameOver` check to `winners` (full validation stays in
#5). `GameOver` call sites, the one-line `GameOverPanel` winner computation and test literals become
`winners: [...]` with a single element — mechanical only, no assertion relaxed and no layout change.

**Files:** `src/game/types.ts`, `src/game/constants.ts`, `src/game/deck.ts`, `src/game/engine.ts`
(create/validate/enact scaffold only), `src/stores/game.ts` (version + defaults), affected test
fixtures, `src/components/game/GameOverPanel.vue` (one-line compile fix), new
`src/game/expansion.test.ts`.

**Covers:** AC-2 (table), AC-4 (deck counts), AC-22 (schema version + v1 defaults), the type half of
AC-3/AC-6/AC-8/AC-18/AC-19.

**Depends on:** —

**Verify:** `pnpm test src/game/expansion.test.ts` → `pnpm test` → `pnpm build`.

**Stop (yes/no):** Do all three commands exit 0, the new test file passes, and `git diff` show the
5–10 `ROLE_TABLE`, `BOARD_POWERS`, `DECK_LIBERAL`, `DECK_FASCIST`, `DECK_TOTAL`, `LIBERAL_TRACK`,
`FASCIST_TRACK` values unchanged with no 5–10 assertion removed?

---

## 2. Rules engine: 23/26 deck, Communist track, powers, win set

**Goal:** An 11–13 game can be played through the reducer with the correct deck, track, powers and
victories, while every 5–10 path stays byte-identical.

**Scope:** `makeDeck`/`deckRecipeFor` produce 8C/5L/10F at 11–13; add
`growDeckForFiveYearPlan`. `enactPolicy` advances `enactedCommunist`; `checkPolicyVictory` adds the
Communist space-6 win. `chancellorEnact` selects the power by card and player count
(`communistPowerFor`, `powerFor` alias to the 9–10 board). Set `pendingAction` and the phase that
yields each `secretStep` for Radicalisation/Confession, grow-and-shuffle the deck for Five-Year
Plan, and leave chaos power-free. Hitler execution returns `['liberal','communist']` at 11–13 and
`['liberal']` at 5–10. Hitler-elected stays role-based. `startNextRound`/`setGameOver`/
`specialElection` clear `pendingAction` and `radicalisation`. Add the engine tests in plan §2.3
(deck arithmetic incl. hands, 23→26, track order, 9–10 board alias, all endings, chaos, no stale
step).

**Files:** `src/game/engine.ts`, `src/game/deck.ts`, `src/game/engine.test.ts`,
`src/game/expansion.test.ts`.

**Covers:** AC-8, AC-9, AC-10, AC-11 (engine half), AC-18, AC-19, AC-20; AC-26 guard.

**Depends on:** #1

**Verify:** `pnpm test src/game/engine.test.ts src/game/expansion.test.ts` → `pnpm test` →
`pnpm build`.

**Stop (yes/no):** Do the targeted tests and the full suite pass, is every 5–10 victory/deck
assertion still present with the same expected values, and does a test prove the 11–13 Fascist
powers equal the 9–10 board for every space?

---

## 3. Rules engine: Radicalisation, party-based rules, Communist knowledge

**Goal:** Radicalisation converts exactly one living player atomically, and `party` (not `role`)
drives investigation, victory membership and rules from then on.

**Scope:** Implement `radicaliseTarget` (any living player incl. the President; Hitler and existing
Communists are valid no-ops), storing `radicalisation` and moving to phase `radicalisationReveal`
with the applied result in the same reducer return; `nextRadicalisationReveal` advances the
handoff and yields the derived `radicaliseDone` step after the last living player;
`finishRadicalisation` → next round. Change investigation to report `target.party`. Add the
Communist branch to `knowledgeFor` (other `role === 'communist'` names only) and keep
`role`-based Fascist/Hitler knowledge. Tests: permanent conversion, no-op success, converted
Liberal/Fascist investigated as Communist, converted Fascist still knows Fascists/Hitler, Hitler
never changes, President can be the target, and resuming at `radicaliseReveal` then acknowledging
does not re-apply or duplicate.

**Files:** `src/game/engine.ts`, `src/game/engine.test.ts`, `src/game/expansion.test.ts`.

**Covers:** AC-7 (engine), AC-12, AC-14 (engine), AC-22 (conversion atomicity).

**Depends on:** #2

**Verify:** `pnpm test src/game/engine.test.ts src/game/expansion.test.ts` → `pnpm test`.

**Stop (yes/no):** Do the tests pass, and does a test show that after a JSON round-trip of a
`radicaliseReveal` state, `finishRadicalisation` leaves exactly one converted player and no
second mutation?

---

## 4. Rules engine: Confession and Five-Year-Plan acknowledgement

**Goal:** Confession publishes a party snapshot only after the table confirms it; Five-Year Plan
gets a public acknowledgement without touching the deck twice.

**Scope:** Implement `acknowledgeConfession` (append `{ playerId, party, round }` from the
snapshot taken when the power started, clear pending, next round) and
`acknowledgeFiveYearPlan` (clear pending, next round). Confession's party is snapshotted from
the sitting President at power start; a later conversion must not rewrite the record.
Tests: mandatory step (no skip action), record snapshot, public only after commit, FYP ack does not
change deck/discard/hands, and a reload before either ack resumes at the same step.

**Files:** `src/game/engine.ts`, `src/game/engine.test.ts`.

**Covers:** AC-13, AC-16 (state half), AC-11 (ack half), AC-22 (resume at a public step).

**Depends on:** #2

**Verify:** `pnpm test src/game/engine.test.ts` → `pnpm test`.

**Stop (yes/no):** Does a test convert the President after a Confession and still read the original
party in `confessions`, and does a test prove the Five-Year-Plan acknowledgement leaves
`deck + discard + enacted` unchanged from the pre-ack state?

---

## 5. Persistence: v2 validation, migration proofs, expansion round-trip

**Goal:** A v1 save loads and plays identically, a v2 expansion save restores every new field, and
bad/newer saves are refused without a crash.

**Scope:** Finish `parseSave` validation per plan §2.4: 5–13 counts, role/party legality (base
saves reject Communist roles/parties/cards/`enactedCommunist`/confessions), `radicalisation`/
`confession` shape and phase consistency, confession records, legal `winners` combinations, new
power names, v0→v1→v2 chain. Add a fixed v1 JSON fixture test (party derived, winners mapped) and an expansion
round-trip that includes a `radicaliseReveal` state with a converted player. Assert `tooNew` for
version 3 and `corrupt` for each malformed new field. The existing e2e fixture that overrides roles
must set `party` with the role (additive, test-only) so it stays a legal v2 save.

**Files:** `src/stores/game.ts`, `src/stores/game.test.ts`, `e2e/game.spec.ts` (fixture only).

**Covers:** AC-22.

**Depends on:** #1–#4

**Verify:** `pnpm test src/stores/game.test.ts` → `pnpm test` → `pnpm build`.

**Stop (yes/no):** Does the v1 fixture produce a playable state with `party`/`winners` derived, does
the expansion round-trip compare equal field-by-field, and do all malformed cases return
`{ error: 'corrupt' }` or `{ error: 'tooNew' }` without throwing?

---

## 6. Privacy: public view and serialization test

**Goal:** The public model is provably free of roles, parties, conversions, targets and deck order
at every phase.

**Scope:** Finish `selectPublicView`: expansion fields (`enactedCommunist`, `confessions`) only for
11–13; never `secretStep`, target, converted flag, player party/role, knowledge, deck/discard/hands.
Add `src/game/privacy.test.ts` that builds a state for setup, role reveal, nomination, voting,
legislative president/chancellor, every base executive result, `radicalisePick`,
`radicaliseReveal`, `radicaliseDone`, `confession`, Five-Year Plan, and game over; recursively
rejects forbidden keys except `confessions[].party` (post-confession) and `gameOver.winners`/
`reason`. Assert the 5–10 `JSON.stringify(view)` contains no `communist` substring at all.

**Files:** `src/game/engine.ts` (`selectPublicView`), new `src/game/privacy.test.ts`.

**Covers:** AC-17, AC-3 (model half), AC-13/AC-16 (public record correctness).

**Depends on:** #2–#4

**Verify:** `pnpm test src/game/privacy.test.ts` → `pnpm test`.

**Stop (yes/no):** Does the recursive scan pass at every listed phase, does the 5–10 view have zero
`communist` keys/values, and is the only party occurrence in an expansion view inside
`confessions`?

---

## 7. UX spec: setup, reveal, Radicalisation, Confession, Five-Year Plan, game over

**Status:** done by the lead (the `ux-designer` agent is not registered in this environment);
output is `specs/communist-expansion/ux.md`. Treat that file as the design gate for tasks 8–14.

**Goal:** A `ux-designer` produces the screen/flow spec the Vue tasks implement, before any of
those screens are coded.

**Scope:** Write `specs/communist-expansion/ux.md` covering: 13-player setup (count grid, expansion
chip, roles, components/spare tiles, review), Communist role card + knowledge panel, the three
Radicalisation steps (public close-eyes cover, President-only picker with no hints, target handoff
without a name, private result, public resolved), Confession (private party-only screen, explicit
table confirmation), Five-Year-Plan public ack, confession history on the board, and the expansion
game-over layout (winner set, three totals, final roles with current party + radicalised marker).
For each: states, all copy keys, focus order/trap/return, live-region policy (public steps only),
48 dp targets, non-colour state cues, 360 dp/200%/RTL constraints, and which privacy cover applies.
Map every screen back to AC-6/15/16/21/25.

**Files:** `specs/communist-expansion/ux.md` (only).

**Covers:** design coverage for AC-6, AC-15, AC-16, AC-21, AC-25.

**Depends on:** — (can run in parallel with #2–#6; must finish before #8)

**Verify:** Read the document; check every screen in plan §2.5 has a flow, states, copy keys and an
a11y/RTL checklist with an AC reference.

**Stop (yes/no):** Does `ux.md` cover all seven flows with states + copy keys + focus/live-region
rules + 360 dp/RTL notes, and does every AC-6/15/16/21/25 bullet have a named screen behaviour?

---

## 8. i18n: EN/FA keys for every new string

**Goal:** Both locales carry identical, translated keys for all new copy.

**Scope:** Add the setup (range/expansion/badge/roles/components/review/knowledge), reveal
(communist role/party/knowledge), game (third track, confession history, radicalised marker),
executive (Radicalisation all steps, Confession, Five-Year Plan), game over (four winner titles,
reason, three totals, final roles), a11y and how-to/about keys from `ux.md`. No hardcoded strings
in components; FA uses natural Persian and RTL-safe wording.

**Files:** `src/i18n/en.ts`, `src/i18n/fa.ts`.

**Covers:** AC-23 (copy half), AC-24 (credits/expansion copy half).

**Depends on:** #7

**Verify:** `pnpm test src/i18n/i18n.test.ts` → `pnpm build`.

**Stop (yes/no):** Does the parity test pass, is every key listed in `ux.md` present in both files,
and does the no-copied-English test stay green?

---

## 9. Setup wizard for 5–13

**Goal:** The wizard offers 5–13, marks 11–13 as experimental, and shows the expansion roles,
components and review while 5–10 screens stay identical.

**Scope:** Render counts from `MIN_PLAYERS..MAX_PLAYERS` (no 14), badge 11–13, add the Communist
role row, use `deckRecipeFor` for the components step (8C/5L/10F/23, 5/6/6 tracks, 9–10 Fascist
board, 2 spare C + 1 spare L note), and expansion-specific review strings. Keep the error text
`5–13` via the existing `{min}/{max}` params. No mode toggle.

**Files:** `src/screens/SetupWizard.vue`, `src/game/constants.ts` (only if a display helper is
missing), `src/i18n/*` (fixes only).

**Covers:** AC-1, AC-3 (UI half), AC-4, AC-5.

**Depends on:** #1, #8

**Verify:** `pnpm build` → `pnpm e2e -g "duplicate names|setup, private reveals"` (base setup
regression) → manually open `/#/setup` at 13.

**Stop (yes/no):** Does `pnpm build` exit 0, is 13 selectable with an experimental label, is 14
absent, does the 13 review name the expansion and all four counts, and does the 5-player setup e2e
pass with the same steps and copy as before?

---

## 10. Role reveal: Communist card and knowledge

**Goal:** An 11–13 player privately sees role + party and exactly the knowledge AC-7 allows; the
5–10 card is unchanged.

**Scope:** Add the Communist card skin/icon (original inline SVG, not colour-only) and the party
line; branch `knowledgeFor` display for `communists`; keep Hitler as role + Fascist party. Ensure
the screen never renders another player's role and the no-flip state stays free of role words.

**Files:** `src/screens/RoleReveal.vue`, `src/components/base/icons.ts`, `src/style.css` (card skin
and token), `src/i18n/*` (fixes only).

**Covers:** AC-6, AC-7 (display half).

**Depends on:** #3 (knowledge), #8

**Verify:** `pnpm build` → `pnpm e2e -g "face-down card conceals|hiding a revealed role"`.

**Stop (yes/no):** Does the Communist card show role + "Communist" + the other Communists' names
only, does a 5–10 reveal render exactly the old card/knowledge, and does the existing role e2e still
pass?

---

## 11. Board: third track, Communist policy card, Confession history

**Goal:** 11–13 boards show the Communist track and public Confession record; 5–10 boards render
exactly two tracks.

**Scope:** Render a third `PolicyTrack` only for `playerCount >= 11`, with six labelled spaces
(no power, Radicalisation, Five-Year Plan, Radicalisation, Confession, victory) using text + icon;
extend `PolicyCard` with the Communist face; add a compact public confession row (name, party,
round) from `view.confessions`. Do not show party, conversion or radicalised state anywhere on the
running board.

**Files:** `src/components/board/GameBoard.vue`, `PolicyTrack.vue`, `src/components/base/PolicyCard.vue`,
`src/components/base/icons.ts`, `src/style.css`, `src/i18n/*` (fixes only).

**Covers:** AC-9 (board half), AC-10 (board half), AC-13 (public board record), AC-25 (track
distinguishability).

**Depends on:** #6, #8

**Verify:** `pnpm build` → `pnpm e2e -g "360|five-player game reaches"`.

**Stop (yes/no):** Does a 13-player board show three distinguishable tracks and the Confession row,
does a 5-player board show exactly two tracks with no Communist text, and does the 360 dp base board
test still pass?

---

## 12. Game over: winner set, three totals, final roles

**Goal:** The expansion ending names the winning side(s), the reason, all three totals and every
player's role/current party/radicalised marker; 5–10 stays single-winner.

**Scope:** Drive the title and icon from `gameOver.winners` (liberal / fascist / communist / joint
liberal+communist), show the reason, three totals only at 11–13, and the final-roles list only at
11–13 (role, current party, marker). Keep the existing 5–10 summary and new-game flow. Read private
state only in this post-game component.

**Files:** `src/components/game/GameOverPanel.vue`, `src/i18n/*` (fixes only).

**Covers:** AC-18, AC-19, AC-20 (display half), AC-21.

**Depends on:** #2, #8

**Verify:** `pnpm build` → `pnpm e2e -g "five-player game reaches"`.

**Stop (yes/no):** Do the four winner combinations render the right title, does a 13-player ending
show three totals and the final roles list, and is the 5-player ending unchanged?

---

## 13. Secret-action screens and resume cover

**Goal:** Radicalisation and Confession run as pass-the-phone flows with no public leak and resume
behind the privacy cover.

**Scope:** Add `RadicalisationPanel.vue` (public close-eyes cover → President-only picker with no
party hints → no-name handoff → private "You are now a Communist"/"No change" + hide → public
"resolved") and `ConfessionPanel.vue` (handoff → party only → explicit table confirmation).
Add the Five-Year-Plan acknowledgement branch to `ExecutivePanel`. `GameScreen` branches by
`pendingAction.type`/the derived `secretStep`, includes `secretStep` in the resume shield, and
keeps the global privacy cover. Public steps may be live regions; private results are not. Focus returns to the panel's
primary action after each commit; all targets ≥48 dp.

**Files:** new `src/components/game/RadicalisationPanel.vue`, `ConfessionPanel.vue`,
`src/components/game/ExecutivePanel.vue`, `src/screens/GameScreen.vue`, `src/i18n/*` (fixes only).

**Covers:** AC-15, AC-16 (UI half), AC-22 (resume half), AC-25.

**Depends on:** #3, #4, #6, #8, #11

**Verify:** `pnpm build` → `pnpm e2e -g "resume mid-session|Chancellor"` (base executive regression)
→ manually reload in `/#/game` at each secret step.

**Stop (yes/no):** Does each step have its own screen, is the target never named on a public
handoff, is the private result absent from live regions and the DOM after hiding, and does a reload
mid-step show the cover before the step?

---

## 14. How-to-play expansion section and credits

**Goal:** The rules are explained in-app for 11–13, with the experimental label and Secret Hitler
XL credit.

**Scope:** Add the expansion section (third party, 11–13 distribution, 23-card deck, Communist
powers, secret Radicalisation/Confession, converted players, joint Hitler-execution win), a
"fan-made and untested/experimental" note, and the Secret Hitler XL credit (Bo-Jivan Parker and
contributors; no endorsement; no official art). Keep the existing 5–10 sections unchanged. Reachable
from the menu and the in-game help link (both already point at `/how-to-play`).

**Files:** `src/screens/HowToPlay.vue`, `src/i18n/en.ts`, `src/i18n/fa.ts` (keys added in #8 if
possible).

**Covers:** AC-24, the credit half of the Constraints.

**Depends on:** #8

**Verify:** `pnpm build` → `pnpm e2e -g "how-to-play"`.

**Stop (yes/no):** Does the how-to page contain an expansion section covering all six required
topics and the credit, do the 5–10 sections read unchanged, and is the page reachable from both the
menu and the game header?

---

## 15. E2E expansion suite

**Goal:** Browser-level proof of the whole mode, including privacy and resume, without weakening the
5–10 suite.

**Scope:** Add `e2e/communist.spec.ts` (and extend `e2e/helpers.ts` with 13 names): 13-player setup
with experimental label; Communist reveal + knowledge; Radicalisation full flow with DOM privacy
assertions at every handoff (no target/result/party before the right screen); no-op target;
Confession party screen and public record; Five-Year-Plan deck count +3; Communist win; joint
Hitler-execution win; reload mid-Radicalisation/Confession; FA RTL 360×640 with overflow/clipping
checks on setup, secret panels, board and game over. Run the existing specs unchanged.

**Files:** `e2e/communist.spec.ts`, `e2e/helpers.ts` (additive only).

**Covers:** AC-1, AC-6, AC-7, AC-9 (user flow), AC-13, AC-15, AC-16, AC-18, AC-19, AC-21, AC-22
(resume), AC-23 (RTL), AC-25.

**Depends on:** #9–#14

**Verify:** `pnpm e2e`.

**Stop (yes/no):** Does the new spec pass, does the full pre-existing e2e suite pass without edits
beyond additive helpers, and does every privacy assertion fail if the target/result is rendered
before its private screen?

---

## 16. Final regression and evidence

**Goal:** Prove the release is green and the 5–10 mode, offline shell and dependency set are
untouched.

**Scope:** Run the full matrix, inspect the diff for accidental scope (no `package.json` dependency,
no `src-tauri` capability/manifest/network permission change, arm64 target untouched), re-check the
5–10 golden tests and e2e, and update `plan.md` only if implementation diverged. Record command
outputs as evidence.

**Files:** `specs/communist-expansion/plan.md` (only if reality diverged); no product code.

**Covers:** AC-26, and confirms all other ACs at integration level.

**Depends on:** #15

**Verify:** `pnpm test` → `pnpm build` → `pnpm e2e` → `pnpm check:rust` → `git diff --stat` and
`git diff -- package.json src-tauri`.

**Stop (yes/no):** Do all four commands exit 0, does `git diff -- package.json src-tauri` show no
dependency, permission or target change, and are the 5–10 unit/e2e assertions unchanged apart from
the mechanical `GameOver`/fixture shape updates listed in task 1?
