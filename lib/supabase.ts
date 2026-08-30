import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key')
);

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Auth helper functions
export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn('Error fetching Supabase auth user:', err);
    return null;
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please provide your Supabase URL & Key in .env.local.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmailPassword(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please provide your Supabase URL & Key in .env.local.');
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

export async function signInWithMagicLink(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please provide your Supabase URL & Key in .env.local.');
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

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet. Please provide your Supabase URL & Key in .env.local.');
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

export async function signOutUser() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}
