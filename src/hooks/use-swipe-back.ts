import { useRef } from 'react';
import type { TouchEvent } from 'react';

/**
 * Left-to-right swipe to go "back", iOS/Android style. Returns touch handlers
 * to spread onto the screen's root element.
 *
 * Guards against false positives: ignores swipes that begin on an interactive
 * or editable element (so dragging in the textarea, tapping a button, or
 * dismissing a drawer never navigates), and only fires on a fast, clearly
 * horizontal rightward gesture.
 */
export function useSwipeBack(onBack: () => void, enabled = true) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    if (!enabled) {
      start.current = null;
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'input, textarea, select, [contenteditable], button, a, [role="button"], [data-vaul-drawer]'
      )
    ) {
      start.current = null; // let the control handle its own gesture
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: TouchEvent) {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    const dt = Date.now() - start.current.t;
    start.current = null;

    const horizontal = dx > 70 && Math.abs(dy) < 60 && dx > Math.abs(dy) * 1.5;
    if (horizontal && dt < 700) onBack();
  }

  return { onTouchStart, onTouchEnd };
}
