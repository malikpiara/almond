# Almond — Product Context

Almond is a **local-first, private self-reflection journal**. It has no remote
database and no SEO needs — it's intimate software, meant to be used every day.

## North-star

The metric that matters is **frequency of reflection**.

More frequent journaling → more pattern-noticing → personal & professional
improvement. Every product and architectural decision is prioritized by one
question:

> **Does this make Almond get used more often?**

When trading off effort, polish, or scope, the tiebreaker is whatever most
increases the odds of writing an entry today.

## Audience & platforms

- Currently for **one user (Malik), desktop-first**.
- Mobile matters for stickiness (reaching for it when tired/lazy), so the
  long-term target is one codebase that works well on **both** phone and
  desktop. The chosen path is a Vite + React SPA that can become an installable
  PWA, rather than a native shell.

## Entity extraction is core to the vision

Each entry is analyzed to extract **people and places**. This is not a
side-feature — it's what eventually lets Almond surface patterns across entries
over time ("every reflection mentioning X", "how often gratitude entries named
family"). Those are relational, indexed queries.

- **Eventual destination:** on-device / local-model inference, so private
  thoughts never leave the device.
- **For now:** be pragmatic. Keep extraction working via a configurable remote
  endpoint, but design so it can be swapped for local inference without touching
  call sites.

## Architectural implications (recorded so future decisions stay consistent)

- **Persistence lives behind one seam** (`src/lib/store.ts`), exposed as an
  **async, query-oriented** API. An async interface is a superset of a sync one,
  so `localStorage` today and **SQLite-WASM / IndexedDB tomorrow** both fit with
  zero call-site churn. SQLite is the likely future engine precisely because
  relational indexed queries power the pattern-recognition north-star.
- **Sync** (e.g. Google Drive of the encrypted `.almond` export) also slots in
  behind the same seam.
- The encrypted export/import is the durability backstop and should stay robust.
