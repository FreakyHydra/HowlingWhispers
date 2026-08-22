"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    arrowLeft: number;
    above: boolean;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 10;
    const width = Math.min(340, viewportWidth - margin * 2);
    pop.style.width = `${width}px`;
    const height = pop.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    const below = rect.bottom + gap + height <= viewportHeight - margin;
    let top = below ? rect.bottom + gap : rect.top - gap - height;
    if (top < margin) top = margin;
    const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 18), width - 18);
    setPos({ top, left, width, arrowLeft, above: !below });
  }, []);

  useEffect(() => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, place]);

  const openPopup = useCallback(() => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }, []);

  return (
    <span
      className="info-tip"
      ref={triggerRef}
      role="note"
      tabIndex={0}
      onMouseEnter={openPopup}
      onMouseLeave={closePopup}
      onFocus={openPopup}
      onBlur={closePopup}
    >
      <span className="info-tip-icon" aria-hidden="true">
        i
      </span>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className={`info-tip-pop help-popover${pos ? " is-visible" : ""}${pos?.above ? " is-above" : ""}`}
            role="tooltip"
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
            onMouseEnter={openPopup}
            onMouseLeave={closePopup}
          >
            <span className="help-popover__arrow" style={{ left: pos?.arrowLeft }} />
            <h4 className="help-popover__title">{label}</h4>
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}
