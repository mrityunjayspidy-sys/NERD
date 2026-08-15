import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserSettings } from '../types';
import { getExpoPushToken } from '../services/notifications';

import { generateNerdCode } from '../services/userCode';

interface AuthContextType {
  user: UserProfile | null;
  settings: UserSettings | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateProfile: (updates: { name: string }) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = '@partner_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  user_id: '',
  morning_digest_enabled: true,
  morning_digest_time: '08:00',
  device_calendar_sync: true,
  theme_preference: 'system',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            nerd_code: session.user.user_metadata?.nerd_code || generateNerdCode(session.user.id),
          });
          await fetchUserSettings(session.user.id);
        }

        // Listen for Supabase auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              nerd_code: session.user.user_metadata?.nerd_code || generateNerdCode(session.user.id),
            });
            await fetchUserSettings(session.user.id);
          } else if (mounted) {
            setUser(null);
          }
        });
      } catch (err) {
        console.warn('Error during auth init:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchUserSettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setSettings(data);
      } else {
        // Create initial settings row
        const newSet: UserSettings = {
          user_id: userId,
          morning_digest_enabled: true,
          morning_digest_time: '08:00',
          device_calendar_sync: false,
          theme_preference: 'system',
        };
        await supabase.from('user_settings').upsert(newSet);
        setSettings(newSet);
      }

      // Sync push token if available
      const pushToken = await getExpoPushToken();
      if (pushToken && (!data || data.push_token !== pushToken)) {
        await supabase
          .from('user_settings')
          .update({ push_token: pushToken })
          .eq('user_id', userId);
      }
    } catch (e) {
      console.warn('Error fetching user settings:', e);
    }
  }

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
      });
      await fetchUserSettings(data.user.id);
    }

    return {};
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
      });
      await fetchUserSettings(data.user.id);
    }

    if (data.user && !data.session) {
      return { message: 'Account created! Check your email if confirmation is enabled, or sign in.' };
    }

    return {};
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { message: 'Password reset instructions sent to your email.' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...(settings || DEFAULT_SETTINGS), ...newSettings };
    setSettings(updated);
    // Also cache locally for faster loads
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    if (user) {
      try {
        await supabase
          .from('user_settings')
          .update(newSettings)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('Error saving settings to Supabase:', err);
      }
    }
  };

  const updateProfile = async (updates: { name: string }) => {
    if (!user) return { error: 'No authenticated user found.' };

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { name: updates.name },
      });

      if (error) {
        return { error: error.message };
      }

      setUser((prev) => (prev ? { ...prev, name: updates.name } : prev));
      return {};
    } catch (err: any) {
      console.warn('Error updating user profile in Supabase:', err);
      return { error: err.message || 'Failed to update username.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        isLoading,
        login,
        signUp,
        resetPassword,
        logout,
        updateSettings,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
