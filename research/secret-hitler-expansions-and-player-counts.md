# Secret Hitler: expansions and player-count variants

Research report for the offline companion app · 2026-10-30

Scope: community expansions and variants that change the player count — more than the
official 10 (notably the Communist / Secret Hitler XL family) and fewer than the
official 5. It ends with what each option would cost to implement in this app.

> **Method / confidence.** Findings come from the Secret Hitler XL rules PDF (fetched
> directly), BoardGameGeek threads (fetched through the public BGG API), the official
> Secret Hitler rulebook PDF, GitHub repositories, and search-result snippets for Reddit,
> Dicebreaker, MakerWorld and Printables. Reddit and some store pages could not be fetched
> directly (403 / bot checks), so claims that rest only on snippets are marked
> **[snippet]**. Everything else was read in full.

---

## TL;DR

1. **The "add Communists" idea is real and already exists.** The mature fan expansion is
   **Secret Hitler XL** (2021, Bo-Jivan Parker / u/LordRoguy and contributors). It adds a
   third party (Communists and a Communist policy tracker), plus Capitalist, Anarchist and
   Monarchist roles, and rules for 11–16 players (the text advertises up to 20).
2. **It is a design kit, not a finished product.** The author says it has "not been play
   tested enough"; BGG users report rule/board contradictions and a balance hole around
   converted Fascists. Treat 11+ as experimental.
3. **There is no established expansion for fewer than 5 players.** The official minimum is
   5. BGG consensus is that 4 players breaks the deduction; one house-rule sketch exists.
   Anything for 3–4 players would be original design, not a port.
4. **For this app:** a 4-player house mode is a small, self-contained feature; 11–16 with a
   third party touches every phase, victory check, power, privacy boundary and the save
   schema. The sensible order is 4-player mode → XL-lite (Communist party, 11–13) → full XL,
   and only if the table actually has 11+ players.

---

## 1. Why player count is hard to change (baseline)

The official game is 5–10 players. Every count has its own role table, Fascist board and
executive powers, and the whole table shares one 17-card policy deck (6 Liberal + 11
Fascist). Liberals win at 5 Liberal policies or by killing Hitler; Fascists win at 6
Fascist policies or by electing Hitler Chancellor after 3 Fascist policies.

Adding players without changing anything makes the game end before everyone has held
office, and gives the non-Fascists too few investigations/executions to find Hitler. That
is why every "more players" expansion below adds **policy trackers and deck cards**, not
just role cards. Conversely, removing players removes the information and the buffer that
make the deduction work.

Current app constants are exactly the official envelope: `MIN_PLAYERS = 5`,
`MAX_PLAYERS = 10`, `DECK_LIBERAL = 6`, `DECK_FASCIST = 11`, `LIBERAL_TRACK = 5`,
`FASCIST_TRACK = 6` (`src/game/constants.ts`).

---

## 2. More players

### 2.1 Secret Hitler XL (the main answer)

**What it is.** A fan expansion for 10+ players built around a new **Communist** party,
with optional roles and optional balance modules. The Communists are an adjusted version
of the earlier **Socialist Expansion** (see 2.2), re-themed with new art.

**Credits (from the rules PDF).** Rules and project: Bo-Jivan Parker (u/LordRoguy).
Communists/Anarchist art: u/PenguineWithAFez; Communist bear clothing: u/muhaaman;
Capitalist/Monarchist art: Leo Carlton (u/therazeblitz). Communist mechanics derive from
the Socialist Expansion by **u/mrkvicka and u/havosh** (Matej Haverlík and Daniel Teplan).
Base game by Mike Boxleiter, Tommy Maranges, Max Temkin, Max Schubert; CC BY-NC-SA 4.0.

**Party ratios (rules PDF, p. 1; Fascist count excludes Hitler):**

| Players | Liberal | Fascist | Communist | + Hitler |
|---:|---:|---:|---:|---:|
| 6 | 3 | 1 | 1 | 1 |
| 7 | 4 | 1 | 1 | 1 |
| 8 | 4 | 2 | 1 | 1 |
| 9 | 4 | 2 | 2 | 1 |
| 10 | 5 | 2 | 2 | 1 |
| 11 | 5 | 3 | 2 | 1 |
| 12 | 6 | 3 | 2 | 1 |
| 13 | 6 | 3 | 3 | 1 |
| 14 | 7 | 3 | 3 | 1 |
| 15 | 7 | 4 | 3 | 1 |
| 16 | 7 | 4 | 4 | 1 |

The PDF stops at 16; the MakerWorld listing says **up to 19** **[snippet]**, the Scribd
version and the rules intro say **up to 20**. There is no tested table above 16 — treat
17+ as unsupported.

**Policy deck.** Standard XL deck: **8 Communist + 5 Liberal + 10 Fascist** (23 cards).
With exactly 8 players: **8 Communist + 6 Liberal + 9 Fascist** (also 23).

