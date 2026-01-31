import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicJudgeProvider } from './anthropic-judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe('AnthropicJudgeProvider', () => {
  let provider: AnthropicJudgeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicJudgeProvider({ model: 'claude-sonnet-4-20250514' });
  });

  it('sends system prompt and user prompt correctly', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score": 0.9, "reasoning": "Good work"}' }],
    });

    const result = await provider.judge('Evaluate this output');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Evaluate this output' }],
    });

    expect(result).toEqual({ score: 0.9, reasoning: 'Good work' });
  });

  it('throws on empty response', async () => {
    mockCreate.mockResolvedValue({ content: [] });

    await expect(provider.judge('test')).rejects.toThrow('Anthropic returned empty response');
  });

  it('throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json' }],
    });

    await expect(provider.judge('test')).rejects.toThrow();
  });
});
