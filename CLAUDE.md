# cally

Family calendar and todo app. Nuxt 5 (nightly) + Nitro 3, SQLite via Node's built-in `node:sqlite`.
Runs on a 12" touch tablet in the kitchen. Touch first, readable from a distance.

## Workflow

- The user commits. Never run `git commit` or `git push`.
- The user reviews and approves every step. Do one step, stop, wait for feedback.
- Keep steps small. Do not build ahead of what was agreed.

## Code rules

- Code comments in English, senior dev style: only where the *why* is not obvious. No narration.
- No em-dashes anywhere (code, comments, docs, chat). Use a normal hyphen if needed.
- UI text is German and hardcoded. i18n comes later, do not build abstractions for it now.
- Explicit imports on the server. Nitro 3 has no auto-imports: `defineHandler` from `nitro`,
  `useDatabase` from `nitro/database`, `getQuery` etc. from `nitro/h3`. Shared code via `#shared/...`.
- Formatting and linting: oxfmt / oxlint, config in `.oxfmtrc.json` and `.oxlintrc.json`.
- Vue: `<script setup lang="ts">`, Composition API, scoped styles. Global styling lives in
  `app/assets/css/`, components only add what is specific to them.

## Stack decisions

- Dates: `Temporal` via `temporal-polyfill`. No `Date` arithmetic, no moment/dayjs/date-fns.
- Recurrence: `rrule-temporal` (RFC 5545 RRULE strings, stored as text).
- All-day events are `PlainDate`s. Timed events are local wall-clock times in `Europe/Vienna`.
- Persistence: Nitro `useDatabase()` (`experimental.database: true`), plain SQL, no ORM.
- Font: Figtree (variable, self-hosted via `@fontsource-variable/figtree`), one family for everything.
- No UI library. Base styles for buttons, inputs etc. are in `app/assets/css/components.css`.

## Design

- Color: blue / petrol as the single accent. Everything else stays quiet.
- Touch targets at least 48px. Text must be readable on a 12" screen at arm's length.
