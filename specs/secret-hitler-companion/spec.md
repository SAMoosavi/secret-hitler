# secret-hitler-companion

## Goal

An offline Android-first companion app for the physical Secret Hitler board game that replaces the
paper bookkeeping: it assigns and privately reveals roles, shows the correct per-player-count board,
records the table's announced election results and the physical policy cards, enforces the official
rules and victory conditions, and resumes exactly where the table left off. It never replaces the
face-to-face discussion, the physical ballot, or the secrecy of the physical cards.

## Acceptance criteria

- **AC-1** Rules engine unit test asserts the official role table for 5–10 players: 3/1/1, 4/1/1, 4/2/1, 5/2/1, 5/3/1, 6/3/1 liberals/fascists/Hitler, and rejects any other count or split.
- **AC-2** Unit test asserts the policy deck is one shuffled deck of 17 tiles (11 fascist, 6 liberal), and that each legislative session draws 3, discards 1, hands 2, discards 1, enacts 1, with the third tile never shown publicly.
- **AC-3** Unit test asserts reshuffling: fewer than 3 tiles left at the end of a legislative session or before a chaos reveal → remaining tiles shuffle with the discard pile; unused tiles are never revealed and never stacked on top.
- **AC-4** Unit test asserts election tracker: 3 consecutive rejected governments → top deck tile enacted, its power ignored, tracker reset to 0, all term limits cleared; any enacted policy resets the tracker.
- **AC-5** Unit test asserts term limits: the last elected president and last elected chancellor cannot be nominated; with exactly 5 living players only the last elected chancellor is blocked; the last president may be nominated as chancellor when 5 remain.
- **AC-6** Unit test asserts nomination validation: no self-nomination, no eliminated player, no term-limited player, no player outside the game; invalid nomination leaves state byte-identical and surfaces a reason.
- **AC-7** Board variant test asserts the executive-action space of each fascist policy for 5–6 players (none, none, Policy Peek, Execution, Execution), 7–8 (none, Investigate Loyalty, Special Election, Execution, Execution) and 9–10 (Investigate, Investigate, Special Election, Execution, Execution), with the 6th space being the fascist victory.
- **AC-8** Unit test asserts each power resolves exactly once before the next round and cannot be skipped: Investigate shows party membership only (never the role) and a player can be investigated at most once per game; Policy Peek shows the top 3 in unchanged order; Execution marks the player eliminated (no vote, no nomination, no presidency) and does not reveal party unless the target is Hitler.
- **AC-9** Veto (official) test: unavailable before the 5th fascist policy and in the session that enacts it; after that, chancellor proposal + president consent discards both tiles unrevealed, passes the presidency left, and advances the election tracker by one (a 3rd advance triggers AC-4); president refusal forces the chancellor to enact.
- **AC-10** Unit test asserts all four victory paths and that they end the game with a named winner and reason: 5 liberal policies, 6 fascist policies, Hitler executed, Hitler elected chancellor when ≥3 fascist policies are enacted.
- **AC-11** Unit test asserts special elections: the sitting president may name any other living player as next presidential candidate, any player may be president regardless of term limits, and the normal clockwise order resumes from the player left of the president who called the special election.
- **AC-12** Unit test asserts the state machine rejects every out-of-phase transition (e.g. enacting before a vote, voting after game over) with state unchanged (serialized state equality).
- **AC-13** Setup wizard test (e2e): 5 steps in order; player count accepts only 5–10 with an explanation of why 5 is the minimum; names default to "Player N"; duplicates are handled by a documented policy (trimmed, case-insensitive, blocked with a reason); the exact role distribution is shown before starting; the physical setup step shows 6 liberal tiles, 11 fascist tiles, one 17-tile deck and a 3-tile draw; roles are shuffled only after the final confirm.
- **AC-14** Role assignment test: 10,000 runs over every player count always yield exactly one role per player and the AC-1 counts; the random source is documented as cryptographically secure; the public/serialized public view model contains no role field.
- **AC-15** Role reveal test (e2e): handoff screen → explicit "this is the right player" confirm → role → "Hide role" → role absent from the DOM/app state before the next handoff; the reveal screen shows only the role and minimal chrome; the public board is never reachable mid-reveal.
- **AC-16** Knowledge rule test: at 5–6 players the lone fascist and Hitler acknowledge each other; at 7–10 fascists see each other and Hitler, and Hitler sees no fascist; no other player learns anything. (See OQ-1 for the 5–6 reading.)
- **AC-17** Voting UI check: only "Record approval" and "Record rejection" are selectable; there is no per-player ballot, tally or hidden-vote input anywhere; the confirmation text states the app records the operator's announced result and did not verify the physical vote.
- **AC-18** Approved/rejected flows: rejection passes the presidency clockwise and advances the tracker; approval opens the legislative phase; both show the consequence before confirming and display the result on the board afterwards.
- **AC-19** Policy cards start face down; "Reveal cards" opens a safety confirmation naming the intended holder; faces appear only after confirmation; cancel returns to the previous state with no change (state hash unchanged).
- **AC-20** Policy flow e2e: president confirms the discarded tile, chancellor confirms the enacted tile, the correct track advances, the discard count grows, the deck count shrinks, and the next screen shows no card face.
- **AC-21** Deck/discard indicators always satisfy deck + discard + enacted = 17 and match the engine after every transition.
- **AC-22** Board screen shows the correct variant for the chosen player count with liberal and fascist tracks side by side (5 and 6 spaces), enacted spaces marked by both color and shape/icon.
- **AC-23** Board screen shows president marker, chancellor marker, nominee marker, election tracker position, draw/discard counts, round number, current phase, and last election result, all derived from the single game state.
- **AC-24** Executive-action spaces show icon only (no explanatory text on the board), the whole space is tappable at ≥48 dp, and tapping opens a modal with name, icon, explanation, eligibility, "available now / after N fascist policies" and Close; opening it performs no state change (state hash unchanged).
- **AC-25** Player strip shows name, president/chancellor markers, nomination eligibility, alive/eliminated status and term-limit status, and never shows a role.
- **AC-26** Persistence test: after every confirmed transition the state is written locally; killing and relaunching the app restores player order, roles, deck order, discard contents, enacted policies, tracker, term limits, alive flags and phase exactly.
- **AC-27** Resume always shows a privacy-safe interstitial ("pass the phone to the operator") before restoring a sensitive phase; no role or card face is visible until confirmed.
- **AC-28** Save file contains a version number; loading an older version migrates, an unknown/newer version refuses with a readable message, and a corrupted save offers "new game" instead of crashing.
- **AC-29** Abandon/reset requires a strong confirmation (types or double-confirms a destructive warning), then clears the save and returns to the menu with no resumable game.
- **AC-30** Destructive or secret controls always open a Confirm/Cancel dialog; routine controls (nomination, policy choice, closing an executive result, hiding a revealed role) ask only while "Confirm routine actions" is enabled (default off). Test asserts cancel leaves the serialized state byte-identical for every action that does ask.
- **AC-31** Double-tap test: two rapid activations of the same confirm produce exactly one transition; confirm buttons disable while committing.
- **AC-32** Invalid actions are visibly disabled and non-activating with a reason on tap/long-press; every button in the UI is wired to real behavior (no placeholders).
- **AC-33** i18n test asserts full FA and EN key parity and zero hardcoded user-facing strings (lint rule or failing test).
- **AC-34** FA mode sets `dir="rtl"` and mirrors layout, navigation, board ordering and dialogs; no text is clipped or overlapped; switching language applies without restart and persists.
- **AC-35** Dark and light themes apply to every screen including secret, confirmation and game-over screens; the choice persists; automated contrast check passes WCAG AA (4.5:1 body text, 3:1 large text and UI components).
- **AC-36** Menu, how-to-play, settings and setup render portrait; the board renders landscape with tracks side by side; if the device cannot lock orientation the app still renders a usable layout without crashing.
- **AC-37** On a 360×640 dp phone in landscape the game screen shows player strip, president/chancellor, tracker and available actions without vertical scrolling of the game container.
- **AC-38** Rotating the device and relaunching the app both preserve state and return to the same phase; safe-area insets keep controls clear of notches and gesture bars at 320 dp width.
- **AC-39** All touch targets are ≥48×48 dp and every icon-only control has an accessible name.
- **AC-40** No state or result is conveyed by color alone (icons/labels accompany every color cue); a high-contrast mode exists and is toggleable.
- **AC-41** Screen-reader check: phase changes and election results are announced, dialogs trap focus and restore it on close, and body text remains readable at 200% font scale without clipping.
- **AC-42** Back navigation never silently loses progress: leaving the game screen asks for confirmation and Android system back on a dialog closes only the dialog.
- **AC-43** Settings screen contains working, persisted controls for language, sound, haptics, animation, orientation behavior, privacy mode, non-critical confirmation preferences, theme, save/resume behavior, board scaling, and clear-save/new-game; required confirmations for secret/destructive actions cannot be disabled.
- **AC-44** Animation toggle removes non-essential motion (verify transitions are instant); sound toggle off produces no sound; haptics toggle off produces no vibration on a supporting device.
- **AC-45** Privacy mode hides app content in the Android recent-apps preview and blocks screenshots (FLAG_SECURE); README states the equivalent iOS limitation.
- **AC-46** How-to-play covers objective, teams/roles, distribution table, setup, turn sequence, nomination, physical voting, legislative session, executive actions, election tracker, victory conditions, Hitler eligibility and a glossary; reachable from the menu and from contextual help on the game screen.
- **AC-47** How-to-play and About use original wording, credit Secret Hitler (CC BY-NC-SA 4.0, Boxleiter/Maranges/Schubert) and do not reproduce rulebook pages or official artwork.
- **AC-48** `pnpm test` (and `cargo test`) pass on a clean checkout, covering AC-1–AC-12, AC-14, AC-16, AC-26–AC-31 and the unit-level parts of AC-21/AC-35.
- **AC-49** A small e2e suite runs headless against the production frontend and passes: full 5-player game to a victory, cancelled confirmation, reload/resume mid-game, language switch, and role-reveal concealment.
- **AC-50** A full game plays end to end in airplane mode, `grep -i INTERNET` finds no permission request in the Android manifest source, and the bundle contains no runtime fetch of assets, fonts or rules.
- **AC-51** `pnpm build` and the Rust build succeed and README gives exact dev/test/build commands, the APK command (`pnpm tauri android build`) and its output path; README states the APK step is unverified in this environment (no Android SDK).
- **AC-52** README lists every bundled asset with its origin/license and a feature list with known limitations.

