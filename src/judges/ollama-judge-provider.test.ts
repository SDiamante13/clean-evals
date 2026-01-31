import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaJudgeProvider } from './ollama-judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('OllamaJudgeProvider', () => {
  let provider: OllamaJudgeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaJudgeProvider({ model: 'llama3' });
  });

  it('sends system prompt and user prompt correctly', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        message: { content: '{"score": 0.85, "reasoning": "Solid output"}' },
      })
    );

    const result = await provider.judge('Evaluate this output');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: 'Evaluate this output' },
        ],
      }),
    });

    expect(result).toEqual({ score: 0.85, reasoning: 'Solid output' });
  });

  it('uses custom baseURL', async () => {
    const custom = new OllamaJudgeProvider({ baseURL: 'http://my-server:8080' });
    mockFetch.mockResolvedValue(
      jsonResponse({
        message: { content: '{"score": 0.5, "reasoning": "OK"}' },
      })
    );

    await custom.judge('test');

    expect(mockFetch).toHaveBeenCalledWith('http://my-server:8080/api/chat', expect.objectContaining({ method: 'POST' }));
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500));

    await expect(provider.judge('test')).rejects.toThrow('Ollama request failed: 500');
  });

  it('throws on empty response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: {} }));

    await expect(provider.judge('test')).rejects.toThrow('Ollama returned empty response');
  });

  it('throws on invalid JSON response', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        message: { content: 'not json' },
      })
    );

    await expect(provider.judge('test')).rejects.toThrow();
  });
});
