"use client";

export interface LivingCastConfigProps {
  config: { enabled: boolean; participationMode: "smart" | "round-robin" };
  onConfigChange: (config: { enabled: boolean; participationMode: "smart" | "round-robin" }) => void;
  onResetCast: () => void;
  onBack: () => void;
  cast: Array<{ id: string; name: string; origin: string; primary?: boolean }>;
  onInvite: () => void;
  onRemove: (characterId: string) => void;
  characters: Array<{ id: string; name: string }>;
}

export function LivingCastConfig(props: LivingCastConfigProps) {
  return (
    <section className="settings-page">
      <div className="settings-heading">
        <div>
          <p className="eyebrow">Add-on</p>
          <h1>Living Cast</h1>
          <p>Multi-character roleplay and cast management.</p>
        </div>
        <div>
          <button className="outline-button" type="button" onClick={props.onBack}>
            ← Back to Add-ons
          </button>
        </div>
      </div>

      <fieldset className="story-control-fieldset">
        <legend>Status</legend>
        <label className="toggle-row">
          <span>
            <span className="setting-name-row">Enabled</span>
            <small>Allow explicitly invited characters to participate in the current roleplay.</small>
          </span>
          <span className="switch">
            <input
              type="checkbox"
              checked={props.config.enabled}
              onChange={(e) =>
                props.onConfigChange({ ...props.config, enabled: e.target.checked })
              }
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="story-control-fieldset">
        <legend>Participation Mode</legend>
        <label className="toggle-row">
          <span>
            <span className="setting-name-row">Round Robin</span>
            <small>Characters take turns in a stable order.</small>
          </span>
          <span className="switch">
            <input
              type="radio"
              name="participation-mode"
              checked={props.config.participationMode === "round-robin"}
              onChange={() =>
                props.onConfigChange({ ...props.config, participationMode: "round-robin" })
              }
            />
          </span>
        </label>
        <label className="toggle-row">
          <span>
            <span className="setting-name-row">Smart</span>
            <small>Characters step in only when directly addressed or relevant.</small>
          </span>
          <span className="switch">
            <input
              type="radio"
              name="participation-mode"
              checked={props.config.participationMode === "smart"}
              onChange={() =>
                props.onConfigChange({ ...props.config, participationMode: "smart" })
              }
            />
          </span>
        </label>
      </fieldset>

      <fieldset className="story-control-fieldset">
        <legend>Current Cast</legend>
        <div className="living-cast-config-list">
          {props.cast.map((member) => (
            <div key={member.id} className="living-cast-config-entry">
              <div>
                <span className="cast-name">{member.name}</span>
                <span className="cast-tags">
                  {member.primary && (
                    <span className="cast-tag cast-tag-primary">Primary</span>
                  )}
                  <span className="cast-tag">{member.origin}</span>
                </span>
              </div>
              {!member.primary && (
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => props.onRemove(member.id)}
                >
                  Remove from cast
                </button>
              )}
            </div>
          ))}
          <button className="outline-button" type="button" onClick={props.onInvite}>
            + Invite Character
          </button>
        </div>
        <div style={{ marginTop: "12px" }}>
          <button className="outline-button" type="button" onClick={props.onResetCast}>
            Reset Current Cast
          </button>
        </div>
      </fieldset>
    </section>
  );
}
