import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiClient, Storage } from './client';

const KEY = 'garap.sesi';

// SecureStore tidak ada di web; localStorage dipakai hanya untuk pratinjau dev di browser.
const secure: Storage = {
  async read() {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async write(v) {
    if (Platform.OS === 'web') {
      if (v === null) globalThis.localStorage?.removeItem(KEY); else globalThis.localStorage?.setItem(KEY, v);
      return;
    }
    if (v === null) await SecureStore.deleteItemAsync(KEY); else await SecureStore.setItemAsync(KEY, v);
  },
};

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';
export const api = new ApiClient({ baseUrl: API_BASE, storage: secure });
