// Deploy with: supabase functions deploy identify-meal
// Requires: supabase secrets set ANTHROPIC_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

interface IdentifyMealRequest {
  imageBase64?: string;
  mediaType?: string;
  manualText?: string;
  userGoal: string;
  dietaryPreference: string;
}

// Identifies food from a photo or manual text description, estimates
// nutrition, and returns a short goal-aware suggestion. The client always
// shows this as editable in the Confirm & Edit screen — never auto-saved,
// same principle as prescription scanning.
serve(async (req) => {
  try {
    const { imageBase64, mediaType, manualText, userGoal, dietaryPreference }: IdentifyMealRequest =
      await req.json();

    const promptText = `Identify the food ${
      imageBase64 ? 'in this photo' : `described as: "${manualText}"`
    }. This is likely Indian home-cooked or restaurant food. The user's goal is "${userGoal}" and
dietary preference is "${dietaryPreference}". Return a JSON object with:
- items: array of { name, calories, protein, carbs, fat, quantity, unit } where the macros are
  numbers for the portion you estimate, quantity is that portion as a number, and unit is one of
  "g", "ml", "piece", "cup", "tbsp", "bowl"
- suggestion: a short (1-2 sentence), calm, practical note on how this meal fits the user's goal.
Do not give medical advice. Return ONLY valid JSON, no markdown fences, no other text.`;

    const content = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: promptText },
        ]
      : promptText;

    // NOTE: use a real, current Anthropic model id. "claude-sonnet-4-6" is
    // not a valid model string — that was silently causing every request
    // to fail upstream. claude-sonnet-4-5-20250929 is a real, current model.
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();

    // Surface upstream failures instead of silently returning {}.
    // This is the fix: previously, if Anthropic returned an error object
    // (bad key, bad model, rate limit, etc.), data.content was undefined,
    // textBlock was undefined, and JSON.parse('{}') quietly returned {}
    // with a 200 status — impossible to debug from the client.
    if (!response.ok || data.type === 'error') {
      console.error('Anthropic API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          items: [],
          suggestion: '',
          error: data.error?.message ?? `Anthropic API returned status ${response.status}`,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    const textBlock = data.content?.find((b: any) => b.type === 'text');

    if (!textBlock?.text) {
      console.error('No text block in Anthropic response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ items: [], suggestion: '', error: 'AI returned no readable response.' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', textBlock.text);
      parsed = {
        items: [],
        suggestion: '',
        error: 'Could not identify the meal. Try a clearer photo or description.',
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // Catch-all so a genuine crash also comes back as a visible error
    // instead of an unhandled exception / empty response.
    console.error('identify-meal function crashed:', err);
    return new Response(
      JSON.stringify({ items: [], suggestion: '', error: 'Server error identifying meal.' }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }
});