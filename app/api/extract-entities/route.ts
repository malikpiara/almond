import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze this journal entry and extract all people and places mentioned.
            For people: Include both named individuals (like "Francisco Ríos Niño") AND relationship references (like "my sister", "my mom", "my friend"). Turn references like "my sister" into Sister and so on.
            For places: Include cities, countries, venues, or any location references.
 Return ONLY a JSON object with this exact structure, no other text:
{
  "people": ["name1", "name2"],
  "places": ["place1", "place2"]
}

Journal entry: ${text}`,
          },
        ],
      }),
    });

    const data = await response.json();

    // Extract the text content from Claude's response
    const textContent =
      data.content.find((item: any) => item.type === 'text')?.text || '{}';

    // Parse the JSON from the response
    const entities = JSON.parse(textContent);

    return NextResponse.json(entities);
  } catch (error) {
    console.error('Error extracting entities:', error);
    return NextResponse.json(
      { people: [], places: [], error: 'Failed to extract entities' },
      { status: 500 }
    );
  }
}
