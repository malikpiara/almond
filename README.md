# Almond

A local-first, private daily self-reflection journal.

- **Why** (product intent, north-star, architectural philosophy): [PRODUCT.md](PRODUCT.md)
- **How it looks and reads** (palette, type, spacing, components, anti-patterns): [DESIGN.md](DESIGN.md)

## Stack

- **Web app**: Vite 8 + React 19 + TanStack Router (code-defined routes); Tailwind CSS v4 via `@tailwindcss/vite`; shadcn/ui (new-york).
- **Persistence**: async store seam at `src/lib/store.ts` over `localStorage`. Async-shaped so the engine can swap to SQLite-WASM / IndexedDB without touching call sites (see PRODUCT.md).
- **Sync**: end-to-end encrypted blob in Google Drive `appDataFolder`. AES-256-GCM + PBKDF2 in `src/lib/crypto.ts`. Device pairing via QR (key in the URL fragment, never sent to a server).
- **Entity extraction**: Cloudflare Worker (`worker/`) calls Anthropic. The SPA never holds the API key.
- **Host**: Cloudflare Pages (`almond-49g.pages.dev`) + Worker (`almond-extract.upfra-me.workers.dev`).

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server on :5173
pnpm worker:dev   # extraction Worker on :8787 (needs worker/.dev.vars with ANTHROPIC_API_KEY)
```

The extraction Worker is optional during day-to-day UI work — entries save and render without it; entities just don't get tagged.

### Build & verify

```bash
pnpm build        # tsc --noEmit && vite build
pnpm lint
```

## Deploy

```bash
pnpm pages:deploy     # builds + deploys to Cloudflare Pages (branch: main = production)
pnpm worker:deploy    # deploys the extraction Worker
pnpm worker:secret    # rotates the Worker's ANTHROPIC_API_KEY secret
```

## Routes

| Path | File | Job |
|---|---|---|
| `/` | `src/routes/index-redirect.tsx` | Land-in-writing: open the last board the user wrote in. |
| `/journals` | `src/routes/home.tsx` | List of journals; create a new one. |
| `/boards/$id` | `src/routes/board.tsx` | The journal: prompt + textarea + entries. |
| `/link` | `src/routes/link-device.tsx` | QR pairing receiver — reads the key from the URL fragment, syncs. |

## Layout

```
src/
  routes/        page-level components (TanStack routes wire them in main.tsx)
  components/    feature components (sync-modal, responsive-dialog, …)
    ui/          shadcn primitives
  lib/           store, crypto, drive sync, api client, schema/migration
  hooks/         useIsMobile, useSwipeBack
worker/          Cloudflare Worker for entity extraction (Anthropic-backed)
public/          PWA icons, manifest
scripts/         icon generation
```

## Secrets

`ANTHROPIC_API_KEY` lives in two places only: `worker/.dev.vars` (gitignored) for local Worker dev, and as a Cloudflare Worker secret in production. It is **never** a `VITE_` variable and **never** in the SPA bundle.

`VITE_GOOGLE_CLIENT_ID` is the OAuth client ID for Drive sync. It is a public client identifier and safe to ship.
