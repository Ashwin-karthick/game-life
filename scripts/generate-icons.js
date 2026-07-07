// One-off icon generation script (Concept A: "Ascending Shield").
// Run with: node scripts/generate-icons.js
// Not part of the app bundle -- sharp is installed with --no-save.
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets', 'images');

const BG_DARK_TOP = '#182238';
const BG_DARK_BOTTOM = '#070B13';
const CYAN = '#22D3EE';
const CYAN_BRIGHT = '#7DF3FF';

// Shield silhouette (1024x1024 viewBox), matching the approved "Ascending
// Shield" concept: a hunter-badge shield with an upward double-chevron.
const SHIELD_PATH =
  'M 512 120 C 660 120 780 170 824 210 L 824 460 C 824 660 700 810 512 900 ' +
  'C 324 810 200 660 200 460 L 200 210 C 244 170 364 120 512 120 Z';

const CHEVRON_LOWER = '368,600 512,470 656,600';
const CHEVRON_UPPER = '392,460 512,350 632,460';

function shieldDefs() {
  return `
    <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_DARK_TOP}" />
      <stop offset="100%" stop-color="${BG_DARK_BOTTOM}" />
    </linearGradient>
    <linearGradient id="chevronFill" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${CYAN}" />
      <stop offset="100%" stop-color="${CYAN_BRIGHT}" />
    </linearGradient>
  `;
}

/** Full-color badge: dark shield body, cyan outline, cyan-gradient chevrons. */
function fullBadgeSvg({ background = 'none' } = {}) {
  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>${shieldDefs()}</defs>
  ${background !== 'none' ? `<rect width="1024" height="1024" fill="${background}" />` : ''}
  <path d="${SHIELD_PATH}" fill="url(#shieldFill)" stroke="${CYAN}" stroke-width="14" stroke-linejoin="round" />
  <polyline points="${CHEVRON_LOWER}" fill="none" stroke="url(#chevronFill)" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="${CHEVRON_UPPER}" fill="none" stroke="url(#chevronFill)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

/** Glyph-only (shield + chevrons), transparent background, scaled into the
 * adaptive-icon safe zone (~66%) so Android's mask never crops the shield. */
function glyphOnlySvg() {
  const scale = 0.62;
  const translate = (1024 - 1024 * scale) / 2;
  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>${shieldDefs()}</defs>
  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <path d="${SHIELD_PATH}" fill="url(#shieldFill)" stroke="${CYAN}" stroke-width="14" stroke-linejoin="round" />
    <polyline points="${CHEVRON_LOWER}" fill="none" stroke="url(#chevronFill)" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="${CHEVRON_UPPER}" fill="none" stroke="url(#chevronFill)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;
}

/** Single-color (white) silhouette for Android 13+ themed icons -- the OS
 * re-tints this to the user's accent color, so only shape matters. */
function monochromeSvg() {
  const scale = 0.62;
  const translate = (1024 - 1024 * scale) / 2;
  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <path d="${SHIELD_PATH}" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linejoin="round" />
    <polyline points="${CHEVRON_LOWER}" fill="none" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="${CHEVRON_UPPER}" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;
}

/** Plain dark gradient, no glyph -- the adaptive icon's background layer. */
function backgroundOnlySvg() {
  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>${shieldDefs()}</defs>
  <rect width="1024" height="1024" fill="url(#shieldFill)" />
</svg>`;
}

async function main() {
  // icon.png: flattened onto the app's base background, no alpha channel.
  await sharp(Buffer.from(fullBadgeSvg()))
    .flatten({ background: BG_DARK_BOTTOM })
    .png()
    .toFile(path.join(OUT, 'icon.png'));

  // splash-icon.png: glyph on transparent, OS composites onto the splash backgroundColor.
  await sharp(Buffer.from(glyphOnlySvg())).png().toFile(path.join(OUT, 'splash-icon.png'));

  // Android adaptive icon layers.
  await sharp(Buffer.from(glyphOnlySvg())).png().toFile(path.join(OUT, 'android-icon-foreground.png'));
  await sharp(Buffer.from(backgroundOnlySvg())).png().toFile(path.join(OUT, 'android-icon-background.png'));
  await sharp(Buffer.from(monochromeSvg())).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));

  // favicon.png: flattened icon, downscaled, bumped from 48 to 128.
  await sharp(Buffer.from(fullBadgeSvg()))
    .flatten({ background: BG_DARK_BOTTOM })
    .resize(128, 128)
    .png()
    .toFile(path.join(OUT, 'favicon.png'));

  console.log('Icon generation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
