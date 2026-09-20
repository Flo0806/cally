# cally

A family calendar for the kitchen tablet, built as an experiment on **Nuxt 5 (nightly)** and **Nitro 3**.

The goal was simple: a calendar and todo list the whole family can use with a finger on a 12" screen. Along the way it became a place to try out what Nuxt 5 changes and how the ecosystem copes with it. The UI is German, the code and comments are English.

## What it does

- **Calendar**: month view with color chips, all-day and multi-day events, start and end times, recurring events (daily, weekly, monthly, yearly, with an end date), single occurrences of a series can be removed
- **Places**: an event can have a location, resolved through Photon (OpenStreetMap). The editor checks the place and shows what it found. The drive time from home comes from OSRM
- **Heute drawer**: today's events with a "leave at" time. Drive time comes from TomTom with traffic for the time of arrival (OSRM without traffic as fallback), plus a buffer, the weather at the destination and closures, roadworks or jams along the route
- **Phone pushes**: "Aufs Handy" sends an event with a Google Maps link to the phones of the people it concerns, through `nuxt-pigeon` and a self hosted ntfy. A task pushes reminders an hour and a quarter hour before leaving
- **Todos**: a drawer with a simple list, assignable to family members
- **Family and categories**: members and categories with colors, no user management, no passwords
- **News**: RSS from a curated list of German sources (tagesschau, heise, Sportschau, mydealz, Google News topics and more) sorted into categories. Each family member picks who is reading, hearts what they like, and their favourite categories move to the top. Read items disappear from "Für dich"
- **Weather**: header with the current conditions and a four day outlook (Open-Meteo)
- **Login**: Google sign-in through `nuxt-auth-utils`, restricted to a list of allowed accounts

## Stack

| Concern    | Choice                                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| Framework  | Nuxt 5 nightly, Nitro 3, Vue 3.5                                                  |
| Dates      | `Temporal` via `temporal-polyfill`, no `Date` arithmetic                          |
| Recurrence | `rrule-temporal`, RFC 5545 rules stored as text                                   |
| Database   | SQLite through Node's built-in `node:sqlite`, plain SQL, a small migration runner |
| Validation | `valibot`, the same schemas on server and client                                  |
| Auth       | `nuxt-auth-utils` (Google OAuth, sealed session cookie)                           |
| Messaging  | `nuxt-pigeon` with an ntfy channel                                                |
| Geo        | Photon for places, OSRM for plain drive times, TomTom for traffic and incidents   |
| Icons      | `@lucide/vue`, weather icons hand drawn                                           |
| Styling    | plain CSS with custom properties, no UI library, self-hosted Figtree              |
| Tooling    | pnpm, oxlint, oxfmt                                                               |
| Deployment | Docker image via GitHub Actions, `node:24-bookworm-slim`                          |

No Pinia, no ORM, no component library. State lives in composables over `useState`.

## Nuxt 5 notes

Things that came up while building on the nightly, in case they save someone an afternoon:

- Server auto-imports are gone. `defineEventHandler`, `getQuery`, `readBody`, `createError` come from `nuxt/server`, `useDatabase` from `nitro/database`, `$fetch` from `ofetch`
- `useRuntimeConfig` from `nuxt/server` returned a stub in dev at the time of writing (the nitro dev environment externalized `nuxt/server`). The fix is upstream, until it ships the app imports it from `nitro/runtime-config`
- Nuxt 5 has sessions built in (`useSession`), but `nuxt-auth-utils` still targets h3 v1. It runs fine through the compat layer, only the event types disagree, see `server/utils/compat.ts`
- `db0`'s `sql` tagged template returns rows only for `SELECT`. `PRAGMA` and friends go through `prepare().get()`
- Nitro tasks work in dev and in the node server preset, the news feeds are pulled every 30 minutes by a scheduled task

## Running it

```bash
pnpm install
cp .env.example .env   # fill in what you need
pnpm dev
```

For local development without a Google client set `NUXT_PUBLIC_AUTH_DISABLED=1`. The weather and the drive times need `NUXT_WEATHER_LATITUDE` and `NUXT_WEATHER_LONGITUDE`, that is home. Traffic needs `NUXT_TOMTOM_KEY` (free tier), pushes need an ntfy server and token (`PIGEON_NTFY_*`), and reminders only run with `NUXT_REMINDERS=1`.

Production runs as a container:

```bash
docker run -d --name cally -p 9215:3000 -v cally-data:/app/.data --env-file cally.env ghcr.io/flo0806/cally:latest
```

## On the tablet

The kitchen tablet runs [Fully Kiosk Browser](https://www.fully-kiosk.com/) pointed at the app: full screen, screen always on, wakes up on motion. Sign in with Google once, the session lasts a year.

## Status

A side project for one family, shared because the Nuxt 5 parts might be useful to others. Expect rough edges, and expect the nightly to move underneath it.

## License

MIT
