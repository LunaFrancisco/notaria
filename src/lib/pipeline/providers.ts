/**
 * LLM providers for the Next.js server environment.
 * Reads API keys from process.env (set via .env.local).
 * Mirrored from cli/src/providers/ — keep in sync.
 */

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface LLMProvider {
  name: string;
  complete(messages: ChatMessage[]): Promise<string>;
}

export interface LoadedFile {
  base64: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export function toDataUri(file: LoadedFile): string {
  return `data:${file.mimeType};base64,${file.base64}`;
}

// ---------------------------------------------------------------------------
// OpenRouter provider
// ---------------------------------------------------------------------------

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY ?? '';
    this.model = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured in .env.local');
    }
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://notaryflow.cl',
        'X-Title': 'NotaryFlow Web',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter: empty model response');
    }
    return content;
  }
}

// ---------------------------------------------------------------------------
// Mistral OCR provider
// ---------------------------------------------------------------------------

export class MistralOCRProvider implements LLMProvider {
  name = 'mistral';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY ?? '';

    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY not configured in .env.local');
    }
  }

  async ocr(file: LoadedFile): Promise<string> {
    const response = await fetch(`${this.baseUrl}/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: file.mimeType === 'application/pdf'
          ? { type: 'document_url', document_url: toDataUri(file) }
          : { type: 'image_url', image_url: toDataUri(file) },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral OCR error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      pages: Array<{ markdown: string }>;
    };
    return data.pages.map(p => p.markdown).join('\n\n---\n\n');
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string'
            ? m.content
            : m.content.map(p => {
                if (p.type === 'text') return { type: 'text', text: p.text };
                return p;
              }),
        })),
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral chat error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Mistral: empty model response');
    }
    return content;
  }
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export type ProviderName = 'openrouter' | 'mistral';

export function createProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? 'openrouter') as ProviderName;

  switch (providerName) {
    case 'openrouter':
      return new OpenRouterProvider();
    case 'mistral':
      return new MistralOCRProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
