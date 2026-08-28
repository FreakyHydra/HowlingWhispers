import { readFileSync, writeFileSync } from "node:fs";

function patchFile(path, patcher) {
  const before = readFileSync(path, "utf8");
  const after = patcher(before);
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    console.log(`[open-world] patched ${path}`);
  } else {
    console.log(`[open-world] ${path} already current`);
  }
}

patchFile("app/dreambound-app.tsx", (source) => {
  let next = source;

  if (!next.includes("function startOpenWorld()")) {
    const marker = "  function importContextFile(file: File, kind: \"memory\" | \"author-note\" | \"lorebook\") {";
    if (!next.includes(marker)) {
      throw new Error("Could not find the context import marker in dreambound-app.tsx");
    }

    const launcher = `  function startOpenWorld() {\n    const now = Date.now();\n    const nowIso = new Date(now).toISOString();\n    const openWorldLocation = sanitizeLocation({\n      id: \"open-world\",\n      name: \"Open World\",\n      type: \"Open world\",\n      shortDescription: \"No predefined cast. Begin with only your persona and let the world develop around you.\",\n      description: \"An open-ended roleplay starting point. The player enters without a predefined companion, primary Contact, or mandatory story. Characters may be encountered, mentioned, invited, or emerge naturally as the world develops.\",\n      atmosphere: [\"open-ended\", \"player-led\", \"persistent social world\"],\n      occupants: [],\n      tags: [\"open-world\", \"player-start\"],\n      source: \"custom\",\n      createdAt: nowIso,\n      updatedAt: nowIso,\n    });\n\n    if (!openWorldLocation) {\n      setChatError(\"Open World could not be created.\");\n      return;\n    }\n\n    const scene = createLocationScene(openWorldLocation);\n    const { session, initialMessages } = buildSessionInitialState(\n      null,\n      scene,\n      openWorldLocation,\n      { persona: activePersona ?? null },\n    );\n\n    session.livingCast = [];\n    session.autonomousCast = [];\n\n    setLocations((current) => {\n      const existing = current.some((location) => location.id === openWorldLocation.id);\n      return existing\n        ? current.map((location) => location.id === openWorldLocation.id ? openWorldLocation : location)\n        : [openWorldLocation, ...current];\n    });\n    setMessages((current) => ({ ...current, [session.messageKey]: initialMessages }));\n    setSessions((current) => [session, ...current]);\n    setCurrentSessionId(session.id);\n    setSelectedId(locationSelectionKey(openWorldLocation.id));\n\n    const nextLivingCastConfig: LivingCastConfig = {\n      ...livingCastConfig,\n      enabled: true,\n      participationMode: \"smart\",\n    };\n    setLivingCastConfig(nextLivingCastConfig);\n    writeLivingCastConfig(nextLivingCastConfig);\n\n    setAutopilotError(\"\");\n    setChatError(\"\");\n    setView(\"chat\");\n  }\n\n`;

    next = next.replace(marker, launcher + marker);
  }

  if (!next.includes(">Start Open World<")) {
    const menuMarker = `                <button onClick={() => { setAccountMenuOpen(false); setView(\"changelog\"); }} role=\"menuitem\">\n                  What&apos;s new\n                </button>\n                <div className=\"account-menu-divider\" />`;
    if (!next.includes(menuMarker)) {
      throw new Error("Could not find the player menu marker in dreambound-app.tsx");
    }

    const menuReplacement = `                <button onClick={() => { setAccountMenuOpen(false); setView(\"changelog\"); }} role=\"menuitem\">\n                  What&apos;s new\n                </button>\n                <button onClick={() => { setAccountMenuOpen(false); startOpenWorld(); }} role=\"menuitem\">\n                  Start Open World\n                </button>\n                <div className=\"account-menu-divider\" />`;
    next = next.replace(menuMarker, menuReplacement);
  }

  return next;
});