## Out of scope

- Backend, accounts, cloud sync, analytics, telemetry, crash reporting, or any network feature → follow-up: none planned; the product is offline by definition.
- Online/remote multiplayer or remote role distribution → follow-up: separate product.
- In-app voting, individual ballots, vote tallying, or any claim that the app verified a vote → physical voting stays physical.
- Digital-only policy mode (allowed as optional by the brief) → follow-up: only physical-card tracking ships in v1; a digital mode must be a separate spec because it changes the secrecy model.
- Card scanning, OCR, QR/NFC reading of physical components → follow-up: not required by the brief and no licensed data format exists.
- Card-image recognition of physical board state; the operator enters all public outcomes.
- APK compilation, signing and Play Store publishing in this environment (no Android SDK) → follow-up: documented command; verify on a machine with the SDK.
- iOS build execution → follow-up: iOS path kept buildable in config, not verified.
- Enforcing table-talk rules ("president and chancellor may not communicate"), truthfulness, or who physically holds the phone → unenforceable; the app only asks for operator confirmation.
- Editions/languages beyond the current Standard Edition rulebook and FA/EN → follow-up: add editions when OQ-5 is decided.
- House rules, custom boards, 4-player or 11+ variants, expansions, themes beyond dark/light.
- Localization of the physical component names into languages other than FA/EN.

