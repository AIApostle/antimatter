import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { getApiBase } from '../lib/apiConfig';

export interface UserSettings {
  theme?: string;
  auto_drc?: boolean;
  default_layer_count?: number;
  default_board_finish?: string;
  [key: string]: any;
}

export interface UserDetails {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  organization?: string;
  experience_level?: string;
  preferred_eda?: string;
  preferred_mcu?: string;
  bio?: string;
  avatar_url?: string;
  settings?: UserSettings;
}

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  token: string | null;
  userDetails: UserDetails | null;
  loading: boolean;
  isLiveConfigured: boolean;
  isRecoveryMode: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name?: string,
    details?: {
      role?: string;
      experience_level?: string;
      organization?: string;
      preferred_eda?: string;
      preferred_mcu?: string;
    }
  ) => Promise<{ error?: string; message?: string }>;
  forgotPassword: (email: string, redirectTo?: string) => Promise<{ error?: string; message?: string }>;
  resetPassword: (newPassword: string) => Promise<{ error?: string; message?: string }>;
  updateUserProfile: (details: Partial<UserDetails>) => Promise<{ error?: string; details?: UserDetails }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    // Only trust localStorage if live Supabase is not configured; otherwise wait for getSession()
    if (!isLiveSupabaseConfigured) {
      const saved = localStorage.getItem('antimatter_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [userDetails, setUserDetails] = useState<UserDetails | null>(() => {
    if (!isLiveSupabaseConfigured) {
      const saved = localStorage.getItem('antimatter_user_details');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
    }
    return false;
  });

  const fetchProfile = async (userId: string, authToken?: string) => {
    try {
      if (authToken) {
        const res = await fetch(`${getApiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUserDetails(data.profile);
            localStorage.setItem('antimatter_user_details', JSON.stringify(data.profile));
            return;
          }
        }
      }
      if (isLiveSupabaseConfigured) {
        const { data } = await supabase.from('user_details').select('*').eq('id', userId).maybeSingle();
        if (data) {
          setUserDetails(data);
          localStorage.setItem('antimatter_user_details', JSON.stringify(data));
        }
      }
    } catch {
      // ignore fetch failures
    }
  };

  useEffect(() => {
    if (isLiveSupabaseConfigured) {
      // Get initial session and strictly enforce authentication
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email || 'engineer@antimatter.ai',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
            role: session.user.user_metadata?.role || 'Hardware Engineer',
            isGuest: false,
          };
          setUser(appUser);
          localStorage.setItem('antimatter_user', JSON.stringify(appUser));
          fetchProfile(session.user.id, session.access_token);
        } else {
          // STRICT AUTH BLOCK: No active session - clear any stale data
          setUser(null);
          setUserDetails(null);
          localStorage.removeItem('antimatter_user');
          localStorage.removeItem('antimatter_user_details');
        }
        setLoading(false);
      });

      // Listen for auth events & password recovery
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        setSession(currentSession);
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
        if (currentSession?.user) {
          const appUser: AppUser = {
            id: currentSession.user.id,
            email: currentSession.user.email || 'engineer@antimatter.ai',
            name: currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0],
            role: currentSession.user.user_metadata?.role || 'Hardware Engineer',
            isGuest: false,
          };
          setUser(appUser);
          localStorage.setItem('antimatter_user', JSON.stringify(appUser));
          fetchProfile(currentSession.user.id, currentSession.access_token);
        } else {
          // Strictly clear session on signout or invalid session
          setUser(null);
          setUserDetails(null);
          localStorage.removeItem('antimatter_user');
          localStorage.removeItem('antimatter_user_details');
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
      const mockId = `user-${Date.now()}`;
      const appUser: AppUser = {
        id: mockId,
        email,
        name: email.split('@')[0],
        role: 'Hardware Engineer',
        isGuest: false,
      };
      const details: UserDetails = {
        id: mockId,
        email,
        full_name: email.split('@')[0],
        role: 'Hardware Engineer',
        experience_level: 'Intermediate',
        preferred_eda: 'KiCad 8',
        preferred_mcu: 'ESP32 / ARM Cortex',
        settings: { theme: 'dark', auto_drc: true, default_layer_count: 2, default_board_finish: 'ENIG' },
      };
      setUser(appUser);
      setUserDetails(details);
      localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      localStorage.setItem('antimatter_user_details', JSON.stringify(details));
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { error: error.message };
      if (data.user && data.session) {
        const appUser: AppUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0],
          role: data.user.user_metadata?.role || 'Hardware Engineer',
          isGuest: false,
        };
        setUser(appUser);
        localStorage.setItem('antimatter_user', JSON.stringify(appUser));
        await fetchProfile(data.user.id, data.session.access_token);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Authentication error' };
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name?: string,
    details?: {
      role?: string;
      experience_level?: string;
      organization?: string;
      preferred_eda?: string;
      preferred_mcu?: string;
    }
  ): Promise<{ error?: string; message?: string }> => {
    const fullName = name || email.split('@')[0];
    const userRole = details?.role || 'Hardware Engineer';
    const experienceLevel = details?.experience_level || 'Intermediate';

    if (!isLiveSupabaseConfigured) {
      const mockId = `user-${Date.now()}`;
      const appUser: AppUser = {
        id: mockId,
        email,
        name: fullName,
        role: userRole,
        isGuest: false,
      };
      const initialDetails: UserDetails = {
        id: mockId,
        email,
        full_name: fullName,
        role: userRole,
        organization: details?.organization || '',
        experience_level: experienceLevel,
        preferred_eda: details?.preferred_eda || 'KiCad 8',
        preferred_mcu: details?.preferred_mcu || 'ESP32 / ARM Cortex',
        settings: { theme: 'dark', auto_drc: true, default_layer_count: 2, default_board_finish: 'ENIG' },
      };
      setUser(appUser);
      setUserDetails(initialDetails);
      localStorage.setItem('antimatter_user', JSON.stringify(appUser));
      localStorage.setItem('antimatter_user_details', JSON.stringify(initialDetails));
      return { message: 'Account created successfully in local sandbox mode.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
            role: userRole,
            experience_level: experienceLevel,
            organization: details?.organization || '',
            preferred_eda: details?.preferred_eda || 'KiCad 8',
            preferred_mcu: details?.preferred_mcu || 'ESP32 / ARM Cortex',
          },
        },
      });

      if (error) return { error: error.message };

      if (data.user) {
        const appUser: AppUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: fullName,
          role: userRole,
          isGuest: false,
        };
        setUser(appUser);
        localStorage.setItem('antimatter_user', JSON.stringify(appUser));

        // Create initial user_details record via backend or client
        if (data.session) {
          await fetchProfile(data.user.id, data.session.access_token);
        } else {
          // If email confirmation is required
          return {
            message: 'Account created! Please check your email inbox to confirm your registration.',
          };
        }
      }
      return { message: 'Account created successfully.' };
    } catch (err: any) {
      return { error: err.message || 'Registration error' };
    }
  };

  const forgotPassword = async (email: string, redirectTo?: string): Promise<{ error?: string; message?: string }> => {
    if (!isLiveSupabaseConfigured) {
      return { message: `Simulated password reset instructions dispatched to ${email}.` };
    }

    try {
      const targetUrl = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/#type=recovery` : undefined);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: targetUrl,
      });
      if (error) return { error: error.message };
      return { message: `If an account exists for ${email}, a password reset link has been dispatched.` };
    } catch (err: any) {
      return { error: err.message || 'Failed to request password reset' };
    }
  };

  const resetPassword = async (newPassword: string): Promise<{ error?: string; message?: string }> => {
    if (!isLiveSupabaseConfigured) {
      setIsRecoveryMode(false);
      return { message: 'Password reset simulated successfully.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      setIsRecoveryMode(false);
      // Clean up hash from URL
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return { message: 'Password updated successfully. You are now logged in.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to update password' };
    }
  };

  const updateUserProfile = async (details: Partial<UserDetails>): Promise<{ error?: string; details?: UserDetails }> => {
    if (user?.isGuest || !isLiveSupabaseConfigured) {
      const updated: UserDetails = {
        ...(userDetails || {
          id: user?.id || 'guest',
          email: user?.email || '',
        }),
        ...details,
      };
      setUserDetails(updated);
      localStorage.setItem('antimatter_user_details', JSON.stringify(updated));
      if (details.full_name && user) {
        const u = { ...user, name: details.full_name };
        setUser(u);
        localStorage.setItem('antimatter_user', JSON.stringify(u));
      }
      return { details: updated };
    }

    try {
      const authToken = session?.access_token;
      if (authToken) {
        const res = await fetch(`${getApiBase()}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(details),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUserDetails(data.profile);
            localStorage.setItem('antimatter_user_details', JSON.stringify(data.profile));
            if (data.profile.full_name && user) {
              const u = { ...user, name: data.profile.full_name };
              setUser(u);
              localStorage.setItem('antimatter_user', JSON.stringify(u));
            }
            return { details: data.profile };
          }
        }
      }

      if (user?.id) {
        const payload = { id: user.id, email: user.email, ...details, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from('user_details').upsert(payload).select().maybeSingle();
        if (error) return { error: error.message };
        if (data) {
          setUserDetails(data);
          localStorage.setItem('antimatter_user_details', JSON.stringify(data));
          return { details: data };
        }
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update profile' };
    }
  };

  const signInAsGuest = () => {
    if (isLiveSupabaseConfigured) {
      console.warn('[Auth] Guest bypass rejected: Live Supabase authentication is enforced.');
      return;
    }
    const guestUser: AppUser = {
      id: `guest-${Date.now()}`,
      email: 'engineer@antimatter.local',
      name: 'Hardware Engineer (Guest)',
      role: 'Hardware Engineer',
      isGuest: true,
    };
    const guestDetails: UserDetails = {
      id: guestUser.id,
      email: guestUser.email,
      full_name: 'Hardware Engineer (Guest)',
      role: 'Hardware Engineer',
      experience_level: 'Intermediate',
      preferred_eda: 'KiCad 8',
      preferred_mcu: 'ESP32 / ARM Cortex',
      bio: 'Guest exploratory engineering mode.',
      settings: { theme: 'dark', auto_drc: true, default_layer_count: 2, default_board_finish: 'ENIG' },
    };
    setUser(guestUser);
    setUserDetails(guestDetails);
    localStorage.setItem('antimatter_user', JSON.stringify(guestUser));
    localStorage.setItem('antimatter_user_details', JSON.stringify(guestDetails));
  };

  const signOut = async () => {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore signOut errors
      }
    }
    localStorage.removeItem('antimatter_user');
    localStorage.removeItem('antimatter_user_details');
    setUser(null);
    setUserDetails(null);
    setSession(null);
    setIsRecoveryMode(false);
  };

  const clearRecoveryMode = () => {
    setIsRecoveryMode(false);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token: session?.access_token || null,
        userDetails,
        loading,
        isLiveConfigured: isLiveSupabaseConfigured,
        isRecoveryMode,
        signInWithEmail,
        signUpWithEmail,
        forgotPassword,
        resetPassword,
        updateUserProfile,
        signInAsGuest,
        signOut,
        clearRecoveryMode,
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
