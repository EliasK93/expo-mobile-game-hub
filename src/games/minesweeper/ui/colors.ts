// The one place that maps a cell's number (1-8) to its colour token: the classic Minesweeper colours. The return type is
// checked against the theme tokens by tsc (via ThemeColor at the call site), so a 0, a 9 or a typo does not compile.
export const numberColor = (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => `mineNum${n}` as const;
