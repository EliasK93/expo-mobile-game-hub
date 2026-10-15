import AsyncStorage from '@react-native-async-storage/async-storage';

// Everything is stored as JSON { version, data } so a later format change can reject old data instead of misreading it.
export async function save(key: string, version: number, data: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify({ version, data }));
}

// Returns null when the key is missing, the version differs or the stored text is not our format.
export async function load<T>(key: string, version: number): Promise<T | null> {
  const text = await AsyncStorage.getItem(key);
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || parsed.version !== version || !('data' in parsed)) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export const remove = (key: string): Promise<void> => AsyncStorage.removeItem(key);
