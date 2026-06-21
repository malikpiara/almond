import { useEffect, useRef } from 'react';

// --ease-out-cubic (globals.css) — the same curve as .animate-entry-appear.
const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const FLIGHT_MS = 300; // composer → row morph (enter → ease-out)
const REVEAL_MS = 150; // cross-fade the real row in as the ghost fades out

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Whether the send-morph should run: needs the Web Animations API and a user
 * who hasn't asked for less motion. When false, callers fall back to the plain
 * `.animate-entry-appear` fade (itself neutralized by the global reduced-motion
 * media query).
 */
export function canMorph(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Element.prototype.animate === 'function' &&
    !prefersReducedMotion()
  );
}

/**
 * Telegram-style "send-message morph" for a freshly-saved entry (mobile).
 *
 * A clone of the entry's text — a "ghost" — is flown from the composer up into
 * the new row, interpolating position + size (FLIP: it starts mapped onto the
 * composer rect, then releases to the row's own slot). The real row stays in
 * the layout (so older entries are already shifted into place) but hidden, and
 * cross-fades in on arrival, so only its metadata line "appears" — no flicker.
 *
 * Why a body-level ghost instead of transforming the row in place: the
 * column-reverse list is `overflow-y-auto`, which would clip a child translated
 * down toward the composer. The ghost lives on <body>, free of that clip.
 *
 * transform + opacity only (GPU-composited); every layout read happens up front,
 * never during the flight (see ANIMATION.md §4).
 */
export function useSendMorph() {
  const cleanup = useRef<(() => void) | null>(null);

  // Collapse an in-flight morph if the screen unmounts mid-flight.
  useEffect(() => () => cleanup.current?.(), []);

  return function morph(row: HTMLElement, sourceRect: DOMRect): void {
    cleanup.current?.(); // finish any previous morph (rapid double-submit)

    // Measure the row's text block — that's what the typed text becomes.
    const textEl = (row.querySelector('p') ?? row) as HTMLElement;
    const target = textEl.getBoundingClientRect();
    if (!target.width || !target.height) return;

    const cs = getComputedStyle(textEl);
    const ghost = document.createElement('div');
    ghost.textContent = textEl.textContent ?? '';
    ghost.setAttribute('aria-hidden', 'true');
    const s = ghost.style;
    s.position = 'fixed';
    s.top = `${target.top}px`;
    s.left = `${target.left}px`;
    s.width = `${target.width}px`;
    s.margin = '0';
    s.color = cs.color;
    s.fontFamily = cs.fontFamily;
    s.fontSize = cs.fontSize;
    s.fontWeight = cs.fontWeight;
    s.lineHeight = cs.lineHeight;
    s.letterSpacing = cs.letterSpacing;
    s.whiteSpace = cs.whiteSpace; // 'pre-line' — keep the entry's line breaks
    s.textAlign = cs.textAlign;
    s.transformOrigin = 'top left';
    s.pointerEvents = 'none';
    s.zIndex = '50';
    s.willChange = 'transform, opacity';
    document.body.appendChild(ghost);

    // Reserve the row's space but hide it until the ghost lands.
    const prevVisibility = row.style.visibility;
    row.style.visibility = 'hidden';

    // FLIP: the transform that maps the row's slot back onto the composer.
    const dx = sourceRect.left - target.left;
    const dy = sourceRect.top - target.top;
    const scale = sourceRect.width / target.width || 1;

    // `backwards` fill means the first painted frame is already at the composer
    // (keyframe 0), so the row never flashes at its final spot first.
    const flight = ghost.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: 'none' },
      ],
      { duration: FLIGHT_MS, easing: EASE_OUT, fill: 'backwards' }
    );

    let fade: Animation | undefined;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      flight.cancel();
      fade?.cancel();
      ghost.remove();
      row.style.visibility = prevVisibility;
      if (cleanup.current === finish) cleanup.current = null;
    };
    cleanup.current = finish;

    flight.finished
      .then(() => {
        if (done) return;
        // Same text, same place: reveal the real row and fade the ghost out.
        row.style.visibility = prevVisibility;
        row.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: REVEAL_MS,
          easing: EASE_OUT,
          fill: 'backwards',
        });
        fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: REVEAL_MS,
          easing: EASE_OUT,
          fill: 'forwards', // stay invisible until removed (no rebound)
        });
        return fade.finished;
      })
      .catch(() => {})
      .finally(finish);
  };
}
