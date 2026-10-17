// Type guards for checking data read back from storage.
export const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
export const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';
export const isMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
