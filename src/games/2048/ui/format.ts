// 12,345: one regex instead of toLocaleString, so Android and the web print the same.
export const formatScore = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
