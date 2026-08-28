import { readFileSync, writeFileSync } from "node:fs";

function patchFile(path, patcher) {
  const before = readFileSync(path, "utf8");
  const after = patcher(before);
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    console.log(`[free-rp] patched ${path}`);
  } else {
    console.log(`[free-rp] ${path} already current`);
  }
}

patchFile("app/features/roleplay/roleplay-area.tsx", (source) => {
  let next = source;

  if (!next.includes("onStartOpenWorld: () => void;")) {
    const marker = "  setView: (view: string) => void;\n";
    if (!next.includes(marker)) throw new Error("RoleplayAreaProps setView marker not found");
    next = next.replace(marker, marker + "  onStartOpenWorld: () => void;\n");
  }

  if (!next.includes("Start Free RP")) {
    const marker = `              <button className="home-changelog-link" onClick={() => props.setView("changelog")}>\n                See what&apos;s new <span aria-hidden="true">→</span>\n              </button>`;
    if (!next.includes(marker)) throw new Error("Roleplay home changelog button marker not found");
    const replacement = `${marker}\n              <button className="home-changelog-link" onClick={props.onStartOpenWorld}>\n                Start Free RP <span aria-hidden="true">→</span>\n              </button>\n              <p>\n                Begin with only your active persona. No predefined Contact, no forced scenario. Characters can enter naturally through Living Cast.\n              </p>`;
    next = next.replace(marker, replacement);
  }

  return next;
});

patchFile("app/dreambound-app.tsx", (source) => {
  if (source.includes("onStartOpenWorld={startOpenWorld}")) return source;

  const marker = "          requestPersonaStart={requestPersonaStart}\n";
  if (!source.includes(marker)) throw new Error("RoleplayArea requestPersonaStart marker not found");
  return source.replace(marker, "          onStartOpenWorld={startOpenWorld}\n" + marker);
});
