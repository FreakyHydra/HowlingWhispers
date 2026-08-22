"use client";

export interface CharacterInvitePickerProps {
  characters: Array<{ id: string; name: string; role: string; image: string }>;
  invitedIds: string[];
  onInvite: (characterId: string) => void;
  onCancel: () => void;
}

export function CharacterInvitePicker(props: CharacterInvitePickerProps) {
  const available = props.characters.filter(
    (character) => !props.invitedIds.includes(character.id),
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={props.onCancel}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">Living Cast</p>
        <h2>Invite Character</h2>
        <div className="living-cast-invite-list">
          {available.length === 0 ? (
            <p className="living-cast-invite-empty">
              No available characters to invite.
            </p>
          ) : (
            available.map((character) => (
              <button
                key={character.id}
                type="button"
                className="living-cast-invite-card"
                onClick={() => props.onInvite(character.id)}
              >
                <span className="living-cast-invite-portrait">
                  {character.image && (
                    <img src={character.image} alt="" />
                  )}
                </span>
                <span className="living-cast-invite-copy">
                  <strong>{character.name}</strong>
                  <small>{character.role}</small>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="settings-actions">
          <button className="outline-button" type="button" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
