# Project: Secret Hitler — Offline Mobile Board Game Companion

Act as a senior mobile application engineer, game UX designer, and software architect. Build a complete, polished, offline-first mobile companion app for the physical board game **Secret Hitler**.

The app is a companion for people playing the physical board game together. It must manage the game state, secretly distribute roles, track elections and enacted policies, display the board, and guide players through each operation. Players will still perform discussions, nominations, voting, and other physical interactions in person.

Do not build merely a prototype or a collection of static screens. Implement the actual game flow, state management, validation, persistence, and all interactive features.

## 1. Technology and Architecture

First inspect the existing repository and follow its current architecture if one exists. If the repository is empty, choose a suitable cross-platform mobile technology and explain the choice briefly.

Requirements:
- Target Android first, with a maintainable path to iOS.
- The entire game must work without internet access.
- No mandatory account, registration, backend, cloud service, or network permission.
- Store settings and resumable game state locally.
- Use a clean architecture with clearly separated UI, game rules, state management, persistence, and presentation.
- Keep game rules independent of UI components.
- Implement reusable components for cards, boards, tokens, confirmation dialogs, and player selection.
- Support different screen sizes, aspect ratios, and safe areas.
- Use a consistent design system with accessible typography, spacing, colors, and touch targets.
- All game controls must work; do not leave placeholder buttons or simulated interactions in the final implementation.
- Include unit tests for game rules, state transitions, victory conditions, and persistence.

Before implementation, inspect the repository and provide a concise implementation plan. Then proceed with implementation rather than stopping after the plan.

## 2. Visual Design and Overall Experience

The interface should resemble a high-quality physical board game placed on a table, not a generic administrative application.

Design direction:
- Dark navy, charcoal, muted red, ivory, and restrained gold accents.
- Textured board surfaces, subtle shadows, layered cards, tactile tokens, and clear visual hierarchy.
- Distinct liberal and fascist policy tracks.
- Presidential and chancellorship markers that resemble physical board-game pieces.
- Carefully designed card backs and policy fronts.
- Smooth but restrained animations for card movement, policy enactment, and changes in government.
- Clear feedback when an operation succeeds, fails, or requires correction.
- Readable text and sufficiently large touch targets on phones.

Use original assets or appropriately licensed graphics. Do not depend on downloading images or fonts at runtime.

The board must be a faithful, recognizable digital representation of the physical Secret Hitler board. Implement the correct player-count-specific board variants and policy tracks. Do not invent game rules or use arbitrary policy counts.

## 3. Orientation and Responsive Layout

Implement orientation-aware layouts.

### Main menu and informational screens
- Portrait orientation.
- Large, clear menu items.
- Comfortable spacing and thumb-friendly controls.
- Responsive layout for small and large phones.

### Main game screen
- Landscape orientation whenever supported by the device.
- The game board should occupy most of the available screen.
- Display the liberal and fascist policy tracks side by side.
- Keep the player list, current president, nominated chancellor, election tracker, and available actions visible without unnecessary scrolling.
- Scale or reposition elements on smaller screens without making cards or labels unreadable.
- Prevent accidental orientation changes from destroying or resetting the game state.
- Handle devices that cannot lock orientation gracefully.

The app must restore the correct screen and orientation when returning from system dialogs or reopening a saved game.

## 4. Main Menu

Create a polished portrait-oriented main menu with these options:

1. **Start Game**
2. **How to Play**
3. **Settings**
4. **Resume Game**, shown only when a resumable game exists.

Include a title screen inspired by the board game's political mystery theme.

### Start Game flow

When the user taps Start Game, open a setup wizard.

Step 1 — Number of players:
- Allow a valid player count from 5 to 10.
- Explain that the game requires at least five players.
- Validate the selected count.

Step 2 — Player names:
- Allow players to enter names or use default labels such as Player 1, Player 2, etc.
- Validate duplicate names according to a documented policy.
- Keep player identity separate from secret role information.

Step 3 — Role distribution:
- Display the exact number of Liberals, Fascists, and Hitler for the selected player count.
- Calculate the distribution from the official rules rather than allowing an invalid arbitrary combination.
- Explain the distribution clearly before starting.
- Randomize and assign roles securely within the app.
- Never display secret roles in the public game interface.

Step 4 — Physical component setup:
- Show the correct liberal and fascist policy counts.
- Show the number of cards in each deck, including any required draw/discard piles.
- Explain how to prepare the physical board and policy decks.
- Make clear which components belong to the physical game and which are represented digitally.

