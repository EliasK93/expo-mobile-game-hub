// Type guards for checking data read back from storage.
export const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
