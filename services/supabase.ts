
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { Category, Dua } from '../types';

// Environment variables - these must be set in .env.local
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type BasicUser = {
  id: string;
  email?: string | null;
};

type DuaRow = {
  id: string;
  user_id: string;
  arabic: string;
  translation: string;
  category: Category;
  source: Dua['source'];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

const toDua = (row: DuaRow): Dua => ({
  id: row.id,
  userId: row.user_id,
  arabic: row.arabic,
  translation: row.translation,
  category: row.category,
  source: row.source,
  isFavorite: row.is_favorite,
  createdAt: Date.parse(row.created_at),
});

export const ensureUserProfile = async (user: BasicUser) => {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (!error) return;

  if (error.code === '42P01') {
    throw new Error(
      'Missing "profiles" table in Supabase. Run the SQL in supabase/profiles.sql, then try again.'
    );
  }

  throw error;
};

export const signInWithEmailPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data.user) {
    await ensureUserProfile({ id: data.user.id, email: data.user.email });
  }
  return data;
};

export const signUpWithEmailPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  // If email confirmation is disabled, session exists and we can create profile immediately.
  if (data.user && data.session) {
    await ensureUserProfile({ id: data.user.id, email: data.user.email });
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const fetchUserDuas = async (userId: string) => {
  const { data, error } = await supabase
    .from('duas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DuaRow[]).map(toDua);
};

type CreateDuaPayload = Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>;

export const createUserDua = async (userId: string, dua: CreateDuaPayload) => {
  const { data, error } = await supabase
    .from('duas')
    .insert({
      user_id: userId,
      arabic: dua.arabic,
      translation: dua.translation,
      category: dua.category,
      source: dua.source,
      is_favorite: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toDua(data as DuaRow);
};

export const updateUserDua = async (userId: string, dua: Dua) => {
  const { data, error } = await supabase
    .from('duas')
    .update({
      arabic: dua.arabic,
      translation: dua.translation,
      category: dua.category,
      source: dua.source,
      is_favorite: dua.isFavorite,
    })
    .eq('id', dua.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return toDua(data as DuaRow);
};

export const deleteUserDua = async (userId: string, duaId: string) => {
  const { error } = await supabase.from('duas').delete().eq('id', duaId).eq('user_id', userId);
  if (error) throw error;
};

export const upsertUserDuas = async (userId: string, duas: CreateDuaPayload[]) => {
  if (!duas.length) return [];

  const payload = duas.map((dua) => ({
    user_id: userId,
    arabic: dua.arabic,
    translation: dua.translation,
    category: dua.category,
    source: dua.source,
    is_favorite: false,
  }));

  const { data, error } = await supabase.from('duas').insert(payload).select('*');

  if (error) throw error;
  return ((data ?? []) as DuaRow[]).map(toDua);
};

export const fetchUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('has_completed_onboarding')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.has_completed_onboarding ?? false;
};

export const setUserOnboardingCompleted = async (userId: string, completed: boolean) => {
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      has_completed_onboarding: completed,
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
};

export const fetchIsPremium = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  // If subscriptions table is not created yet, fail safely as free tier.
  if (error) {
    if (error.code === '42P01') return false;
    throw error;
  }
  return data?.status === 'active';
};
