import assert from "node:assert/strict";
import test from "node:test";

import {
  characterCardV2ToHowling,
  characterToHWCCCard,
  howlingCharacterToV2,
  isHWCC,
  HOWLING_EXTENSION_KEY,
} from "../lib/characters/character-card-v2.ts";

const plainCard = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "Plain Pam",
    description: "An ordinary companion.",
    personality: "Friendly.",
    scenario: "A quiet room.",
    first_mes: "Hi there.",
    mes_example: "",
    creator_notes: "",
    system_prompt: "",
    post_history_instructions: "",
    alternate_greetings: [],
    tags: ["friend"],
    creator: "Internet",
    character_version: "2.0",
    extensions: { some_other_ext: { hello: true } },
  },
};

function hwccCard(extension) {
  return {
    ...plainCard,
    data: {
      ...plainCard.data,
      extensions: {
        ...plainCard.data.extensions,
        howling_whispers: { hwcc_version: "1", ...extension },
      },
    },
  };
}

test("plain CCV2 (no hwcc_version) is not detected as HWCC and imports plainly", () => {
  assert.equal(isHWCC(plainCard), false);
  const character = characterCardV2ToHowling(plainCard, "pam");
  assert.equal(character.hwccVersion, undefined);
  assert.equal(character.ageBehavior, undefined);
});

test("HWCC v1 card is detected and imports the extension authoritatively", () => {
  const card = hwccCard({
    ageBehavior: { actualAge: "12", maturityLevel: "Acts like a pre-teen" },
    personality: { coreTraits: "Curious, loyal", fears: "Thunder" },
    knowledge: { knowsWell: "School subjects", doesNotKnow: "Tax law" },
  });
  assert.equal(isHWCC(card), true);
  const character = characterCardV2ToHowling(card, "riley");
  assert.equal(character.hwccVersion, "1");
  assert.equal(character.ageBehavior?.actualAge, "12");
  assert.equal(character.personality?.coreTraits, "Curious, loyal");
  assert.equal(character.knowledge?.doesNotKnow, "Tax law");
});

test("Howling character round-trips through HWCC v1 without losing structured data", () => {
  const character = {
    id: "riley",
    name: "Riley",
    role: "Neighbor kid",
    status: "Ready to meet",
    image: "hw-portrait://riley",
    sceneImage: "",
    scene: "The playground",
    weather: "Sunny",
    bond: 12,
    memories: [],
    reply: "Wanna play?",
    profile: "Riley is a bright 12-year-old.",
    accent: "#abc",
    ageCategory: "minor",
    isMinor: true,
    ageBehavior: { actualAge: "12", speechAge: "Speaks like a 12-year-old" },
    personality: { coreTraits: "Curious", fears: "Spiders" },
    voice: { speechStyle: "Quick and excitable" },
    knowledge: { knowsWell: "Video games", doesNotKnow: "Mortgages" },
    interests: { interests: "Skateboarding" },
    greetings: { exampleMessages: "Hey!" },
    contextNotes: "Keep age-consistent.",
  };
  const card = characterToHWCCCard(character);
  assert.equal(card.spec, "chara_card_v2");
  assert.equal(card.spec_version, "2.0");
  assert.equal(isHWCC(card), true);

  const ext = card.data.extensions[HOWLING_EXTENSION_KEY];
  assert.equal(ext.hwcc_version, "1");
  assert.equal(ext.ageBehavior.actualAge, "12");
  assert.equal(ext.knowledge.knowsWell, "Video games");
  assert.equal(ext.interests.interests, "Skateboarding");
  assert.equal(ext.greetings.exampleMessages, "Hey!");

  // standard CCV2 compatibility projection is present, rooted in CCV2
  assert.match(card.data.description, /bright 12-year-old/);
  assert.equal(card.data.name, "Riley");

  // re-import keeps HWCC authoritative and structured data intact
  const reimported = characterCardV2ToHowling(card, "riley-2");
  assert.equal(reimported.hwccVersion, "1");
  assert.equal(reimported.ageBehavior?.actualAge, "12");
  assert.equal(reimported.knowledge?.knowsWell, "Video games");
  assert.equal(reimported.interests?.interests, "Skateboarding");
  assert.equal(reimported.contextNotes, "Keep age-consistent.");
});

test("HWCC export preserves unknown CCV2 data fields and other extension namespaces", () => {
  const character = {
    id: "x",
    name: "X",
    role: "",
    status: "",
    image: "",
    sceneImage: "",
    scene: "",
    weather: "",
    bond: 12,
    memories: [],
    reply: "",
    profile: "",
    accent: "",
    cardV2: {
      description: "",
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
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
          name: "X",
          custom_field: "keep this",
          description: "",
          personality: "",
          scenario: "",
          first_mes: "",
          mes_example: "",
          creator_notes: "",
          system_prompt: "",
          post_history_instructions: "",
          alternate_greetings: [],
          tags: [],
          creator: "",
          character_version: "1.0",
          extensions: { other_namespace: { secret: 42 } },
        },
      },
    },
  };
  const card = characterToHWCCCard(character);
  assert.equal(card.data.custom_field, "keep this");
  assert.deepEqual(card.data.extensions.other_namespace, { secret: 42 });
  assert.equal(isHWCC(card), true);
});

test("HWCC export never flattens the character into a plain CCV2 projection", () => {
  const character = {
    id: "riley",
    name: "Riley",
    role: "",
    status: "",
    image: "",
    sceneImage: "",
    scene: "",
    weather: "",
    bond: 12,
    memories: [],
    reply: "",
    profile: "",
    accent: "",
    ageBehavior: { actualAge: "12" },
  };
  const hwccCardResult = characterToHWCCCard(character);
  const plainCardResult = howlingCharacterToV2(character);
  // The HWCC card carries the extension; the plain projection does not.
  assert.equal(isHWCC(hwccCardResult), true);
  assert.equal(isHWCC(plainCardResult), false);
  assert.ok(hwccCardResult.data.extensions[HOWLING_EXTENSION_KEY].ageBehavior.actualAge, "12");
});