Step 5 — Review:
- Summarize player count, names, role distribution, and board variant.
- Require confirmation before creating the game.
- Shuffle and assign roles only when the user confirms the setup.
- Persist the initialized game locally.

Do not invent official game component counts. Encode the actual rules and board configurations for each supported player count.

## 5. Secret Role Assignment and Privacy

Role assignment is a critical feature.

Implement a private, pass-the-phone role reveal flow.

Requirements:
- Randomly assign exactly the correct number of roles.
- Ensure every player receives exactly one role.
- Use an appropriate cryptographically secure random source when available.
- Never expose roles through the public game board, notifications, logs, or ordinary debug output.
- Do not reveal all roles on a single public screen.
- Display a clear handoff screen before each reveal.

Example flow:

1. Display: "Pass the phone to Player 1."
2. Require an explicit confirmation that the intended player has the phone.
3. Reveal that player's role only after confirmation.
4. Allow the player to read the role privately.
5. Require the player to tap "Hide Role" or "Continue".
6. Clear the secret role from the visible screen.
7. Show the handoff screen for the next player.
8. Repeat until all roles have been privately revealed.
9. Return to the public game board.

For secret roles, provide a privacy-preserving screen with minimal surrounding information.

The application must correctly handle the official Secret Hitler rules for fascist team knowledge and Hitler's knowledge, including the player-count-dependent exceptions. Implement these rules from verified official rule material rather than assuming all fascists always know the same information.

Never expose secret roles accidentally through screenshots generated by the app, recent-app previews where platform APIs permit protection, or persistent public UI elements. Explain any platform limitations.

## 6. Physical Board Representation

The main game board is the central element of the application.

Build a detailed, interactive board with:

### Liberal policy track
- The correct number of policy spaces.
- Clear visual distinction between enacted and empty spaces.
- Physical-card-like policy tokens.
- The correct liberal victory condition.

### Fascist policy track
- Player-count-specific board variants.
- Clearly marked policy spaces.
- Appropriate executive-action spaces and eligibility indicators.
- Hitler-related victory condition and relevant election restrictions.

### Additional board components
- President marker.
- Chancellor marker.
- Election tracker.
- Draw pile and discard pile indicators.
- Current round or turn information.
- Current government status.
- Current president and nominated chancellor.
- A clear indication of the last election result.

Use icons and shapes as well as color so the game remains understandable for players with color-vision deficiencies.

The board must update from the central game state. Do not maintain separate, inconsistent copies of the same information in different screens.

## 7. Board Spaces with Special Actions

Some spaces on the fascist board have executive actions.

**Do not put explanatory text underneath these spaces.** The board should remain visually clean and resemble a physical board.

Instead:
- Render the special-action spaces as images or illustrated icons.
- Make the entire icon or space tappable.
- Use a sufficiently large touch target.
- On tapping, open a dedicated modal or detail screen.
- Display the action name, icon, concise explanation, eligibility requirements, and required next steps.
- Explain whether the action is available immediately or only after the corresponding fascist policy has been enacted.
- Provide a Close button that returns to the same game state without modifying it.

Use the correct action for each official board variant. Possible actions include investigating a player's party membership, calling a special election, executing a player, and the applicable top-deck policy action. Implement only the actions actually present in the relevant official board configuration.

An information popup must never execute a game action merely because the player opened it.

## 8. Player List and Government Markers

Display all players in a compact, readable layout.

Each player entry should support:
- Player name.
- President marker when applicable.
- Chancellor marker when applicable.
- Current eligibility for nomination.
- Status as alive or eliminated, if applicable.
- Election or term-limit information required by the official rules.

Do not display secret roles in the public player list.

When a president nominates a chancellor:
- Let the operator select an eligible player.
- Validate the nomination against the official rules.
- Update the nominated chancellor marker.
- Clearly distinguish nomination from election approval.
- Require confirmation before committing the nomination.

Implement the official term-limit and eligibility rules, including special-election behavior and any exceptions after failed elections or government changes.

## 9. External Voting — No In-App Ballot

Voting takes place physically, outside the app.

The application must not conduct an in-app vote, secretly collect votes, calculate votes from individual player inputs, or require players to cast digital ballots.

Instead, provide a simple public voting-result interface.

The operator selects one of two outcomes after the physical vote has concluded:
- **Government Approved**
- **Government Rejected**

The app records only the announced aggregate result.

After selecting a result:
1. Display a confirmation dialog.
2. Explain the consequences of the selected result.
3. Require explicit confirmation.
4. Apply the official game rules.
5. Update the election tracker and government status.
6. Display the result clearly on the game board.

