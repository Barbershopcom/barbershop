import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'tenant_slug';

/** Extrai o slug de um path/URL `/b/:slug` (com ou sem scheme/query). */
export function extractSlugFromPath(path: string | null): string | null {
  if (!path) return null;
  const match = path.match(/\/b\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

export async function persistSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, slug);
}

export async function loadPersistedSlug(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}
