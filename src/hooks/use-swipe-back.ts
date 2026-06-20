import { useRef } from 'react';
import type { TouchEvent } from 'react';

const EDGE = 30; // gesture must start within this many px of the left edge
const COMMIT_RATIO = 0.4; // drag past 40% of the width to go back

/**
 * Interactive iOS/Telegram-style swipe-back: an edge pan that drags the whole
 * screen with the finger, then either completes (slides off → onBack) or snaps
 * back. Returns a ref for the screen element plus touch handlers to spread on it.
 *
 * Edge-only start + a vertical-bail keep it from fighting the message list's
 * vertical scroll or text selection. The transform is written straight to the
 * node (no per-frame React state) so the drag stays smooth.
 */
export function useSwipeBack(onBack: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dx = useRef(0);

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
    const el = ref.current;
    if (!start.current || !el) return;
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
      el.style.transition = 'none';
      el.style.willChange = 'transform';
    }
    dx.current = Math.max(0, mx);
    el.style.transform = `translateX(${dx.current}px)`;
    el.style.boxShadow = '-12px 0 28px rgba(0,0,0,0.10)';
  }

  function onTouchEnd() {
    const el = ref.current;
    const wasDragging = dragging.current;
    const distance = dx.current;
    start.current = null;
    dragging.current = false;
    dx.current = 0;
    if (!wasDragging || !el) return;

    el.style.transition = 'transform 0.2s ease-out';
    if (distance > window.innerWidth * COMMIT_RATIO) {
      el.style.transform = 'translateX(100%)';
      window.setTimeout(onBack, 190);
    } else {
      el.style.transform = 'translateX(0)';
      el.style.boxShadow = '';
    }
  }

  return { ref, onTouchStart, onTouchMove, onTouchEnd };
}
