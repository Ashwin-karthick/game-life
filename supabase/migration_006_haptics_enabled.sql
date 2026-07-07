-- Backs the new SettingsState.hapticsEnabled toggle (app/settings.tsx).
alter table profiles add column haptics_enabled boolean not null default true;
