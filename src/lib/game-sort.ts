import type { Playtime } from './playtime';
import { load, save } from './storage';

export const SORTS = ['recent', 'name', 'playtime'] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = { recent: 'Recent', name: 'Name', playtime: 'Playtime' };

const SETTINGS_KEY = 'hub:settings';
const SETTINGS_VERSION = 1;

export async function loadSort(): Promise<Sort> {
  const settings = await load<{ sort?: string }>(SETTINGS_KEY, SETTINGS_VERSION);
  return SORTS.find((s) => s === settings?.sort) ?? 'recent';
}

export const saveSort = (sort: Sort) => save(SETTINGS_KEY, SETTINGS_VERSION, { sort });

// Recent: last played first, never-played last. Playtime: most played first. Ties (and never-played) go by name.
// Returns a new array.
export function sortGames<G extends { id: string; title: string }>(games: G[], sort: Sort, playtime: Playtime): G[] {
  const key = (g: G) =>
    sort === 'recent' ? (playtime[g.id]?.lastPlayedAt ?? 0) : sort === 'playtime' ? (playtime[g.id]?.totalMs ?? 0) : 0;
  return [...games].sort((a, b) => key(b) - key(a) || a.title.localeCompare(b.title));
}
