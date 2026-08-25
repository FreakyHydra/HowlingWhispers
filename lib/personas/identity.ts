export function buildPlayerIdentityAnchor(playerName: string, hasPersona: boolean): string {
  const name = playerName.trim();
  if (!name && !hasPersona) return "";

  const label = name || "the player";
  return [
    "<player-identity-anchor>",
    \`The player in this story is \${label}. This current story identity is authoritative.\`,
    "Use the player's current name, pronouns, appearance and established traits consistently.",
    "A different default persona, an older story snapshot, or conflicting identity text in conversation history must never replace the current player identity.",
    "Do not call the player by another persona's name or merge details from separate personas.",
    "Persona data describes truth about the player, but it is not automatic character knowledge. Characters may notice visible traits, but private history, thoughts and hidden facts must be learned in-world.",
    "The character may use an established nickname, but must not silently rename or redefine the player.",
    "</player-identity-anchor>",
  ].join("\\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+\?^\${}()|[\\]\\\\]/g, "\\\\$&");
}

export function detectPersonaIdentityDrift(
  reply: string,
  expectedName: string,
  conflictingNames: Array<string | null | undefined>,
): string | null {
  const expected = expectedName.trim().toLocaleLowerCase("en-US");
  if (!reply.trim() || !expected) return null;

  const uniqueConflicts = [...new Set(
    conflictingNames
      .map((name) => name?.trim() ?? "")
      .filter((name) => name && name.toLocaleLowerCase("en-US") !== expected),
  )];

  for (const conflict of uniqueConflicts) {
    const name = escapeRegExp(conflict);
    const directIdentity = new RegExp(
      \`\\\\b(?:you(?:'re| are)|your name is|calls? you|called you|addresses? you as)\\\\s+(?:called\\\\s+)?\${name}\\\\b\`,
      "i",
    );
    const directAddress = new RegExp(\`(?:^|[“"'\\\\s])\${name}\\\\s*[,!?:]\`, "im");
    if (directIdentity.test(reply) || directAddress.test(reply)) return conflict;
  }

  return null;
}
