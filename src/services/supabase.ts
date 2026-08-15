import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FALLBACK_URL = 'https://xokqlvvqmqybwbwopqmy.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhva3FsdnZxbXF5Yndid29wcW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODM4NjYsImV4cCI6MjEwMjM1OTg2Nn0.mh8raVxS_C6JbYmgxhOMHa6q4dO7DAyk8WlYwLcsOEk';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

// Safe storage adapter for React Native and Web
const customStorageAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') return null;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage.getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') return;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage.setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') return;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage.removeItem error:', e);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
