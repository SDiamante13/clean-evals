/** Deterministic evaluations require all expected tool calls to match. */
export const DETERMINISTIC_PASS_THRESHOLD = 1.0;

/** LLM judge evaluations use a lower threshold to account for scoring variance. */
export const LLM_PASS_THRESHOLD = 0.7;

export const DEFAULT_WARN_THRESHOLD = 0.5;
