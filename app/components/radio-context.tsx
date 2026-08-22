"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const STREAM_URL = "/radio/radio.mp3";
const VOLUME_STORAGE_KEY = "dreambound_radio_volume";
const DEFAULT_VOLUME = 0.6;

type RadioApi = {
  isPlaying: boolean;
  connected: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (value: number) => void;
};

const RadioContext = createContext<RadioApi | undefined>(undefined);

export function useRadio(): RadioApi {
  const ctx = useContext(RadioContext);
  if (!ctx) {
    throw new Error("useRadio must be used within a <RadioProvider>");
  }
  return ctx;
}

export default function RadioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ isPlaying: boolean; connected: boolean }>(
    { isPlaying: false, connected: false },
  );
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_VOLUME;
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored === null) return DEFAULT_VOLUME;
    const parsed = Number.parseFloat(stored);
    return Number.isNaN(parsed) ? DEFAULT_VOLUME : Math.min(1, Math.max(0, parsed));
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const commitVolume = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next));
    setVolume(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    }
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.play().catch(() => setState((s) => ({ ...s, isPlaying: false })));
    } else {
      const audio = new Audio(STREAM_URL);
      audio.volume = volume;
      audio.addEventListener("ended", () => setState((s) => ({ ...s, isPlaying: false })));
      audio.addEventListener("error", () => setState((s) => ({ ...s, isPlaying: false })));
      audioRef.current = audio;
      void audio.play().catch(() => setState((s) => ({ ...s, isPlaying: false })));
    }
    setState({ isPlaying: true, connected: true });
  }, [volume]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audio.load();
      audioRef.current = null;
    }
    setState({ isPlaying: false, connected: false });
  }, []);

  return (
    <RadioContext.Provider
      value={{
        isPlaying: state.isPlaying,
        connected: state.connected,
        volume,
        play,
        pause,
        stop,
        setVolume: commitVolume,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}
