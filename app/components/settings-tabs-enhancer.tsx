"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SettingsTab = "engine" | "appearance" | "player" | "privacy" | "backup" | "updates";

const tabs: { id: SettingsTab; label: string; icon: string; description: string }[] = [
  { id: "engine", label: "Story Engine", icon: "✦", description: "Provider, model and roleplay behavior" },
  { id: "appearance", label: "Appearance", icon: "Aa", description: "Reading and interface preferences" },
  { id: "player", label: "Player", icon: "◉", description: "Your local player identity" },
  { id: "privacy", label: "Privacy", icon: "◇", description: "What this browser remembers" },
  { id: "backup", label: "Backup & Restore", icon: "↥", description: "Export, restore and server backups" },
  { id: "updates", label: "Updates", icon: "↻", description: "Version and release channel" },
];

export default function SettingsTabsEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<SettingsTab>("engine");

  useEffect(() => {
    let mounted = true;

    const findTarget = () => {
      const page = document.querySelector<HTMLElement>(".settings-page");
      if (!mounted) return;
      setTarget(page);
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    target.dataset.settingsTab = active;
    return () => {
      delete target.dataset.settingsTab;
    };
  }, [target, active]);

  if (!target) return null;

  return createPortal(
    <aside className="settings-section-nav" aria-label="Settings sections">
      <div className="settings-section-nav__brand">
        <span className="settings-section-nav__mark" aria-hidden="true">◒</span>
        <div>
          <strong>Settings</strong>
          <small>Howling Whispers</small>
        </div>
      </div>

      <nav className="settings-section-nav__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={active === tab.id ? "active" : ""}
            onClick={() => setActive(tab.id)}
            aria-pressed={active === tab.id}
          >
            <span className="settings-section-nav__icon" aria-hidden="true">{tab.icon}</span>
            <span className="settings-section-nav__copy">
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </span>
          </button>
        ))}
      </nav>
    </aside>,
    target,
  );
}
