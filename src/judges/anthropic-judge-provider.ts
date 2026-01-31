import Anthropic from '@anthropic-ai/sdk';
import type { JudgeProvider, JudgeResult } from './judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';
import { parseJudgeResponse } from './parse-judge-response.js';

export interface AnthropicJudgeOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class AnthropicJudgeProvider implements JudgeProvider {
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicJudgeOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model ?? 'claude-sonnet-4-20250514';
  }

  async judge(prompt: string): Promise<JudgeResult> {
    const response: Anthropic.Message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const block: Anthropic.ContentBlock | undefined = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Anthropic returned empty response');
    }

    return parseJudgeResponse(block.text);
  }
}