patchFile("features/changelog/changelog-view.tsx", (source) => {
  if (source.includes("Version 0.11.1.0 · Open World Begins")) return source;

  const marker = `           <div className=\"changelog-list\">\n             <article className=\"changelog-entry milestone latest\">`;
  if (!source.includes(marker)) {
    throw new Error("Could not find the latest changelog marker");
  }

  const entries = `           <div className=\"changelog-list\">\n             <article className=\"changelog-entry milestone latest\">\n               <span className=\"changelog-mark\">🌍</span>\n               <div>\n                 <span className=\"changelog-version\">Version 0.11.1.0 · Open World Begins</span>\n                 <div className=\"milestone-badge\">✨ MINOR FEATURE RELEASE</div>\n                 <h2>Open World Begins</h2>\n                 <blockquote className=\"milestone-quote\">Start with nobody. Meet whoever the world puts in your path.</blockquote>\n                 <p>A new player-level start mode removes the mandatory primary Contact and lets a roleplay begin with only the active persona.</p>\n                 <h3>✨ Added</h3>\n                 <ul>\n                   <li><strong>Start Open World</strong> — available directly from the player menu under What&apos;s new</li>\n                   <li><strong>Persona-only opening</strong> — a fresh session begins with the active persona and no predefined NPC cast</li>\n                   <li><strong>Living Cast ready</strong> — Smart Focus is enabled so characters can join naturally as they are encountered or invited</li>\n                   <li><strong>Persistent open-world session</strong> — Open World uses the existing Location, session, generation, persona, and World Engine paths instead of a second chat system</li>\n                 </ul>\n                 <h3>🎭 Living Cast</h3>\n                 <ul>\n                   <li><strong>Direct focus</strong> — mentioning one present character focuses only that character for the turn</li>\n                   <li><strong>Group address</strong> — naming several characters, or using group wording such as everyone or you two, allows multiple participants</li>\n                   <li><strong>Quiet presence</strong> — characters can remain present and scene-aware without being forced to answer every turn</li>\n                 </ul>\n               </div>\n             </article>\n\n             <article className=\"changelog-entry featured\">\n               <span className=\"changelog-mark\">🎭</span>\n               <div>\n                 <span className=\"changelog-version\">Version 0.11.0.1 · Living Cast Focus Fix</span>\n                 <h2>Living Cast Focus Fix</h2>\n                 <p>Smart participation now follows the player&apos;s current address instead of dragging old name mentions back into later turns.</p>\n                 <h3>🛠 Fixed</h3>\n                 <ul>\n                   <li><strong>Latest-turn focus</strong> — a direct name mention takes priority over older conversation history</li>\n                   <li><strong>No unwanted chorus</strong> — unrelated cast members stay present without automatically speaking</li>\n                   <li><strong>Clearer controls</strong> — the Living Cast page now explains Smart Focus behavior more directly</li>\n                 </ul>\n               </div>\n             </article>\n\n             <article className=\"changelog-entry milestone\">`;

  return source.replace(marker, entries);
});

patchFile("CHANGELOG.md", (source) => {
  if (source.includes("## 0.11.1.0 — Open World Begins")) return source;

  const marker = "# Changelog\n\n";
  if (!source.startsWith(marker)) {
    throw new Error("CHANGELOG.md does not start with the expected heading");
  }

  const entry = `## 0.11.1.0 — Open World Begins\n\n✨ MINOR FEATURE RELEASE\n\n### Added\n\n- **Start Open World** in the player menu starts a fresh roleplay with only the active persona and no predefined primary Contact.\n- **Persona-only opening** uses the existing Location/session generation path so the new mode does not fork the roleplay runtime.\n- **Living Cast ready by default** in Open World with Smart Focus enabled for characters that enter later.\n\n### Changed\n\n- **Living Cast Smart Focus** now prioritizes characters named in the latest player turn instead of keeping older mentions active indefinitely.\n- **Quiet cast presence** lets characters remain in-scene and aware without forcing every present character to reply.\n- **Group address support** allows several explicitly named characters, or collective wording such as \"everyone\" and \"you two\", to participate together.\n\n---\n\n## 0.11.0.1 — Living Cast Focus Fix\n\n### Fixed\n\n- Directly addressing one cast member now focuses that character for the current turn.\n- Old name mentions no longer keep unrelated cast members eligible forever.\n- Living Cast settings copy now describes Smart Focus behavior more clearly.\n\n---\n\n`;

  return marker + entry + source.slice(marker.length);
});