**Communist rules.**

- Communists have their own tracker and win when it is **full of Communist policies**
  (5 slots for 6–8 players, 6 slots for 9+).
- They also win if **Hitler is assassinated**; Liberals win alongside them (and vice
  versa: a Communist assassination of Hitler is a shared Liberal/Communist win).
- For <11 players Communists do **not** know each other at setup; at 11+ they do.
- Communist presidential powers, in tracker order:
  - **Bugging** — Communists secretly look at one player's Party Membership card
    (pass-the-phone night action).
  - **Radicalisation** — Communists secretly swap one player's Party Membership card for a
    Communist card; that player is now a Communist. Hitler and the Capitalist are immune
    and check their card back.
  - **Five-Year Plan** — add 2 Communist + 1 Liberal policy to the draw deck, shuffle.
  - **Congress** — newly radicalised Communists learn who the original Communists are.
  - **Confession** — the sitting President must reveal their Party Membership to everyone.
- Power order by count:
  - 6–8: 5-slot tracker — Bugging, Radicalisation, Five-Year Plan, Congress.
  - 9–10: 6-slot tracker — Bugging, Radicalisation, Five-Year Plan, Congress, Confession.
  - 11+: 6-slot tracker — blank, Radicalisation, Five-Year Plan, Radicalisation,
    Confession.
  - Short-game alternative: 3-slot tracker (Confession, Radicalisation), Liberal tracker
    cut to 3 slots, deck 10 Fascist + 4 Liberal + 6 Communist. This shortens the game
    instead of extending it.

**Optional roles.**

- **Capitalist** — wins if neither the Anarchist nor the Communists win. If assassinated,
  add one Communist policy to the deck. Used to help Communists find a second
  assassination target, or to weaken them.
- **Anarchist** — two modes:
  1. *Without Communists:* wins if an Anarchist policy is enacted by the election tracker.
     Deck gets 3 Anarchist policies; each enacted Anarchist policy shuffles another in and
     moves the election tracker to the end, forcing a random policy.
  2. *With Communists:* on the Communist team; replaces 2 Communist policies with 2
     Anarchist ones. Anarchist policies go on the Communist tracker but grant no power.
     Wins if the Communists win with 2 Anarchist policies on the tracker, or if Hitler is
     assassinated.
- **Monarchist** — Fascist team. Wins if the Fascists win and Hitler **never** becomes
  Chancellor after 3 Fascist policies; loses if Hitler is assassinated. Replaces one
  Fascist to balance a group where Fascists win too often.
- **Nationalist** — listed in the contents but has **no rules in the PDF**; do not
  implement.
- **Dictator** — not a role: a Hitler card reskin for tables that prefer not to use the
  Hitler name (confirmed in a 2026 BGG reply on the XL thread).

**Balance modules (no new roles).**

- **Anti-policies:** Anti-Communist (place on Fascist track; use the Fascist power, then
  remove a Communist policy; the next Communist policy grants no power), Anti-Fascist
  (mirror image on the Communist track), Social Democratic (place on Liberal track; remove
  a Fascist or Communist policy; only for groups where Liberals are clearly losing).
- **Liberal disadvantage:** use a 6-slot Liberal tracker to lengthen the game by one
  Liberal policy.
- **Emergency Powers:** one per player above 10 (two per player above 13 with Communists,
  max six: three Article 48 + three Enabling Act). Article 48 gives the **President** an
  emergency power; Enabling Act gives it to the **Chancellor**. Examples: Propaganda (peek
  the top policy, keep or discard), Policy Peek (3 cards), Impeachment (reveal party card
  to a chosen player), Marked for Execution (executed after 3 more Fascist policies),
  Execution, Presidential Pardon, Vote of No Confidence (the President's discarded policy
  is enacted).

**Known problems (important if porting).**

- Author: "has not been play tested enough".
- BGG thread reports the rules and board contradict each other on when Communists learn
  each other, and a printing/card-count mismatch for Five-Year Plan.
- **Converted Fascist problem:** a radicalised Fascist knows Hitler with certainty and can
  simply say so, which can end the game. A 2026 house-rule proposal adds a **Rote Kapelle**
  convert who dies if Hitler/the Dictator is assassinated, and a Dictator decoy at setup.
  No official fix.
- Card backs and board art have print-alignment complaints; a colour PDF was made by a
  community member in 2024.

