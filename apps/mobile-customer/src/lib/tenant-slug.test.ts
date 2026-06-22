import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  extractSlugFromPath,
  loadPersistedSlug,
  persistSlug,
  STORAGE_KEY,
} from './tenant-slug';

describe('extractSlugFromPath', () => {
  it('extrai slug de /b/:slug', () => {
    expect(extractSlugFromPath('/b/zezinho')).toBe('zezinho');
  });
  it('extrai slug de deep link com scheme', () => {
    expect(extractSlugFromPath('barbeariacustomer://b/zezinho')).toBe('zezinho');
  });
  it('ignora query string', () => {
    expect(extractSlugFromPath('/b/zezinho?utm=x')).toBe('zezinho');
  });
  it('retorna null sem match', () => {
    expect(extractSlugFromPath('/perfil')).toBeNull();
    expect(extractSlugFromPath(null)).toBeNull();
  });
});

describe('persistência', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  it('persiste e lê o slug', async () => {
    await persistSlug('zezinho');
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('zezinho');
    expect(await loadPersistedSlug()).toBe('zezinho');
  });
  it('loadPersistedSlug retorna null se nada salvo', async () => {
    expect(await loadPersistedSlug()).toBeNull();
  });
});
