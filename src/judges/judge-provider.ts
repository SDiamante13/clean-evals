/**
 * Score and explanation returned by an LLM judge.
 */
export interface JudgeResult {
  score: number;
  reasoning: string;
}

/**
 * Interface for LLM-based evaluation judges.
 *
 * Implementations send a grading prompt to an LLM and parse the response
 * into a normalized score (0.0–1.0) with reasoning. Built-in providers:
 * - {@link OpenAIJudgeProvider} — OpenAI (gpt-4o default)
 * - {@link AnthropicJudgeProvider} — Anthropic (Claude Sonnet default)
 * - {@link OllamaJudgeProvider} — Local Ollama (llama3 default)
 */
export interface JudgeProvider {
  judge(prompt: string): Promise<JudgeResult>;
}
