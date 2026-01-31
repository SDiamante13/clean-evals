import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIJudgeProvider } from './openai-judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
    },
  };
});

describe('OpenAIJudgeProvider', () => {
  let provider: OpenAIJudgeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIJudgeProvider({ model: 'gpt-4o' });
  });

  it('sends system prompt and user prompt correctly', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"score": 0.9, "reasoning": "Good work"}',
          },
        },
      ],
    });

    const result = await provider.judge('Evaluate this output');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: 'Evaluate this output' },
      ],
      temperature: 0,
    });

    expect(result).toEqual({ score: 0.9, reasoning: 'Good work' });
  });

  it('throws on empty response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    await expect(provider.judge('test')).rejects.toThrow('OpenAI returned empty response');
  });

  it('throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });

    await expect(provider.judge('test')).rejects.toThrow();
  });
});
