const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4.5';

type Chunk = { choices?: Array<{ delta?: { content?: string | null; refusal?: string | null }; finish_reason?: string | null }>; error?: { message?: string } };

export function createLessonGateway(apiKey: string) {
  return {
    async stream(system: string, user: string): Promise<string> {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, stream: true, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
        throw new Error(body?.error?.message ?? body?.message ?? `Ошибка генерации (${response.status})`);
      }
      if (!response.body) throw new Error('Пустой ответ генератора');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      let denied = false;
      const handleFrame = (frame: string) => {
        const payload = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!payload || payload === '[DONE]') return;
        const chunk = JSON.parse(payload) as Chunk;
        if (chunk.error) throw new Error(chunk.error.message ?? 'Ошибка генерации');
        for (const choice of chunk.choices ?? []) {
          if (choice.delta?.refusal || choice.finish_reason === 'content_filter') denied = true;
          text += choice.delta?.content ?? '';
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            handleFrame(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
          }
        }
        if (buffer.trim()) handleFrame(buffer);
      } finally { reader.releaseLock(); }
      if (denied) throw new Error('Модель отказалась сформировать план урока');
      if (!text.trim()) throw new Error('Пустой ответ генератора');
      return text;
    },
  };
}