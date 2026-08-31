import { readFileSync, writeFileSync } from "node:fs";

const path = "app/dreambound-app.tsx";
let source = readFileSync(path, "utf8");
let changed = false;

// Keep the existing nextSpeaker scope repair idempotent. This script runs before
// dev/build/start/test, so it must be safe against both patched and unpatched trees.
const declarationBefore = `    let respondAs: string | undefined;\n    if (livingCastConfig.enabled && mode === "Speak" && activeSession) {`;
const legacyDeclarationAfter = `    let respondAs: string | undefined;\n    let nextSpeaker: LivingCastEntry | null = null;\n    if (livingCastConfig.enabled && mode === "Speak" && activeSession) {`;
const declarationAfter = `    let respondAs: string | undefined;\n    let nextSpeaker: LivingCastEntry | null = null;\n    if (livingCastConfig.enabled && activeSession) {`;
const assignmentBefore = `      const nextSpeaker = selector.next(conversation);`;
const assignmentAfter = `      nextSpeaker = selector.next(conversation);`;

const nextSpeakerFixed = source.split(declarationAfter).length - 1;
if (nextSpeakerFixed === 1) {
  console.log("nextSpeaker scope already fixed.");
} else {
  const legacyFixedCount = source.split(legacyDeclarationAfter).length - 1;
  if (legacyFixedCount === 1) {
    source = source.replace(legacyDeclarationAfter, declarationAfter);
    changed = true;
    console.log("Updated Living Cast focus to run for normal composer modes.");
  } else {
    const declarationCount = source.split(declarationBefore).length - 1;
    const assignmentCount = source.split(assignmentBefore).length - 1;
    if (declarationCount !== 1 || assignmentCount !== 1) {
      throw new Error(
        `Refusing unsafe nextSpeaker patch: declarations=${declarationCount}, assignments=${assignmentCount}, fixed=${nextSpeakerFixed}`,
      );
    }
    source = source.replace(declarationBefore, declarationAfter);
    source = source.replace(assignmentBefore, assignmentAfter);
    changed = true;
    console.log("Patched nextSpeaker scope site.");
  }
}

// Manual player input is authoritative. The old Action-mode code stripped a
// leading/trailing asterisk and then wrapped the whole message again. That could
// turn a correct mixed message such as `*i turn around* \"hello\"` into malformed
// markup, and Action mode also stayed selected so later normal messages kept
// being wrapped in asterisks.
const manualFormatBefore = `    const playerMessage: Message = {\n      id: Date.now(),\n      sender: \"player\",\n      text:\n        mode === \"Action\"\n          ? \`*\${text.replace(/^\\*|\\*$/g, \"\")}*\`\n          : mode === \"Narration\"\n            ? \`[\${text}]\`\n            : text,\n    };`;

const manualFormatAfter = `    // Manual player text is authoritative. If the user supplied roleplay\n    // markup, preserve it exactly instead of reinterpreting it through the\n    // Action/Narration wrapper. Plain text may still use the selected one-shot\n    // mode, which resets to Dialogue after the message is submitted.\n    const hasExplicitRoleplayMarkup = /(?:\\*[^*\\n]+\\*|[\"“][^\"”\\n]+[\"”]|\\[[^\\]\\n]+\\])/.test(text);\n    const submittedText = hasExplicitRoleplayMarkup\n      ? text\n      : mode === \"Action\"\n        ? \`*\${text}*\`\n        : mode === \"Narration\"\n          ? \`[\${text}]\`\n          : text;\n\n    const playerMessage: Message = {\n      id: Date.now(),\n      sender: \"player\",\n      text: submittedText,\n    };`;

const manualFormatFixed = source.includes("const submittedText = hasExplicitRoleplayMarkup");
if (manualFormatFixed) {
  console.log("Manual player formatting already fixed.");
} else {
  const count = source.split(manualFormatBefore).length - 1;
  if (count !== 1) {
    throw new Error(`Refusing unsafe manual player formatting patch: matches=${count}`);
  }
  source = source.replace(manualFormatBefore, manualFormatAfter);
  changed = true;
  console.log("Patched manual player formatting.");
}

const resetBefore = `    setDraft(\"\");\n    setRelationshipDelta(null);`;
const resetAfter = `    setDraft(\"\");\n    setMode(\"Dialogue\");\n    setRelationshipDelta(null);`;

if (source.includes(resetAfter)) {
  console.log("Composer mode reset already fixed.");
} else {
  const count = source.split(resetBefore).length - 1;
  if (count !== 1) {
    throw new Error(`Refusing unsafe composer mode reset patch: matches=${count}`);
  }
  source = source.replace(resetBefore, resetAfter);
  changed = true;
  console.log("Patched composer mode reset.");
}

if (changed) {
  writeFileSync(path, source, "utf8");
  console.log("Source compatibility patches applied.");
} else {
  console.log("Source compatibility patches already applied.");
}
