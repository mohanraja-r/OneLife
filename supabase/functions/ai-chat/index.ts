// Deploy with: supabase functions deploy ai-chat
// Requires: supabase secrets set ANTHROPIC_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

interface AIChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userContext?: {
    profile?: Record<string, unknown>;
    medicines?: unknown[];
    recentMeals?: unknown[];
    healthData?: Record<string, unknown>;
    medicalInfo?: Record<string, unknown>;
  };
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

/** AI Chat function that provides health advice and personal data search capabilities. */
serve(async (req) => {
  try {
    const {
      message,
      conversationHistory = [],
      userContext = {},
    }: AIChatRequest = await req.json();

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt(userContext);

    // Build messages array for Claude
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = (await response.json()) as AnthropicResponse;

    if (!response.ok || data.type === 'error') {
      console.error('Anthropic API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          content: '',
          error: data.error?.message ?? `Anthropic API returned status ${response.status}`,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    const textBlock = data.content?.find((b) => b.type === 'text');

    if (!textBlock?.text) {
      return new Response(
        JSON.stringify({
          content: '',
          error: 'No text in response',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content: textBlock.text }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('ai-chat error:', error);
    return new Response(
      JSON.stringify({ content: '', error: String(error) }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }
});

/** Build system prompt with user context for personalized responses. */
function buildSystemPrompt(userContext: Record<string, unknown>): string {
  let contextStr = '';

  if (userContext.profile) {
    contextStr += `\n## User Profile\n${JSON.stringify(userContext.profile, null, 2)}`;
  }

  if (userContext.medicines && Array.isArray(userContext.medicines)) {
    contextStr += `\n## Current Medicines\n${JSON.stringify(userContext.medicines, null, 2)}`;
  }

  if (userContext.medicalInfo) {
    contextStr += `\n## Medical Information\n${JSON.stringify(userContext.medicalInfo, null, 2)}`;
  }

  if (userContext.recentMeals && Array.isArray(userContext.recentMeals)) {
    contextStr += `\n## Recent Meals\n${JSON.stringify(userContext.recentMeals, null, 2)}`;
  }

  if (userContext.healthData) {
    contextStr += `\n## Health Data\n${JSON.stringify(userContext.healthData, null, 2)}`;
  }

  return `You are a friendly, knowledgeable health and wellness assistant for the OneLife app. You help users:
- Answer questions about their medicines, dosages, and interactions
- Provide insights on their meal logging and nutrition
- Give personalized health advice based on their profile and data
- Help them understand their health trends and data
- Provide encouragement and motivation for healthy habits
- Answer questions about pregnancy, cycle tracking, and women's health if applicable

Always be empathetic, non-judgmental, and practical. If asked about serious medical concerns, remind users to consult with their healthcare provider. Never provide diagnoses or replace professional medical advice.

You have access to the user's personal health data:
${contextStr}

When users ask to search or look up their personal data, use the information provided above. Be specific about dates, values, and trends when referencing their data.`;
}
