# Communist expansion — technical plan

Status: draft for Gate 2 · 2026-10-30
Spec: `specs/communist-expansion/spec.md` (approved)
Research: `research/secret-hitler-expansions-and-player-counts.md`

## 1. Options and decision

### Option A — extend the existing reducer and types (chosen)

Add the expansion to `src/game/{types,constants,engine,deck}.ts`, keep one `transition()`,
one `GameState`, one save parser and one `selectPublicView`. Mode is driven by data
(`playerCount` 11–13) and guards keep the 5–10 path byte-for-byte equivalent.

- **Pros:** one deterministic rules engine, one save format, one privacy boundary; existing
  tests keep protecting the official game; smallest total diff for one expansion.
- **Cons:** the strict unions grow; the engine gains branches. Mitigated with exhaustive
  switches and a 5–10 regression suite.
- **Rejected alternatives:** a separate expansion reducer (duplicates election/legislative/
  power logic and creates two privacy boundaries); a plugin/config system (a refactor of a
  working 504-line engine for one mode — not worth the regression risk); deriving party from
  role (cannot represent Radicalisation).

### Key sub-decisions

| Decision | Choice | Why |
|---|---|---|
| Party storage | `Player.party: Party`, set at creation from role | Conversion must not rewrite the secret role; v1 saves derive it |
| Winner shape | `GameOver.winners: Winner[]` (v1 `winner` maps to a one-element array) | Joint Liberal/Communist win; no combined string. Existing 5–10 assertions are mechanically updated, none weakened |
| Communist powers | Reuse `pendingAction`; add `communistPower` and `radicalisationReveal` phases | Same pattern as fascist executive powers; persisted and resumable |
| Conversion timing | Apply `party = 'communist'` in the same reducer step that records the private result | One atomic commit; save-on-every-transition already guarantees no half-state |
| Fascist board | 9–10 board for 11–13 | Spec AC-10; XL uses the largest existing board |
| Deck | `makeDeck(playerCount)` returns 17 cards for 5–10, 23 for 11–13 | One deck factory; no duplicated shuffle paths |
| Five-Year Plan | Add 2 Communist + 1 Liberal to the draw deck and shuffle immediately; acknowledge step only clears the power | Deck growth happens once even if the app is killed before acknowledge |

### Open decisions for Gate 2

1. **Winner shape.** Recommended `winners: Winner[]` and a mechanical test update
   (`gameOver.winner` → `gameOver.winners[0]`). Alternative: keep `winner` and add
   `coWinners`, which avoids test churn but creates two sources of truth.
2. **Radicalisation handoff.** The spec says "pass to the target", but the table sees who
   receives the phone, leaking the target. Recommended: after the President privately picks,
   pass the phone to **every living player in seat order**; each sees "No change" or "You
   are now a Communist". Only the target sees a change; the table learns nothing but the
   order of handoff. This still satisfies AC-15(b)-(e).
3. **Acting player.** Per approved OQ-1, the sitting President chooses/operates Communist
   powers. This is privacy-preserving but lets a non-Communist President sabotage; flag it
   as an experimental-mode caveat.

## 2. Data model

### 2.1 Types (`src/game/types.ts`)

```ts
export type Role = 'liberal' | 'fascist' | 'hitler' | 'communist'
export type Party = 'liberal' | 'fascist' | 'communist'
export type Policy = 'liberal' | 'fascist' | 'communist'
export type Winner = 'liberal' | 'fascist' | 'communist'
export type WinReason =
  | 'liberalPolicies' | 'fascistPolicies' | 'communistPolicies'
  | 'hitlerExecuted' | 'hitlerElected'

export type Phase =
  | 'roleReveal' | 'nomination' | 'voting'
  | 'legislativePresident' | 'legislativeChancellor'
  | 'executive' | 'communistPower' | 'radicalisationReveal'
  | 'gameOver'

export type Power =
  | 'none' | 'investigate' | 'peek' | 'special' | 'execute'
  | 'radicalise' | 'fiveYearPlan' | 'confession'
```

