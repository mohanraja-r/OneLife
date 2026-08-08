# OneLife

A personal health app for medicine adherence, meal logging, and daily planning — with
optional cycle and pregnancy tracking. Built with Expo Router and TypeScript on a
Supabase backend, with AI features running server-side in Deno edge functions.

| | |
| --- | --- |
| **Platforms** | iOS, Android, web (Expo) |
| **Version** | 1.0.0 |
| **Runtime** | Expo SDK 54 · React Native 0.81 · React 19 |
| **Backend** | Supabase (Postgres 17, Auth, Edge Functions) |

## Features

- **Medicine** — track medicines with dosage, frequency, and reminder times. Reminder
  slots expand into a daily dose schedule; doses are marked taken or missed, and a
  7-day adherence score and trend are derived from that history. Prescriptions can be
  photographed and parsed instead of typed in by hand.
- **Meals** — log a meal by photo, free text, or manual entry. An AI edge function
  identifies the food and estimates macros; nothing is saved until it's reviewed and
  confirmed.
- **Planner** — a day-by-day task list with categories (work / personal / fitness),
  optional times, repeat rules, and reminders.
- **Women's Health** — cycle tracking (period, phases, fertility window, symptoms, BBT,
  ovulation tests) and pregnancy tracking (week, trimester, baby-size comparisons,
  checkups, weight and BP logs). Shown only to users whose profile gender is `woman`.
- **Onboarding** — a 16-screen flow collecting goal, body stats, diet and activity
  preferences, which produces a starting daily calorie and macro target.

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project
- Expo Go on a device, or an iOS Simulator / Android Emulator

### Setup

```bash
npm install
```

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Only the anon key belongs here. `EXPO_PUBLIC_*` variables are bundled into the client
and are readable by anyone with the app — secrets go in edge functions instead (see
[AI edge functions](#ai-edge-functions)).

### Run

```bash
npm start        # Expo dev server — scan the QR code with Expo Go
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # browser
```

## Scripts

| Script | Does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `android` / `web` | Start on a specific platform |
| `npm run lint` | ESLint with type-aware rules — run before considering a change done |
| `npm run lint:fix` | ESLint with autofix |
| `npm run format` | Prettier over the repo |

## Project structure

```
src/
  app/              Routes (Expo Router, file-based)
    (tabs)/         Bottom-tab screens: home, medicine, planner, women
    onboarding/     Onboarding flow with its own layout and local state.ts
  components/       Shared UI
    ui/             Primitives: BottomSheet, ChipRow, EmptyState, LoadingState…
    women/          Women's Health panels and sheets
  services/         One module per domain — all Supabase access lives here
  constants/
    theme.ts        Every design token (color, spacing, radius, type, motion)
supabase/
  functions/        Deno edge functions (identify-meal, scan-prescription)
migrations/         SQL patches applied to the Supabase project
```

Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

### Architecture notes

- **Screens don't query Supabase directly.** Every database call goes through a module
  in `src/services/`, which is the only layer that knows the table shapes. New queries
  belong there, not in components.
- **No global state library.** Screen-local state plus service modules; `profile.ts`
  keeps one module-level cache of the signed-in user's summary, since the nav and
  headers on every screen need it.
- **Navigation is custom.** The Expo Router tab bar is hidden and `FloatingNav` renders
  navigation on every screen instead. The `Tabs` navigator stays mounted so switching
  destinations swaps screens rather than pushing a stack.
- **Nothing derived is stored.** Cycle predictions, adherence percentages, and pregnancy
  summaries are all recomputed from logged entries, so correcting a log never leaves a
  stale number behind.

## Database

Ten tables in the `public` schema, all with Row Level Security enabled:

| Table | Holds |
| --- | --- |
| `profiles` | One row per user — onboarding answers, calorie/macro targets, gender |
| `meals` | Logged meals; `items` is a jsonb array of foods and macros |
| `medicines` | Medicine catalogue with reminder slots in `times text[]` |
| `dose_log` | One row per acted-on dose (pending / taken / missed) |
| `planner_tasks` | Day-by-day tasks |
| `cycle_entries` | One logged cycle day, unique on `(user_id, date)` |
| `pregnancy_data` | One row per user; checkups and logs as jsonb arrays |
| `family_links` | Caregiver ↔ dependent relationships |
| `push_tokens` | Device push tokens |
| `activity_logs` | Daily water, steps, workouts |

New tables need RLS policies, not just a schema. Check the existing tables before
assuming structure — `migrations/` holds ad-hoc patches applied through the Supabase
SQL editor and is not a complete schema history.

## AI edge functions

Both AI features follow the same shape: the client posts raw input to a Deno edge
function, the function calls the Anthropic API with a server-side key, and the result is
always shown for review before anything is written to the database — never auto-saved.

| Function | Does |
| --- | --- |
| `identify-meal` | Photo or text → estimated food items, macros, and a goal-aware suggestion |
| `scan-prescription` | Prescription photo → structured medicine list for review |

Deploy and configure:

```bash
supabase functions deploy identify-meal
supabase functions deploy scan-prescription
supabase secrets set ANTHROPIC_API_KEY=sk-...
```

The API key lives only in edge-function secrets. It must never be added to `.env` or
referenced from client code.

## Conventions

- **TypeScript strict mode** — no implicit `any`, no unchecked nulls.
- **Run `npm run lint` before calling a change done.** Type-aware rules are enabled, so
  lint catches things `tsc` alone won't.
- **No raw hex in screens.** Add a token to `src/constants/theme.ts` instead; per-screen
  color comes from `Accents`, not ad-hoc constants.
- **New database work goes in `src/services/`**, one file per domain.
- **Check Expo Go compatibility** before adding a native module, or flag that it needs a
  development build.
- See `CLAUDE.md` and `AGENTS.md` for the full working agreement.

## Notes

- `scripts/reset-project.js` is a leftover from the Expo starter template and **deletes
  `/src`**. It's not part of this project's workflow and is safe to remove.
- `LICENSE` is still the Expo template's MIT license (© 650 Industries). Replace it with
  the project's own license before distributing.
