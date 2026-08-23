"use client";

import { useEffect } from "react";

const DEFAULT_UI_FONT_SIZE = 16;

function applyUiFontSize() {
  try {
    const raw = window.localStorage.getItem("dreambound_text_style");
    const parsed = raw ? JSON.parse(raw) as { uiFontSize?: unknown; uiScale?: unknown } : null;
    const uiFontSize = typeof parsed?.uiFontSize === "number"
      ? Math.min(22, Math.max(12, parsed.uiFontSize))
      : DEFAULT_UI_FONT_SIZE;
    const uiScale = typeof parsed?.uiScale === "number"
      ? Math.min(150, Math.max(75, parsed.uiScale))
      : 100;
    document.documentElement.style.setProperty("--ui-font-size", `${uiFontSize}px`);
    document.documentElement.style.setProperty("--ui-font-scale", String((uiFontSize / DEFAULT_UI_FONT_SIZE) * (uiScale / 100)));
    document.documentElement.style.setProperty("--ui-scale", String(uiScale / 100));
  } catch {
    document.documentElement.style.setProperty("--ui-font-size", `${DEFAULT_UI_FONT_SIZE}px`);
    document.documentElement.style.setProperty("--ui-font-scale", "1");
    document.documentElement.style.setProperty("--ui-scale", "1");
  }
}

export default function AccessibilityPreferences() {
  useEffect(() => {
    applyUiFontSize();
    const update = () => applyUiFontSize();
    window.addEventListener("storage", update);
    window.addEventListener("dreambound-preferences-changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("dreambound-preferences-changed", update);
    };
  }, []);

  return null;
}
