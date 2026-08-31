import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Safe environment variable retrieval with fallback checks
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

// Validate if environment variables are non-empty and not dummy placeholders
export const isSupabaseConfigured: boolean = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  rawSupabaseUrl.startsWith('https://') &&
  !rawSupabaseUrl.includes('your-project-id') &&
  !rawSupabaseUrl.includes('placeholder') &&
  !rawSupabaseAnonKey.includes('your-anon-public-key') &&
  !rawSupabaseAnonKey.includes('placeholder')
);

// Fallback dummy values to prevent createClient from throwing an exception during initialization
const validUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder-expance.supabase.co';
const validAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key-prevent-crash';

export const supabase: SupabaseClient = createClient(validUrl, validAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper to get the currently authenticated user
export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    console.warn('[Supabase] Error retrieving auth user:', err);
    return null;
  }
}

// Helper to get the current session
export async function getAuthSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) return null;
    return data.session;
  } catch (err) {
    console.warn('[Supabase] Error retrieving auth session:', err);
    return null;
  }
}

// Email/Password Sign-In
export async function signInWithEmailPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Email/Password Sign-Up
export async function signUpWithEmailPassword(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
      },
    },
  });
  if (error) throw error;
  return data;
}

// Magic Link Sign-In
export async function signInWithMagicLink(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  return data;
}

// Google OAuth Sign-In
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  return data;
}

// Sign Out
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase] Sign out error:', err);
    }
  }
}
