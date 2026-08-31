# Relationship Engine V2 and Free Roam

Status: Active

Checkpoint 1 completed on 2026-08-31: two-way scoring, Free Roam session identity, automatic Smart Focus, empty-cast preservation, Free Roam cast discovery, per-speaker relationship scoring, backup persistence, and regression coverage.

Owner zones:

- Relationship logic: `lib/relationships/`
- Free Roam definition: `lib/locations/free-roam.ts`
- Living Cast focus: `lib/living-cast/`
- Chat controls: `features/chat/chat-workspace.tsx`
- Runtime wiring only: `app/dreambound-app.tsx`

## Goal

Make relationship changes reflect the actual exchange between the player and a character, while providing a reliable player-first Free Roam mode with no mandatory starting character.

## Locked decisions

1. Keep the current chat workspace design. Improve labels and behavior without redesigning the entire screen.
2. Relationship state stays keyed by `(characterId, personaId)`.
3. The score range remains `-1000..10000` with neutral at `0`.
4. Each character reply owns one stable relationship event. Rerolls replace it. Deletes and rewinds reverse it.
5. Relationship V2 evaluates the player turn and character reply separately, then combines their deltas.
6. Fear, vulnerability, leaving a physical place, and setting a personal boundary are not hostile by themselves.
7. A boundary violation, direct threat, betrayal, abandonment, or explicit rejection can reduce the score.
8. Free Roam starts with the active persona, an empty cast, and no mandatory primary Contact.
9. When Living Cast Smart Focus is enabled, a character named in the newest player turn gets focus for that turn. Other cast members stay present and quiet.
10. Free Roam uses the existing Location, session, generation, context, and backup systems. It must not create a second chat runtime.

## Acceptance checks

- A frightened player asking not to be hurt receives no negative player delta.
- A respectful personal boundary receives no negative player delta.
- Deliberately violating another character's boundary produces a negative player delta.
- A warm character response can add a small positive character delta.
- Relationship events store the player and character components without exposing them in visible roleplay text.
- Starting Free Roam creates a resumable session with `freeRoam: true` and an explicit empty cast.
- An empty Free Roam cast is not replaced with a fake `Free Roam` character.
- Smart Focus works during ordinary Dialogue, Action, and Narration submissions. It does not depend on a hidden composer mode.
- Free Roam and its cast survive private-data backup and restore.
- All tests, lint, and the production build pass.

## Delivery order

1. Two-way Relationship V2 evaluator and regression tests.
2. Durable Free Roam session identity and automatic Smart Focus.
3. Free Roam cast discovery and per-speaker relationship scoring.
4. Relationship history and tuning tools only after runtime behavior is verified.

## Out of scope for this project

- Full Chat Workspace redesign
- Character Card V2 rewrite
- Persona system rewrite
- A second roleplay backend
- Relationship history UI before scoring behavior is stable
