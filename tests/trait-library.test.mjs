import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  TRAIT_LIBRARY,
  getTraitById,
  searchTraits,
} from "../lib/characters/trait-library.ts";
import { EMPTY_CHARACTER_TRAITS, cloneCharacterTraits, isTraitAssigned, removeTrait, addTrait, normalizeCustomTraits, sanitizeTraits } from "../lib/characters/traits.ts";

describe("trait-library", () => {
  test("TRAIT_LIBRARY has exactly 111 entries", () => {
    assert.strictEqual(TRAIT_LIBRARY.length, 111);
  });

  test("each trait has id, name, and description", () => {
    for (const trait of TRAIT_LIBRARY) {
      assert.ok(trait.id.length > 0);
      assert.ok(trait.name.length > 0);
      assert.ok(trait.description.length > 0);
    }
  });

  test("trait ids are unique", () => {
    const ids = TRAIT_LIBRARY.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  test("getTraitById returns matching trait", () => {
    const brave = getTraitById("brave");
    assert.ok(brave);
    assert.strictEqual(brave.name, "Brave");
  });

  test("getTraitById returns undefined for unknown id", () => {
    assert.strictEqual(getTraitById("does-not-exist"), undefined);
  });

  test("searchTraits matches name and description", () => {
    const results = searchTraits("loyal");
    assert.ok(results.length >= 1);
    assert.ok(results.some((t) => t.id === "loyal"));
  });

  test("searchTraits returns empty array for empty query", () => {
    assert.deepStrictEqual(searchTraits(""), []);
    assert.deepStrictEqual(searchTraits("   "), []);
  });

  test("searchTraits is case-insensitive", () => {
    const results = searchTraits("LOYAL");
    assert.ok(results.some((t) => t.id === "loyal"));
  });
});

describe("traits", () => {
  test("EMPTY_CHARACTER_TRAITS has empty arrays", () => {
    assert.deepStrictEqual(EMPTY_CHARACTER_TRAITS.primary, []);
    assert.deepStrictEqual(EMPTY_CHARACTER_TRAITS.secondary, []);
    assert.deepStrictEqual(EMPTY_CHARACTER_TRAITS.situational, []);
    assert.deepStrictEqual(EMPTY_CHARACTER_TRAITS.custom, []);
  });

  test("cloneCharacterTraits returns deep copy", () => {
    const original = {
      primary: ["brave"],
      secondary: [],
      situational: ["curious"],
      custom: [{ id: "c1", name: "Test", description: "Desc" }],
    };
    const cloned = cloneCharacterTraits(original);
    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(cloned.primary, original.primary);
    assert.notStrictEqual(cloned.custom?.[0], original.custom?.[0]);
    cloned.primary.push("new");
    assert.deepStrictEqual(original.primary, ["brave"]);
  });

  test("isTraitAssigned detects across tiers", () => {
    const traits = { primary: ["brave"], secondary: [], situational: ["curious"], custom: [] };
    assert.strictEqual(isTraitAssigned(traits, "brave"), true);
    assert.strictEqual(isTraitAssigned(traits, "curious"), true);
    assert.strictEqual(isTraitAssigned(traits, "loyal"), false);
  });

  test("addTrait moves trait if already assigned", () => {
    const traits = { primary: ["brave"], secondary: [], situational: [], custom: [] };
    const updated = addTrait(traits, "brave", "secondary");
    assert.deepStrictEqual(updated.primary, []);
    assert.deepStrictEqual(updated.secondary, ["brave"]);
  });

  test("removeTrait removes from all tiers and custom", () => {
    const traits = {
      primary: ["brave"],
      secondary: ["cautious"],
      situational: [],
      custom: [{ id: "c1", name: "Test", description: "" }],
    };
    const updated = removeTrait(traits, "brave");
    assert.deepStrictEqual(updated.primary, []);
    assert.deepStrictEqual(updated.secondary, ["cautious"]);
    const updatedCustom = removeTrait(updated, "c1");
    assert.deepStrictEqual(updatedCustom.custom, []);
  });
});

describe("sanitizeTraits", () => {
  test("returns empty traits for undefined input", () => {
    const result = sanitizeTraits(undefined);
    assert.deepStrictEqual(result, EMPTY_CHARACTER_TRAITS);
  });

  test("clamps array lengths", () => {
    const custom = Array.from({ length: 15 }, (_, i) => ({ id: `c${i}`, name: "X", description: "Y" }));
    const input = {
      primary: Array(25).fill("brave"),
      secondary: Array(25).fill("cautious"),
      situational: Array(25).fill("curious"),
      custom,
    };
    const result = sanitizeTraits(input);
    assert.strictEqual(result.primary.length, 20);
    assert.strictEqual(result.secondary.length, 20);
    assert.strictEqual(result.situational.length, 20);
    assert.strictEqual(result.custom?.length, 10);
  });

  test("strips invalid custom traits", () => {
    const input = {
      primary: [],
      secondary: [],
      situational: [],
      custom: [
        { id: "", name: "No ID", description: "" },
        { id: "c1", name: "", description: "No name" },
        { id: "c2", name: "Valid", description: "OK" },
      ],
    };
    const result = sanitizeTraits(input);
    assert.strictEqual(result.custom?.length, 1);
    assert.strictEqual(result.custom?.[0].id, "c2");
  });
});

describe("normalizeCustomTraits", () => {
  test("deduplicates by id and trims strings", () => {
    const input = {
      primary: [],
      secondary: [],
      situational: [],
      custom: [
        { id: "c1", name: "  Name  ", description: "  Desc  " },
        { id: "c1", name: "Duplicate", description: "Ignore" },
        { id: "c2", name: "Second", description: "" },
      ],
    };
    const result = normalizeCustomTraits(input);
    assert.strictEqual(result.custom?.length, 2);
    assert.strictEqual(result.custom?.[0].id, "c1");
    assert.strictEqual(result.custom?.[0].name, "Name");
    assert.strictEqual(result.custom?.[0].description, "Desc");
  });
});
