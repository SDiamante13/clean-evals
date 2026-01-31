export interface JudgeResult {
  score: number;
  reasoning: string;
}

export interface JudgeProvider {
  judge(prompt: string): Promise<JudgeResult>;
}
