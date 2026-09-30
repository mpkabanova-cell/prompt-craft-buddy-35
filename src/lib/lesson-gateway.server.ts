import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';

export function createLessonGateway(apiKey: string) {
  let runId: string | undefined;
  let gatewayError: { status: number; message: string } | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set('X-Lovable-AIG-Run-ID', runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get('X-Lovable-AIG-Run-ID') ?? undefined;
      if (!response.ok) {
        const body = await response.clone().json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
        gatewayError = { status: response.status, message: body?.error?.message ?? body?.message ?? `Ошибка генерации (${response.status})` };
      }
      return response;
    },
  });

  return {
    getError: () => gatewayError,
    stream: (system: string, user: string) => streamText({
      model: provider.responses('openai/gpt-6-astra'),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      providerOptions: { openai: {
        forceReasoning: true,
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        store: false,
        include: ['reasoning.encrypted_content'],
      } },
    }),
  };
}