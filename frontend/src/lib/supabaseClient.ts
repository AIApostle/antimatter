import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment or localStorage for runtime developer overrides.
// Vercel only exposes variables prefixed with VITE_ to the browser bundle.
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('antimatter_supabase_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('antimatter_supabase_key') : null;

export const supabaseUrl = localUrl || envUrl || 'https://mock-antimatter.supabase.co';
export const supabaseAnonKey = localKey || envKey || 'mock-anon-key';

export const isLiveSupabaseConfigured = Boolean((localUrl || envUrl) && (localKey || envKey));

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
