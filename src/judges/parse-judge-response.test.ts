import { describe, it, expect } from 'vitest';
import { parseJudgeResponse } from './parse-judge-response.js';

describe('parseJudgeResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseJudgeResponse(
      '{"score": 0.85, "reasoning": "Well done"}',
    );
    expect(result).toEqual({ score: 0.85, reasoning: 'Well done' });
  });

  it('extracts JSON from surrounding text', () => {
    const result = parseJudgeResponse(
      'Here is my evaluation: {"score": 0.5, "reasoning": "Average"} end',
    );
    expect(result).toEqual({ score: 0.5, reasoning: 'Average' });
  });

  it('throws on non-JSON input', () => {
    expect(() => parseJudgeResponse('no json here')).toThrow(
      'not valid JSON',
    );
  });

  it('throws when score is missing', () => {
    expect(() =>
      parseJudgeResponse('{"reasoning": "test"}'),
    ).toThrow('missing score or reasoning');
  });

  it('throws when reasoning is missing', () => {
    expect(() => parseJudgeResponse('{"score": 0.5}')).toThrow(
      'missing score or reasoning',
    );
  });
});
