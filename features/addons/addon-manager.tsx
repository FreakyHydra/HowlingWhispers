import type { InstalledAddon, HowlingAddonManifest, AddonCommonScene } from "../lib/generation/howling-addons.ts";

export interface AddonManagerProps {
  setChatError: React.Dispatch<React.SetStateAction<string>>;
  installedAddons: InstalledAddon[];
  isHowlingAddon: (value: unknown) => value is HowlingAddonManifest;
  validateAddonContent: (content: unknown) => AddonCommonScene[] | null;
  installAddon: (manifest: HowlingAddonManifest) => InstalledAddon[];
  exportAddon: (addon: InstalledAddon) => Blob;
  toggleAddonEnabled: (addonId: string) => void;
  uninstallAddon: (addonId: string) => void;
}

export function AddonManager(props: AddonManagerProps) {
  return (
    <section className="settings-page">
      <div className="settings-heading">
        <div>
          <p className="eyebrow">Content packs</p>
          <h1>Howling Add-ons</h1>
          <p>Install reusable content packs that work with any character.</p>
        </div>
        <div>
          <input
            type="file"
            id="addon-import-input"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const parsed = JSON.parse(reader.result as string);
                  if (!props.isHowlingAddon(parsed)) {
                    props.setChatError("Invalid add-on package. Expected format: howling-addon v1.");
                    return;
                  }
                  const scenes = props.validateAddonContent(parsed.content);
                  if (scenes === null) {
                    props.setChatError("Add-on content is malformed.");
                    return;
                  }
                  props.installAddon(parsed);
                  props.setChatError("");
                } catch {
                  props.setChatError("Could not read the add-on file.");
                }
              };
              reader.readAsText(file);
              event.target.value = "";
            }}
          />
          <button
            className="outline-button"
            type="button"
            onClick={() => document.getElementById("addon-import-input")?.click()}
          >
            Install Add-on
          </button>
        </div>
      </div>

      {props.installedAddons.length === 0 ? (
        <p className="scene-library-empty">No add-ons installed yet. Install a JSON package to get started.</p>
      ) : (
        <div className="addon-list">
          {props.installedAddons.map((addon) => {
            const addonScenes = props.validateAddonContent(addon.manifest.content);
            return (
              <div className="addon-card" key={addon.manifest.id}>
                <div className="addon-card-header">
                  <div>
                    <h3>{addon.manifest.name}</h3>
                    <small>v{addon.manifest.version} · {addonScenes?.length ?? 0} scenes</small>
                    {addon.manifest.author && <small>by {addon.manifest.author}</small>}
                    {addon.manifest.description && <p>{addon.manifest.description}</p>}
                  </div>
                  <span className={`addon-status ${addon.enabled ? "enabled" : "disabled"}`}>
                    {addon.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="addon-card-actions">
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => props.toggleAddonEnabled(addon.manifest.id)}
                  >
                    {addon.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => {
                      const blob = props.exportAddon(addon);
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${addon.manifest.id}-${addon.manifest.version}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export
                  </button>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => {
                      if (confirm(`Uninstall "${addon.manifest.name}"? This does not delete scenes you already started.`)) {
                        props.uninstallAddon(addon.manifest.id);
                      }
                    }}
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
