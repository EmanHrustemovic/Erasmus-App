import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readCached<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(`erasmus-cache:${key}`);
  return value ? JSON.parse(value) as T : null;
}

export async function writeCached<T>(key: string, value: T) {
  await AsyncStorage.setItem(`erasmus-cache:${key}`, JSON.stringify(value));
}
