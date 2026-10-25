// The share of games won in whole percent; 0 when nothing is played (Make 24 and Minesweeper).
export const winPercent = (played: number, wins: number) => (played === 0 ? 0 : Math.round((wins / played) * 100));