**Where to get it.** Rules PDF (read for this report):
`https://makerworld.bblmw.com/makerworld/model/US7e7b664decd30/design/2024-11-20_7f275fff92078.pdf`
· BGG thread: `https://boardgamegeek.com/thread/2749708`
· Designer's Drive folder: `https://drive.google.com/drive/folders/1GXc9XdO--G-5bb2hw-DL_kDXxvrFV2Gs`
· Dicebreaker coverage: `https://www.dicebreaker.com/games/secret-hitler/news/secret-hitler-xl-fan-expansion`
· 3D-print listing (19 players, summary): `https://makerworld.com/en/models/1052392-secret-hitler-xl-communist-expansion`
· Steam Workshop (Tabletop Simulator): `https://steamcommunity.com/sharedfiles/filedetails/?id=2652375964`

### 2.2 Secret Hitler: Socialist Expansion (2019, the predecessor)

A third-party expansion designed by **Matej Haverlík** and **Daniel Teplan**
(u/havosh, dtep), published on r/SecretHitler with a print-and-play. It adds a Socialist
party with its own **policy track and set of powers**, and a "Chairman" role. XL's
Communists are "essentially the same" mechanics with the Chairman removed and veto powers
added to the tracker.

This is the better starting point if you want a third party but not XL's 11–20 scaffolding:
it predates XL and does not add the larger-table machinery. Rules/PNP:
`https://www.reddit.com/r/SecretHitler/comments/dvdr1g/secret_hitler_socialist_expansion/`
(the post itself was not readable from here; the description comes from the XL credits and
the thread snippet **[snippet]**).

A working digital implementation exists:
`https://github.com/luc-moreira/Secret-Hitler-In-Person-Play` — a single-file,
mobile-first pass-and-play app with **optional Socialist Expansion**, which is the closest
prior art to this project.

### 2.3 "Communists and up to 12 players" (2016, Vinetou)

An earlier, much simpler BGG expansion (`https://boardgamegeek.com/thread/1584173`). Rules
posted by the author:

- 11 players: Hitler + 3 Fascists + 5 Liberals + 2 Communists.
- 12 players: Hitler + 3 Fascists + 6 Liberals + 2 Communists.
- Adds an **Independence track**; use the 9–10 Fascist board.
- Communists know each other at setup.
- Communists win if Hitler is assassinated by a Communist President **and** at least one
  Communist article is on the Independence track; or with 3+ articles including at least
  one Communist and both Communists elected Chancellor and President.
- A player may remove one article from any track (not the one just placed), which can
  re-enable powers. A scoring table is included.
- Print-and-play cards only (images in the thread).

Good reference for a minimal "third faction" rule set; less developed than XL.

### 2.4 "Bear Down for Hitler" (2024)

A 2024 variant of the Communist expansion, announced on r/SecretHitler: 2-page rules and a
12-page print-and-play, explicitly differentiated from XL and other Communist/Socialist
expansions. Only the announcement snippet was readable **[snippet]**:
`https://www.reddit.com/r/SecretHitler/comments/1bni8vs/`

### 2.5 Themed rethemes (not player-count expansions)

BGG maintains a list of known variants (`https://boardgamegeek.com/thread/2345090`):
Secret Alien (Among Us), Secret Cthulhu, Secret Ganon, Secret Hamilton, Secret Krampus,
Secret Lion, Secret Pirate, Secret Resistance, Secret Romulan, Secret Santa, Secret Sith,
Secret Spider, Secret Stalin, Secret Struggle, Secret Voldemort, plus a "Silence Power"
variant. These reskin the base 5–10 game; they do not add players. Useful for art/theming
ideas and for confirming that derivative works are allowed under CC BY-NC-SA 4.0 (no
commercial sale, attribution, share-alike).

---

## 3. Fewer players

**There is no established expansion for 3–4 players.** The official rules start at 5, and
the BGG thread "Rules for 4 players?" (`https://boardgamegeek.com/thread/3418831`, Dec 2024)
is representative:

- "I can't conceive of any way to make this game work with only four players."
- "Five is okay. Seven is ideal. Four just doesn't work."
- "…three hidden roles, only one player left to deduce, no confrontation."

The one concrete house-rule sketch in that thread:

- 4 roles: **2 Liberals, 1 Fascist, 1 Hitler**.
- No investigation power at all.
- Liberals win at **4** Liberal policies or Hitler's death; Fascists win at **5** Fascist
  policies or Hitler elected Chancellor (optionally 3/4 for a shorter game).
- No other changes. Untested; the author presents it as a 20-minute experiment.

Why it is fragile: with four players there are only three other players to read, the
Fascist has almost no room to hide, and the policy deck (17 cards, 5/6 tracks) is tuned for
more offices and more powers. Shrinking the tracks is necessary but makes each random
policy swing huge.

If a sub-5 mode is ever wanted, the design levers are: smaller tracks, fewer/zero powers,
a two-faction core with Hitler hidden among the Fascists, and a shorter deck. That is
**original design**, not a port of an existing expansion; it should be labelled a house
variant, not "official".

---

## 4. What this means for this app