```ts
export interface Player {
  id: number
  name: string
  role: Role
  party: Party        // current party; changes on Radicalisation
  alive: boolean
}

export interface GameOver {
  winners: Winner[]   // one entry for 5–10; two for the joint Hitler-execution win
  reason: WinReason
}

export interface Confession {
  playerId: number
  party: Party
  round: number
}

export interface Radicalisation {
  targetId: number
  before: Party
  after: Party        // 'communist' unless Hitler/already Communist
  revealIndex: number // seat-order handoff position, persisted for resume
}

export interface GameState {
  schemaVersion: 2
  expansion: 'communist' | null
  // ...existing fields...
  enactedCommunist: number
  confessions: Confession[]
  radicalisation: Radicalisation | null
  confession: { playerId: number; party: Party } | null
}
```

`PublicView` adds `enactedCommunist`, `expansion`, `confessions` (public history) and
`gameOver.winners`; it never includes `radicalisation`, `confession` (pending) or `party`.
`KnowledgeEntry` adds `party: Party` and `communists: string[]`.

`secretStep` is **derived, not stored**: `secretStep(state)` returns
`'radicalisePick' | 'fiveYearPlan' | 'confession' | 'radicaliseReveal' | 'radicaliseDone' | null`
from `phase`, `pendingAction.type` and `radicalisation.revealIndex`. No extra persisted field, so
no extra migration surface or inconsistency to validate.

### 2.2 Constants (`src/game/constants.ts`)

- `MIN_PLAYERS = 5`, `MAX_PLAYERS = 13`, `EXPANSION_MIN = 11`.
- `ROLE_TABLE` adds 11/12/13 (fascist excludes Hitler): 11 = 5/3/2, 12 = 6/3/2,
  13 = 6/3/3.
- `BOARD_POWERS`: 11–13 reuse the 9–10 array (or `powerFor` falls back to `Math.min(10, n)`).
- `DECK_LIBERAL = 6`, `DECK_FASCIST = 11` stay for 5–10; add `DECK_COMMUNIST = 8`,
  `COMMUNIST_TRACK = 6`, `COMMUNIST_DECK = { liberal: 5, fascist: 10, communist: 8 }`.
- `COMMUNIST_POWERS: Record<11 | 12 | 13, Power[]>` =
  `['none','radicalise','fiveYearPlan','radicalise','confession','none']`
  (read as `[enactedCommunist - 1]`: space 1 blank, 2/4 Radicalisation, 3 Five-Year Plan,
  5 Confession, 6 victory).
- `partyForRole(role)` and `isExpansion(playerCount)`.
- `makeDeck(playerCount)` in `deck.ts` (moved from a fixed array).

### 2.3 Engine (`src/game/engine.ts`)

- `validateSetup`: 5–13; same duplicate/name checks; error params 5/13.
- `createGame`: `party: partyForRole(role)`, `deck: shuffle(makeDeck(count))`,
  `expansion: count >= 11 ? 'communist' : null`, new counters empty.
- `enactPolicy`: switch on policy; `tracker = 0`; unlock veto at 5 fascist.
- `checkPolicyVictory`: communist track full first (if expansion), then liberal 5, fascist 6.
- `chancellorEnact`: after enact, if no victory and card was communist, resolve the power at
  `enactedCommunist`:
  - `radicalise` → `pendingAction = { type: 'radicalise', actorId: presidentId }`,
    `phase = 'communistPower'`.
  - `fiveYearPlan` → append 2 communist + 1 liberal to `deck`, `shuffle`, then
    `pendingAction`/`phase` for a public acknowledge step.
  - `confession` → `pendingAction = { type: 'confession', actorId: presidentId }`,
    `phase = 'communistPower'`; also snapshot `confession = { playerId: presidentId,
    party: president.party }` now, so a later conversion cannot rewrite the public record.
  - slot 1/6 → no power (slot 6 already won).
- New actions:
  - `radicalise { playerId }` — phase `communistPower`; any living player; set
    `radicalisation = { targetId, before, after, revealIndex: 0 }`; if `before !==
    'communist'` and target.role !== 'hitler', set `party = 'communist'`; phase
    `radicalisationReveal`.
  - `nextRadicalisationReveal` — advance `revealIndex`; after the last living player the
    derived step is `radicaliseDone`, with the conversion already applied exactly once.
  - `finishRadicalisation` — clear `radicalisation` and `startNextRound` after the public
    resolved screen.
  - `acknowledgeFiveYearPlan` — clear the pending public step and `startNextRound`; the deck
    was already grown once at enact time.
  - `acknowledgeConfession` — push the snapshot `{ playerId, party, round }` to
    `confessions`, clear the pending step and `startNextRound`.
