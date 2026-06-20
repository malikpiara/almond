import type { Entry } from '@/types';

type Entities = NonNullable<Entry['entities']>;

const EMPTY: Entities = { people: [], places: [] };

/**
 * Entity-extraction client — the seam between Almond and whatever performs
 * people/places extraction. Today it points at a remote endpoint configured via
 * `VITE_EXTRACT_API_URL`; tomorrow it could call an on-device model. Callers
 * don't change either way.
 *
 * The backend is deferred (the old Next API route can't come along to Vite), so
 * when `VITE_EXTRACT_API_URL` is unset, or the request fails, this resolves to
 * empty entities rather than throwing — an entry must always save, even when
 * extraction is unavailable.
 */
export async function extractEntities(text: string): Promise<Entities> {
  const base = import.meta.env.VITE_EXTRACT_API_URL;
  if (!base) return EMPTY;

  try {
    const res = await fetch(`${base}/extract-entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return {
      people: data.people ?? [],
      places: data.places ?? [],
    };
  } catch {
    return EMPTY;
  }
}
