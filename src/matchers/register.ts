import { expect } from 'vitest';
import { toPassTraceEval } from './to-pass-trace-eval.js';
import { toPassEval } from './to-pass-eval.js';

expect.extend({ toPassTraceEval, toPassEval });