## Constraints

- **Stack (fixed by AGENT.md):** Tauri v2 (`src-tauri/`, Rust) + Vue 3 + TypeScript + Vite frontend + Tailwind CSS; UI split into components/screens with one component per file, rules engine in pure TypeScript with no Vue/Tauri imports, game state owned in one store (no duplicated state across screens).
- **Offline:** no runtime network, no `INTERNET` permission, no remote fonts/icons/assets; everything bundled at build time; no runtime model or rule updates.
- **Platform:** Android-first via Tauri v2 mobile; iOS must remain a viable target (no Android-only APIs outside documented platform shims); devices that cannot lock orientation must degrade gracefully.
- **Persistence:** local only, schemaVersion field, forward migrations, no secrets in logs or crash output; only name, role and game data needed for resume.
- **Official components (verified against secrethitler.com rulebook PDF):** 17 policy tiles (6 liberal, 11 fascist), liberal track of 5, fascist track of 6, election tracker threshold 3, max 10 players, role table per AC-1, board variants per AC-7, veto after the 5th fascist policy.
- **Rules source of truth:** the official Secret Hitler Standard Edition rules and board tracks; no invented counts, no alternate victory conditions, no silently skipped mandatory rules; ambiguities resolved by the defaults in "Open questions" and recorded in the decision log.
- **Assets:** original or properly licensed only; no official logo, card art, board scans or rulebook pages; Secret Hitler is CC BY-NC-SA 4.0 (non-commercial) — the project must carry attribution and share-alike notice and stay non-commercial.
- **UX law:** every mutation is cancel-safe and double-tap-safe; destructive or secret mutations are confirm-first, while routine ones confirm only when "Confirm routine actions" is enabled; secret data is drawn only on a private screen and erased before the next handoff; the app never claims to verify a physical action.
- **Accessibility:** 48 dp targets, AA contrast, no color-only meaning, labeled controls, 200% text scale safety.
- **i18n:** all user-facing strings externalized; FA is a first-class RTL locale, not a translation overlay; numbers and dates localized.
- Keep the repo small and readable: no unused scaffolding, no speculative feature flags, no placeholder screens.

