# cally

Family calendar and todo app. Nuxt 5 (nightly) + Nitro 3, SQLite via Node's built-in `node:sqlite`.
Runs on a 12" touch tablet in the kitchen. Touch first, readable from a distance.

## Workflow

- The user commits. Never run `git commit` or `git push`.
- The user reviews and approves every step. Do one step, stop, wait for feedback.
- Keep steps small. Do not build ahead of what was agreed.

## Code rules

- Code comments in English, senior dev style: only where the _why_ is not obvious. No narration.
- No em-dashes anywhere (code, comments, docs, chat). Use a normal hyphen if needed.
- UI text is German and hardcoded. i18n comes later, do not build abstractions for it now.
- Explicit imports on the server, there are no auto-imports. Request helpers come from `nuxt/server`
  (`defineEventHandler`, `getQuery`, `readBody`, `createError`), `$fetch` from `ofetch`,
  `useDatabase` from `nitro/database`. Shared code via `#shared/...`.
- `useRuntimeConfig` comes from `nitro/runtime-config` for now. The `nuxt/server` one returns a stub
  in dev because Vite externalizes `nuxt/server`; fix is pending upstream. Switch back once merged.
- pnpm: never add `nitro` or `h3` as direct dependencies (duplicate instances). If server imports
  stop resolving, hoist via `.npmrc` `public-hoist-pattern[]=nitro` instead.
- Formatting and linting: oxfmt / oxlint, config in `.oxfmtrc.json` and `.oxlintrc.json`.
- Vue: `<script setup lang="ts">`, Composition API, scoped styles. Global styling lives in
  `app/assets/css/`, components only add what is specific to them. Data and measuring logic goes
  into `app/composables/`, components stay UI.
- Call Nuxt composables (`useState`, `useFetch`, `useApi` ...) before the first `await` in setup
  and in composables. After an `await` the Nuxt instance context is gone on the server.

## Stack decisions

- Dates: `Temporal` via `temporal-polyfill`. No `Date` arithmetic, no moment/dayjs/date-fns.
- Recurrence: `rrule-temporal` (RFC 5545 RRULE strings, stored as text).
- All-day events are `PlainDate`s. Timed events are local wall-clock times in `Europe/Berlin`.
- Persistence: SQLite via Nitro `useDatabase()` (`experimental.database: true`), plain SQL, no ORM.
  Server code gets the connection through `useDb()` in `server/utils/db.ts`, which runs pending
  migrations from `server/database/migrations.ts` on first use (append only, `PRAGMA user_version`).
  db0 quirk: the `sql` tagged template returns rows only for SELECT, use `prepare().get()` or `.all()` otherwise.
- Font: Figtree (variable, self-hosted in `public/fonts/`, preloaded in `nuxt.config.ts`), one family for everything.
- No UI library. Base styles for buttons, inputs etc. are in `app/assets/css/components.css`.
- Icons: `@lucide/vue`, imported per icon. Weather icons are hand drawn in `WeatherIcon.vue`.
- Login: `nuxt-auth-utils` (Google OAuth, sealed session cookie). It targets h3 v1 and runs through
  Nuxt 5's compat layer; where its utils meet our `RequestEvent`, cast via `server/utils/compat.ts`.
  Only emails in `NUXT_ALLOWED_EMAILS` get a session, every `/api/*` route needs one
  (`server/middleware/auth.ts`). `NUXT_PUBLIC_AUTH_DISABLED=1` skips it in local dev.
- No Pinia. App wide state is a composable over `useState` with plain functions as actions
  (see `useLookups`). Decided 2026-09-18, revisit only if cross-entity updates get messy.

## Design

- Color: blue / petrol as the single accent. Everything else stays quiet.
- Touch targets at least 48px. Text must be readable on a 12" screen at arm's length.
