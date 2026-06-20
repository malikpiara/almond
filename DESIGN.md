# Almond — Design Language

> Companion to [PRODUCT.md](PRODUCT.md). PRODUCT describes the *why* (north-star, audience, architectural philosophy). This describes the *how it looks and reads*. Both are living docs — update them when a decision changes, not when nothing has.

This document is a description, not a spec. It captures the design choices Almond has actually committed to, grounded in real values from the code. The frontend-design skill (`.agents/skills/frontend-design`) is the underlying philosophy; this file is what that philosophy looks like *for this product*.

If you find yourself reaching for a new colour, weight, container width, or layout idiom not listed here — pause. Either it belongs in this doc as a deliberate addition, or it's drift. Don't introduce it silently.

---

## 1. Subject & job

Almond is a **local-first, private daily journal for one person at a time**. Its only job is to make reflection happen more often. Everything in the interface either supports that or gets removed.

The hero on every screen is the user's own writing — never branded chrome, never marketing, never a dashboard. Branding lives in one accent (see Signature). The product is silent furniture around the act of writing.

The single screen that matters most is `/boards/$id` — the journal view. Land-in-writing: the index route opens the last board the user wrote in, not a list.

---

## 2. Signature element

A single thin amber rail down the left edge of every screen — the **notebook spine**.

- Mobile: `w-2` (8px), `bg-amber-200` (2px was tried but is invisible on a real phone — keep it visibly present)
- Desktop: `w-3` (12px), `bg-amber-200`
- Continuous top-to-bottom: `fixed inset-y-0 left-0 z-20 pointer-events-none`

This is Almond's only structural decoration. It carries the brand on its own so every other element can stay quiet. Do not add a second branded accent. Do not change its colour. Do not animate it.

The lavender almond mark (`#BDB3FF`) belongs only to the favicon and the installed-app icon — it never appears in the UI itself.

---

## 3. Palette

A warm, cream-based palette with one amber accent for personality and one neutral ramp for hierarchy. All values are pulled from the live code — if you need something not on this list, add it here first.

### Surface
| Token | Value | Where |
|---|---|---|
| Page background | `#FAF9F5` (cream, set globally) | Body |
| Sticky header (translucent) | `bg-[#FAF9F5]/80 backdrop-blur-sm` | Top of `home.tsx`, `board.tsx` |
| Card surface | `bg-card` (white via shadcn) | Desktop entry cards, template input |

### Text (the only ramp)
| Token | Value | Use |
|---|---|---|
| Primary | `text-gray-800` | Body copy, entry content |
| Secondary | `text-gray-500` | Metadata, secondary nav, the global Sync link |
| Muted | `text-gray-400` | Timestamps, placeholder hints |

We do not use pure black. `gray-800` is the floor for readable text — anything darker reads as cold against the cream.

### Buttons
| Variant | Classes | Use |
|---|---|---|
| Filled primary (modal CTAs) | `bg-gray-700 hover:bg-gray-600` | Create journal, Connect Google Drive, Sync now, Download backup, Restore journal — modal actions where attention is wanted. |
| Outline (writing-screen Submit) | `variant='outline'` (no overrides) | Submit on the board — deliberately quiet so the writing is the hero. Also: "+" FAB on home, "Link a device". |
| Ghost / link | `variant='ghost'` + `text-gray-500` | Global Sync trigger, Disconnect, Cancel |

> The Submit button on the board is `variant='outline'` on purpose: a calm white surface beside the writing, not a heavy filled control. This is load-bearing — when the button competes with the text, the screen stops being about the words. Do not "improve" this to a filled primary. The filled `bg-gray-700` treatment belongs to modal CTAs, not to anything beside the writing.

### Amber accents
| Token | Value | Use |
|---|---|---|
| The rail | `bg-amber-200` | The notebook spine — see Signature |
| Soft chip background | `bg-[#FFFBEA]` | "Use" template-prompt pills on home |
| Soft chip text | `text-[#83591e]` | Same pills |
| Info notice | `bg-amber-50 border-amber-200 text-amber-800` | Sync-modal "needs pairing" hint, encryption notices |

### Other semantic colors
| Token | Use |
|---|---|
| `bg-blue-50 border-blue-200 text-blue-800` | Restore-modal "this will replace" notice |

Both info treatments use the same shape (`rounded-lg p-3` + soft bg + 200-step border + 800-step text). If you add a new notice type, follow the same shape.

---

## 4. Typography

One family, used at restraint.

- **Family**: Geist Variable (`@fontsource-variable/geist`)
- **Default weight**: 400 (body); 500 (`font-medium`) for headings; never 700 in body copy

