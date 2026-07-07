// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { getDefaultConfig });

// @supabase/supabase-js (and its dependencies) ship a package "exports" map
// with a "react-native" condition. Without this, Metro falls back to the
// legacy "module"/"main" fields and picks the wrong build (an .mjs file
// Metro doesn't know how to resolve), causing a bundling error.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
