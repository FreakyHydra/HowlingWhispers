import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { howlingCharacterToV2, characterCardV2ToHowling } from "../lib/characters/character-card-v2.ts";

describe("character-card-v2 traits round-trip", () => {
  test("howlingCharacterToV2 writes traits into extensions", () => {
    const v2 = howlingCharacterToV2({
      name: "Test",
      role: "Tester",
      profile: "Profile",
      reply: "Hello",
      credit: "Author",
      cardV2: {
        description: "Desc",
        personality: "Personality",
        scenario: "Scenario",
        mesExample: "Example",
        alternateGreetings: ["Alt"],
        creatorNotes: "Notes",
        characterVersion: "1.0",
        tags: ["tag1"],
        importedSystemPrompt: "",
        importedPostHistoryInstructions: "",
        characterBook: undefined,
        original: {
          spec: "v2",
          spec_version: "2.0",
          data: {
            name: "Test",
            description: "Desc",
            personality: "Personality",
            scenario: "Scenario",
            first_mes: "Hello",
            mes_example: "Example",
            alternate_greetings: ["Alt"],
            creator_notes: "Notes",
            character_version: "1.0",
            tags: ["tag1"],
            system_prompt: "",
            post_history_instructions: "",
            character_book: undefined,
            extensions: {},
          },
        },
      },
      traits: {
        primary: ["brave"],
        secondary: [],
        situational: [],
        custom: [{ id: "c1", name: "Custom", description: "A custom trait." }],
      },
    });
    assert.ok(v2.data.extensions);
    assert.ok(v2.data.extensions.howling_traits);
    assert.deepStrictEqual(v2.data.extensions.howling_traits.primary, ["brave"]);
    assert.strictEqual(v2.data.extensions.howling_traits.custom?.[0].name, "Custom");
  });

  test("characterCardV2ToHowling reads traits from extensions", () => {
    const card = {
      spec: "v2",
      spec_version: "2.0",
      data: {
        name: "Test",
        description: "Desc",
        personality: "",
        scenario: "",
        first_mes: "Hello",
        mes_example: "",
        alternate_greetings: [],
        creator_notes: "",
        character_version: "1.0",
        tags: [],
        system_prompt: "",
        post_history_instructions: "",
        character_book: undefined,
        extensions: {
          howling_traits: {
            primary: ["brave"],
            secondary: ["loyal"],
            situational: [],
            custom: [{ id: "c1", name: "Custom", description: "Desc" }],
          },
        },
      },
    };
    const character = characterCardV2ToHowling(card);
    assert.ok(character.traits);
    assert.deepStrictEqual(character.traits?.primary, ["brave"]);
    assert.deepStrictEqual(character.traits?.secondary, ["loyal"]);
    assert.strictEqual(character.traits?.custom?.[0].name, "Custom");
  });

  test("round-trip preserves traits", () => {
    const original = {
      name: "Round",
      role: "Tester",
      profile: "Profile",
      reply: "Hello",
      traits: {
        primary: ["brave"],
        secondary: [],
        situational: ["cautious"],
        custom: [{ id: "c1", name: "Custom", description: "Desc" }],
      },
    };
    const v2 = howlingCharacterToV2({
      ...original,
      cardV2: {
        description: "Desc",
        personality: "",
        scenario: "",
        mesExample: "",
        alternateGreetings: [],
        creatorNotes: "",
        characterVersion: "1.0",
        tags: [],
        importedSystemPrompt: "",
        importedPostHistoryInstructions: "",
        original: {
          spec: "v2",
          spec_version: "2.0",
          data: {
            name: "Round",
            description: "Desc",
            personality: "",
            scenario: "",
            first_mes: "Hello",
            mes_example: "",
            alternate_greetings: [],
            creator_notes: "",
            character_version: "1.0",
            tags: [],
            system_prompt: "",
            post_history_instructions: "",
            character_book: undefined,
            extensions: {},
          },
        },
      },
    });
    const back = characterCardV2ToHowling(v2);
    assert.deepStrictEqual(back.traits?.primary, ["brave"]);
    assert.deepStrictEqual(back.traits?.situational, ["cautious"]);
    assert.strictEqual(back.traits?.custom?.[0].name, "Custom");
  });
});