- `investigate`: report `target.party` (Communist for converted/communists).
- `execute`: `target.role === 'hitler'` → `winners: expansion ? ['liberal','communist'] :
  ['liberal']`.
- `knowledgeFor`: add `party`; Liberals none; Communists see other `role === 'communist'`
  names; Hitler at 11+ sees nobody; Fascists see fascists + Hitler. Converted players keep
  their role knowledge (a converted Fascist still sees Fascists/Hitler); no roster exchange.
- `selectPublicView`: add `expansion`, `enactedCommunist`, `confessions`, `winners`; omit
  pending confession/radicalisation and all parties.
- `startNextRound`/`setGameOver`: clear `pendingAction`, `radicalisation`, `confession`.

### 2.4 Save (`src/stores/game.ts`)

- `SAVE_VERSION = 2`.
- v0/v1 → v2: `party` from role; `expansion` from player count; `enactedCommunist: 0`;
  `confessions: []`; `radicalisation: null`; `confession: null`;
  `gameOver.winners = [old.winner]`.
- Validate 5–13, roles/parties/policies/phases/win reasons/winners; reject a v2 save whose
  `expansion` disagrees with the player count; validate `radicalisation` (living target,
  parties, revealIndex) and pending confession; reject newer versions as today.
- `parseSave` must accept both old `.winner` and new `.winners`, never both required.
- `persist` stays the single write point; no extra save calls.

### 2.5 UI

- `SetupWizard`: count 5–13; 11–13 badge "experimental fan expansion"; components step
  shows 23 tiles and the 6-space Communist track; review shows all four role counts and the
  9–10 board.
- `RoleReveal`: role + party; Communist card distinct; knowledge lists; no other player's
  data.
- `GameBoard`/`PolicyTrack`: third track only when `expansion`; compact layout at 360 dp.
- New components: `RadicalisationPanel.vue` (public cover, President-only picker,
  seat-order handoff, public resolved) and `ConfessionPanel.vue` (cover, snapshot party,
  mandatory confirmation); the Five-Year-Plan acknowledgement lives in `ExecutivePanel.vue`.
  Reuse `AppDialog`, `PlayerToken` (`allowPresident`), `PolicyCard`, confirm patterns.
- `GameOverPanel`: winners array, three policy totals, final roles with current party and a
  radicalised marker.
- `HowToPlay`: expansion section + credits (Secret Hitler XL / Bo-Jivan Parker and
  contributors); no official art.
- i18n: EN/FA keys in `src/i18n/{en,fa}.ts`; parity test already exists.

## 3. Risks

| Risk | Impact | Mitigation | Owner task |
|---|---|---|---|
| Converted Fascist can out Hitler | Mode feels broken at some tables | Label experimental; document in HowToPlay; no rules change in this scope | T9 |
| Radicalisation handoff leaks the target | Privacy violation | Pass-to-everyone pattern (Gate 2 decision); privacy test | T5, T8, T10 |
| 5–10 regression from shared types | Shipping bug in the official mode | Guards by `expansion`; full existing suite; 5–10 golden tests | T1–T4, T11 |
| Save migration loses a conversion | Corrupt/rewound game | Atomic commit; v1 fixture tests; resume test during reveal | T4, T10 |
| Three tracks at 360 dp / RTL | Clipping, unreadable board | ux-designer spec; e2e 360 dp + FA | T5, T10 |
| Free-model subagent limits | Pipeline stalls | Lead can write workflow artifacts; implementation tasks stay small | process |

## 4. Task order

See `tasks.md`. Dependency chain: T1 → T2 → T3 → T4; T5 (UX) after T1 and parallel with
T2–T4; T6–T8 after their engine + UX dependencies; T9–T10 after UI; T11 last.

## 5. Definition of done for the feature

- All 26 ACs have a mapping to a unit/e2e test or a documented manual check.
- `pnpm test`, `pnpm build`, `pnpm e2e`, `pnpm check:rust` pass; Android build still
  arm64-only with no new permission.
- `code-qa` PASS; reviewer has 0 blocker/major.
- A 5–10 game and an 11–13 game both survive kill/relaunch in every phase.
