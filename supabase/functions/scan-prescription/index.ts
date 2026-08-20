// Deploy with: supabase functions deploy scan-prescription
// Set the key first: supabase secrets set ANTHROPIC_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

interface ScanPrescriptionRequest {
  imageBase64: string; // data-uri-free base64 payload
  mediaType: string; // e.g. "image/jpeg"
}

/**
 * The slice of the Anthropic Messages API response these functions read: either
 * an error envelope or a list of content blocks. Kept local to each function so
 * they stay independently deployable.
 */
interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  type?: string;
  error?: { message?: string };
  content?: AnthropicContentBlock[];
}

// Extracts structured medicine data from a photographed prescription.
// The app always shows this for review before inserting anything into the
// medicines table — never auto-added, since handwriting/OCR misreads on a
// prescription are a real risk.
serve(async (req) => {
  const { imageBase64, mediaType }: ScanPrescriptionRequest = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Extract each medicine from this prescription image. Return a JSON object
with a "medicines" array, each item having: name, dosage, frequency,
foodRelation ("before"|"after"|"any"), durationDays (number, if specified else null).
Return ONLY valid JSON, no other text, no markdown fences.`,
            },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === 'text');

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock?.text ?? '{}') as unknown;
  } catch {
    parsed = { medicines: [], error: 'Could not parse prescription. Try a clearer photo.' };
  }

  return new Response(JSON.stringify(parsed), {
    headers: { 'content-type': 'application/json' },
  });
});
