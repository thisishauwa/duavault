
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Environment variables - these must be set in .env.local
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Detects the correct redirect URL based on the environment.
 * For Capacitor, you should use your custom scheme.
 * For Web, use the current origin.
 */
const getRedirectUrl = () => {
  const isNative = window.location.protocol === 'capacitor:';
  if (isNative) {
    // This matches the App ID you define in capacitor.config.json
    return 'com.chick.duavault://login-callback';
  }
  return window.location.origin;
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
