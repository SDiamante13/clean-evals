import type { JudgeProvider, JudgeResult } from './judge-provider.js';
import { JUDGE_SYSTEM_PROMPT } from './system-prompt.js';
import { parseJudgeResponse } from './parse-judge-response.js';

export interface OllamaJudgeOptions {
  model?: string;
  baseURL?: string;
}

interface OllamaResponse {
  message?: { content?: string };
}

export class OllamaJudgeProvider implements JudgeProvider {
  private model: string;
  private baseURL: string;

  constructor(options: OllamaJudgeOptions = {}) {
    this.model = options.model ?? 'llama3';
    this.baseURL = options.baseURL ?? 'http://localhost:11434';
  }

  async judge(prompt: string): Promise<JudgeResult> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const content = data.message?.content;

    if (!content) {
      throw new Error('Ollama returned empty response');
    }

    return parseJudgeResponse(content);
  }
}
