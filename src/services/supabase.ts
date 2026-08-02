import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

// WEB App
// import 'react-native-url-polyfill/auto';
// import { Platform } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';
// import ws from 'ws';

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// AsyncStorage's web shim needs `window`, which isn't ready at the point
// Supabase tries to read it during SSR/bundling on web. Fall back to
// localStorage directly on web, AsyncStorage on native.
// const storage =
//   Platform.OS === 'web'
//     ? undefined // supabase-js defaults to localStorage on web automatically
//     : AsyncStorage;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
//   realtime: {
//     transport: ws as any,
//   },
// });