If the government is rejected, apply the official failed-election rules. If the government is approved, proceed to the policy-selection phase.

Never claim that the app verified the physical vote. It only records the result entered by the operator.

## 10. Policy Cards and Secret Card Handling

Implement policy management in a way that respects the physical game's secrecy.

The application must support both:
- Tracking physical policy cards selected by players.
- An optional fully digital policy-card workflow if implemented consistently and without breaking the game's rules.

For the physical-card workflow:
- Record the number of cards drawn, discarded, and enacted.
- Record whether the president discarded a policy.
- Record which policy was enacted by the chancellor.
- Update the appropriate policy track.
- Ensure that the app does not reveal hidden cards to the public.

After an approved election, display the policy phase with cards face down by default.

The operator must explicitly tap a **Reveal Cards** button before the card faces become visible.

Before revealing:
- Display a confirmation screen indicating that the card information may be visible to everyone holding or viewing the phone.
- Ask the operator to confirm that the correct player has the device and that it is safe to reveal the cards.
- Only reveal the cards after confirmation.

After the appropriate operation:
- Require confirmation of the selected or discarded card.
- Record the result.
- Return to a public-safe screen.
- Never leave hidden card faces visible when the next player receives the phone.

When a card is selected, display a confirmation dialog such as:
"Confirm that the correct player has the phone and that this is the intended card."

Provide Cancel and Confirm options. Cancel must return to the previous state without applying the operation.

Implement deck exhaustion, reshuffling of the discard pile, and all applicable official policy-resolution rules correctly.

If the digital-card mode is implemented, define precisely who can see each card, when cards are revealed, and how card state is erased from the public view. Do not mix the physical and digital workflows ambiguously.

## 11. Confirmation and Accidental-Touch Protection

This requirement applies to **every state-changing operation**.

The application must use a consistent confirmation mechanism before committing important actions.

Examples:
- Starting a new game.
- Revealing a secret role.
- Hiding a role and handing over the phone.
- Nominating a chancellor.
- Recording a voting result.
- Revealing policy cards.
- Discarding or enacting a policy.
- Executing a player.
- Investigating a player.
- Calling a special election.
- Resetting or abandoning a game.
- Resuming a saved game if private information might become visible.

For operations involving secret information, include a handoff confirmation that identifies the intended recipient without displaying the secret itself.

For other actions, use a concise confirmation dialog that explains the operation and its consequences.

Confirmation behavior:
- Use explicit Confirm and Cancel buttons.
- Do not commit the operation before confirmation.
- Cancel must not change the game state.
- Prevent double taps from applying the same operation twice.
- Prevent repeated submission while an operation is being committed.
- Disable invalid actions.
- Provide a safe way to recover from accidental navigation.
- Use an Undo mechanism for reversible mistakes when it does not compromise hidden information or contradict official rules.
- Require stronger confirmation for irreversible actions such as player execution, abandoning a game, or resetting all game progress.

The app must not falsely claim that it can verify who physically holds the phone. It can only request the operator's confirmation.

## 12. Official Game Rules and State Machine

Implement the complete standard Secret Hitler rules for 5–10 players.

Use a deterministic game-state machine with explicit phases. For example:

- Main menu.
- Game setup.
- Private role reveal.
- Public board.
- Government nomination.
- Physical voting result entry.
- Policy draw and legislative phase.
- Executive action, when applicable.
- Next president selection.
- Game over.

The exact phase sequence must follow the official rules.

Implement and test:
- Correct role distribution for each player count.
- Player nomination and term limits.
- Physical voting result entry.
- Election tracker progression and reset.
- Automatic top-deck policy enactment when the official election tracker reaches its threshold.
- Policy deck exhaustion and reshuffling.
- Executive actions.
- Player elimination and eligibility changes.
- Special-election handling.
- Fascist victory through the relevant policy or Hitler election conditions.
- Liberal victory through the correct policy count or Hitler execution.
- Restrictions on electing Hitler as chancellor after the applicable fascist policy has been enacted.
- All applicable exceptions and edge cases.

The application must not invent alternate victory conditions or silently skip mandatory rules.

Use a single source of truth for game state and validate every transition.

If an action is invalid, explain why and leave the game state unchanged.

## 13. How to Play

Create a dedicated portrait-oriented instructional section.

Include:
- Objective of the game.
- Player roles and teams.
- Role distribution by player count.
- Setup instructions.
- Turn sequence.
- Presidential nomination.
- Physical voting procedure.
- Legislative session.
- Executive actions.
- Election tracker.
- Victory conditions.
- Rules for Hitler's identity and election eligibility.
- A short glossary of important game terms.

