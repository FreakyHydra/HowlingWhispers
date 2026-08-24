import { readFileSync, writeFileSync } from "node:fs";

const path = "app/dreambound-app.tsx";
let source = readFileSync(path, "utf8");

const declarationBefore = `    let respondAs: string | undefined;\n    if (livingCastConfig.enabled && mode === "Speak" && activeSession) {`;
const declarationAfter = `    let respondAs: string | undefined;\n    let nextSpeaker: LivingCastEntry | null = null;\n    if (livingCastConfig.enabled && mode === "Speak" && activeSession) {`;
const assignmentBefore = `      const nextSpeaker = selector.next(conversation);`;
const assignmentAfter = `      nextSpeaker = selector.next(conversation);`;

const alreadyFixed = source.split(declarationAfter).length - 1;
if (alreadyFixed === 2) {
  console.log("nextSpeaker scope already fixed.");
  process.exit(0);
}

const declarationCount = source.split(declarationBefore).length - 1;
const assignmentCount = source.split(assignmentBefore).length - 1;
if (declarationCount !== 2 || assignmentCount !== 2) {
  throw new Error(
    `Refusing unsafe nextSpeaker patch: declarations=${declarationCount}, assignments=${assignmentCount}, fixed=${alreadyFixed}`,
  );
}

source = source.replaceAll(declarationBefore, declarationAfter);
source = source.replaceAll(assignmentBefore, assignmentAfter);
writeFileSync(path, source, "utf8");
console.log("Patched both nextSpeaker scope sites.");
