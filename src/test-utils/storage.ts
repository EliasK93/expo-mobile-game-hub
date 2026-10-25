import AsyncStorage from '@react-native-async-storage/async-storage';

// The AsyncStorage mock holds the `{ version, data }` JSON the app's storage helper writes.
export const seed = (key: string, version: number, data: unknown) =>
  AsyncStorage.setItem(key, JSON.stringify({ version, data }));

// What the app saved under `key`: the parsed `{ version, data }`, or null when nothing is there.
export const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
