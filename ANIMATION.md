# Animation & Transitions — a working guide

A portable guide to motion for Malik's products (born in Almond, meant to travel). It blends three sources: **Emil Kowalski's [animations.dev](https://animations.dev)** principles, **learnings dug out of Telegram's open-source Android app**, and **what we measured ourselves** with Chrome DevTools. Keep it updated as we learn more.

> Companion to [DESIGN.md](DESIGN.md). DESIGN.md describes Almond's *current* look; this describes durable motion *principles* + reusable learnings. Per our working rule, don't write up an in-flux Almond transition in DESIGN.md until it's settled — but general learnings (this file) are fair to capture.

---

## 0. Malik's rules (these win)

1. **Never change the position of a static element on hover.** A persistent element must not `translate` on hover. Translations are reserved for things **entering or leaving the screen** (route transitions, drawers, items added/removed) — motion that means "something arrived/left," not decoration. Hover may change shadow / background / color, never position. (`active:scale` for press/tap feedback is fine — it's a press, not hover, and not a position change.)
2. **Don't combine motion axes that fight.** A slide that also scaled the screen read as "two directions at once" and felt jarring. Keep a transition coherent — usually one dominant axis.
3. **Don't document motion while experimenting.** Settle the decision first, then write it up. Premature docs become stale the moment the experiment changes.
4. **Match the feel, then the recipe — and verify by measuring, not by eye alone.** See §4.

---

## 1. Easing (Emil Kowalski / animations.dev)

| Situation | Easing |
| --- | --- |
| Element entering or leaving the screen | **`ease-out`** (fast start, settles in) |
| On-screen element moving/morphing | `ease-in-out` |
| Hover / color change | `ease` |
| Constant motion (marquee, progress) | `linear` |
| (almost never) | `ease-in` — sluggish, delays feedback |

Tokens we keep in CSS:
```css
--ease-out-cubic:  cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart:  cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-out-quint:  cubic-bezier(0.23, 1, 0.32, 1);
--ease-decelerate: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* ≈ Android DecelerateInterpolator */
```
Paired elements (modal+overlay, drawer+backdrop) share the **same** easing + duration.

## 2. Duration & restraint

- Micro-interactions **100–150ms**; standard UI (dropdowns, tooltips) **150–250ms**; modals/drawers **200–300ms**. Cap UI motion at ~300ms. Exits can be ~20% faster than entrances. Longer travel → longer duration.
- **Don't animate things people see 100+×/day** (or make it near-instant). Speed beats smoothness for frequent actions.
- **Only animate `transform` and `opacity`** (GPU-composited; skip layout/paint). Avoid animating width/height/margin/top, and blurs over ~20px.
- **Always honor `prefers-reduced-motion`** — neutralize transitions/animations (a global media query that also covers Radix/vaul is the pragmatic safety net).
- **Springs** for gesture/drag (interruptible, velocity-aware). Not needed for simple taps.

## 3. Navigation transitions

### View Transitions API (web)
- **Shared-element morph** (a list card morphs into its detail view) is the standout move — interpolates position+size, cross-fades contents, no duplicate rendering. Malik loves this; reach for it.
- **Be platform-aware.** A full-width slide that feels right on a phone feels **jarring on a wide desktop** — there, a contained morph (or fade) fits better.
- Implementation pattern (TanStack Router): `viewTransition={{ types: ['name'] }}` on the navigation + `:active-view-transition-type(name)::view-transition-old/new(root)` CSS for direction; set a `view-transition-name` on the tapped element (at click time, so it's unique in the snapshot) to morph it.
- Direction/stacking: for a push, the incoming screen is on top (`z-index`) sliding in; for a pop, the outgoing screen is on top sliding off — set `z-index` on the pseudo-elements per type.

### Gestures
- Interactive swipe-back: drag the screen with the finger via a direct `translateX` written to the node (no per-frame React state); commit past a distance **or** a velocity flick; otherwise snap back. A destination "peek" can ride behind with a small parallax.

---

## 4. The hard-won lesson: feel ≠ recipe (measure it)

We matched Telegram's chat-open recipe exactly and it *still* felt less smooth. Profiling (Chrome DevTools, mobile + 4× CPU) explained why:

- The open did **~85ms of forced reflow** and **~104ms INP** — main-thread layout/render work landing **inside the transition's first frames**. That start-hitch is the "less smooth," not the curve.
- **Telegram has none of this** because it's native: it animates **pre-laid-out, recycled views** with zero main-thread work during the animation.
- **Hand-rolling the tap-open** (render the destination first, then transform — the swipe-back trick) measured **worse** (235ms INP): a *tap* has no finger-drag to hide the render behind, and both screens mount at once. The swipe-back is smooth only because its render overlaps the gesture.
- **Virtualization helps only long lists.** For short lists the open cost is **constant** — component mount-time layout reads (heavy UI libs), web-font swap, or the route rendering synchronously inside the View Transition. Pin the exact function with **source-mapped** profiling before optimizing; don't guess.

**Takeaways that transfer:**
- Profile transitions with `performance_start_trace` → interact → `performance_stop_trace`; read the **INPBreakdown** and **ForcedReflow** insights. Throttle CPU (4×) to emulate a phone.
- A buttery transition needs **no synchronous render/layout while it runs**. Pay rendering cost *before* (gesture cover) or *after* (defer non-critical content), or make the destination cheap to render.
- Web route transitions in a framework will rarely beat a native app's hand-tuned, recycling view system; aim for "great," and spend effort where the trace says the time goes.

---

## 5. Learnings from Telegram's source (Android, open source)

From [`ActionBarLayout.java`](https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/ui/ActionBar/ActionBarLayout.java), the chat-open **push**:

| Detail | Value |
| --- | --- |
| Background parallax | **small fixed offset** (`dp(48)`), *not* a % of screen width — the background barely moves |
| Leading-edge shadow | a `layerShadowDrawable` on the moving screen's edge; alpha ramps with offset (depth + masks the seam) |
| Curve | `DecelerateInterpolator` (gentle quadratic ease-out ≈ `cubic-bezier(0.25,0.46,0.45,0.94)`) |
| Duration | **~150ms** (190ms in preview mode) |
| Dim/scrim on open | **none** (scrim appears only during the swipe-back gesture) |
| Spring | none for the push; velocity is tracked only for swipe-back |

Web translation that worked: small fixed parallax + a soft leading-edge `box-shadow` + a decelerate curve at ~150ms. The visual recipe is portable; the native runtime smoothness is not (see §4).

---

## 6. Tooling

- **Chrome DevTools MCP** for traces: `performance_start_trace` / `performance_stop_trace`, then `performance_analyze_insight` for `ForcedReflow` / `INPBreakdown`. `emulate` to set a mobile viewport + CPU throttle.
- A headless preview won't show real-device GPU/refresh behavior or the OS keyboard — confirm feel on an actual device.
