# Game Life

Turn your real life into an honest progression system. Log real actions, build habits and dailies, take on quests, and watch six (or more) life attributes level up — no fake grinding, no pay-to-win, just effort you actually put in.

Built with [Expo](https://expo.dev) (SDK 57) and React Native. Local-first, open source, with an optional Supabase-backed account for cloud backup and sync.

[![License: MIT](https://img.shields.io/badge/License-MIT-22D3EE.svg)](LICENSE)
[![Build & Release](https://github.com/Ashwin-karthick/game-life/actions/workflows/release.yml/badge.svg)](https://github.com/Ashwin-karthick/game-life/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Ashwin-karthick/game-life?display_name=tag)](https://github.com/Ashwin-karthick/game-life/releases/latest)

## Download

Every release is built automatically by [GitHub Actions](.github/workflows/release.yml) and attached to the [**Releases**](https://github.com/Ashwin-karthick/game-life/releases/latest) page.

| Platform | How to get it |
| --- | --- |
| **Android** | Download the `game-life-*.apk` from the [latest release](https://github.com/Ashwin-karthick/game-life/releases/latest) and open it on your phone. |
| **Windows / macOS / Linux** | Game Life is a mobile app — there's no native desktop installer. Run the **web version** in any browser instead: grab `game-life-web-*.zip` from the [latest release](https://github.com/Ashwin-karthick/game-life/releases/latest) and serve it with any static file server, or run it from source with `npm install && npm run web`. |
| **iOS / iPhone / iPad** | Apple only allows app installs through the App Store or TestFlight, so there is no downloadable iOS file. [Build it from source](#build-from-source) with a Mac and an Apple Developer account, or run it in [Expo Go](https://expo.dev/go). |

> **Note on the Android APK:** it's signed with a debug key by the CI build, so on install Android will warn about an "unknown developer" and you'll need to allow installing from your browser/file manager. That's expected for a sideloaded open-source build — it just isn't a Google Play upload.

## Features

- **Attributes** — Health, Intelligence, Career, Emotion, Finance, Relationship by default, plus your own custom life areas (Music, Faith, a side project — anything). Each one has its own level, XP curve, and gentle decay if neglected.
- **Habits & Dailies** — log recurring good/bad habits with streak tracking, and schedule dailies for specific weekdays. Missing a scheduled daily costs XP — showing up matters. Slips and completions can be undone within a few seconds.
- **Quests** — daily, weekly, and comeback quest offers generated based on what needs attention, plus fully custom quests you create yourself (one-time or multi-step, with optional deadlines).
- **Economy** — earn gems alongside XP, spend them in a Reward Shop stocked with your own real-life rewards. Loot drops (gem caches, streak shields, XP boosters, collectible artifacts) roll on quest/daily/habit completion.
- **Weekly Challenge** — an auto-generated XP target scaled to your own recent pace, with a gem payout on clear.
- **Perks** — spend AP earned from leveling up on permanent boosts (XP multipliers, better drop rates, more freeze tokens).
- **Hunter Rank** — an overall E → S rank derived from total AP across every attribute, with rank-up celebrations.
- **Analytics** — 7-day XP chart, 5-week activity heatmap, and a balance index showing how evenly you're growing.
- **Achievements** — a full badge wall with locked/unlocked states.
- **Daily briefing** — a plain-language morning readout: streak status, dailies remaining, your quietest area, challenge progress.
- **Backup & restore** — export your data as JSON and restore it on a new device, no account needed. Optionally sign in with email + password to back up to the cloud and sync across devices.

Everything is local-first — every screen reads and writes to on-device storage instantly, with no network wait. Signing in is entirely optional: without an account, nothing ever leaves the device. With one, changes sync to Supabase in the background without ever blocking the UI.

## Tech stack

- [Expo](https://expo.dev) / React Native (SDK 57)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware for state + versioned migrations
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) for motion
- [react-native-svg](https://github.com/software-mansion/react-native-svg) for charts and progress rings
- [Supabase](https://supabase.com) (Postgres + Auth, row-level security) for optional cloud sync
- `expo-haptics`, `expo-blur`, `expo-linear-gradient` for feel and polish
- Optional [Sentry](https://sentry.io) crash reporting, gated behind an env var

## Getting started

```bash
npm install
npx expo start
```

Then press `w` for web, or scan the QR code with [Expo Go](https://expo.dev/go) on your phone.

## Build from source

Prerequisites: Node.js 22.13+, and for native builds the platform toolchains below.

**Android APK** (what CI produces — needs the Android SDK + JDK 17):

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

**iOS** (needs macOS, Xcode, and an Apple Developer account to run on a device):

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios     # or open ios/*.xcworkspace in Xcode
```

**Web** (runs anywhere with a browser):

```bash
npm install
npx expo export --platform web   # static build → dist/
# or, for development:
npm run web
```

## Cloud sync setup (optional)

The app is fully functional offline with no account. To enable the optional cloud backup with your own Supabase project:

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in `supabase/` in order (`migration_001_init.sql` first, then `002`…`006`).
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key (Dashboard → Settings → API).
4. (Optional) deploy the account-deletion function: `supabase functions deploy delete-account`.
5. Restart the dev server. A "Back up & Sync" card appears in Settings.

Without a `.env` file, the app runs exactly as before — fully local, no sign-in prompt blocks anything.

## Project structure

```
app/                  Expo Router screens (file-based routing)
  (tabs)/             Home, Tasks, Stats, Data, Hunter tabs
components/           Shared UI components and overlays
components/ui/        Design-system primitives (Button, Card, ProgressBar, etc.)
lib/                  Pure logic: progression math, quests, economy, analytics
store/                Zustand stores — the single source of truth
supabase/             SQL migrations + the delete-account edge function
scripts/              One-off tooling (app-icon generation)
types/                Shared TypeScript types
constants/theme.ts    Colors, fonts, gradients, spacing
.github/workflows/    CI that builds the APK + web bundle on each release tag
```

## Contributing

Issues and pull requests are welcome. To get set up:

```bash
git clone https://github.com/Ashwin-karthick/game-life.git
cd game-life
npm install
npx tsc --noEmit   # type-check
npx expo start
```

Please run `npx tsc --noEmit` before opening a PR — the project is strict-typed and should stay clean.

## License

[MIT](LICENSE) © Ashwin Karthick