Use concise explanations, diagrams, and illustrations where appropriate.

Clearly distinguish the app's functions from the physical game's rules. The app records public outcomes; it does not replace face-to-face discussion or physical voting.

Make the content accessible from the main menu and, where useful, through contextual help icons on the game screen.

Use verified official rule material as the source of truth. Do not copy unlicensed artwork or reproduce extensive copyrighted rulebook text verbatim.

## 14. Settings

Implement a functional settings screen with:
- Language selection, including Persian and English.
- Sound effects toggle.
- Haptic feedback toggle where supported.
- Animation toggle.
- Screen-orientation behavior.
- Privacy mode for sensitive screens.
- Confirmation-dialog preferences for reversible actions, without allowing important actions to bypass required confirmations.
- Theme options.
- Local save and resume behavior.
- Clear saved game or start a new game, with appropriate confirmation.
- Optional board scaling for smaller phones.

Store settings locally and apply them consistently.

If Persian is supported, implement right-to-left layouts correctly rather than merely translating the text.

## 15. Persistence and Recovery

Save the game state locally after every confirmed state transition.

Requirements:
- Resume a game after the app closes or the phone restarts.
- Persist policy counts, election tracker, player order, current government, eliminated players, and the current game phase.
- Protect hidden roles and private card information from accidental display when reopening the app.
- On resume, show a privacy-safe interstitial before returning to a sensitive game phase.
- Avoid storing unnecessary sensitive information.
- Handle interrupted operations safely.
- Ensure a failed save cannot leave the app showing a state that differs from the persisted state without clearly handling the failure.

Store a versioned game-state schema to support future migrations.

Provide a way to abandon or reset a game with explicit confirmation.

## 16. Accessibility and Usability

Implement:
- Readable text at common phone sizes.
- Touch targets large enough for reliable interaction.
- High-contrast mode.
- Icons paired with labels where needed.
- Accessibility labels for controls.
- Clear error messages.
- No reliance on color alone.
- Consistent back navigation.
- No accidental data loss from Android Back navigation.
- Loading and error states where appropriate.
- Smooth orientation changes.
- Layouts that do not require precision tapping.

Avoid overcrowding the landscape game board. Use a compact player strip, collapsible panels, or contextual dialogs when necessary.

## 17. Testing Requirements

Add automated tests covering at least:

1. Every supported player count and its exact role distribution.
2. Random role assignment and uniqueness of player roles.
3. Private role reveal and concealment.
4. Valid and invalid chancellor nominations.
5. Term-limit and special-election rules.
6. Approved and rejected elections.
7. Election tracker progression and automatic policy enactment.
8. Policy drawing, discarding, enactment, and reshuffling.
9. Executive actions and player elimination.
10. All victory conditions.
11. Persistence and recovery after app restart.
12. Confirmation cancellation leaving state unchanged.
13. Prevention of duplicate state-changing actions.
14. Orientation changes preserving game state.
15. Regression tests for edge cases in the official rules.

Include a small set of end-to-end tests for the primary game flow.

## 18. Deliverables

Produce a complete project containing:
- All application source code.
- A clear project structure.
- Reusable UI components.
- The complete game-state machine and rules engine.
- Local persistence.
- Original or properly licensed visual assets.
- Unit and integration tests.
- Build and run instructions.
- A README describing architecture, limitations, and design decisions.
- Instructions for generating an installable Android APK.
- A list of implemented features and any remaining limitations.

Do not stop after producing mockups, wireframes, or a design document. Implement the working application.

## 19. Acceptance Criteria

The project is complete only when:
- It builds successfully.
- It launches without internet access.
- The main menu works in portrait orientation.
- The game board works in landscape orientation where supported.
- The correct board variant and role distribution appear for every supported player count.
- Secret information is never displayed on the public board.
- Physical voting is recorded only as an announced aggregate result.
- Policy cards are hidden until explicitly revealed and confirmed.
- Every important state-changing action has the required confirmation.
- Cancel never commits an operation.
- Official rules are enforced by the rules engine.
- A game can be saved, closed, and resumed.
- All core tests pass.
- The UI is usable on typical Android phone screens.

Begin by inspecting the repository and selecting the appropriate implementation strategy. Then implement the application incrementally, run the tests, fix failures, and verify the complete game flow.

At the end, report the actual files created or modified, the build and test results, and the exact command required to build the APK. Never claim that a build or test succeeded unless you actually ran it.