### Open questions

1. **5–6 player knowledge.** The official rulebook's overview says Hitler does not know the fascists, but its 5–6 setup ritual says "Fascist and Hitler, open your eyes and acknowledge each other"; some secondary sources narrow the exception to exactly 5 players. Default: follow the setup ritual (5–6 mutual knowledge), as encoded in AC-16.
2. **Term-limit exception below 5 living players.** The rulebook only states the case with 5 players left; it does not say what happens at 4 or fewer. Default: the exception applies at exactly 5 living players, otherwise normal term limits; game usually ends first.
3. **Veto timing when the 5th fascist policy arrives by chaos or in the current session.** Default: veto unlocks only in legislative sessions after the 5th policy is enacted, including a 5th enacted by the election-tracker chaos rule, and never in the session that produced it.
4. **Investigating eliminated players.** The rulebook does not forbid it; common digital implementations do. Default: only living players are targets.
5. **Edition/printing scope.** The spec follows the current Standard Edition tracks; a first-edition or print-and-play board with different spaces would be a separate variant. Default: Standard Edition only; confirm if a specific printing must be supported.

---

Decision log: 2026-10-29 — initial groom; counts verified against the official rulebook PDF (17 tiles = 6 L + 11 F, 5/6 tracks, tracker 3, role table, veto after 5 fascist policies); physical-card mode only; digital mode deferred.
