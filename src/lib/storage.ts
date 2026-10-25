import AsyncStorage from '@react-native-async-storage/async-storage';

import { isRecord } from './guards';

// Everything is stored as JSON { version, data } so a later format change can reject old data instead of misreading it.
// A failed write (full disk) is swallowed: callers fire and forget on purpose, and a game is still playable without it.
export async function save(key: string, version: number, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ version, data }));
  } catch {}
}

// Returns null when the key is missing or unreadable, the version differs or the stored text is not our format.
export async function load<T>(key: string, version: number): Promise<T | null> {
  try {
    const text = await AsyncStorage.getItem(key);
    if (text === null) return null;
    const parsed = JSON.parse(text);
    if (!isRecord(parsed) || parsed.version !== version || !('data' in parsed)) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

// The end of a game: delete the save first, then write the stats. If the app dies in between, the game is lost
// rather than counted twice on resume. If the delete fails, nothing is counted and the save stays.
export async function replaceSaveWithStats(
  saveKey: string,
  statsKey: string,
  version: number,
  stats: unknown,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(saveKey);
  } catch {
    return;
  }
  await save(statsKey, version, stats);
}
