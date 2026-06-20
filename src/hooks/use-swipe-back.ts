import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';

const EDGE = 30; // gesture must start within this many px of the left edge
const COMMIT_RATIO = 0.4; // drag past 40% of the width to go back
const PARALLAX = 0.3; // destination starts 30% off-screen-left and slides in

/**
 * Interactive iOS/Telegram-style swipe-back with a destination peek.
 *
 * An edge pan drags the foreground screen (`ref`) right with the finger while
 * the destination screen (`peekRef`) parallaxes in behind it. Past the commit
 * threshold it completes (foreground slides off, destination settles, then
 * onBack navigates for real); otherwise both snap back.
 *
 * `peeking` tells the caller to mount the destination layer only during a drag.
 * Transforms are written straight to the nodes (no per-frame React state) so the
 * drag stays smooth. Edge-only start + a vertical-bail keep it from fighting the
 * message list's scroll.
 */
export function useSwipeBack(onBack: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dx = useRef(0);
  const [peeking, setPeeking] = useState(false);

  function setFrame(distance: number) {
    const w = window.innerWidth;
    if (ref.current) {
      ref.current.style.transform = `translateX(${distance}px)`;
      ref.current.style.boxShadow = '-12px 0 28px rgba(0,0,0,0.12)';
    }
    if (peekRef.current) {
      const progress = Math.min(1, distance / w);
      peekRef.current.style.transform = `translateX(${
        -PARALLAX * w * (1 - progress)
      }px)`;
    }
  }

  function onTouchStart(e: TouchEvent) {
    if (!enabled) {
      start.current = null;
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'input, textarea, select, [contenteditable], [data-vaul-drawer]'
      )
    ) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    if (t.clientX > EDGE) {
      start.current = null;
      return;
    }
    start.current = { x: t.clientX, y: t.clientY };
    dragging.current = false;
    dx.current = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!start.current) return;
    const t = e.touches[0];
    const mx = t.clientX - start.current.x;
    const my = t.clientY - start.current.y;
    if (!dragging.current) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      if (Math.abs(my) > Math.abs(mx)) {
        start.current = null; // vertical intent — let the list scroll
        return;
      }
      dragging.current = true;
      setPeeking(true); // mount the destination layer
      if (ref.current) {
        ref.current.style.transition = 'none';
        ref.current.style.willChange = 'transform';
      }
    }
    if (peekRef.current) peekRef.current.style.transition = 'none';
    dx.current = Math.max(0, mx);
    setFrame(dx.current);
  }

  function onTouchEnd() {
    const wasDragging = dragging.current;
    const distance = dx.current;
    start.current = null;
    dragging.current = false;
    dx.current = 0;
    if (!wasDragging) return;

    const w = window.innerWidth;
    if (ref.current) ref.current.style.transition = 'transform 0.22s ease-out';
    if (peekRef.current)
      peekRef.current.style.transition = 'transform 0.22s ease-out';

    if (distance > w * COMMIT_RATIO) {
      if (ref.current) ref.current.style.transform = 'translateX(100%)';
      if (peekRef.current) peekRef.current.style.transform = 'translateX(0)';
      window.setTimeout(onBack, 200);
    } else {
      if (ref.current) {
        ref.current.style.transform = 'translateX(0)';
        ref.current.style.boxShadow = '';
      }
      if (peekRef.current)
        peekRef.current.style.transform = `translateX(${-PARALLAX * w}px)`;
      window.setTimeout(() => setPeeking(false), 220);
    }
  }

  return { ref, peekRef, peeking, onTouchStart, onTouchMove, onTouchEnd };
}
