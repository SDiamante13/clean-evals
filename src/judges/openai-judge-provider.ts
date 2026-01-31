import OpenAI from 'openai';
import type { JudgeProvider, JudgeResult } from './judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';
import { parseJudgeResponse } from './parse-judge-response.js';

export interface OpenAIJudgeOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIJudgeProvider implements JudgeProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIJudgeOptions = {}) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model ?? 'gpt-4o';
  }

  async judge(prompt: string): Promise<JudgeResult> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response: OpenAI.Chat.Completions.ChatCompletion =
      await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
      });

    const content: string | null =
      response.choices[0]?.message?.content ?? null;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return parseJudgeResponse(content);
  }
}