### Scale (only these)
| Class | Use |
|---|---|
| `text-2xl font-medium tracking-tight text-balance` | Page H1 (Your Journals, journal-not-found) |
| `text-xl sm:text-2xl font-medium tracking-tight text-balance` | Board prompt — slightly smaller on mobile so the textarea is what you see first |
| `text-lg` | Special — the entry textarea uses `!text-lg` so writing feels weighty |
| `text-base` (default 16px) | Body copy, entry content with `leading-relaxed` |
| `text-sm` | Secondary copy, modal body, button labels, metadata rows |
| `text-xs` | Tiny labels: "Backup & restore (advanced)" hint |

Headings always carry `tracking-tight` + `text-balance` for the calm look. Body copy always carries `leading-relaxed` when it's a paragraph the user actually reads (entries, paragraph notices). Buttons and rows do not.

Do not introduce `text-3xl` or larger — Almond has no marketing surface that would justify it.

---

## 5. Spacing & rhythm

Tailwind's default 4px scale, but only a few stops are actually in use. Stick to them.

| Stop | Use |
|---|---|
| `gap-2` / `space-y-2` | Within a tightly-coupled group (label + input, button row) |
| `p-3` | Inline notices and small cards |
| `gap-4` | Cards in a list (desktop entries, journal cards); modal sections |
| `py-5` | Mobile entry rows |
| `gap-6` | Page-level vertical rhythm on home |
| `px-6 sm:px-8` | Home container horizontal padding |
| `px-4 sm:px-8` | Board container horizontal padding (tighter on mobile so writing has more room) |
| `gap-8` | Major sections inside the board (header → form → entries) |
| `pb-28` | Bottom padding on scrollable pages so content clears the fixed Sync button and FAB |

### Container widths
| Route | Container |
|---|---|
| `/journals` (home) | `max-w-4xl mx-auto` |
| `/boards/$id` (journal) | `max-w-2xl mx-auto` |
| `/link` (pairing) | `max-w-md m-auto` |
| Modals (desktop) | `sm:max-w-md` |

The board is narrower than the home grid on purpose: it's a reading surface (~65ch reading width), not a layout surface.

### Full-bleed entries on mobile
On mobile, the divider lines between entries run edge-to-edge. The pattern is `-mx-4 divide-y divide-gray-200` on the section + `px-4 py-5` on each row — the row keeps its text indented while the divider escapes the container padding. This is a deliberate viewport-specific treatment; desktop uses Cards instead.

---

## 6. Components & patterns

Where two implementations exist for the same surface (desktop vs. mobile), both are deliberate. Neither is the canonical one. Match desktop structure when adapting to mobile.

### Cards vs. divider rows (entries)
- **Desktop**: `<Card><CardContent>` per entry, `gap-4` between them. Cards give the entries weight and presence on a wide screen.
- **Mobile**: full-bleed `<article>` rows separated by `divide-y divide-gray-200`. Cards would feel boxy in a narrow column.
- Branch on `useIsMobile()` (not Tailwind responsive classes) — the structural difference is too large for utility classes alone.

### Modals → ResponsiveDialog
- `src/components/responsive-dialog.tsx` renders a bottom `Drawer` (vaul) on mobile and a centered `Dialog` on desktop, same content.
- Use this for any user-initiated modal surface (Sync, Export, Import, Create journal).

### Entry options
- **Desktop**: `DropdownMenu` (Radix) on a `MoreHorizontalIcon` button. Structure: People label → person items → separator → Places label → place items → separator → Delete this entry.
- **Mobile**: Drawer that mirrors the same structure 1:1, using the same `text-sm font-medium` label class, the same `text-sm` item row class, and the same `bg-border h-px` separator. No invented pills, no uppercase tracking labels.
- Branch on `useIsMobile()` per entry.

### Sticky translucent header
Pattern: `sticky top-0 z-10 -mx-{container-px} px-{container-px} py-3 bg-[#FAF9F5]/80 backdrop-blur-sm`. The negative margins let the header span the full container width while the rest of the page keeps its inset.

- `home.tsx` uses it at both viewports (the "Your Journals" title bar).
- `board.tsx` uses it **only on mobile** (← Journals + ⋯, via a `useIsMobile()` branch). On desktop the board keeps its original **fixed-corner** controls (`← Journals` at `fixed left-6 top-4`, `⋯` at `fixed right-6 top-3`) and a vertically-centered `max-w-3xl` column — that desktop layout is deliberate; don't replace it with the sticky bar.

### Global controls
- **Sync** trigger lives in the global root layout, fixed `right-2 bottom-2`, as a `ghost` `text-gray-500` button. It's intentionally quiet — Sync is an occasional action.
- **"+" FAB** (create journal) lives on `home.tsx` only, fixed `bottom-6 left-6`, `variant='outline'` `size='icon-lg'` rounded-full.

