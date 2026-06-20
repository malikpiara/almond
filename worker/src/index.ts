/**
 * Almond entity-extraction Worker.
 *
 * Ports the old Next.js /api/extract-entities route. The SPA (src/lib/api.ts)
 * POSTs { text } and expects { people: string[], places: string[] } back.
 * The Anthropic key lives only as a Worker secret — never in the SPA bundle.
 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

// Lock the endpoint to Almond's own origins (production Pages alias, its preview
// deploys, and local dev) so arbitrary sites can't spend the Anthropic budget.
// Non-matching origins get the production alias back, which the browser rejects.
function allowedOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  const ok =
    origin === 'http://localhost:5173' ||
    origin === 'https://almond-49g.pages.dev' ||
    /^https:\/\/[a-z0-9]+\.almond-49g\.pages\.dev$/.test(origin);
  return ok ? origin : 'https://almond-49g.pages.dev';
}

const PROMPT = (text: string) =>
  `Analyze this journal entry and extract all people and places mentioned.
            For people: Include both named individuals (like "Francisco Ríos Niño") AND relationship references (like "my sister", "my mom", "my friend"). Turn references like "my sister" into Sister and so on.
            For places: Include cities, countries, venues, or any location references.
 Return ONLY a JSON object with this exact structure, no other text:
{
  "people": ["name1", "name2"],
  "places": ["place1", "place2"]
}

Journal entry: ${text}`;

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    try {
      const { text } = (await request.json()) as { text?: string };
      if (!text) {
        return json({ people: [], places: [], error: 'Missing text' }, 400, origin);
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          // claude-sonnet-4-20250514 retired 2026-06-15; claude-sonnet-4-6 is
          // its drop-in replacement (latest Sonnet).
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: PROMPT(text) }],
        }),
      });

      if (!response.ok) {
        return json(
          { people: [], places: [], error: `Anthropic ${response.status}` },
          500,
          origin
        );
      }

      const data = (await response.json()) as {
        content?: { type: string; text?: string }[];
      };
      const textContent =
        data.content?.find((item) => item.type === 'text')?.text || '{}';
      // The model may wrap the JSON in a ```json fence or add prose; pull out
      // the first {...} object so parsing is robust to formatting drift.
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      const entities = (jsonMatch ? JSON.parse(jsonMatch[0]) : {}) as {
        people?: string[];
        places?: string[];
      };

      return json(
        { people: entities.people ?? [], places: entities.places ?? [] },
        200,
        origin
      );
    } catch (error) {
      return json(
        { people: [], places: [], error: String(error) },
        500,
        origin
      );
    }
  },
};
