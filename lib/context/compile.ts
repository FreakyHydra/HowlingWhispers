import type { MemoryEntry, AuthorNoteEntry, LorebookRecord, LorebookParsedEntry } from "./types.ts";
import { estimateTokens } from "../generation/compile-context.ts";

export type HWLoreSelection = {
  entries: Array<{ entry: LorebookParsedEntry; reason: "constant" | "trigger" }>;
  omitted: Array<{ id: string; title: string; reason: "inactive" | "budget" }>;
};

export function selectHWLorebooks(
  lorebooks: LorebookRecord[],
  searchableContext: string,
  budget: number,
): HWLoreSelection {
  const enabled = lorebooks.filter((book) => book.enabled);
  if (enabled.length === 0) return { entries: [], omitted: [] };

  const candidates: Array<{ record: LorebookRecord; entry: LorebookParsedEntry; reason: "constant" | "trigger" | null }> = [];
  for (const book of enabled) {
    const entries = book.parsed?.entries ?? [];
    for (const entry of entries) {
      if (!entry.enabled) continue;
      const triggerMatches = entry.keys.filter((trigger) =>
        searchableContext.includes(trigger.toLocaleLowerCase("en-US")),
      ).length;
      const reason = entry.forceActivation ? "constant" : triggerMatches > 0 ? "trigger" : null;
      if (reason) {
        candidates.push({ record: book, entry, reason });
      }
    }
  }

  candidates.sort((left, right) => {
    if (left.reason === "constant" && right.reason !== "constant") return -1;
    if (right.reason === "constant" && left.reason !== "constant") return 1;
    return 0;
  });

  const mandatoryTokens = candidates
    .filter((c) => c.reason === "constant")
    .reduce((total, c) => total + estimateTokens(renderLoreEntry(c.entry)), 0);
  const loreBudget = Math.max(mandatoryTokens, Math.floor(budget * 0.15));
  const selected: typeof candidates = [];
  let usedTokens = 0;
  const omitted: HWLoreSelection["omitted"] = [];

  for (const candidate of candidates) {
    const tokens = estimateTokens(renderLoreEntry(candidate.entry));
    if (candidate.reason !== "constant" && usedTokens + tokens > loreBudget) {
      omitted.push({
        id: String(candidate.entry.id ?? `${candidate.record.id}-entry`),
        title: candidate.entry.displayName ?? "Untitled",
        reason: "budget",
      });
      continue;
    }
    selected.push(candidate);
    usedTokens += tokens;
  }

  return {
    entries: selected.map((c) => ({ entry: c.entry, reason: c.reason })),
    omitted,
  };
}

export function renderMemoryBlock(memories: MemoryEntry[]): string {
  const enabled = memories.filter((m) => m.enabled);
  if (enabled.length === 0) return "";
  const lines = enabled.map((m) => `- ${m.text}`).join("\n");
  return `<memory>\n${lines}\n</memory>`;
}

export function renderAuthorNoteBlock(authorNotes: AuthorNoteEntry[]): string {
  const enabled = authorNotes.filter((n) => n.enabled);
  if (enabled.length === 0) return "";
  return `<author-note>\n${enabled.map((n) => n.text).join("\n\n")}\n</author-note>`;
}

export function renderHWLorebookBlock(selection: HWLoreSelection): string {
  if (selection.entries.length === 0) return "";
  return selection.entries
    .map(({ entry }) => renderLoreEntry(entry))
    .join("\n\n");
}

function renderLoreEntry(entry: LorebookParsedEntry): string {
  const title = entry.displayName?.trim() || "Untitled";
  return `<hw-lorebook-entry title="${escapeAttribute(title)}">\n${entry.text}\n</hw-lorebook-entry>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
