import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isLiveConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('antimatter_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // No auto-guest: user must explicitly sign in or choose guest mode
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLiveSupabaseConfigured) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email || 'engineer@antimatter.ai',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            isGuest: false,
          };
          setUser(appUser);
          localStorage.setItem('antimatter_user', JSON.stringify(appUser));
        }
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email || 'engineer@antimatter.ai',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            isGuest: false,
          };
          setUser(appUser);
          localStorage.setItem('antimatter_user', JSON.stringify(appUser));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = async (email: string, pass: string): Promise<{ error?: string }> => {
    if (!isLiveSupabaseConfigured) {
      // Offline mock authentication
      const appUser: AppUser = {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        isGuest: false,
      };
      setUser(appUser);
      localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { error: error.message };
      if (data.user) {
        const appUser: AppUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0],
          isGuest: false,
        };
        setUser(appUser);
        localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Authentication error' };
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string): Promise<{ error?: string }> => {
    if (!isLiveSupabaseConfigured) {
      const appUser: AppUser = {
        id: `user-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        isGuest: false,
      };
      setUser(appUser);
      localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name: name || email.split('@')[0] },
        },
      });
      if (error) return { error: error.message };
      if (data.user) {
        const appUser: AppUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: name || email.split('@')[0],
          isGuest: false,
        };
        setUser(appUser);
        localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Registration error' };
    }
  };

  const signInAsGuest = () => {
    const guestUser: AppUser = {
      id: `guest-${Date.now()}`,
      email: 'engineer@antimatter.local',
      name: 'Hardware Engineer (Guest)',
      isGuest: true,
    };
    setUser(guestUser);
    localStorage.setItem('antimatter_user', JSON.stringify(guestUser));
  };

  const signOut = async () => {
    if (isLiveSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('antimatter_user');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLiveConfigured: isLiveSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
