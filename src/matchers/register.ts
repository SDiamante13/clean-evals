import { expect } from 'vitest';
import { toPassTraceEval } from './to-pass-trace-eval.js';
import { toPassEval } from './to-pass-eval.js';
import { toPassHybridEval } from './to-pass-hybrid-eval.js';

expect.extend({ toPassTraceEval, toPassEval, toPassHybridEval });
