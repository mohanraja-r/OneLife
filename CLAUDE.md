@AGENTS.md
-When creating a new function always include a one sentence description of what it does

## Project
OneLife — a health/wellness app (medicine tracking, meal logging, planner) built with
Expo Router (file-based routing), TypeScript, and Supabase as the backend.

## Stack
- Expo SDK 54, expo-router ~6 (typed routes, React Compiler enabled)
- React 19 / React Native 0.81
- Supabase JS client (`src/services/supabase.ts`) — session persisted via AsyncStorage
  (skipped on web), auth token auto-refresh on
- Styling: no NativeWind/UI kit — check `src/constants/theme.ts` before introducing a new
  styling approach
- lucide-react-native for icons, moti/react-native-reanimated for animation

## Architecture
- `src/app/` — routes (Expo Router). `(tabs)/` = bottom-tab screens (home, health, medicine,
  planner). `onboarding/` = onboarding flow, has its own local `state.ts`.
- `src/services/` — one file per domain (meals, medicine, notifications, planner,
  prescriptionScan) wrapping Supabase calls. Put new DB/queries here, not in components.
- `src/components/` — shared UI components.
- `supabase/functions/` — Deno edge functions (identify-meal, scan-prescription) for AI calls
  that shouldn't run client-side (API keys).
- `migrations/` — SQL migrations (currently light; confirm whether new schema changes should
  go here or via `supabase/migrations` + Supabase CLI/MCP).

## Conventions
- Path alias `@/*` → `src/*`, `@/assets/*` → `assets/*` (see tsconfig.json).
- TypeScript strict mode is on — no implicit any, no unchecked nulls.
- ESLint: type-aware linting is enabled (`recommended-requiring-type-checking`) — run
  `npm run lint` before considering a change done.
- Env vars are `EXPO_PUBLIC_*` prefixed (client-exposed) — never put secret keys behind
  `EXPO_PUBLIC_`; secrets belong in edge functions only.

## Expo Go specifics
- Verify any new native module works in Expo Go, or flag if it needs a dev build
  (Expo Go only supports a fixed set of native modules).
- Don't add packages requiring native config changes without checking `app.json` plugins.

## Supabase specifics
- Client: `src/services/supabase.ts` — reuse this instance, don't create new clients.
- RLS: assume Row Level Security is/should be on for all user data tables — new tables need
  policies, not just a schema.
- Edge functions handle AI/third-party API calls (see `supabase/functions/`) — keep API keys
  server-side there, never in client code.
- Before schema changes, check existing tables/migrations rather than assuming structure.

## Docs
- Expo docs changed — always check https://docs.expo.dev/versions/v57.0.0/ for current APIs
  before writing Expo code (already in AGENTS.md, repeating because it's easy to miss).