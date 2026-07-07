# Game Life

Turn your real life into an honest progression system. Log real actions, build habits and dailies, take on quests, and watch six (or more) life attributes level up — no fake grinding, no pay-to-win, just effort you actually put in.

Built with [Expo](https://expo.dev) (SDK 57) and React Native, local-first with an optional Supabase-backed account for cloud backup and sync.

## Features

- **Attributes** — Health, Intelligence, Career, Emotion, Finance, Relationship by default, plus your own custom life areas (Music, Faith, a side project — anything). Each one has its own level, XP curve, and gentle decay if neglected.
- **Habits & Dailies** — log recurring good/bad habits with streak tracking, and schedule dailies for specific weekdays. Missing a scheduled daily costs XP — showing up matters.
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

### Cloud sync setup (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard's SQL Editor, run `supabase/migration_001_init.sql` once.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key (Dashboard → Settings → API).
4. Restart the dev server. A "Back up & Sync" card appears in Settings.

Without a `.env` file, the app runs exactly as before — fully local, no sign-in prompt blocks anything.

## Tech stack

- [Expo](https://expo.dev) / React Native (SDK 57)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware for state + versioned migrations
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) for motion
- [react-native-svg](https://github.com/software-mansion/react-native-svg) for charts and progress rings
- `expo-haptics`, `expo-blur`, `expo-linear-gradient` for feel and polish

## Getting started

```bash
npm install
npx expo start
```

Then press `w` for web, or scan the QR code with Expo Go on your phone.

## Project structure

```
app/                  Expo Router screens (file-based routing)
  (tabs)/             Home, Tasks, Stats, Data, Hunter tabs
components/           Shared UI components and overlays
components/ui/        Design-system primitives (Button, Card, ProgressBar, etc.)
lib/                  Pure logic: progression math, quests, economy, analytics
store/                Zustand store — the single source of truth
types/                Shared TypeScript types
constants/theme.ts    Colors, fonts, gradients, spacing
```

## License

MIT
