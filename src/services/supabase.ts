import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// React Native has its own built-in WebSocket global — unlike plain Node.js,
// it does NOT need the `ws` package or a custom transport. That earlier
// warning only applies when running Supabase in a Node.js server context.

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Calls a Supabase edge function and returns its JSON payload typed as `T`,
 * turning transport-level failures into real Errors so callers only ever deal
 * with a value or a throw.
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  // Read off the response rather than destructuring it: supabase-js types the
  // failure branch's `error` as `any`, which would leak into every caller.
  const response = await supabase.functions.invoke<T>(functionName, { body });

  if (response.error) {
    const cause: unknown = response.error;
    throw cause instanceof Error ? cause : new Error(String(cause));
  }
  if (response.data === null) {
    throw new Error(`${functionName} returned no data.`);
  }

  return response.data;
}
