"use client";

import { useEffect, useRef, useState } from "react";
import { useRadio } from "./radio-context";

export type RadioPlacement = "above" | "below";

export default function RadioPlayer({ placement }: { placement: RadioPlacement }) {
  const { isPlaying, connected, volume, play, pause, stop, setVolume } = useRadio();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const toggleOpen = () => setOpen((next) => !next);
  const close = () => setOpen(false);
  const handlePlayPause = () => (isPlaying ? pause() : play());

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const status = isPlaying ? "LIVE" : connected ? "Paused" : "Idle";

  return (
    <div
      className={`radio-control radio-control--${placement}${open ? " is-open" : ""}`}
      ref={wrapperRef}
    >
      <button
        type="button"
        className={`radio-trigger${isPlaying ? " is-playing" : ""}`}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Live radio"
        title="Live radio"
      >
        <span className="radio-trigger-icon" aria-hidden="true">
          ♪
        </span>
        <span className="radio-trigger-label">Radio</span>
      </button>
      <div
        className={`radio-popover ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label="Live radio player"
      >
        <span className="radio-status">{status}</span>
        <div className="radio-row">
          <button
            type="button"
            className="radio-btn"
            onClick={handlePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="radio-btn"
            onClick={stop}
            disabled={!connected}
            aria-label="Stop"
            title="Stop"
          >
            Stop
          </button>
          <label className="radio-volume-wrapper" aria-label="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number.parseFloat(event.target.value))}
              aria-valuenow={volume}
              aria-valuemin={0}
              aria-valuemax={1}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