Current facts: 5–10 only; single 17-card deck; two tracks; powers keyed by player count and
Fascist policy; one save schema (`schemaVersion: 1`); privacy boundary in
`selectPublicView`; setup wizard hard-codes the count.

### Change surface

| Area | 4-player house mode | XL-lite (Communist party, 11–13) | Full XL (16–20) |
|---|---|---|---|
| `src/game/constants.ts` | new role table, deck sizes, shorter tracks | second deck + Communist tracker, per-count power orders | all of XL + optional roles |
| `src/game/engine.ts` | skip investigation, new win thresholds | new party, tracker, Communist powers, shared Hitler-death win, radicalisation | anti-policies, emergency powers, Anarchist/Monarchist/Capitalist |
| Privacy/public view | small (no investigate) | large: night actions must not leak to `selectPublicView` | very large |
| Pass-the-phone UI | none | Bugging, Radicalisation, Congress, Confession | plus emergency powers and role-specific night steps |
| Save schema | bump if mode is stored | bump; store party, tracker, converted membership | bump again |
| Setup / i18n / tests | new count option, EN/FA strings, role-table tests | power and win-condition tests per count | full matrix |

### Recommended sequencing

1. **4-player house variant (small).** One new role table, shorter tracks, no investigation;
   reuse the existing engine. Ship it behind a "House variant" label. Effort: days, not
   weeks. Risk: balance is unknown; it is a novelty mode.
2. **XL-lite: Communist party for 11–13 (medium–large).** Port only the party, deck, tracker,
   four/five powers and win conditions; skip optional roles and emergency powers. This is
   the actual "add Communists so more people can play" feature. It needs a real privacy
   design for the night actions and a save-schema bump.
3. **Full XL (large, experimental).** Only if the group regularly has 14+ and is willing to
   playtest. The source itself is under-tested, and the converted-Fascist problem needs a
   house fix before it is enjoyable.

**Do not** advertise 20 players. The tested table stops at 16, the designer calls it
under-tested, and the app cannot verify balance without a device/table.

### Licensing

Secret Hitler is CC BY-NC-SA 4.0; XL and the Socialist Expansion are derivative fan works
under the same licence. This app is non-commercial and already attributes the original
creators, so a fan-expansion mode is compatible **if** it credits the expansion authors and
does not imply endorsement. Do not bundle paid art or sell the build.

---

## 5. Sources

| # | Source | Used for |
|---|---|---|
| 1 | Secret Hitler official rules PDF — `https://www.secrethitler.com/assets/Secret_Hitler_Rules.pdf` | 5–10 counts, 6+11 deck, 5/6 win conditions, role setup |
| 2 | Secret Hitler XL rules PDF — `https://makerworld.bblmw.com/makerworld/model/US7e7b664decd30/design/2024-11-20_7f275fff92078.pdf` | all XL rules, tables, powers, credits |
| 3 | BGG thread 2749708 — `https://boardgamegeek.com/thread/2749708` | XL announcement, credits, community issues, Dictator/Rote Kapelle |
| 4 | BGG thread 2345090 — `https://boardgamegeek.com/thread/2345090` | list of known variants/rethemes |
| 5 | BGG thread 1584173 — `https://boardgamegeek.com/thread/1584173` | 2016 Communist/Independence expansion to 12 |
| 6 | BGG thread 3418831 — `https://boardgamegeek.com/thread/3418831` | 4-player consensus and house rule |
| 7 | Dicebreaker — `https://www.dicebreaker.com/games/secret-hitler/news/secret-hitler-xl-fan-expansion` | XL credits/context **[snippet, 403]** |
| 8 | MakerWorld XL — `https://makerworld.com/en/models/1052392-secret-hitler-xl-communist-expansion` | up to 19 players, 3D-print version **[snippet, 403]** |
| 9 | GitHub `luc-moreira/Secret-Hitler-In-Person-Play` | prior art: pass-and-play app with Socialist Expansion |
| 10 | Reddit r/SecretHitler threads (Socialist Expansion, XL, 4 players, Bear Down) | dates/context **[snippet, not directly readable]** |

## 6. Open questions before implementation

1. Which is the target: a **4-player** table, or **11+**? They are different products; the
   first is a small variant, the second a rules-engine expansion.
2. For 11+, is the third party required, or is "more players with the existing two parties"
   enough? XL's own answer is that you need a longer game and more investigation, which a
   third party provides.
3. How should night actions work offline? XL assumes closed eyes and card swaps. A
   pass-the-phone flow can do it, but it must be designed explicitly (who holds the phone,
   what the public view shows, how to prove a card was swapped).
4. Do we accept the converted-Fascist imbalance, or adopt a house fix (Rote Kapelle/decoy)?
5. Is the app willing to ship an explicitly experimental mode? If yes, label it in the UI
   and keep the official 5–10 mode untouched.