### Forms
- React Hook Form + Zod + shadcn `Field`/`FieldError`/`FieldGroup`.
- The entry textarea is `min-h-32 resize-none rounded-lg bg-white !text-lg` — deliberately large type and a calm white surface against the cream page.

---

## 7. Responsive philosophy

**Mobile and desktop are both deliberate.** Neither is the "real" version that the other adapts to.

- Tailwind's `sm:` breakpoint (640px) is the dividing line. Below it: mobile. At/above it: desktop.
- When you change something "on mobile," scope it with `sm:` overrides or `useIsMobile()` branching. Do not touch the desktop treatment unless that was the ask. (Same in reverse.)
- A change that *unifies* the two viewports — e.g. removing Cards on both because mobile uses divider rows — is almost always wrong. Ask before unifying.

---

## 8. Voice & copy

- **Sentence case** everywhere — buttons, modal titles, menu items. No Title Case ever.
- **Plain verbs**. "Sync", "Submit", "Connect Google Drive", "Delete this entry." Same verb appears in trigger, dialog, toast. ("Connect Google Drive" → toast "Connected and synced".)
- **Short.** Modal descriptions are one sentence. Most are under 15 words.
- **No marketing voice.** No "Welcome to your private journal." Almond is software you use; it doesn't introduce itself.
- **Soft hints** for privacy/encryption notices keep a calm tone — they are facts about what's happening, not pep talks.
- **Emojis** appear in two places only: `🍃` in the export-passphrase modal, `💭` in the restore-modal. Don't add new ones.

### Typography conventions (Butterick's *Practical Typography*)

Almond is a reading-and-writing product, so the small marks matter. These are committed conventions — audited 2026-06-20.

- **Curly apostrophes and quotes, always** — `’` not `'`, `“ ”` not `" "`. In JSX, paste the real character (`’`) directly; `’` renders literally in JSX text, and `&rsquo;` only works in plain HTML. The whole app uses `’` — don't reintroduce straight typewriter apostrophes.
- **Real ellipsis `…` (U+2026)**, never three periods. Used in progress copy ("Syncing…", "Take a moment to reflect…").
- **Real em dash `—` (U+2014)** for sentence breaks, never `--`. Used in the privacy hints.
- **"and", not "&", in running text and labels.** The ampersand is reserved for proper names (we have none). "Backup and restore", "Tagging people and places…".
- **One space after punctuation.** Never two.

These are correctness rules, not style — apply them silently when writing any new copy. Open typographic levers that are *deliberately not changed* (flag, don't apply): the entry reading measure (~79ch, wider than Butterick's ~66 ideal) and entry `leading-relaxed` (1.63, looser than the 1.2–1.45 ideal) are both kept as-is for the calm reading feel unless Malik asks otherwise.

### Microcopy specifics already in production
- "Take a moment to reflect…" — textarea placeholder
- "Tagging people and places…" — entity-extraction-running indicator
- "Almond" is always capitalised as a single word.

---

## 9. Anti-patterns (don't do these)

Captured from real session corrections — see `~/.claude/projects/-Users-malik-Code-mindful/memory/` for the underlying memos.

1. **Don't change colours or tokens the product has already committed to.** If a smaller element seems to need a stronger amber to read, *propose* it as a separate change. Don't silently swap `amber-200` for `amber-300` because you're shrinking something.
2. **Don't unify mobile and desktop silently.** "Drop cards on mobile" does not mean "drop cards everywhere." Use `sm:` or `useIsMobile()`.
3. **Don't invent components.** The drawer mirroring the desktop dropdown reuses the dropdown's exact classes for label / item / separator. No pills, no uppercase labels, no new icon affordances. The desktop treatment is the canonical specification for the mobile equivalent.
4. **Don't add chrome.** No banners, no welcome cards, no marketing strips, no dashboard tiles. Almond is silent furniture.
5. **Don't centre body copy.** Only short hero/empty-state copy is centred (see `link-device.tsx`'s `text-center`).
6. **Don't add a second accent colour.** The amber rail does the personality work. Lavender lives only in the favicon.
7. **Don't reach for `text-3xl` or larger headings.** Almond has no surface that needs them.
8. **Don't write planning, decision, or audit `.md` files speculatively.** PRODUCT.md and this file are the design ground truth. New `.md` files are created on explicit request only.

---

## 10. When in doubt

Re-read [PRODUCT.md](PRODUCT.md) section 1 ("North-star"). Almond gets used more often when the writing surface is calm and the chrome is invisible. Any design decision that doesn't serve that goal — including this document, if it stops serving it — should be revised.
